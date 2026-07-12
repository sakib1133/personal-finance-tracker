const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function SummaryPanel({ expenses }) {
  const calculateTotals = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });

    const totalThisMonth = thisMonthExpenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0);

    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + toNumber(exp.amount);
      return acc;
    }, {});

    const highestExpense = expenses.length > 0 
      ? expenses.reduce((max, exp) => toNumber(exp.amount) > toNumber(max.amount) ? exp : max, expenses[0])
      : null;

    return {
      totalThisMonth,
      categoryTotals,
      highestExpense
    };
  };

  const { totalThisMonth, categoryTotals, highestExpense } = calculateTotals();

  return (
    <div className="shadow p-4 sm:p-6 mb-6 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '14px' }}>
      <h2 className="text-lg sm:text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Summary</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded border" style={{ backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' }}>
          <p className="text-xs sm:text-sm mb-1" style={{ color: '#cbd5e1' }}>Total This Month</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ color: '#ffffff' }}>
            ₹{totalThisMonth.toFixed(2)}
          </p>
        </div>

        <div className="p-3 sm:p-4 rounded border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <p className="text-xs sm:text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Highest Single Expense</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--primary)' }}>
            {highestExpense ? `₹${highestExpense.amount.toFixed(2)}` : '₹0.00'}
          </p>
          {highestExpense && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {highestExpense.category} - {new Date(highestExpense.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          )}
        </div>

        <div className="p-3 sm:p-4 rounded border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <p className="text-xs sm:text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Total Expenses</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--primary)' }}>
            {expenses.length}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Spending by Category</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(categoryTotals).map(([category, total]) => (
            <div key={category} className="p-2 sm:p-3 rounded border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>{category}</p>
              <p className="text-sm sm:text-lg font-semibold" style={{ color: 'var(--primary)' }}>
                ₹{total.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
