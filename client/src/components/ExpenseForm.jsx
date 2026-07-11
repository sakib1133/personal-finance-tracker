import { useState, useEffect } from 'react';
import { createExpense, updateExpense } from '../api/expenses';

const CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];

export default function ExpenseForm({ editingExpense, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    date: '',
    note: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        amount: editingExpense.amount,
        category: editingExpense.category,
        date: editingExpense.date,
        note: editingExpense.note || ''
      });
    } else {
      setFormData({
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        note: ''
      });
    }
  }, [editingExpense]);

  const validate = () => {
    const newErrors = {};
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    setApiError('');

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, formData);
      } else {
        await createExpense(formData);
      }
      onSubmit();
      setFormData({
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        note: ''
      });
      setErrors({});
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save expense';
      setApiError(errorMessage);
      console.error('Error saving expense:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shadow p-4 sm:p-6 mb-6 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '14px' }}>
      <h2 className="text-lg sm:text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        {editingExpense ? 'Edit Expense' : 'Add New Expense'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="p-3 rounded-md text-sm" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            {apiError}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Amount (₹)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className={`w-full px-3 py-2 border focus:outline-none text-sm ${
              errors.amount ? 'border-red-500' : ''
            }`} style={{ backgroundColor: 'var(--bg-input)', borderColor: errors.amount ? '#ef4444' : 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
          />
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className={`w-full px-3 py-2 border focus:outline-none text-sm ${
              errors.category ? 'border-red-500' : ''
            }`} style={{ backgroundColor: 'var(--bg-input)', borderColor: errors.category ? '#ef4444' : 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className={`w-full px-3 py-2 border focus:outline-none text-sm ${
              errors.date ? 'border-red-500' : ''
            }`} style={{ backgroundColor: 'var(--bg-input)', borderColor: errors.date ? '#ef4444' : 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
          />
          {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Note (optional)
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className="w-full px-3 py-2 border focus:outline-none text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
            rows="2"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 text-white py-2 px-4 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--primary)', borderRadius: '10px' }}
          >
            {loading ? 'Saving...' : (editingExpense ? 'Update' : 'Add') + ' Expense'}
          </button>
          {editingExpense && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2 px-4 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: '#e2e8f0', color: 'var(--text-primary)', borderRadius: '10px' }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
