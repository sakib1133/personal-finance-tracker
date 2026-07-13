import { deleteExpense } from '../api/expenses';

const toNumber = (value) => {
const parsed = Number(value);
return Number.isFinite(parsed) ? parsed : 0;
};

export default function ExpenseTable({ expenses, onEdit, onDelete }) {
const handleDelete = async (id) => {
if (window.confirm('Are you sure you want to delete this expense?')) {
try {
await deleteExpense(id);
onDelete();
} catch (error) {
console.error('Error deleting expense:', error);
}
}
};

const formatDate = (dateString) => {
if (!dateString) return 'No Date';

const date = new Date(dateString);

if (isNaN(date.getTime())) {
  return 'Invalid Date';
}

return date.toLocaleDateString('en-IN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'Asia/Kolkata'
});

};

const getBadgeStyle = (category) => {
switch (category) {
case 'Food':
return {
backgroundColor: '#f1f5f9',
color: '#334155',
border: '1px solid #cbd5e1'
};
case 'Transport':
return {
backgroundColor: '#f1f5f9',
color: '#475569',
border: '1px solid #e2e8f0'
};
case 'Bills':
return {
backgroundColor: '#f1f5f9',
color: '#64748b',
border: '1px solid #e2e8f0'
};
case 'Entertainment':
return {
backgroundColor: '#f1f5f9',
color: '#64748b',
border: '1px solid #e2e8f0'
};
case 'Other':
return {
backgroundColor: '#f1f5f9',
color: '#94a3b8',
border: '1px solid #e2e8f0'
};
default:
return {
backgroundColor: '#f1f5f9',
color: '#334155',
border: '1px solid #cbd5e1'
};
}
};

if (!expenses || expenses.length === 0) {

return (
<div
className="shadow p-6 text-center border"
style={{
backgroundColor: 'var(--bg-card)',
borderColor: 'var(--border)',
borderRadius: '14px',
color: 'var(--text-secondary)'
}}
>
No expenses found </div>
);
}

return (
<div
className="shadow overflow-hidden border"
style={{
backgroundColor: 'var(--bg-card)',
borderColor: 'var(--border)',
borderRadius: '14px'
}}
>
{/* Desktop Table */} <div className="hidden md:block overflow-x-auto"> <table className="w-full">
<thead style={{ borderBottom: '1px solid var(--border)' }}> <tr>
<th
className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
style={{
color: 'var(--text-muted)',
fontSize: '11px',
letterSpacing: '0.8px'
}}
>
Date </th>

          <th
            className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            style={{
              color: 'var(--text-muted)',
              fontSize: '11px',
              letterSpacing: '0.8px'
            }}
          >
            Category
          </th>

          <th
            className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            style={{
              color: 'var(--text-muted)',
              fontSize: '11px',
              letterSpacing: '0.8px'
            }}
          >
            Note
          </th>

          <th
            className="px-4 sm:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider"
            style={{
              color: 'var(--text-muted)',
              fontSize: '11px',
              letterSpacing: '0.8px'
            }}
          >
            Amount
          </th>

          <th
            className="px-4 sm:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider"
            style={{
              color: 'var(--text-muted)',
              fontSize: '11px',
              letterSpacing: '0.8px'
            }}
          >
            Actions
          </th>
        </tr>
      </thead>

      <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
        {expenses.map((expense) => (
          <tr
            key={expense.id}
            style={{ transition: 'background-color 0.2s' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = '#f8fafc')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            <td
              className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {formatDate(
  expense.date ||
  expense.createdAt ||
  expense.created_at
)}
            </td>

            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
              <span
                className="px-2 inline-flex text-xs leading-5 font-semibold rounded"
                style={getBadgeStyle(expense.category)}
              >
                {expense.category}
              </span>
            </td>

            <td
              className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {expense.note || '-'}
            </td>

            <td
              className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-right font-medium"
              style={{ color: 'var(--primary)', fontWeight: 700 }}
            >
              ₹{toNumber(expense.amount).toFixed(2)}
            </td>

            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button
                onClick={() => onEdit(expense)}
                className="mr-2 sm:mr-3"
                style={{ color: 'var(--primary)', fontWeight: 600 }}
              >
                Edit
              </button>

              <button
                onClick={() => handleDelete(expense.id)}
                style={{ color: '#cbd5e1' }}
                onMouseEnter={(e) =>
                  (e.target.style.color = '#e11d48')
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = '#cbd5e1')
                }
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Mobile Cards */}
  <div className="md:hidden p-4 space-y-4">
    {expenses.map((expense) => (
      <div
        key={expense.id}
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--bg-input)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <p
              className="text-xs font-medium mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {formatDate(
  expense.date ||
  expense.createdAt ||
  expense.created_at
)}
            </p>

            <span
              className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded"
              style={getBadgeStyle(expense.category)}
            >
              {expense.category}
            </span>
          </div>

          <p
            className="text-lg font-bold"
            style={{ color: 'var(--primary)' }}
          >
            ₹{toNumber(expense.amount).toFixed(2)}
          </p>
        </div>

        {expense.note && (
          <p
            className="text-sm mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            {expense.note}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(expense)}
            className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--primary)',
              color: '#fff'
            }}
          >
            Edit
          </button>

          <button
            onClick={() => handleDelete(expense.id)}
            className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    ))}
  </div>
</div>

);
}
