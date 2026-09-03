# Целевая архитектура платформы EMS Platform

## 1. Концепция: Microkernel + Event-Driven Plugin Architecture

Архитектура системы строится на паттерне **микроядра (Microkernel)** с четким разделением на:
1. **Core Shell (Ядро платформы):** Минимальный, стабильный фундамент, отвечающий за безопасность, маршрутизацию, реестр компонентов и обмен сообщениями.
2. **Core Extensions (Расширения ядра):** Технические плагины, подключаемые к интерфейсам поставщиков услуг (SPI — Service Provider Interfaces) ядра.
3. **Business Modules (Бизнес-модули):** Автономные функциональные единицы, реализующие предметную логику предприятия и взаимодействующие исключительно асинхронно через шину событий.

```
+-----------------------------------------------------------------------------------------+
|                                    UI APP SHELL                                         |
|  - Host Navigation & Header                                                             |
|  - Dynamic Module Navigation Mounting (Slot Architecture)                               |
|  - Theme Registry & Shared Design Tokens                                                |
+--------------------------------------------+--------------------------------------------+
                                             | HTTP / WebSocket
+--------------------------------------------v--------------------------------------------+
|                                  CORE SHELL RUNTIME                                     |
|  +---------------------------+  +--------------------------+  +----------------------+  |
|  | Module Lifecycle Manager  |  |   Security & RBAC Guard  |  |   Service Registry   |  |
|  +---------------------------+  +--------------------------+  +----------------------+  |
|  +-----------------------------------------------------------------------------------+  |
|  |                      Pluggable Event Bus Engine (@platform/contracts)             |  |
|  |             In-Memory Dispatcher / Redis Streams Bridge / Outbox Poller           |  |
|  +-----------------------------------------------------------------------------------+  |
+---------------------+-------------------------------+-----------------------------------+
                      |                               |
        +-------------v-------------+   +-------------v-------------+
        |      Core Extensions      |   |     Business Modules      |
        |    (SPI Implementation)   |   |   (Event Bus Producers &  |
        |                           |   |        Consumers)         |
        +---------------------------+   +---------------------------+
        | - Auth: LDAP / ActiveDir  |   | - EPS: Паспорта активов   |
        | - Storage: MinIO / S3     |   | - WMS: Складской учет     |
        | - Audit: Syslog / SIEM    |   | - MRO: Графики и ТОиР     |
        | - Sync: Jira / ERP        |   | - PRM: Заявки и закупки   |
        +---------------------------+   +---------------------------+
                      |                               |
        +-------------v-------------+   +-------------v-------------+
        |     System DB Schema      |   |   Isolated Module Schemas |
        |  `core.users`, `core.rbac`|   |   `eps.*`, `wms.*`,       |
        |  `core.audit_log`         |   |   `mro.*`, `prm.*`        |
        +---------------------------+   +---------------------------+
```

---

## 2. Спецификация Core Shell (Ядро платформы)

Ядро не содержит предметного кода и реализует следующие подсистемы:

### 2.1. Менеджер жизненного цикла модулей (Module Lifecycle Manager)
Каждый модуль декларирует манифест [`module.json`](architecture-migration-plan/01-target-architecture.md:46) и класс инициализации, реализующий интерфейс:

```typescript
export interface IModuleBootstrap {
  readonly id: string;
  readonly version: string;
  readonly dependencies?: string[];
  
  onInit(context: IPlatformContext): Promise<void>;
  onStart(): Promise<void>;
  onStop(): Promise<void>;
}
```

Контекст [`IPlatformContext`](architecture-migration-plan/01-target-architecture.md:58) передает модулю доступ к:
* Экземпляру шины сообщений [`IEventBus`](packages/shared/src/types.ts:1).
* Реестру навигационных пунктов (для интеграции меню в UI Shell).
* Сервису проверки разрешений пользователя ([`IPermissionChecker`](packages/shared/src/permissions.ts:1)).
* Изолированному подключению к БД для схемы модуля.

### 2.2. Ролевая модель доступа (Security & RBAC Guard)
* Централизованное управление учетными записями, ролями и маппингом прав.
* Каждый модуль регистрирует свои права доступа при старте в формате: `<module>:<resource>:<action>` (например: `wms:stock:transfer`, `mro:schedule:approve`, `eps:equipment:delete`).
* Ядро гарантирует, что HTTP-запрос к API модуля проходит проверку прав до передачи управления в контроллер модуля.

---

## 3. Спецификация Business Modules (Бизнес-модули)

### 3.1. Принцип строгой изоляции
1. **Запрет прямых вызовов:** Модуль `module-wms` не имеет права импортировать классы, сервисы или файлы из `module-eps`.
2. **Запрет общих таблиц:** Модули не разделяют таблицы в БД. Внешние ключи (Foreign Keys) между схемами разных модулей запрещены на уровне СУБД.
3. **Локальная репликация через события:** Если модулю `WMS` необходимо знать инвентарный номер и статус оборудования из `EPS`, он слушает события `eps.equipment.created` / `eps.equipment.updated` и сохраняет проекцию минимально необходимых данных в своей локальной таблице `wms_equipment_references`.

