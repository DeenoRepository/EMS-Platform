/**
 * Тесты уведомлений об инцидентах SRM (notifySrmIncident).
 *
 * Модуль решает, кого и когда предупреждать об аварийной заявке или о риске
 * срыва SLA. Ошибка в этих ветвлениях не ломает сборку и не видна в UI: она
 * проявляется как «уведомление молча не пришло», поэтому регрессия ловится
 * только исполняемым тестом.
 *
 * Проверяются свойства, которые нельзя вывести из типов:
 *   • фильтр критичности и порог SLA (SLA_TARGET_HOURS) из ./constants;
 *   • отсутствие рассылки, когда получателей нет;
 *   • адресация уведомления каждому найденному пользователю;
 *   • fail-soft: ошибка БД не выбрасывается наружу, чтобы падение рассылки
 *     не срывало обработку вебхука.
 *
 * Реальное подключение к PostgreSQL не открывается: prisma полностью замокан
 * через mock.module('@ems/database').
 *
 * Requires TSX_TSCONFIG_PATH=apps/web/tsconfig.json (set by test-runner.mjs).
 */
import { test, describe, before, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MILLISECONDS_PER_HOUR, SLA_TARGET_HOURS } from '../jira/constants';

interface CreatedNotification {
  userId: string;
  title: string;
  message: string;
  type: string;
  link: string;
}

let targetUsers: Array<{ id: string }> = [];
let findManyError: Error | null = null;
let createError: Error | null = null;
let created: CreatedNotification[] = [];
let lastFindManyArgs: unknown = null;

const prismaMock = {
  user: {
    findMany: async (args: unknown) => {
      lastFindManyArgs = args;
      if (findManyError) throw findManyError;
      return targetUsers;
    },
  },
  notification: {
    create: async ({ data }: { data: CreatedNotification }) => {
      if (createError) throw createError;
      created.push(data);
      return data;
    },
  },
};

const loggerWarnings: string[] = [];
const loggerMock = {
  warn: (message: string) => loggerWarnings.push(message),
  error: () => {},
  info: () => {},
  debug: () => {},
};

// Логгер мокается ровно одним специфаером — тем, который использует сам модуль
// (`../logger`). Регистрация второго алиаса (`@/lib/logger`) на тот же файл
// ломает загрузку набора: node:test трактует их как разные модули и падает до
// регистрации subtests, из-за чего файл отчитывается как один «пройденный»
// тест, не выполнив при этом ни одной проверки.
mock.module('@ems/database', { namedExports: { prisma: prismaMock } });
mock.module('../logger', { namedExports: { logger: loggerMock } });

type NotificationsModule = typeof import('../jira/notifications');
let notifySrmIncident: NotificationsModule['notifySrmIncident'];

const hoursAgo = (hours: number) => new Date(Date.now() - hours * MILLISECONDS_PER_HOUR);

type JiraIssue = Parameters<NotificationsModule['notifySrmIncident']>[0];

function issue(overrides: Partial<JiraIssue> = {}): JiraIssue {
  return {
    issueKey: 'EMS-101',
    summary: 'Отказ насоса',
    status: 'In Progress',
    priority: 'Low',
    issueType: 'Incident',
    assignee: null,
    reporter: null,
    createdDate: hoursAgo(1),
    resolvedDate: null,
    equipmentId: null,
    rawData: {},
    ...overrides,
  };
}

describe('notifySrmIncident', () => {
  before(async () => {
    ({ notifySrmIncident } = await import('../jira/notifications'));
  });

  beforeEach(() => {
    targetUsers = [{ id: 'user-1' }, { id: 'user-2' }];
    findManyError = null;
    createError = null;
    created = [];
    lastFindManyArgs = null;
    loggerWarnings.length = 0;
  });

  test('не рассылает уведомления по некритичной заявке в пределах SLA', async () => {
    await notifySrmIncident(issue({ priority: 'Low', createdDate: hoursAgo(1) }));

    assert.equal(created.length, 0);
    assert.equal(lastFindManyArgs, null, 'получателей не следует искать до выполнения условия');
  });

  test('уведомляет каждого получателя о критическом инциденте', async () => {
    await notifySrmIncident(issue({ priority: 'Blocker' }), 'Насос НМ-1');

    assert.deepEqual(
      created.map((n) => n.userId),
      ['user-1', 'user-2'],
    );
    assert.match(created[0].title, /Критический инцидент: EMS-101/);
    assert.match(created[0].message, /Насос НМ-1/, 'имя оборудования должно попадать в текст');
    assert.equal(created[0].type, 'SLA_BREACH');
    assert.equal(created[0].link, '/srm?tab=issues&search=EMS-101');
  });

  test('распознаёт критичность независимо от регистра приоритета', async () => {
    await notifySrmIncident(issue({ priority: 'HIGHEST' }));

    assert.equal(created.length, 2);
  });

  test('уведомляет о риске срыва SLA для нерешённой заявки старше порога', async () => {
    await notifySrmIncident(
      issue({ priority: 'Low', createdDate: hoursAgo(SLA_TARGET_HOURS + 1) }),
    );

    assert.equal(created.length, 2);
    assert.match(created[0].title, /Риск срыва SLA: заявка EMS-101/);
  });

  test('молчит о старой заявке, если она уже решена', async () => {
    await notifySrmIncident(
      issue({
        priority: 'Low',
        createdDate: hoursAgo(SLA_TARGET_HOURS + 10),
        resolvedDate: hoursAgo(1),
      }),
    );

    assert.equal(created.length, 0);
  });

  test('не создаёт уведомлений, когда подходящих получателей нет', async () => {
    targetUsers = [];

    await notifySrmIncident(issue({ priority: 'Critical' }));

    assert.equal(created.length, 0);
    assert.notEqual(lastFindManyArgs, null, 'поиск получателей должен был выполниться');
  });

  test('ограничивает выборку активными пользователями с правами SRM', async () => {
    await notifySrmIncident(issue({ priority: 'Critical' }));

    const args = lastFindManyArgs as { where: { isActive: boolean }; take: number };
    assert.equal(args.where.isActive, true);
    assert.equal(args.take, 10);
    const serialized = JSON.stringify(args.where);
    assert.match(serialized, /srm\.dashboard\.view/);
    assert.match(serialized, /admin\.users\.manage/);
  });

  test('не выбрасывает ошибку наружу, если чтение получателей упало', async () => {
    findManyError = new Error('db is down');

    await notifySrmIncident(issue({ priority: 'Critical' }));

    assert.equal(created.length, 0);
    assert.equal(loggerWarnings.length, 1);
  });

  test('не выбрасывает ошибку наружу, если запись уведомления упала', async () => {
    createError = new Error('write failed');

    await notifySrmIncident(issue({ priority: 'Critical' }));

    assert.equal(created.length, 0);
    assert.equal(loggerWarnings.length, 1);
  });
});
