# EPS: план устранения замечаний

Дата аудита: 2026-10-05  
Ревизия: `a1b9a260b33d2897b25d4982918054ead495961f`  
Область: `apps/web/src/app/eps`, `apps/web/src/app/api/eps`, `apps/web/src/components/eps`, связанные auth/storage/database/lib и EPS-тесты.

## 1. Результат аудита

### Подтвержденные блокирующие риски

1. **Обход согласования.** `api/eps/approvals/[id]/route.ts:94-103` принимает решение при `EPS_APPROVALS_MANAGE` **или** `EPS_EQUIPMENT_EDIT`; редактор может утвердить собственную заявку. `api/eps/equipment/[id]/route.ts:151-156,202,258-278` позволяет редактору перевести `DRAFT` в `ACTIVE` обычным PATCH.
2. **Отзыв доступа не действует сразу.** `apps/web/src/lib/auth-guard.ts:32-42` восстанавливает права из JWT, если актуальная запись пользователя неактивна/не найдена или запрос к БД завершился ошибкой; `packages/auth/src/rbac.ts:24-25` возвращает пустой набор прав.
3. **Побочные эффекты в GET.** `api/eps/custom-sections/route.ts:14-16,95-143,254-294` под правом просмотра сбрасывает определения и мигрирует все паспорта.
4. **Импорт обходит полномочия.** `api/eps/import/execute/route.ts:46,126,145,165,199,370` при одном `CREATE + IMPORT_EXECUTE` выполняет `FULL_REPLACE`, изменяет существующие паспорта и справочники без `PURGE`, `EDIT`, `APPROVALS_MANAGE`, `CUSTOM_FIELDS_MANAGE`.
5. **Импорт портит существующие данные.** UPSERT по умолчанию затирает статус `ACTIVE` и имя fallback-значением (`execute/route.ts:208-217,278-292,373-378`); поиск смешивает external ID, inventory и serial (`:309-339`); кеш external ID не обновляется внутри файла (`:187-195,314,365-380`).
6. **Неатомарные согласования и вложения.** Resolver согласования удаляет теги до завершения операции (`api/eps/approvals/[id]/route.ts:157-170`), а загрузка сохраняет файл до создания DB-записи (`api/eps/documents/route.ts:167,299-332`). Ошибки могут оставить частичное состояние или потерянные файлы.
7. **Небезопасная выдача файлов.** `api/files/[...path]/route.ts:14-34` проверяет только login, не EPS-права/Document-связь; `:25` использует строковый `startsWith`. Для root `/app/uploads` путь `/app/uploads-backup/private.pdf` проходит изолированную проверку.
8. **Неверная заявка на смену статуса.** `components/eps/ApprovalWizardDialog.tsx:116-129` отправляет `proposedData.status`, а resolver читает `targetStatus` (`api/eps/approvals/[id]/route.ts:201-205`); заявка становится `APPROVED`, но оборудование не меняется.

### Существенные функциональные дефекты

1. Предпросмотр batch edit устаревает после изменения параметров и не блокирует применение (`EquipmentBatchEditDialog.tsx:135-184,254,300,330,352,368,456-477`).
2. Пустой `SELECTED` в batch edit проваливается в весь реестр (`api/eps/equipment/batch-edit/route.ts:164-176`).
3. Полнота карточки определяется по-разному в UI, grid и API: required custom fields против шести базовых `NOT NULL` (`eps-helpers.ts:102-175`, `eps-query-builder.ts:104-127`).
4. Фильтры UI не совпадают с серверным контрактом: `responsible_person_name` vs `respPerson`, `equipment_group` vs `eqGroup`, а диапазоны износа/поверки не поддержаны builder (`EquipmentColumnFiltersRow.tsx:156-161`, `EquipmentFilterDrawer.tsx:245,295-298`).
5. Grid отправляет `pageSize=12`, а пагинатор считает выбранный `pageSize=25` (`eps/page.tsx:278-283,859-867`).
6. Deep links вкладок паспорта устарели, URL не синхронизируется (`eps/[id]/page.tsx:207-229,333-344,886-900`); ошибки 403/404/500 показывают вечный loading (`:274-310,650-651`).
7. Поздние ответы запросов перезаписывают новые фильтры в реестре и журналах (`eps/page.tsx:275-309`, approvals/documents/history/reports pages). Отмена редактирования паспорта оставляет старый draft (`eps/[id]/page.tsx:286-296,393-419`).
8. UI МОЛ может сохранить старые `responsible_user_id/login` при смене имени или очистке (`EquipmentWizardForm.tsx:247-252`, `eps/[id]/page.tsx:1939-1947`).
9. Каталог полей редактирует по upsert ключу, не по `editingFieldId`: изменение ключа A на существующий B перезаписывает B (`EquipmentFieldsCatalogView.tsx:128-164`, `api/eps/custom-fields/route.ts:44-57`).
10. Экспорт сквозного выбора между страницами теряет записи; печать не использует выбранные ID (`eps/page.tsx:525-565,1189-1195,1277-1279,1411-1419`).

