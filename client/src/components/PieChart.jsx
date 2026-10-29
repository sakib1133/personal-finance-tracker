import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { addCents, fromCents, toCents } from '../utils/money';

const COLORS = ['#334155', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];

export default function ExpensePieChart({ expenses }) {
  const categoryTotals = new Map();
  expenses.forEach((expense) => {
    categoryTotals.set(
      expense.category,
      addCents(categoryTotals.get(expense.category) || 0, toCents(expense.amount))
    );
  });
  const categoryData = [...categoryTotals].map(([name, cents]) => ({
    name,
    value: fromCents(cents)
  }));

  if (categoryData.length === 0) {
    return (
      <div className="shadow p-6 text-center border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '14px', color: 'var(--text-secondary)' }}>
        No data to display
      </div>
    );
  }

  return (
    <div className="shadow p-4 sm:p-6 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '14px' }}>
      <h2 className="text-lg sm:text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Spending by Category</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={categoryData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={{ 
              formatter: ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`,
              fontSize: 10 
            }}
            outerRadius={60}
            fill="#8884d8"
            dataKey="value"
          >
            {categoryData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
