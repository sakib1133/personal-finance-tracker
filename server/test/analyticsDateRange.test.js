const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getIndiaDateString,
  getIndiaMonthStartDate,
  isDailySpendingRangeWithinLimit
} = require('../analyticsDateRange');

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

test('reporting date and month boundaries are based on Asia/Kolkata', () => {
  const beforeMidnight = new Date('2026-09-30T18:29:00.000Z');
  const indiaMidnight = new Date('2026-09-30T18:30:00.000Z');

  assert.equal(getIndiaDateString(beforeMidnight), '2026-09-30');
  assert.equal(getIndiaDateString(indiaMidnight), '2026-10-01');
  assert.equal(getIndiaMonthStartDate(indiaMidnight), '2026-10-01');
  assert.equal(getIndiaMonthStartDate(indiaMidnight, 1), '2026-11-01');
});