### Документы, импорт и отчеты

1. Удаление документа/фото сначала удаляет файл, затем DB-запись; ошибки storage игнорируются (`api/eps/documents/[id]/route.ts:34-43`, nested documents/photos routes).
2. `FULL_REPLACE` каскадно удаляет Document/Photo, но физические файлы остаются; rollback не защищает файловую систему.
3. Удаление вложения через nested URL не проверяет `equipmentId` (`equipment/[id]/documents` и `photos`), а главное фото меняется без общей транзакции.
4. `STORAGE_LOCAL_DIR` используется при сохранении (`lib/storage.ts:5`), но files route строит root только из `UPLOAD_DIR` (`api/files/[...path]/route.ts:23`).
5. Импорт не ограничивает строки/ячейки/rate limit на analyze; неизвестные статусы молча превращаются в `ACTIVE`; arbitrary primary key не сохраняется гарантированно.
6. Reports generate не исключает `deletedAt` и имеет неограниченный `limit` (`api/eps/reports/generate/route.ts:106-163`); DELETE report template не ограничен `module='eps'`.

### Техдолг и тестовая защита

1. `eps-catalog-import.test.ts`, `eps-document-binding.test.ts`, `eps-multi-document-upload.test.ts` в основном проверяют regex исходников, а не runtime API.
2. Approval-тесты в `packages/auth/src/eps.test.ts:96-143` тестируют локальную копию resolver, а не route handler, и тем самым не ловят ошибку прав.
3. Основные страницы EPS чрезмерно велики: `eps/[id]/page.tsx` около 2266 строк, registry около 1481, documents около 1320, approvals около 1293, reports около 1271. Статический checker выставил им grade F; его оценки complexity эвристические, но размер и реальные длинные обработчики подтверждены.
4. `matchesAllEquipmentFilters` и связанные client-side фильтры используются в production-коде ограниченно/не используются для серверного списка; после унификации нужно удалить дубли или оставить один подтвержденный runtime-путь.
5. Мертвые/устаревшие обработчики: `handleTabChange` в паспорте и старый flow создания заявки в approvals page. Удалять только после поведенческих тестов.

## 2. Правила выполнения

- Исправления делать отдельными логическими коммитами Conventional Commits.
- Для каждого P1 сначала добавить регрессионный тест, затем менять код.
- Не заменять route-level проверки тестами исходного текста. Для DB-сценариев использовать Prisma test database/изоляцию транзакций.
- Все мутации EPS должны проходить через `requireAuth(req, permission)` или эквивалентную проверку с актуальными правами; GET не должен менять данные.
- Не скрывать несовместимые контролы UI: фильтр считается поддержанным только после реализации API и теста round-trip.
- Для файлов применять единый root/resolver из `lib/storage.ts`; не дублировать вычисление upload directory.
- Не смешивать в одном PR security/data-loss исправления и косметический рефакторинг страниц.

## 3. Порядок работ для другого агента

### Этап 0. Подготовка тестового контура

