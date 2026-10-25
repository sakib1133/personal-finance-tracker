export const MAX_ANALYTICS_RANGE_DAYS = 367;

export const isDateRangeWithinLimit = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return false;
  }

  const days = Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
  return days <= MAX_ANALYTICS_RANGE_DAYS;
};
