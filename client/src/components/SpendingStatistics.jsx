const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function SpendingStatistics({ expenses, dailySpendingData }) {
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
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const currentMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });
  
  const currentMonthTotal = currentMonthExpenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0);
  const averageDailySpending = currentMonthTotal / daysInMonth;
  
  const monthsWithData = new Set(
    expenses.map(exp => {
      const expDate = new Date(exp.date);
      return `${expDate.getFullYear()}-${expDate.getMonth()}`;
    })
  ).size;
  
  const averageMonthlySpending = monthsWithData > 0 ? totalAmount / monthsWithData : 0;
  
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
      label: 'Average Daily Spending',
      value: `₹${averageDailySpending.toFixed(2)}`,
      icon: '📅',
      color: 'bg-green-100 text-green-700'
    },
    {
      label: 'Average Monthly Spending',
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