### 3.2. Манифест бизнес-модуля (`module.manifest.json`)
```json
{
  "$schema": "https://ems-platform.local/schemas/module-manifest.v1.json",
  "id": "module-wms",
  "name": "Warehouse Management System",
  "version": "1.0.0",
  "entrypoint": "./dist/index.js",
  "database": {
    "schema": "wms",
    "migrations": "./migrations"
  },
  "permissions": [
    "wms:stock:read",
    "wms:stock:write",
    "wms:transfer:execute",
    "wms:inventory:reconcile"
  ],
  "events": {
    "publishes": [
      "wms.stock.reserved",
      "wms.stock.issued",
      "wms.stock.depleted"
    ],
    "subscribes": [
      "prm.order.received",
      "mro.spare_parts.requested"
    ]
  },
  "navigation": [
    {
      "id": "wms-root",
      "title": "Складской учет",
      "path": "/wms",
      "permission": "wms:stock:read",
      "icon": "WarehouseIcon"
    }
  ]
}
```

---

## 4. Спецификация Core Extensions (Расширения ядра)

Расширения предназначены для замены или модификации инфраструктурных механизмов ядра.

### 4.1. Доступные точки расширения (Extension Points / SPI)

1. **`IAuthProvider` (Аутентификация):**
   * Расширяет логику входа. Базовый провайдер: локальная база паролей (argon2id).
   * Расширения: `ext-auth-ldap` (Active Directory), `ext-auth-oidc` (Keycloak/SAML).
2. **`IStorageProvider` (Хранилище файлов):**
   * Базовый провайдер: локальная файловая система.
   * Расширения: `ext-storage-s3` (MinIO, Ceph, AWS S3).
3. **`IAuditLogger` (Журналирование безопасности):**
   * Базовый провайдер: системная таблица БД `core.audit_log`.
   * Расширения: `ext-audit-syslog` (RFC 5424), отправка в OpenSearch/ELK.
4. **`ITicketSyncProvider` (Интеграция с трекерами):**
   * Расширения: `ext-jira-sync` (двусторонняя синхронизация инцидентов и ТОиР).

---

## 5. Спецификация шины сообщений (Event Bus)

### 5.1. Структура конверта события (Event Envelope)
Каждое сообщение, передаваемое через шину, валидируется Zod-схемой из `@platform/contracts`:

```typescript
export interface DomainEventEnvelope<T = unknown> {
  id: string;              // UUID v4
  type: string;            // 'domain.entity.action', например 'wms.stock.issued'
  producer: string;        // ID модуля-отправителя, например 'module-wms'
  timestamp: string;       // ISO 8601 UTC
  correlationId: string;   // Для трассировки цепочек вызовов
  version: number;         // Версия схемы payload события (начиная с 1)
  payload: T;              // Типизированные полезные данные
}
```

### 5.2. Реализация шины для нагрузки в 50 пользователей
1. **Базовый режим (Embedded In-Process Bus):**
   * Асинхронный диспетчер внутри процесса Node.js на базе `EventEmitter2` / каналов памяти.
   * Полная изоляция ошибок: падение одного подписчика перехватывается и логируется, не прерывая выполнение отправителя и других подписчиков.
2. **Гарантия надежности (Transactional Outbox Pattern):**
   * При фиксации бизнес-операции модуль сохраняет событие в таблицу `outbox` в рамках той же транзакции БД, что и бизнес-данные.
   * Фоновый воркер ядра вычитывает неподтвержденные события и отправляет их в шину, гарантируя доставку **At Least Once**.
3. **Идемпотентность на стороне подписчиков:**
   * Каждый модуль ведет локальную таблицу `processed_events (event_id, processed_at)` для защиты от дублирования сообщений.

---

## 6. Топология базы данных PostgreSQL

Для системы из 50 пользователей создается единый кластер PostgreSQL с разделением схем данных:

| Схема | Владелец | Описание |
|---|---|---|
| `core` | Core Shell | Пользователи, роли, сессии, зарегистрированные модули, системный аудит |
| `eps` | `module-eps` | Паспорта оборудования, узлы, классификаторы, нормативные документы |
| `wms` | `module-wms` | Номенклатура, склады, ячейки, партии, движения, инвентаризация |
| `mro` | `module-mro` | Графики ТОиР, периодические регламенты, наряды, фиксация простоев |
| `prm` | `module-prm` | Заявки на закупку, потребности, согласования, поставки |

Такая топология обеспечивает:
* Полную логическую изоляцию данных.
* Возможность выноса любой схемы в отдельную физическую БД без переписывания SQL-запросов модуля.
* Простоту единого резервного копирования для администратора.
