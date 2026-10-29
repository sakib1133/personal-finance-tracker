const MAX_DAILY_SPENDING_RANGE_DAYS = 367;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function getIndiaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function getIndiaMonthStartDate(date = new Date(), monthOffset = 0) {
  const [year, month] = getIndiaDateString(date).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + monthOffset, 1)).toISOString().slice(0, 10);
}

function isDailySpendingRangeWithinLimit({ startDate, endDate }) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const daysInRange = Math.floor((end - start) / MILLISECONDS_PER_DAY) + 1;

  return daysInRange <= MAX_DAILY_SPENDING_RANGE_DAYS;
}

module.exports = {
  getIndiaDateString,
  getIndiaMonthStartDate,
  isDailySpendingRangeWithinLimit
};
