import { addCents, formatCents, toCents } from '../utils/money';
import { getCurrentIndiaMonthExpenses, groupExpenseCentsByCategory } from '../utils/finance';

export default function SummaryPanel({ expenses }) {
  const calculateTotals = () => {
    const currentMonthExpenses = getCurrentIndiaMonthExpenses(expenses);
    const totalThisMonthCents = currentMonthExpenses.reduce(
      (sum, expense) => addCents(sum, toCents(expense.amount)),
      0
    );
    const categoryTotalsCents = groupExpenseCentsByCategory(expenses);

    const highestExpense = expenses.length > 0 
      ? expenses.reduce((max, expense) => toCents(expense.amount) > toCents(max.amount) ? expense : max, expenses[0])
      : null;

    return {
      totalThisMonthCents,
      categoryTotalsCents,
      highestExpense
    };
  };

  const { totalThisMonthCents, categoryTotalsCents, highestExpense } = calculateTotals();

  return (
    <div className="shadow p-4 sm:p-6 mb-6 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '14px' }}>
      <h2 className="text-lg sm:text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Summary</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded border" style={{ backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' }}>
          <p className="text-xs sm:text-sm mb-1" style={{ color: '#cbd5e1' }}>Total This Month</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ color: '#ffffff' }}>
            ₹{formatCents(totalThisMonthCents)}
          </p>
        </div>

        <div className="p-3 sm:p-4 rounded border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <p className="text-xs sm:text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Highest Single Expense</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--primary)' }}>
            {highestExpense ? `₹${formatCents(toCents(highestExpense.amount))}` : '₹0.00'}
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
          {[...categoryTotalsCents].map(([category, totalCents]) => (
            <div key={category} className="p-2 sm:p-3 rounded border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>{category}</p>
              <p className="text-sm sm:text-lg font-semibold" style={{ color: 'var(--primary)' }}>
                ₹{formatCents(totalCents)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
