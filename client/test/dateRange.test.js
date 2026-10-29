import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getIndiaDateString,
  getIndiaMonthKey,
  isDateRangeWithinLimit,
  MAX_ANALYTICS_RANGE_DAYS
} from '../src/utils/dateRange.js';

test('client date range limit matches the API limit', () => {
  assert.equal(MAX_ANALYTICS_RANGE_DAYS, 367);
  assert.equal(isDateRangeWithinLimit('2023-03-01', '2024-03-01'), true);
  assert.equal(isDateRangeWithinLimit('2023-03-01', '2024-03-02'), false);
});

test('date and month boundaries use Asia/Kolkata rather than the browser timezone', () => {
  assert.equal(getIndiaDateString(new Date('2026-09-30T18:29:00.000Z')), '2026-09-30');
  assert.equal(getIndiaDateString(new Date('2026-09-30T18:30:00.000Z')), '2026-10-01');
  assert.equal(getIndiaMonthKey(new Date('2026-10-31T20:00:00.000Z')), '2026-11');
});