Затронуть: `apps/web/src/app/api/eps/**`, `packages/auth/src`, test setup, возможно `packages/database`.

1. Зафиксировать минимальные fixtures пользователей: VIEW, CREATE, EDIT, APPROVALS_MANAGE, IMPORT_EXECUTE, DATABASE_PURGE, CUSTOM_FIELDS_MANAGE, admin; отдельные fixtures disabled/deleted user и stale JWT.
2. Добавить route-level helpers для вызова handlers с Request и моками/тестовой БД.
3. Добавить negative-first tests для всех P1 ниже.
4. В CI включить полный EPS набор; текущая команда `pnpm test` дает 169/169, но расширенный прямой EPS run дает 101/102 из-за уже упавшего completeness regex-теста. Сначала исправить тестовый контракт, а не маскировать fail.

**Приемка:** тесты действительно проверяют status response и состояние БД/файлов, а не только наличие строк; `tsc --noEmit` проходит.

### Этап 1. Немедленная защита прав и чтения

**1.1 Актуальные права сессии**

Файлы: `apps/web/src/lib/auth-guard.ts`, `packages/auth/src/rbac.ts`, auth tests.

- Различать: актуальный активный пользователь с пустыми правами, заблокированный/удаленный пользователь и ошибка БД.
- Не fallback-ить права из JWT после успешной проверки, вернувшей пустой набор.
- При ошибке получения актуальных прав для мутаций возвращать отказ, а не старый payload; явно определить допустимое поведение для read-only.

**Тесты:** блокировка после выдачи токена, снятие последнего права, удаление пользователя, DB error, admin token после деактивации.

**1.2 Согласования и переходы статусов**

Файлы: `api/eps/approvals/[id]/route.ts`, `api/eps/equipment/[id]/route.ts`, `api/eps/approvals/route.ts`, `ApprovalWizardDialog.tsx`.

- APPROVED/REJECTED разрешать только `EPS_APPROVALS_MANAGE`; отдельно запретить self-approval, если это политика предприятия.
- Ввести явную state-transition matrix: EDIT может сохранить DRAFT, но не публиковать его без approval.
- Унифицировать payload: для `STATUS_CHANGE` использовать типизированный `targetStatus`; валидировать его при POST и PATCH.
- CANCELLED принимать только из PENDING; примененное решение отменяется новой заявкой, не переписыванием истории.

**Тесты:** EDIT без MANAGE получает 403; DRAFT -> ACTIVE без заявки запрещен; wizard -> approve меняет status; malformed payload не создает ложную APPROVED-заявку; APPROVED -> CANCELLED отклонен.

**1.3 Чистый GET custom sections**

Файл: `api/eps/custom-sections/route.ts`.

- Убрать reset/migration из GET.
- Вынести bootstrap/migration в явную admin-only операцию с транзакцией, аудитом, lock/idempotency и политикой конфликтов canonical/alias.

**Тесты:** любой GET под VIEW не вызывает `create/update/delete`; migration запускается только admin endpoint.

### Этап 2. Атомарность, целостность и защита данных

**2.1 Approval resolver**

Файлы: `api/eps/approvals/[id]/route.ts`, `api/eps/equipment/[id]/route.ts`, Prisma schema/migrations.

- Хранить typed diff, `baseUpdatedAt`/версию и затронутые связи вместо полного устаревшего snapshot.
- Применять equipment, tags, approval status, audit и notifications в одной `$transaction`.
- Обновлять approval условием `status=PENDING`, чтобы два решения дали только один успех.
- Валидировать FK/unique до destructive операций; поддержать явную семантику `null` и удаления JSON-ключей.

**Тесты:** FK/unique failure полностью откатывает теги и equipment; параллельные решения; stale version conflict; очистка даты/custom field; полный audit diff.

**2.2 Импорт**

Файл: `api/eps/import/execute/route.ts` плюс `analyze/route.ts`.

