import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getExpenses } from '../api/expenses';
import { getBudgets } from '../api/budgets';
import ExpenseForm from '../components/ExpenseForm';
import SummaryPanel from '../components/SummaryPanel';
import ExpensePieChart from '../components/PieChart';
import Navbar from '../components/Navbar';
import BudgetOverview from '../components/BudgetOverview';
import BudgetAlert from '../components/BudgetAlert';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const { success, error: showError } = useToast();

  useEffect(() => {
    loadData(true);

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

  useEffect(() => {
    if (location.state?.editingExpense) {
      setEditingExpense(location.state.editingExpense);
      navigate('/dashboard', { replace: true, state: null });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state, navigate]);

  const loadData = async (showInitialLoading = false) => {
    try {
      if (showInitialLoading) {
        setLoading(true);
      }
      console.log('Loading fresh data...');
      const [expensesData, budgetsData] = await Promise.all([getExpenses(), getBudgets()]);
      const sorted = expensesData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(sorted);
      setBudgets(budgetsData);
      console.log('Data loaded successfully:', sorted);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load data');
    } finally {
      if (showInitialLoading) {
        setLoading(false);
      }
    }
  };

  const handleFormSubmit = () => {
    const wasEditing = Boolean(editingExpense);
    loadData();
    success(wasEditing ? 'Expense updated successfully' : 'Expense added successfully');
    setEditingExpense(null);
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
      
      <div className="app-content py-4 sm:py-8 px-2 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="app-page-title text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-8" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>

          <ExpenseForm
            editingExpense={editingExpense}
            onSubmit={handleFormSubmit}
            onCancel={() => setEditingExpense(null)}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="lg:col-span-2">
              <SummaryPanel expenses={expenses} />
            </div>
            <div>
              <ExpensePieChart expenses={expenses} />
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
        </div>
      </div>
    </div>
  );
}
