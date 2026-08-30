import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApprovalStatus, ApprovalType } from '@ems/database';
import {
  buildApprovalStats,
  buildApprovalWhereInput,
  parseApprovalListQuery,
} from './get-query';

test('parses approval list pagination and trimmed filters', () => {
  const query = parseApprovalListQuery(new URLSearchParams({
    page: '0',
    pageSize: '500',
    status: ' PENDING ',
    type: ' PARAMETER_CHANGE ',
    equipmentId: ' eq-1 ',
    search: ' pump ',
    scope: 'my_requests',
  }));

  assert.deepEqual(query, {
    page: 1,
    pageSize: 100,
    status: 'PENDING',
    type: 'PARAMETER_CHANGE',
    equipmentId: 'eq-1',
    search: 'pump',
    scope: 'my_requests',
  });
});

test('builds scoped approval filters and ignores invalid enum values', () => {
  const where = buildApprovalWhereInput({
    status: ApprovalStatus.PENDING,
    type: ApprovalType.PARAMETER_CHANGE,
    equipmentId: 'eq-1',
    search: 'pump',
    scope: 'my_requests',
  }, 'user-1');

  assert.deepEqual(where, {
    equipmentId: 'eq-1',
    status: ApprovalStatus.PENDING,
    type: ApprovalType.PARAMETER_CHANGE,
    requesterId: 'user-1',
    OR: [
      { title: { contains: 'pump', mode: 'insensitive' } },
      { description: { contains: 'pump', mode: 'insensitive' } },
      {
        equipment: {
          OR: [
            { name: { contains: 'pump', mode: 'insensitive' } },
            { inventoryNumber: { contains: 'pump', mode: 'insensitive' } },
            { serialNumber: { contains: 'pump', mode: 'insensitive' } },
            { manufacturer: { contains: 'pump', mode: 'insensitive' } },
          ],
        },
      },
    ],
  });

  assert.deepEqual(buildApprovalWhereInput({
    status: 'INVALID',
    type: 'INVALID',
    equipmentId: '',
    search: '',
    scope: 'to_review',
  }, 'user-1'), { status: 'PENDING' });
});

test('builds approval statistics for all, review, and own scopes', () => {
  const allApprovals = [
    { status: 'PENDING' },
    { status: 'APPROVED' },
    { status: 'REJECTED' },
    { status: 'CANCELLED' },
  ];
  const userApprovals = [{ status: 'PENDING' }, { status: 'REJECTED' }];

  assert.deepEqual(buildApprovalStats(allApprovals, userApprovals, 'all', true), {
    total: 4,
    pending: 1,
    approved: 1,
    rejected: 1,
    cancelled: 1,
    toReview: 1,
    myRejected: 1,
    myPending: 1,
    actionableCount: 2,
  });

  assert.equal(buildApprovalStats(allApprovals, userApprovals, 'to_review', false).total, 1);
  assert.equal(buildApprovalStats(allApprovals, userApprovals, 'my_requests', true).total, 2);
});
