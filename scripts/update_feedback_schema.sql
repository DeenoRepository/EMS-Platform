-- ==============================================================================
-- EMS Platform — Миграция схемы базы данных: Система обратной связи (Feedback Hub)
-- ==============================================================================

-- 1. Создание перечислений (Enums)
DO $$ BEGIN
    CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'FEATURE_REQUEST', 'QUESTION', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackModule" AS ENUM ('EPS', 'WMS', 'SRM', 'MRO', 'ADMIN', 'GENERAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'IN_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'DUPLICATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Добавление типов системных уведомлений
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FEEDBACK_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FEEDBACK_STATUS_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FEEDBACK_REPLY';

-- 3. Создание таблицы FeedbackTicket
CREATE TABLE IF NOT EXISTS "FeedbackTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketNumber" TEXT NOT NULL UNIQUE,
    "type" "FeedbackType" NOT NULL DEFAULT 'BUG',
    "module" "FeedbackModule" NOT NULL DEFAULT 'GENERAL',
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pageUrl" TEXT,
    "browserInfo" JSONB,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "assignedToId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "FeedbackTicket_type_idx" ON "FeedbackTicket"("type");
CREATE INDEX IF NOT EXISTS "FeedbackTicket_module_idx" ON "FeedbackTicket"("module");
CREATE INDEX IF NOT EXISTS "FeedbackTicket_status_idx" ON "FeedbackTicket"("status");
CREATE INDEX IF NOT EXISTS "FeedbackTicket_priority_idx" ON "FeedbackTicket"("priority");
CREATE INDEX IF NOT EXISTS "FeedbackTicket_createdById_idx" ON "FeedbackTicket"("createdById");
CREATE INDEX IF NOT EXISTS "FeedbackTicket_assignedToId_idx" ON "FeedbackTicket"("assignedToId");
CREATE INDEX IF NOT EXISTS "FeedbackTicket_createdAt_idx" ON "FeedbackTicket"("createdAt");
CREATE INDEX IF NOT EXISTS "FeedbackTicket_deletedAt_idx" ON "FeedbackTicket"("deletedAt");

-- 4. Создание таблицы FeedbackComment
CREATE TABLE IF NOT EXISTS "FeedbackComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL REFERENCES "FeedbackTicket"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FeedbackComment_ticketId_idx" ON "FeedbackComment"("ticketId");
CREATE INDEX IF NOT EXISTS "FeedbackComment_userId_idx" ON "FeedbackComment"("userId");
CREATE INDEX IF NOT EXISTS "FeedbackComment_createdAt_idx" ON "FeedbackComment"("createdAt");

-- 5. Создание таблицы FeedbackAttachment
CREATE TABLE IF NOT EXISTS "FeedbackAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL REFERENCES "FeedbackTicket"("id") ON DELETE CASCADE,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FeedbackAttachment_ticketId_idx" ON "FeedbackAttachment"("ticketId");
CREATE INDEX IF NOT EXISTS "FeedbackAttachment_uploadedById_idx" ON "FeedbackAttachment"("uploadedById");

-- 6. Регистрация нового права доступа
INSERT INTO "Permission" ("id", "code", "displayName", "module", "description")
VALUES (
    'perm_admin_feedback_manage',
    'admin.feedback.manage',
    'Центр обратной связи и техподдержки',
    'admin',
    'Просмотр всех обращений, модерация, смена статусов, назначение ответственных и переписка'
)
ON CONFLICT ("code") DO NOTHING;

-- Выдача права роли admin
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r.name = 'admin' AND p.code = 'admin.feedback.manage'
ON CONFLICT DO NOTHING;
