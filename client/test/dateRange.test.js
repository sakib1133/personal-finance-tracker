import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDateRangeWithinLimit,
  MAX_ANALYTICS_RANGE_DAYS
} from '../src/utils/dateRange.js';

test('client date range limit matches the API limit', () => {
  assert.equal(MAX_ANALYTICS_RANGE_DAYS, 367);
  assert.equal(isDateRangeWithinLimit('2023-03-01', '2024-03-01'), true);
  assert.equal(isDateRangeWithinLimit('2023-03-01', '2024-03-02'), false);
});
