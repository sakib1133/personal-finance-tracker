import { useState, useEffect, useRef } from 'react';
import { getExpenses } from '../api/expenses';
import { getBudgets } from '../api/budgets';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseTable from '../components/ExpenseTable';
import FilterBar from '../components/FilterBar';
import SummaryPanel from '../components/SummaryPanel';
import ExpensePieChart from '../components/PieChart';
import ExportButton from '../components/ExportButton';
import Navbar from '../components/Navbar';
import BudgetOverview from '../components/BudgetOverview';
import BudgetAlert from '../components/BudgetAlert';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const { success, error: showError } = useToast();

  // Track current filter state so filters are re-applied after data refreshes
  const [activeFilters, setActiveFilters] = useState({ category: 'All', dateRange: 'All Time', startDate: '', endDate: '' });

  useEffect(() => {
    loadData();

    // Re-fetch data when the page becomes visible (tab switch, PWA resume)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing data...');
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const applyFilters = (expensesList, filters) => {
    let filtered = [...expensesList];

    if (filters.category !== 'All') {
      filtered = filtered.filter(exp => exp.category === filters.category);
    }

    if (filters.dateRange === 'This Month') {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      });
    } else if (filters.dateRange === 'Last Month') {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear;
      });
    } else if (filters.dateRange === 'Custom' && filters.startDate && filters.endDate) {
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= new Date(filters.startDate) && expDate <= new Date(filters.endDate);
      });
    }

    return filtered;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading fresh data...');
      const [expensesData, budgetsData] = await Promise.all([getExpenses(), getBudgets()]);
      const sorted = expensesData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(sorted);
      setFilteredExpenses(applyFilters(sorted, activeFilters));
      setBudgets(budgetsData);
      console.log('Data loaded successfully:', sorted);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      console.log('Refreshing expenses...');
      const data = await getExpenses();
      const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(sorted);
      setFilteredExpenses(applyFilters(sorted, activeFilters));
      console.log('Expenses refreshed:', sorted);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
    setFilteredExpenses(applyFilters(expenses, filters));
  };

  const handleFormSubmit = (wasEditing) => {
    console.log('Form submitted, reloading all data...');

    // Determine what action happened based on whether we were editing
    const isUpdate = wasEditing || editingExpense !== null;

    loadData();

    if (isUpdate) {
      success('Expense updated successfully');
    } else {
      success('Expense added successfully');
    }

    setEditingExpense(null);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
  };

  const handleDeleteExpense = () => {
    loadData();
    success('Expense deleted successfully');
  };

  const getCurrentMonthExpenses = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });
  };

  const calculateBudgetSummary = () => {
    const currentMonthExpenses = getCurrentMonthExpenses();
    const spendingByCategory = {};

    currentMonthExpenses.forEach(exp => {
      if (!spendingByCategory[exp.category]) {
        spendingByCategory[exp.category] = 0;
      }
      spendingByCategory[exp.category] += exp.amount;
    });

    const totalBudget = budgets.reduce((sum, budget) => sum + budget.monthlyBudget, 0);
    const totalSpending = budgets.reduce((sum, budget) => sum + (spendingByCategory[budget.category] || 0), 0);
    const remainingBudget = totalBudget - totalSpending;

    return { totalBudget, totalSpending, remainingBudget, spendingByCategory };
  };

  const { totalBudget, totalSpending, remainingBudget, spendingByCategory } = calculateBudgetSummary();

  const getBudgetAlerts = () => {
    const alerts = [];
    budgets.forEach(budget => {
      const spent = spendingByCategory[budget.category] || 0;
      const percentage = budget.monthlyBudget > 0 ? (spent / budget.monthlyBudget) * 100 : 0;
      if (percentage >= 80) {
        alerts.push({ category: budget.category, percentage, isOverspent: percentage >= 100 });
      }
    });
    return alerts;
  };

  const budgetAlerts = getBudgetAlerts();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Navbar />
      
      <div className="py-4 sm:py-8 px-2 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-8" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>

          <ExpenseForm
            editingExpense={editingExpense}
            onSubmit={handleFormSubmit}
            onCancel={handleCancelEdit}
          />

          {budgetAlerts.length > 0 && (
            <div className="mb-4 sm:mb-6">
              {budgetAlerts.map((alert, index) => (
                <BudgetAlert
                  key={index}
                  percentage={alert.percentage}
                  category={alert.category}
                />
              ))}
            </div>
          )}

          <FilterBar onFilterChange={handleFilterChange} activeFilters={activeFilters} />

          <div className="flex justify-end mb-4">
            <ExportButton expenses={filteredExpenses} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="lg:col-span-2">
              <SummaryPanel expenses={filteredExpenses} />
            </div>
            <div>
              <ExpensePieChart expenses={filteredExpenses} />
            </div>
          </div>

          {budgets.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <BudgetOverview
                totalBudget={totalBudget}
                totalSpending={totalSpending}
                remainingBudget={remainingBudget}
              />
            </div>
          )}

          <ExpenseTable
            expenses={filteredExpenses}
            onEdit={handleEdit}
            onDelete={handleDeleteExpense}
          />
        </div>
      </div>
    </div>
  );
}