- Разделить authorization по фактической операции: `FULL_REPLACE` требует PURGE, existing update требует EDIT/approval policy, definitions требуют CUSTOM_FIELDS_MANAGE.
- `FULL_REPLACE` сделать явно destructive с preview/count и post-commit cleanup вложений; не удалять всё только по boolean confirmation.
- Для UPSERT строить PATCH только из явно присутствующих колонок; fallback name только CREATE; не менять status без входного значения.
- Развести namespaces primary key/external/inventory/serial; дубликаты считать конфликтом; обновлять индекс после каждой строки или сделать уникальный DB key.
- Полностью валидировать status/date, лимиты rows/cells/bytes и rate limit analyze.

**Тесты:** permission matrix без DB writes, partial import сохраняет старые name/status, collision cases, duplicate external ID, idempotent re-import, all enum values, invalid date/status, oversized workbook.

**2.3 Вложения и storage**

Файлы: `lib/storage.ts`, `api/files/[...path]/route.ts`, documents/photos routes, purge route.

- Экспортировать единый `UPLOAD_ROOT`/safe resolver; проверять `path.relative` и symlink/realpath.
- Скачать можно только при EPS document/photo permission и существующей DB-связи с допустимым объектом.
- До записи файла валидировать docType и parent; при DB failure выполнять компенсационную очистку.
- Удалять DB-связь в транзакции, физическую очистку выполнять post-commit job/queue с retry и повторной проверкой ссылок.
- Nested DELETE фильтровать по `id + equipmentId`; primary photo менять атомарно и сериализованно.

**Тесты:** соседний root prefix, `..`, symlink, STORAGE_LOCAL_DIR, no-EPS permission, orphan path, invalid enum no file write, parent mismatch 404, unlink failure, shared file concurrency, concurrent primary upload.

### Этап 3. Контракт данных и отчеты

Файлы: `eps-query-builder.ts`, `eps-helpers.ts`, `EquipmentFilterTypes.ts`, filter components, `reports/generate`, templates route/history routes.

1. Создать единый registry фильтров: UI key, URL key, Prisma expression, client display label, supported scope.
2. Реализовать или убрать wear/calibration и все dynamic filters; один builder используется для registry и batch preview.
3. Вынести completeness predicate на основе configured required fields в общий server-side service; UI/grid/API используют тот же результат.
4. Добавить `deletedAt: null` во все EPS выборки, если soft delete остается; ограничить report `limit` и выбирать только требуемые relations/columns.
5. В templates DELETE добавить `module='eps'` и актуальную permission check.
6. Заменить client-side сортировку журналов серверной сортировкой до pagination; неизвестное поле должно давать 400 или быть скрыто UI, а не молча сортировать по updatedAt.

**Тесты:** round-trip каждого фильтра, completeness fixture с required custom field, сортировка на границе страниц, report soft-delete/limit, cross-module template denial.

### Этап 4. UI/UX и доступность

**4.1 Реестр, batch и фильтры**

Файлы: `eps/page.tsx`, `EquipmentBatchEditDialog.tsx`, `EquipmentColumnFiltersRow.tsx`, `EquipmentFilterDrawer.tsx`.

- Использовать один ordered columns model для header/filter/cells.
- Синхронизировать effective page size grid/table и paginator; обеспечить все записи.
- Preview batch привязывать к immutable params hash; инвалидировать при любом изменении, игнорировать stale responses, запретить apply без актуального preview. `SELECTED=[]` валидировать как 400.
- Выбрать модель selection: page-local или cross-page; для cross-page export/print передавать выбранные IDs на сервер.
- Исправить CSV/XLSX label и nullish handling, чтобы `0` не превращался в `—`.

**4.2 Паспорт, заявки, МОЛ**

Файлы: `eps/[id]/page.tsx`, `EquipmentWizardForm.tsx`, `ResponsibleUserSelect.tsx`, `ApprovalWizardDialog.tsx`.

