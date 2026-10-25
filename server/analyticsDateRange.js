const MAX_DAILY_SPENDING_RANGE_DAYS = 367;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function isDailySpendingRangeWithinLimit({ startDate, endDate }) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const daysInRange = Math.floor((end - start) / MILLISECONDS_PER_DAY) + 1;

  return daysInRange <= MAX_DAILY_SPENDING_RANGE_DAYS;
}

module.exports = { isDailySpendingRangeWithinLimit };
