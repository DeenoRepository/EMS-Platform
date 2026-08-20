import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hasPermission } from './rbac';
import { JwtUserPayload, PERMISSIONS, EQUIPMENT_STATUS_MAP, APPROVAL_STATUS_MAP } from '@ems/shared';
import { EquipmentStatus, ApprovalStatus, ApprovalType, DocumentType } from '@ems/database';

describe('EPS Domain Logic, RBAC & State Machine', () => {
  // ─── 1. RBAC & Security for EPS Module ───
  describe('EPS Role-Based Access Control', () => {
    const operatorUser: JwtUserPayload = {
      userId: 'op-1',
      ldapLogin: 'operator.ivanov',
      displayName: 'Иванов И.И. (Оператор)',
      roles: ['operator'],
      permissions: [PERMISSIONS.EPS_EQUIPMENT_VIEW],
    };

    const engineerUser: JwtUserPayload = {
      userId: 'eng-1',
      ldapLogin: 'engineer.sidorov',
      displayName: 'Сидоров С.С. (Инженер)',
      roles: ['engineer'],
      permissions: [
        PERMISSIONS.EPS_EQUIPMENT_VIEW,
        PERMISSIONS.EPS_EQUIPMENT_CREATE,
        PERMISSIONS.EPS_EQUIPMENT_EDIT,
        PERMISSIONS.EPS_DOCUMENTS_UPLOAD,
        PERMISSIONS.EPS_APPROVALS_CREATE,
      ],
    };

    const chiefEngineerUser: JwtUserPayload = {
      userId: 'chief-1',
      ldapLogin: 'chief.petrov',
      displayName: 'Петров П.П. (Главный инженер)',
      roles: ['chief_engineer'],
      permissions: [
        PERMISSIONS.EPS_EQUIPMENT_VIEW,
        PERMISSIONS.EPS_EQUIPMENT_CREATE,
        PERMISSIONS.EPS_EQUIPMENT_EDIT,
        PERMISSIONS.EPS_EQUIPMENT_DELETE,
        PERMISSIONS.EPS_DOCUMENTS_UPLOAD,
        PERMISSIONS.EPS_APPROVALS_CREATE,
        PERMISSIONS.EPS_APPROVALS_MANAGE,
        PERMISSIONS.EPS_CUSTOM_FIELDS_MANAGE,
        PERMISSIONS.EPS_IMPORT_EXECUTE,
        PERMISSIONS.EPS_REPORTS_MANAGE,
      ],
    };

    test('Operator can view equipment but cannot create or edit', () => {
      assert.strictEqual(hasPermission(operatorUser, PERMISSIONS.EPS_EQUIPMENT_VIEW), true);
      assert.strictEqual(hasPermission(operatorUser, PERMISSIONS.EPS_EQUIPMENT_CREATE), false);
      assert.strictEqual(hasPermission(operatorUser, PERMISSIONS.EPS_EQUIPMENT_EDIT), false);
      assert.strictEqual(hasPermission(operatorUser, PERMISSIONS.EPS_APPROVALS_MANAGE), false);
    });

    test('Engineer can create and edit equipment and submit approvals, but cannot delete or manage approval decisions', () => {
      assert.strictEqual(hasPermission(engineerUser, PERMISSIONS.EPS_EQUIPMENT_CREATE), true);
      assert.strictEqual(hasPermission(engineerUser, PERMISSIONS.EPS_EQUIPMENT_EDIT), true);
      assert.strictEqual(hasPermission(engineerUser, PERMISSIONS.EPS_DOCUMENTS_UPLOAD), true);
      assert.strictEqual(hasPermission(engineerUser, PERMISSIONS.EPS_APPROVALS_CREATE), true);
      assert.strictEqual(hasPermission(engineerUser, PERMISSIONS.EPS_APPROVALS_MANAGE), false);
      assert.strictEqual(hasPermission(engineerUser, PERMISSIONS.EPS_EQUIPMENT_DELETE), false);
    });

    test('Chief Engineer has full management permissions over equipment lifecycle, custom fields and approvals', () => {
      assert.strictEqual(hasPermission(chiefEngineerUser, PERMISSIONS.EPS_EQUIPMENT_DELETE), true);
      assert.strictEqual(hasPermission(chiefEngineerUser, PERMISSIONS.EPS_APPROVALS_MANAGE), true);
      assert.strictEqual(hasPermission(chiefEngineerUser, PERMISSIONS.EPS_CUSTOM_FIELDS_MANAGE), true);
      assert.strictEqual(hasPermission(chiefEngineerUser, PERMISSIONS.EPS_IMPORT_EXECUTE), true);
    });
  });

  // ─── 2. Equipment Approval State Machine & Workflow ───
  describe('Equipment Approval Resolution Engine', () => {
    interface MockEquipment {
      id: string;
      name: string;
      status: EquipmentStatus;
      commissionDate: Date | null;
      customFields: Record<string, any>;
    }

    interface MockApproval {
      id: string;
      equipmentId: string;
      type: ApprovalType;
      status: ApprovalStatus;
      requesterId: string;
      reviewerId: string | null;
      resolutionComment: string | null;
      proposedData?: any;
    }

    function processApprovalDecision(
      approval: MockApproval,
      equipment: MockEquipment,
      user: JwtUserPayload,
      decision: ApprovalStatus,
      resolutionComment?: string
    ) {
      if (approval.status !== 'PENDING' && decision !== 'CANCELLED') {
        throw new Error('Решение по этой заявке уже было принято');
      }

      if (decision === 'CANCELLED') {
        if (approval.requesterId !== user.userId && !hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE)) {
          throw new Error('Отменить заявку может только её инициатор или уполномоченный руководитель');
        }
      } else {
        if (!hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE) && !hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_EDIT)) {
          throw new Error('Недостаточно прав для согласования заявки');
        }
      }

      const updatedEquipment = { ...equipment };
      const updatedApproval: MockApproval = {
        ...approval,
        status: decision,
        reviewerId: decision === 'CANCELLED' ? approval.reviewerId : user.userId,
        resolutionComment: resolutionComment || null,
      };

      if (decision === 'APPROVED') {
        if (approval.type === 'COMMISSIONING') {
          updatedEquipment.status = 'ACTIVE';
          if (!updatedEquipment.commissionDate) {
            updatedEquipment.commissionDate = new Date();
          }
        } else if (approval.type === 'DECOMMISSIONING') {
          updatedEquipment.status = 'DECOMMISSIONED';
        } else if (approval.type === 'STATUS_CHANGE' && approval.proposedData?.targetStatus) {
          updatedEquipment.status = approval.proposedData.targetStatus;
        } else if (approval.type === 'PARAMETER_CHANGE' && approval.proposedData?.customFields) {
          updatedEquipment.customFields = {
            ...updatedEquipment.customFields,
            ...approval.proposedData.customFields,
          };
        }
      }

      return { updatedApproval, updatedEquipment };
    }

    test('Approving COMMISSIONING request transitions equipment to ACTIVE and sets commissionDate', () => {
      const equipment: MockEquipment = {
        id: 'eq-1',
        name: 'Насос 1',
        status: 'IN_STORAGE',
        commissionDate: null,
        customFields: {},
      };
      const approval: MockApproval = {
        id: 'appr-1',
        equipmentId: 'eq-1',
        type: 'COMMISSIONING',
        status: 'PENDING',
        requesterId: 'eng-1',
        reviewerId: null,
        resolutionComment: null,
      };
      const chief: JwtUserPayload = {
        userId: 'chief-1',
        ldapLogin: 'chief.petrov',
        displayName: 'Петров П.П.',
        roles: ['chief_engineer'],
        permissions: [PERMISSIONS.EPS_APPROVALS_MANAGE],
      };

      const result = processApprovalDecision(approval, equipment, chief, 'APPROVED', 'Согласовано ввод в эксплуатацию');
      assert.strictEqual(result.updatedApproval.status, 'APPROVED');
      assert.strictEqual(result.updatedApproval.reviewerId, 'chief-1');
      assert.strictEqual(result.updatedEquipment.status, 'ACTIVE');
      assert.ok(result.updatedEquipment.commissionDate instanceof Date);
    });

    test('Approving DECOMMISSIONING request transitions equipment to DECOMMISSIONED', () => {
      const equipment: MockEquipment = {
        id: 'eq-2',
        name: 'Трансформатор Т-100',
        status: 'ACTIVE',
        commissionDate: new Date('2020-01-01'),
        customFields: {},
      };
      const approval: MockApproval = {
        id: 'appr-2',
        equipmentId: 'eq-2',
        type: 'DECOMMISSIONING',
        status: 'PENDING',
        requesterId: 'eng-1',
        reviewerId: null,
        resolutionComment: null,
      };
      const chief: JwtUserPayload = {
        userId: 'chief-1',
        ldapLogin: 'chief.petrov',
        displayName: 'Петров П.П.',
        roles: ['chief_engineer'],
        permissions: [PERMISSIONS.EPS_APPROVALS_MANAGE],
      };

      const result = processApprovalDecision(approval, equipment, chief, 'APPROVED', 'Выработало ресурс');
      assert.strictEqual(result.updatedApproval.status, 'APPROVED');
      assert.strictEqual(result.updatedEquipment.status, 'DECOMMISSIONED');
    });

    test('Approving PARAMETER_CHANGE merges proposed custom fields', () => {
      const equipment: MockEquipment = {
        id: 'eq-3',
        name: 'Компрессор К-1',
        status: 'ACTIVE',
        commissionDate: new Date('2022-05-10'),
        customFields: { power_kw: 45, max_pressure: 10 },
      };
      const approval: MockApproval = {
        id: 'appr-3',
        equipmentId: 'eq-3',
        type: 'PARAMETER_CHANGE',
        status: 'PENDING',
        requesterId: 'eng-1',
        reviewerId: null,
        resolutionComment: null,
        proposedData: { customFields: { max_pressure: 12, cooling_type: 'WATER' } },
      };
      const chief: JwtUserPayload = {
        userId: 'chief-1',
        ldapLogin: 'chief.petrov',
        displayName: 'Петров П.П.',
        roles: ['chief_engineer'],
        permissions: [PERMISSIONS.EPS_APPROVALS_MANAGE],
      };

      const result = processApprovalDecision(approval, equipment, chief, 'APPROVED');
      assert.strictEqual(result.updatedEquipment.customFields.power_kw, 45);
      assert.strictEqual(result.updatedEquipment.customFields.max_pressure, 12);
      assert.strictEqual(result.updatedEquipment.customFields.cooling_type, 'WATER');
    });

    test('Rejecting request leaves equipment unchanged and records resolution comment', () => {
      const equipment: MockEquipment = {
        id: 'eq-4',
        name: 'Станок ЧПУ',
        status: 'ACTIVE',
        commissionDate: new Date('2023-01-01'),
        customFields: {},
      };
      const approval: MockApproval = {
        id: 'appr-4',
        equipmentId: 'eq-4',
        type: 'DECOMMISSIONING',
        status: 'PENDING',
        requesterId: 'eng-1',
        reviewerId: null,
        resolutionComment: null,
      };
      const chief: JwtUserPayload = {
        userId: 'chief-1',
        ldapLogin: 'chief.petrov',
        displayName: 'Петров П.П.',
        roles: ['chief_engineer'],
        permissions: [PERMISSIONS.EPS_APPROVALS_MANAGE],
      };

      const result = processApprovalDecision(approval, equipment, chief, 'REJECTED', 'Отклонено: требуется дефектовочная ведомость');
      assert.strictEqual(result.updatedApproval.status, 'REJECTED');
      assert.strictEqual(result.updatedApproval.resolutionComment, 'Отклонено: требуется дефектовочная ведомость');
      assert.strictEqual(result.updatedEquipment.status, 'ACTIVE');
    });

    test('Requester can cancel their own pending approval request', () => {
      const equipment: MockEquipment = {
        id: 'eq-5',
        name: 'Станок',
        status: 'ACTIVE',
        commissionDate: new Date(),
        customFields: {},
      };
      const approval: MockApproval = {
        id: 'appr-5',
        equipmentId: 'eq-5',
        type: 'STATUS_CHANGE',
        status: 'PENDING',
        requesterId: 'eng-1',
        reviewerId: null,
        resolutionComment: null,
      };
      const requester: JwtUserPayload = {
        userId: 'eng-1',
        ldapLogin: 'engineer.sidorov',
        displayName: 'Сидоров С.С.',
        roles: ['engineer'],
        permissions: [PERMISSIONS.EPS_APPROVALS_CREATE],
      };

      const result = processApprovalDecision(approval, equipment, requester, 'CANCELLED', 'Ошибочная заявка');
      assert.strictEqual(result.updatedApproval.status, 'CANCELLED');
    });

    test('Unauthorized user cannot resolve approval requests', () => {
      const equipment: MockEquipment = {
        id: 'eq-6',
        name: 'Вентилятор',
        status: 'ACTIVE',
        commissionDate: new Date(),
        customFields: {},
      };
      const approval: MockApproval = {
        id: 'appr-6',
        equipmentId: 'eq-6',
        type: 'DECOMMISSIONING',
        status: 'PENDING',
        requesterId: 'eng-1',
        reviewerId: null,
        resolutionComment: null,
      };
      const operator: JwtUserPayload = {
        userId: 'op-1',
        ldapLogin: 'op.ivanov',
        displayName: 'Иванов И.И.',
        roles: ['operator'],
        permissions: [PERMISSIONS.EPS_EQUIPMENT_VIEW],
      };

      assert.throws(() => {
        processApprovalDecision(approval, equipment, operator, 'APPROVED');
      }, /Недостаточно прав/);
    });
  });

  // ─── 3. Smart Import Header Matching & Collision Resolution ───
  describe('Smart Import Column Matching & Collision Detection', () => {
    function normalizeHeader(str: string): string {
      return str
        .toLowerCase()
        .replace(/[*[\]()]/g, '')
        .trim();
    }

    const KNOWN_BASE_RULES = [
      { key: 'name', aliases: ['наименование оборудования', 'наименование', 'название', 'оборудование', 'name', 'title', 'equipment name'] },
      { key: 'inventoryNumber', aliases: ['инвентарный номер', 'инвентарный', 'инв. номер', 'инв номер', 'инв. №', 'инв №', 'инв.', 'инв', 'inventorynumber', 'inventory number', 'inv number', 'inv no'] },
      { key: 'serialNumber', aliases: ['заводской номер', 'серийный номер', 'заводской / серийный номер', 'зав. номер', 'зав. №', 'зав №', 'серийный', 'serialnumber', 'serial number', 'serial', 'sn'] },
      { key: 'manufacturer', aliases: ['производитель', 'изготовитель', 'бренд', 'завод-изготовитель', 'вендор', 'manufacturer', 'vendor', 'brand', 'make'] },
      { key: 'model', aliases: ['модель', 'модификация', 'модель / модификация', 'марка', 'тип оборудования', 'model', 'type'] },
      { key: 'location', aliases: ['место установки', 'локация', 'цех', 'участок', 'местоположение', 'помещение', 'location', 'site', 'placement'] },
    ];

    function matchColumn(header: string): string | null {
      const norm = normalizeHeader(header);
      const matched = KNOWN_BASE_RULES.find((rule) =>
        rule.aliases.some((alias) => norm === alias || norm.startsWith(alias) || alias.startsWith(norm))
      );
      return matched ? matched.key : null;
    }

    test('Successfully matches various Russian & English column header aliases', () => {
      assert.strictEqual(matchColumn('Инвентарный № [обязательно]'), 'inventoryNumber');
      assert.strictEqual(matchColumn('Наименование оборудования *'), 'name');
      assert.strictEqual(matchColumn('Заводской / серийный номер'), 'serialNumber');
      assert.strictEqual(matchColumn('Завод-изготовитель'), 'manufacturer');
      assert.strictEqual(matchColumn('Место установки (Цех/участок)'), 'location');
      assert.strictEqual(matchColumn('Model/Type'), 'model');
    });

    test('Detects database collisions by inventory number and flags row state', () => {
      const existingInventoryNumbers = new Set(['EQ-100', 'EQ-200']);
      const existingSerialNumbers = new Set(['SN-999']);

      function validateImportRow(row: { name?: string; inventoryNumber?: string; serialNumber?: string }) {
        if (!row.name || !row.name.trim()) {
          return { status: 'ERROR', message: 'Отсутствует наименование' };
        }
        if (row.inventoryNumber && existingInventoryNumbers.has(row.inventoryNumber.trim())) {
          return { status: 'COLLISION', message: `Совпадение по инв. № ${row.inventoryNumber}` };
        }
        if (row.serialNumber && existingSerialNumbers.has(row.serialNumber.trim())) {
          return { status: 'COLLISION', message: `Совпадение по серийному № ${row.serialNumber}` };
        }
        return { status: 'NEW', message: 'Готово к созданию' };
      }

      assert.strictEqual(validateImportRow({ name: 'Насос', inventoryNumber: 'EQ-100' }).status, 'COLLISION');
      assert.strictEqual(validateImportRow({ name: 'Компрессор', serialNumber: 'SN-999' }).status, 'COLLISION');
      assert.strictEqual(validateImportRow({ name: '', inventoryNumber: 'EQ-300' }).status, 'ERROR');
      assert.strictEqual(validateImportRow({ name: 'Новый станок', inventoryNumber: 'EQ-500' }).status, 'NEW');
    });
  });

  // ─── 4. File Storage & Security Rules ───
  describe('Document & Photo Storage Security', () => {
    const ALLOWED_DOC_EXTS = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.dwg', '.dxf', '.jpg', '.png']);
    const ALLOWED_PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

    function validateFileUpload(fileName: string, subFolder: 'documents' | 'photos', sizeBytes: number) {
      const ext = (fileName.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
      const allowed = subFolder === 'photos' ? ALLOWED_PHOTO_EXTS : ALLOWED_DOC_EXTS;
      const maxSize = subFolder === 'photos' ? 20 * 1024 * 1024 : 50 * 1024 * 1024;

      if (!allowed.has(ext)) {
        throw new Error(`Недопустимое расширение файла: ${ext}`);
      }
      if (sizeBytes > maxSize) {
        throw new Error('Превышен допустимый размер файла');
      }
      return true;
    }

    test('Allows valid engineering drawing and document formats', () => {
      assert.strictEqual(validateFileUpload('drawing.dwg', 'documents', 1024 * 1024), true);
      assert.strictEqual(validateFileUpload('passport.pdf', 'documents', 2 * 1024 * 1024), true);
      assert.strictEqual(validateFileUpload('photo.webp', 'photos', 500 * 1024), true);
    });

    test('Rejects dangerous and executable file extensions', () => {
      assert.throws(() => validateFileUpload('script.exe', 'documents', 100), /Недопустимое расширение/);
      assert.throws(() => validateFileUpload('payload.sh', 'documents', 100), /Недопустимое расширение/);
      assert.throws(() => validateFileUpload('malware.php', 'photos', 100), /Недопустимое расширение/);
      assert.throws(() => validateFileUpload('macro.bat', 'documents', 100), /Недопустимое расширение/);
    });

    test('Rejects files exceeding size limits', () => {
      assert.throws(() => validateFileUpload('large_photo.jpg', 'photos', 25 * 1024 * 1024), /Превышен допустимый размер/);
      assert.throws(() => validateFileUpload('huge_doc.pdf', 'documents', 60 * 1024 * 1024), /Превышен допустимый размер/);
    });
  });
});
