import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExpenses } from '../api/expenses';
import ExpenseTable from '../components/ExpenseTable';
import ExportButton from '../components/ExportButton';
import FilterBar from '../components/FilterBar';
import Navbar from '../components/Navbar';
import { useToast } from '../context/ToastContext';
import { getIndiaMonthKey } from '../utils/dateRange';

const DEFAULT_FILTERS = {
  category: 'All',
  dateRange: 'All Time',
  startDate: '',
  endDate: ''
};

const applyFilters = (expenses, filters) => {
  let filtered = [...expenses];

  if (filters.category !== 'All') {
    filtered = filtered.filter((expense) => expense.category === filters.category);
  }

  if (filters.dateRange === 'This Month' || filters.dateRange === 'Last Month') {
    const [year, month] = getIndiaMonthKey().split('-').map(Number);
    const targetMonth = new Date(Date.UTC(
      year,
      month - 1 + (filters.dateRange === 'Last Month' ? -1 : 0),
      1
    )).toISOString().slice(0, 7);

    filtered = filtered.filter((expense) => expense.date.slice(0, 7) === targetMonth);
  } else if (filters.dateRange === 'Custom' && filters.startDate && filters.endDate) {
    filtered = filtered.filter((expense) =>
      expense.date >= filters.startDate && expense.date <= filters.endDate
    );
  }

  return filtered;
};

export default function History() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { success, error: showError } = useToast();

  const loadExpenses = async () => {
    try {
      const data = await getExpenses();
      setExpenses(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoadError('');
    } catch (error) {
      console.error('Error loading expense history:', error);
      setLoadError('Failed to load expense history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadExpenses();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleDelete = async () => {
    await loadExpenses();
    success('Expense deleted successfully');
  };

  const handleEdit = (expense) => {
    navigate('/dashboard', { state: { editingExpense: expense } });
  };

  const handleDeleteError = (error) => {
    console.error('Error deleting expense:', error);
    showError(error.response?.data?.error || 'Failed to delete expense');
  };

  const filteredExpenses = applyFilters(expenses, activeFilters);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Navbar />

      <div className="app-content py-4 sm:py-8 px-2 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <div className="app-page-header flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 gap-4">
            <h1 className="app-page-title text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Expense History
            </h1>
          </div>

          {loadError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
              <p>{loadError}</p>
              <button onClick={loadExpenses} className="mt-2 font-semibold underline">
                Retry
              </button>
            </div>
          )}

          <FilterBar onFilterChange={setActiveFilters} activeFilters={activeFilters} />

          <div className="mb-4 flex justify-end">
            <ExportButton expenses={filteredExpenses} />
          </div>

          {loading ? (
            <div className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
              Loading expense history...
            </div>
          ) : (
            <ExpenseTable
              expenses={filteredExpenses}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDeleteError={handleDeleteError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
