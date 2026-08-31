import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildFeedbackQueryParams, countActiveFeedbackFilters, type FeedbackFilterState } from './feedback-filters';

const allFilters: FeedbackFilterState = {
  searchQuery: '',
  filterType: 'ALL',
  filterModule: 'ALL',
  filterStatus: 'ALL',
  filterPriority: 'ALL',
};

describe('feedback filter helpers', () => {
  test('counts only filters that deviate from ALL', () => {
    assert.equal(countActiveFeedbackFilters(allFilters), 0);
    assert.equal(countActiveFeedbackFilters({ ...allFilters, filterType: 'BUG' }), 1);
    assert.equal(
      countActiveFeedbackFilters({ ...allFilters, filterType: 'BUG', filterModule: 'EPS', filterStatus: 'OPEN' }),
      3,
    );
  });

  test('builds query params with pagination and only non-ALL/non-empty filters', () => {
    const params = buildFeedbackQueryParams(allFilters, 2, 25);
    assert.equal(params.get('limit'), '25');
    assert.equal(params.get('offset'), '50');
    assert.equal(params.has('type'), false);
    assert.equal(params.has('search'), false);
  });

  test('includes trimmed search and active filter values', () => {
    const params = buildFeedbackQueryParams(
      { searchQuery: '  pump  ', filterType: 'BUG', filterModule: 'ALL', filterStatus: 'OPEN', filterPriority: 'HIGH' },
      0,
      10,
    );
    assert.equal(params.get('search'), 'pump');
    assert.equal(params.get('type'), 'BUG');
    assert.equal(params.has('module'), false);
    assert.equal(params.get('status'), 'OPEN');
    assert.equal(params.get('priority'), 'HIGH');
  });
});
