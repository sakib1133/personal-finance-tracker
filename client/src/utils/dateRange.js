export const MAX_ANALYTICS_RANGE_DAYS = 367;

export const getIndiaDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export const getIndiaMonthKey = (date = new Date()) => getIndiaDateString(date).slice(0, 7);

export const getDateStringMonthKey = (dateString) => dateString.slice(0, 7);

export const isDateRangeWithinLimit = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return false;
  }

  const days = Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
  return days <= MAX_ANALYTICS_RANGE_DAYS;
};
