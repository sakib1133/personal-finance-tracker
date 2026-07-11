import { useState, useEffect } from 'react';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../api/budgets';
import { getExpenses } from '../api/expenses';
import BudgetForm from '../components/BudgetForm';
import BudgetProgressCard from '../components/BudgetProgressCard';
import BudgetAlert from '../components/BudgetAlert';
import BudgetVsSpendingChart from '../components/BudgetVsSpendingChart';
import Navbar from '../components/Navbar';
import { useToast } from '../context/ToastContext';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [editingBudget, setEditingBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    loadData();

    // Re-fetch data when the page becomes visible (tab switch, PWA resume)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('Budgets page became visible, refreshing data...');
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loadData = async () => {
    try {
      const [budgetsData, expensesData] = await Promise.all([getBudgets(), getExpenses()]);
      setBudgets(budgetsData);
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
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

  const calculateSpendingByCategory = () => {
    const currentMonthExpenses = getCurrentMonthExpenses();
    const spendingByCategory = {};

    currentMonthExpenses.forEach(exp => {
      if (!spendingByCategory[exp.category]) {
        spendingByCategory[exp.category] = 0;
      }
      spendingByCategory[exp.category] += exp.amount;
    });

    return spendingByCategory;
  };

  const getBudgetWithSpending = () => {
    const spendingByCategory = calculateSpendingByCategory();

    return budgets.map(budget => ({
      ...budget,
      spent: spendingByCategory[budget.category] || 0,
      remaining: budget.monthlyBudget - (spendingByCategory[budget.category] || 0),
      percentage: budget.monthlyBudget > 0 
        ? ((spendingByCategory[budget.category] || 0) / budget.monthlyBudget) * 100 
        : 0
    }));
  };

  const handleAddBudget = async (budgetData) => {
    try {
      await createBudget(budgetData);
      await loadData();
      setShowForm(false);
      success('Budget added successfully');
    } catch (error) {
      console.error('Error adding budget:', error);
      showError(error.response?.data?.error || 'Failed to add budget');
    }
  };

  const handleUpdateBudget = async (budgetData) => {
    try {
      await updateBudget(editingBudget.id, budgetData);
      await loadData();
      setEditingBudget(null);
      setShowForm(false);
      success('Budget updated successfully');
    } catch (error) {
      console.error('Error updating budget:', error);
      showError(error.response?.data?.error || 'Failed to update budget');
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) {
      return;
    }

    try {
      await deleteBudget(id);
      await loadData();
      success('Budget deleted successfully');
    } catch (error) {
      console.error('Error deleting budget:', error);
      showError('Failed to delete budget');
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingBudget(null);
    setShowForm(false);
  };

  const budgetsWithSpending = getBudgetWithSpending();
  const chartData = budgetsWithSpending.map(b => ({
    category: b.category,
    budget: b.monthlyBudget,
    spent: b.spent
  }));

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 gap-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Budget Management
            </h1>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors text-sm sm:text-base"
              >
                Add Budget
              </button>
            )}
          </div>

          {showForm && (
            <BudgetForm
              onSubmit={editingBudget ? handleUpdateBudget : handleAddBudget}
              onCancel={handleCancelEdit}
              editingBudget={editingBudget}
            />
          )}

          {budgets.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center" style={{ backgroundColor: 'var(--bg-card)' }}>
              <p className="text-base sm:text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
                No budgets set up yet
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Create budgets for your categories to track your spending
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-500 text-white py-2 px-4 sm:px-6 rounded-md hover:bg-blue-600 transition-colors text-sm sm:text-base"
              >
                Create Your First Budget
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 sm:mb-6">
                <BudgetVsSpendingChart data={chartData} />
              </div>

              {budgetsWithSpending.map(budget => (
                <div key={budget.id} className="mb-4 sm:mb-6">
                  <BudgetAlert percentage={budget.percentage} category={budget.category} />
                  <BudgetProgressCard
                    category={budget.category}
                    budget={budget.monthlyBudget}
                    spent={budget.spent}
                    remaining={budget.remaining}
                    percentage={budget.percentage}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="flex-1 bg-blue-500 text-white py-2 px-3 sm:px-4 rounded-md hover:bg-blue-600 transition-colors text-xs sm:text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="flex-1 bg-red-500 text-white py-2 px-3 sm:px-4 rounded-md hover:bg-red-600 transition-colors text-xs sm:text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
