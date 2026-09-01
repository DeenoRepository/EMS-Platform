import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import type { JiraFieldMappingConfig } from './field-mapping';

let issues: any[] = [];
let equipments: any[] = [];
let latestInternalIssue: any = null;
let createdIssues: any[] = [];
let equipmentUpdates: any[] = [];
let createdSchedules: any[] = [];
let updatedIssues: any[] = [];
let notificationCalls: any[] = [];

const prismaMock = {
  jiraIssueCache: {
    findMany: async () => issues,
    findFirst: async () => latestInternalIssue,
    create: async (args: any) => {
      createdIssues.push(args);
      return {
        id: 'issue-created',
        ...args.data,
        resolvedDate: null,
        syncedAt: new Date(),
      };
    },
    findUnique: async () => latestInternalIssue,
    update: async (args: any) => {
      updatedIssues.push(args);
      return { ...latestInternalIssue, ...args.data };
    },
  },
  equipment: {
    findMany: async () => equipments,
    findUnique: async () => equipments[0] ?? null,
    update: async (args: any) => {
      equipmentUpdates.push(args);
      return { id: args.where.id, ...args.data };
    },
  },
  maintenanceSchedule: {
    create: async (args: any) => {
      createdSchedules.push(args);
      return { id: 'schedule-created', ...args.data };
    },
  },
};

mock.module('@ems/database', { namedExports: { prisma: prismaMock } });
mock.module('../logger', {
  namedExports: { logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} } },
});
mock.module('./notifications', {
  namedExports: {
    notifySrmIncident: async (...args: unknown[]) => {
      notificationCalls.push(args);
    },
  },
});

let defaultJiraFieldMapping: JiraFieldMappingConfig;
let applyJiraFieldMapping: typeof import('./field-mapping')['applyJiraFieldMapping'];
let extractValueByPath: typeof import('./field-mapping')['extractValueByPath'];
let testJiraFieldMapping: typeof import('./field-mapping')['testJiraFieldMapping'];
let calculateSrmMetrics: typeof import('./metrics')['calculateSrmMetrics'];
let calculateAdvancedRamsMetrics: typeof import('./metrics')['calculateAdvancedRamsMetrics'];
let createInternalServiceRequest: typeof import('./service-requests')['createInternalServiceRequest'];
let createMroWorkOrderFromIssue: typeof import('./service-requests')['createMroWorkOrderFromIssue'];

before(async () => {
  ({ DEFAULT_JIRA_FIELD_MAPPING: defaultJiraFieldMapping, applyJiraFieldMapping, extractValueByPath, testJiraFieldMapping } = await import('./field-mapping'));
  ({ calculateSrmMetrics } = await import('./metrics'));
  ({ calculateAdvancedRamsMetrics } = await import('./metrics'));
  ({ createInternalServiceRequest, createMroWorkOrderFromIssue } = await import('./service-requests'));
});

beforeEach(() => {
  issues = [];
  equipments = [];
  latestInternalIssue = null;
  createdIssues = [];
  equipmentUpdates = [];
  createdSchedules = [];
  updatedIssues = [];
  notificationCalls = [];
});

describe('Jira field mapping business rules', () => {
  test('extracts nested and indexed values without throwing on missing branches', () => {
    const issue = { fields: { components: [{ name: 'Pump' }], status: { name: 'Open' } } };

    assert.equal(extractValueByPath(issue, 'fields.components[0].name'), 'Pump');
    assert.equal(extractValueByPath(issue, 'fields.status.name'), 'Open');
    assert.equal(extractValueByPath(issue, 'fields.assignee.displayName'), undefined);
    assert.equal(extractValueByPath(null, 'fields.status'), undefined);
  });

  test('maps Jira values, applies status/priority maps, defaults missing fields, and matches equipment', async () => {
    const rawIssue = {
      key: 'EMS-7',
      fields: {
        summary: '  Pump failure  ',
        status: { name: 'Done' },
        priority: { name: 'Highest' },
        issuetype: { name: 'Incident' },
        created: '2026-01-01T00:00:00.000Z',
        customfield_10042: '4.5',
        customfield_10100: 'INV-42',
      },
    };

    const mapped = await applyJiraFieldMapping(rawIssue, defaultJiraFieldMapping, [{
      id: 'equipment-42', name: 'Pump A', inventoryNumber: 'INV-42', serialNumber: 'SN-42',
    }]);

    assert.equal(mapped.issueKey, 'EMS-7');
    assert.equal(mapped.summary, 'Pump failure');
    assert.equal(mapped.status, 'Closed');
    assert.equal(mapped.priority, 'Highest');
    assert.ok(mapped.customFields);
    assert.equal(mapped.customFields.downtimeHours, 4.5);
    assert.equal(mapped.equipmentId, 'equipment-42');
    assert.equal(mapped.resolvedDate, null);
  });

  test('returns diagnostics for invalid mapping samples and reports missing required values', async () => {
    const result = await testJiraFieldMapping(null, defaultJiraFieldMapping);
    assert.equal(result.success, false);
    assert.match(result.diagnostics[0], /некорректный JSON/i);

    const partial = await testJiraFieldMapping({ key: 'EMS-8', fields: {} }, defaultJiraFieldMapping);
    assert.equal(partial.success, true);
    assert.ok(partial.diagnostics.some((item) => /не найдено/.test(item)));
  });
});

