const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function FinancialInsights({ data }) {
  const insights = [
    {
      label: 'Total Expenses',
      value: `₹${toNumber(data.totalExpenses).toFixed(2)}`,
      color: 'bg-blue-500',
      icon: '💰'
    },
    {
      label: 'Average Expense',
      value: `₹${toNumber(data.averageExpenseAmount).toFixed(2)}`,
      color: 'bg-purple-500',
      icon: '📊'
    },
    {
      label: 'Highest Expense',
      value: `₹${toNumber(data.highestSingleExpense).toFixed(2)}`,
      color: 'bg-red-500',
      icon: '📈'
    },
    {
      label: 'Lowest Expense',
      value: `₹${toNumber(data.lowestExpense).toFixed(2)}`,
      color: 'bg-green-500',
      icon: '📉'
    },
    {
      label: 'Most Used Category',
      value: data.mostUsedCategory,
      color: 'bg-yellow-500',
      icon: '🏷️'
    },
    {
      label: 'Current Month',
      value: `₹${toNumber(data.currentMonthSpending).toFixed(2)}`,
      color: 'bg-indigo-500',
      icon: '📅'
    },
    {
      label: 'Previous Month',
      value: `₹${toNumber(data.previousMonthSpending).toFixed(2)}`,
      color: 'bg-pink-500',
      icon: '📆'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {insights.map((insight, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{insight.label}</p>
              <p className="text-2xl font-bold text-gray-800">{insight.value}</p>
            </div>
            <div className={`${insight.color} text-white text-3xl p-3 rounded-full`}>
              {insight.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