- Использовать строковые tab keys, синхронизировать URL/back/reload и удалить мертвый `handleTabChange` после теста.
- Разделить loading/error/not-found/forbidden и добавить retry/выход.
- Сбрасывать draft при cancel/open, блокировать duplicate submit.
- Хранить displayName/id/login атомарно: ручное имя очищает связь; quick dialog инициализирует текущего пользователя.
- Серверный debounced search вместо первых 300/100 записей; выбранный ID сохраняется вне списка результатов.
- Устранить два источника истины для базовых полей в wizard.

**4.3 Request races и a11y**

- Во всех registry/journal/report loads использовать AbortController/request sequence guard; stale response не меняет rows/count/loading/error.
- Заменить clickable Card/TableRow на доступную ссылку/кнопку; checkbox не должен открывать паспорт.
- Связать labels с inputs через `label`/`aria-labelledby`; добавить RTL/a11y tests.
- Использовать `ConfirmDialog`, `DataTableWrapper`, palette tokens; убрать локальные status pills и hardcoded hex.

**Acceptance:** Playwright/RTL сценарии для B→A responses, pagination, deep links, keyboard navigation, cancel/reopen, duplicate click, MOL transitions, mobile/desktop smoke.

### Этап 5. Декомпозиция и удаление мертвого кода

1. Разделить giant pages на data hooks, query/command services и presentational sections, сохраняя route contracts.
2. Сначала вынести API clients/validation/normalizers; затем handlers `handleUploadSubmit`, `handleProcessReview`, `handleDeleteDoc` и repeated sorting/filter logic.
3. Удалить `matchesAllEquipmentFilters` и вспомогательные client-only paths только после подтверждения grep + runtime tests, либо сделать их единственным local filtering path.
4. Удалить старый approval submit flow и `handleTabChange` после E2E coverage.
5. Исправить completeness regex test и заменить source-text assertions на behavior tests.

**Приемка:** `tsc --noEmit`, lint, полный unit/integration/E2E набор; страницы не превышают проектный лимит без обоснованного ADR; каждый удаленный handler имеет заменяющий test-covered flow.

## 4. Предлагаемая нарезка коммитов

1. `test: add EPS route authorization and rollback fixtures`
2. `fix: enforce current EPS permissions and approval transitions`
3. `fix: make EPS approvals and audit atomic`
4. `fix: secure EPS import authorization and upsert identity`
5. `fix: make EPS document and photo storage transactional`
6. `fix: unify EPS filters completeness and report scope`
7. `fix: correct EPS pagination selection and request races`
8. `fix: repair EPS approval passport and responsible user flows`
9. `test: replace EPS source assertions with behavior coverage`
10. `refactor: split EPS pages and remove dead handlers`

Каждый коммит должен проходить относящиеся к нему тесты; объединять коммиты допускается только после review, если проект использует squash workflow.

## 5. Проверка результата

Минимальный release gate для EPS:

```bash
pnpm --filter @ems/web exec tsc --noEmit --incremental false
pnpm test
pnpm exec tsx --test packages/auth/src/eps.test.ts apps/web/src/lib/__tests__/eps-*.test.ts
```

Дополнительно при наличии тестовой БД:

```bash
pnpm --filter @ems/web exec playwright test --grep EPS
```

До исправлений зафиксировано: `pnpm test` — 169/169 pass; расширенный прямой EPS run — 101/102 pass из-за теста `eps-completeness.test.ts:127-136`, который ожидает устаревшую строку label. `tsc --noEmit --incremental false` проходит. DB-интеграционные и браузерные проверки в аудите не выполнялись и обязательны перед закрытием P1/P2.

## 6. Вопросы, которые нужно решить до реализации

1. Должна ли `STATUS_CHANGE` требовать отдельного approval для каждого перехода или только для публикации/списания?
2. Является ли batch edit привилегированным обходом approval или все status/critical fields должны идти через approval?
3. Должна ли привязка документа «по модели/децимальному номеру» быть постоянной для будущего оборудования или это разовое распространение?
4. Для выбора между страницами нужна page-local или cross-page семантика; план выше предполагает cross-page только если это уже обещано UI.
5. Разрешено ли удалять собственные EPS report templates после отзыва `EPS_REPORTS_MANAGE`?
