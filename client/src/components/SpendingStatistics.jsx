const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function SpendingStatistics({ expenses, dateRange }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Spending Statistics</h3>
        <p className="text-gray-500 text-center py-4">No data available</p>
      </div>
    );
  }

  const totalExpensesCount = expenses.length;
  const totalAmount = expenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0);
  
  const start = new Date(`${dateRange.startDate}T00:00:00Z`);
  const end = new Date(`${dateRange.endDate}T00:00:00Z`);
  const daysInRange = Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
  const averageDailySpending = daysInRange > 0 ? totalAmount / daysInRange : 0;
  const averageMonthlySpending = averageDailySpending * (365.2425 / 12);
  
  const numericAmounts = expenses.map(exp => toNumber(exp.amount));
  const largestExpense = Math.max(...numericAmounts);
  const smallestExpense = Math.min(...numericAmounts);

  const stats = [
    {
      label: 'Total Expenses',
      value: totalExpensesCount,
      icon: '📝',
      color: 'bg-blue-100 text-blue-700'
    },
    {
      label: 'Average Daily Spending (selected range)',
      value: `₹${averageDailySpending.toFixed(2)}`,
      icon: '📅',
      color: 'bg-green-100 text-green-700'
    },
    {
      label: 'Average Monthly Equivalent',
      value: `₹${averageMonthlySpending.toFixed(2)}`,
      icon: '📊',
      color: 'bg-purple-100 text-purple-700'
    },
    {
      label: 'Largest Expense',
      value: `₹${largestExpense.toFixed(2)}`,
      icon: '📈',
      color: 'bg-red-100 text-red-700'
    },
    {
      label: 'Smallest Expense',
      value: `₹${smallestExpense.toFixed(2)}`,
      icon: '📉',
      color: 'bg-yellow-100 text-yellow-700'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Spending Statistics</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${stat.color}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-sm opacity-80">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
