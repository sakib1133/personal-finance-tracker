const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const toCents = (amount) => {
  const value = Number(amount);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
};

const sumExpenseCents = (expenses) =>
  expenses.reduce((sum, expense) => sum + toCents(expense.amount), 0);

const formatDate = (date) => date.toISOString().slice(0, 10);

function buildMonthlyTrends(expenses, dateRange, now = new Date()) {
  const startDate = dateRange
    ? new Date(`${dateRange.startDate}T00:00:00Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const endDate = dateRange
    ? new Date(`${dateRange.endDate}T00:00:00Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthlyCents = new Map();

  expenses.forEach((expense) => {
    const monthKey = String(expense.date).slice(0, 7);
    monthlyCents.set(monthKey, (monthlyCents.get(monthKey) || 0) + toCents(expense.amount));
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
      (categoryCents.get(expense.category) || 0) + toCents(expense.amount)
    );
  });

  const totalCents = [...categoryCents.values()].reduce((sum, amount) => sum + amount, 0);
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
  const rangeStart = dateRange
    ? new Date(`${dateRange.startDate}T00:00:00Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const rangeEnd = dateRange
    ? new Date(`${dateRange.endDate}T00:00:00Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const startKey = formatDate(rangeStart);
  const endKey = formatDate(rangeEnd);
  const dailyCents = new Map();

  expenses.forEach((expense) => {
    const dateKey = String(expense.date).slice(0, 10);
    if (dateKey < startKey || dateKey > endKey) {
      return;
    }

    dailyCents.set(dateKey, (dailyCents.get(dateKey) || 0) + toCents(expense.amount));
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
    ? [...dailyCents.values()].reduce((sum, amount) => sum + amount, 0) / 100 / daysInRange
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
  sumExpenseCents
};