describe('SRM metrics business rules', () => {
  test('classifies statuses, calculates MTTR and SLA compliance, and preserves counts', async () => {
    const created = new Date('2026-01-01T00:00:00.000Z');
    issues = [
      { status: 'Open', priority: 'HIGH', createdDate: created, resolvedDate: null },
      { status: 'In Progress', priority: 'MEDIUM', createdDate: new Date('2026-01-02T00:00:00.000Z'), resolvedDate: null },
      { status: 'Resolved', priority: 'CRITICAL', createdDate: created, resolvedDate: new Date('2026-01-01T12:00:00.000Z') },
      { status: 'Closed', priority: 'LOW', createdDate: created, resolvedDate: new Date('2026-01-05T00:00:00.000Z') },
    ];

    const result = await calculateSrmMetrics();

    assert.equal(result.totalIssues, 4);
    assert.equal(result.openIssues, 1);
    assert.equal(result.inProgressIssues, 1);
    assert.equal(result.resolvedIssues, 2);
    assert.equal(result.mttrHours, 54);
    assert.equal(result.slaComplianceRate, 50);
    assert.deepEqual(result.statusCounts, { Open: 1, 'In Progress': 1, Resolved: 1, Closed: 1 });
    assert.deepEqual(result.priorityCounts, { HIGH: 1, MEDIUM: 1, CRITICAL: 1, LOW: 1 });
  });

  test('uses stable defaults for empty and single-issue datasets', async () => {
    const empty = await calculateSrmMetrics('equipment-none');
    assert.equal(empty.totalIssues, 0);
    assert.equal(empty.mttrHours, 0);
    assert.equal(empty.slaComplianceRate, 100);

    issues = [{ status: 'Open', priority: 'MEDIUM', createdDate: new Date(), resolvedDate: null }];
    const single = await calculateSrmMetrics();
    assert.ok(single.mtbfDays > 0);
  });

  test('calculates advanced RAMS aggregates and equipment breakdown', async () => {
    const created = new Date('2026-01-01T00:00:00.000Z');
    const resolved = new Date('2026-01-01T06:00:00.000Z');
    issues = [{
      status: 'RESOLVED', priority: 'HIGH', source: 'JIRA', failureCategory: 'MECHANICAL',
      equipmentId: 'equipment-1', createdDate: created, resolvedDate: resolved,
      downtimeMinutes: 120, warrantyClaim: true, slaDeadline: new Date('2026-01-02T00:00:00.000Z'),
    }];
    equipments = [{ id: 'equipment-1', name: 'Pump A', inventoryNumber: 'INV-1' }];

    const result = await calculateAdvancedRamsMetrics('equipment-1');

    assert.equal(result.totalIncidents, 1);
    assert.equal(result.resolvedCount, 1);
    assert.equal(result.mttrHours, 6);
    assert.equal(result.totalDowntimeHours, 2);
    assert.equal(result.failureCategoryCounts.MECHANICAL, 1);
    assert.equal(result.warrantyIncidentsCount, 1);
    assert.equal(result.topEquipment[0].name, '[INV-1] Pump A');
  });
});

describe('Internal SRM and MRO service request business rules', () => {
  test('generates the next incident key, derives SLA, and moves high-priority equipment to repair', async () => {
    latestInternalIssue = { issueKey: 'INC-2026-0042' };
    equipments = [{ id: 'equipment-1', name: 'Pump A' }];

    const result = await createInternalServiceRequest({
      summary: 'Bearing failure',
      description: 'Urgent inspection required',
      priority: 'HIGH',
      equipmentId: 'equipment-1',
      createdById: 'operator-1',
      warrantyClaim: true,
    });

    assert.equal(result.issueKey, 'INC-2026-0043');
    assert.equal(result.priority, 'HIGH');
    assert.equal(result.status, 'OPEN');
    assert.equal(result.warrantyClaim, true);
    assert.equal(createdIssues[0].data.failureCategory, 'OTHER');
    assert.equal(equipmentUpdates[0].data.status, 'UNDER_REPAIR');
    assert.equal(notificationCalls.length, 1);
  });

  test('creates an MRO schedule, links it to the issue, and changes equipment status', async () => {
    latestInternalIssue = {
      id: 'issue-1', issueKey: 'INC-2026-0001', summary: 'Pump failure', description: 'Stop line',
      equipmentId: 'equipment-1', priority: 'CRITICAL', failureCategory: 'MECHANICAL',
    };

    const result = await createMroWorkOrderFromIssue('issue-1', 'operator-1');

    assert.equal(result.schedule.id, 'schedule-created');
    assert.equal(createdSchedules[0].data.status, 'IN_PROGRESS');
    assert.equal(createdSchedules[0].data.jiraIssueKey, 'INC-2026-0001');
    assert.match(createdSchedules[0].data.title, /INC-2026-0001/);
    assert.equal(updatedIssues[0].data.status, 'IN_PROGRESS');
    assert.equal(equipmentUpdates[0].data.status, 'UNDER_REPAIR');
  });

  test('rejects MRO creation for missing or equipment-less issues', async () => {
    latestInternalIssue = null;
    await assert.rejects(createMroWorkOrderFromIssue('missing'), /Инцидент не найден/);

    latestInternalIssue = { id: 'issue-2', issueKey: 'INC-2', equipmentId: null };
    await assert.rejects(createMroWorkOrderFromIssue('issue-2'), /не привязано оборудование/);
    assert.equal(createdSchedules.length, 0);
  });
});
