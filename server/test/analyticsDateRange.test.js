const test = require('node:test');
const assert = require('node:assert/strict');
const { isDailySpendingRangeWithinLimit } = require('../analyticsDateRange');

test('allows a one-day daily-spending range', () => {
  assert.equal(
    isDailySpendingRangeWithinLimit({
      startDate: '2026-10-25',
      endDate: '2026-10-25'
    }),
    true
  );
});

test('allows a 367-day range that includes a leap day', () => {
  assert.equal(
    isDailySpendingRangeWithinLimit({
      startDate: '2023-03-01',
      endDate: '2024-03-01'
    }),
    true
  );
});

test('rejects a daily-spending range longer than 367 days', () => {
  assert.equal(
    isDailySpendingRangeWithinLimit({
      startDate: '2023-03-01',
      endDate: '2024-03-02'
    }),
    false
  );
});
