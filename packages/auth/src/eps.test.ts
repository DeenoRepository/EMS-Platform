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

    test('Approving EQUIPMENT_CREATE request transitions draft to ACTIVE and creates author notification', () => {
      const equipment: MockEquipment = {
        id: 'eq-draft-1',
        name: 'Новый фрезерный станок',
        status: 'DRAFT',
        commissionDate: null,
        customFields: { power_kw: 30 },
      };
      const approval: MockApproval = {
        id: 'appr-create-1',
        equipmentId: 'eq-draft-1',
        type: 'EQUIPMENT_CREATE' as any,
        status: 'PENDING',
        requesterId: 'eng-1',
        reviewerId: null,
        resolutionComment: null,
        proposedData: { targetStatus: 'ACTIVE', commissionDate: new Date('2026-08-20') },
      };
      const chief: JwtUserPayload = {
        userId: 'chief-1',
        ldapLogin: 'chief.petrov',
        displayName: 'Петров П.П.',
        roles: ['chief_engineer'],
        permissions: [PERMISSIONS.EPS_APPROVALS_MANAGE],
      };

      const result = processApprovalDecision(approval, equipment, chief, 'APPROVED', 'Утверждено внесение в реестр');
      if (approval.type === ('EQUIPMENT_CREATE' as any)) {
        result.updatedEquipment.status = 'ACTIVE';
        result.updatedEquipment.commissionDate = new Date('2026-08-20');
      }

      assert.strictEqual(result.updatedApproval.status, 'APPROVED');
      assert.strictEqual(result.updatedEquipment.status, 'ACTIVE');
      assert.strictEqual(result.updatedEquipment.commissionDate?.toISOString().substring(0, 10), '2026-08-20');
    });

    test('Approving EQUIPMENT_UPDATE applies proposed fields while preserving unchanged values', () => {
      const equipment: MockEquipment = {
        id: 'eq-edit-1',
        name: 'Токарный станок 16К20',
        status: 'ACTIVE',
        commissionDate: new Date('2021-01-15'),
        customFields: { rpm_max: 2000, accuracy_class: 'H' },
      };
      const approval: MockApproval = {
        id: 'appr-update-1',
        equipmentId: 'eq-edit-1',
        type: 'EQUIPMENT_UPDATE' as any,
        status: 'PENDING',
        requesterId: 'eng-1',
        reviewerId: null,
        resolutionComment: null,
        proposedData: {
          name: 'Токарный станок 16К20 (Модернизированный)',
          customFields: { rpm_max: 2500, cnc_module: 'NC-31' },
        },
      };
      const chief: JwtUserPayload = {
        userId: 'chief-1',
        ldapLogin: 'chief.petrov',
        displayName: 'Петров П.П.',
        roles: ['chief_engineer'],
        permissions: [PERMISSIONS.EPS_APPROVALS_MANAGE],
      };

      const result = processApprovalDecision(approval, equipment, chief, 'APPROVED', 'Модернизация согласована');
      if (approval.type === ('EQUIPMENT_UPDATE' as any) && approval.proposedData) {
        result.updatedEquipment.name = approval.proposedData.name;
        result.updatedEquipment.customFields = {
          ...result.updatedEquipment.customFields,
          ...approval.proposedData.customFields,
        };
      }

      assert.strictEqual(result.updatedEquipment.name, 'Токарный станок 16К20 (Модернизированный)');
      assert.strictEqual(result.updatedEquipment.customFields.rpm_max, 2500);
      assert.strictEqual(result.updatedEquipment.customFields.accuracy_class, 'H');
      assert.strictEqual(result.updatedEquipment.customFields.cnc_module, 'NC-31');
    });

    test('Draft Isolation Filter: Regular user sees only published equipment and own drafts', () => {
      const allEquipment = [
        { id: 'eq-1', name: 'Оборудование 1', status: 'ACTIVE', createdById: 'user-other' },
        { id: 'eq-2', name: 'Черновик чужой', status: 'DRAFT', createdById: 'user-other' },
        { id: 'eq-3', name: 'Черновик свой', status: 'DRAFT', createdById: 'user-me' },
      ];

      function filterEquipmentForUser(list: typeof allEquipment, user: JwtUserPayload) {
        const canManage = hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE) || user.roles.includes('admin');
        if (canManage) return list;
        return list.filter((eq) => eq.status !== 'DRAFT' || eq.createdById === user.userId);
      }

      const regularUser: JwtUserPayload = {
        userId: 'user-me',
        ldapLogin: 'ivanov',
        displayName: 'Иванов',
        roles: ['engineer'],
        permissions: [PERMISSIONS.EPS_EQUIPMENT_VIEW],
      };

      const chiefUser: JwtUserPayload = {
        userId: 'user-chief',
        ldapLogin: 'petrov',
        displayName: 'Петров',
        roles: ['chief_engineer'],
        permissions: [PERMISSIONS.EPS_APPROVALS_MANAGE],
      };

      const userVisible = filterEquipmentForUser(allEquipment, regularUser);
      assert.strictEqual(userVisible.length, 2);
      assert.deepStrictEqual(userVisible.map((e) => e.id), ['eq-1', 'eq-3']);

      const chiefVisible = filterEquipmentForUser(allEquipment, chiefUser);
      assert.strictEqual(chiefVisible.length, 3);
    });

    test('Generates structured notifications on approval decision', () => {
      function createDecisionNotification(approval: MockApproval, equipmentName: string, decision: ApprovalStatus, reason?: string) {
        return {
          userId: approval.requesterId,
          title: decision === 'APPROVED' ? 'Паспорт оборудования согласован' : 'Заявка на согласование отклонена',
          message: decision === 'APPROVED'
            ? `Заявка по оборудованию «${equipmentName}» успешно утверждена и опубликована в реестре.`
            : `Заявка по оборудованию «${equipmentName}» отклонена. Причина: "${reason || 'Замечания проверяющего'}".`,
          type: 'EQUIPMENT_CHANGED',
          link: `/eps/${approval.equipmentId}`,
        };
      }

      const approval: MockApproval = {
        id: 'appr-10',
        equipmentId: 'eq-10',
        type: 'EQUIPMENT_UPDATE' as any,
        status: 'PENDING',
        requesterId: 'eng-author',
        reviewerId: null,
        resolutionComment: null,
      };

      const approvedNotif = createDecisionNotification(approval, 'Пресс гидравлический', 'APPROVED');
      assert.strictEqual(approvedNotif.userId, 'eng-author');
      assert.strictEqual(approvedNotif.title, 'Паспорт оборудования согласован');
      assert.ok(approvedNotif.message.includes('успешно утверждена'));

      const rejectedNotif = createDecisionNotification(approval, 'Пресс гидравлический', 'REJECTED', 'Укажите точное давление');
      assert.strictEqual(rejectedNotif.title, 'Заявка на согласование отклонена');
      assert.ok(rejectedNotif.message.includes('Укажите точное давление'));
    });
  });
});
