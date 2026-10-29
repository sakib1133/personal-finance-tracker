const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const toCents = (amount) => {
  const value = String(amount);
  const match = value.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new TypeError('Expense amount must have no more than two decimal places');
  }

  const [, whole, fraction = ''] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError('Expense amount exceeds the safe integer range');
  }
  return cents;
};

const addCents = (total, value) => {
  const sum = total + value;
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(value) || !Number.isSafeInteger(sum)) {
    throw new RangeError('Monetary total exceeds the safe integer range');
  }
  return sum;
};

const sumExpenseCents = (expenses) =>
  expenses.reduce((sum, expense) => addCents(sum, toCents(expense.amount)), 0);

const formatDate = (date) => date.toISOString().slice(0, 10);

function buildMonthlyTrends(expenses, dateRange, now = new Date()) {
  const indiaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const currentYear = Number(indiaDate.find((part) => part.type === 'year').value);
  const currentMonth = Number(indiaDate.find((part) => part.type === 'month').value);
  const startDate = dateRange
    ? new Date(`${dateRange.startDate}T00:00:00Z`)
    : new Date(Date.UTC(currentYear, currentMonth - 12, 1));
  const endDate = dateRange
    ? new Date(`${dateRange.endDate}T00:00:00Z`)
    : new Date(Date.UTC(currentYear, currentMonth - 1, 1));
  const monthlyCents = new Map();

  expenses.forEach((expense) => {
    const monthKey = String(expense.date).slice(0, 7);
    monthlyCents.set(
      monthKey,
      addCents(monthlyCents.get(monthKey) || 0, toCents(expense.amount))
    );
  });

  const months = [];
  for (
    let date = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    date <= endDate;
    date.setUTCMonth(date.getUTCMonth() + 1)
  ) {
    const monthKey = date.toISOString().slice(0, 7);
    months.push({
      month: date.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      totalSpending: (monthlyCents.get(monthKey) || 0) / 100
    });
  }

  return months;
}

function buildCategoryBreakdown(expenses) {
  const categoryCents = new Map();
  expenses.forEach((expense) => {
    categoryCents.set(
      expense.category,
      addCents(categoryCents.get(expense.category) || 0, toCents(expense.amount))
    );
  });

  const totalCents = [...categoryCents.values()].reduce(
    (sum, amount) => addCents(sum, amount),
    0
  );
  return [...categoryCents.entries()]
    .map(([category, amount]) => ({
      category,
      amount: amount / 100,
      percentage: totalCents > 0
        ? Number(((amount / totalCents) * 100).toFixed(2))
        : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildDailySpending(expenses, dateRange, now = new Date()) {
  const indiaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const currentYear = Number(indiaDate.find((part) => part.type === 'year').value);
  const currentMonth = Number(indiaDate.find((part) => part.type === 'month').value);
  const rangeStart = dateRange
    ? new Date(`${dateRange.startDate}T00:00:00Z`)
    : new Date(Date.UTC(currentYear, currentMonth - 1, 1));
  const rangeEnd = dateRange
    ? new Date(`${dateRange.endDate}T00:00:00Z`)
    : new Date(Date.UTC(currentYear, currentMonth, 0));
  const startKey = formatDate(rangeStart);
  const endKey = formatDate(rangeEnd);
  const dailyCents = new Map();

  expenses.forEach((expense) => {
    const dateKey = String(expense.date).slice(0, 10);
    if (dateKey < startKey || dateKey > endKey) {
      return;
    }

    dailyCents.set(dateKey, addCents(dailyCents.get(dateKey) || 0, toCents(expense.amount)));
  });

  const daysInRange = Math.floor((rangeEnd - rangeStart) / MILLISECONDS_PER_DAY) + 1;
  const dailyData = [];
  for (let dayOffset = 0; dayOffset < daysInRange; dayOffset++) {
    const date = new Date(rangeStart);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const dateKey = formatDate(date);
    dailyData.push({
      date: dateKey,
      day: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      }),
      amount: (dailyCents.get(dateKey) || 0) / 100
    });
  }

  const highest = dailyData.reduce(
    (max, day) => (day.amount > max.amount ? day : max),
    { date: null, day: 'N/A', amount: 0 }
  );
  const averageDailySpending = dailyData.length > 0
    ? [...dailyCents.values()].reduce((sum, amount) => addCents(sum, amount), 0) / 100 / daysInRange
    : 0;

  return {
    dailyData,
    highestSpendingDay: highest,
    averageDailySpending: Number(averageDailySpending.toFixed(2))
  };
}

module.exports = {
  buildCategoryBreakdown,
  buildDailySpending,
  buildMonthlyTrends,
  sumExpenseCents,
  addCents,
  toCents
};
