import { useState, useEffect } from 'react';
import {
  getAnalyticsSummary,
  getMonthlyTrends,
  getCategoryBreakdown,
  getDailySpending
} from '../api/analytics';
import { getExpenses } from '../api/expenses';
import Navbar from '../components/Navbar';
import FinancialInsights from '../components/FinancialInsights';
import MonthlyTrendChart from '../components/MonthlyTrendChart';
import CategoryBreakdownChart from '../components/CategoryBreakdownChart';
import DailySpendingChart from '../components/DailySpendingChart';
import MonthlyComparison from '../components/MonthlyComparison';
import TopSpendingCategories from '../components/TopSpendingCategories';
import SpendingStatistics from '../components/SpendingStatistics';
import AnalyticsFilter from '../components/AnalyticsFilter';

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [dailySpending, setDailySpending] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalyticsData();

    // Re-fetch data when the page becomes visible (tab switch, PWA resume)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('Analytics page became visible, refreshing data...');
        loadAnalyticsData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [summaryData, trendsData, categoryData, dailyData, expensesData] = await Promise.all([
        getAnalyticsSummary(),
        getMonthlyTrends(),
        getCategoryBreakdown(),
        getDailySpending(),
        getExpenses()
      ]);

      setSummary(summaryData);
      setMonthlyTrends(trendsData);
      setCategoryBreakdown(categoryData);
      setDailySpending(dailyData);
      setExpenses(expensesData);
      setError(null);
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = ({ filter, startDate, endDate }) => {
    console.log('Filter changed:', filter, startDate, endDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-700 text-center">{error}</p>
          <button
            onClick={loadAnalyticsData}
            className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Navbar />
      
      <div className="py-4 sm:py-8 px-2 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-8" style={{ color: 'var(--text-primary)' }}>
            Analytics Dashboard
          </h1>

          <AnalyticsFilter onFilterChange={handleFilterChange} />

          <div className="mb-4 sm:mb-8">
            <FinancialInsights data={summary} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-8">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Monthly Spending Trend</h3>
              <MonthlyTrendChart data={monthlyTrends} />
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Category Breakdown</h3>
              <CategoryBreakdownChart data={categoryBreakdown} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-8">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Daily Spending Pattern</h3>
              <DailySpendingChart data={dailySpending?.dailyData || []} />
              {dailySpending && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-purple-600 mb-1">Highest Spending Day</p>
                    <p className="text-base sm:text-lg font-bold text-purple-800">{dailySpending.highestSpendingDay.day}</p>
                    <p className="text-xs sm:text-sm text-purple-600">₹{dailySpending.highestSpendingDay.amount.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-green-600 mb-1">Average Daily Spending</p>
                    <p className="text-base sm:text-lg font-bold text-green-800">₹{dailySpending.averageDailySpending.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <MonthlyComparison
                currentMonth={summary.currentMonthSpending}
                previousMonth={summary.previousMonthSpending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-8">
            <TopSpendingCategories data={categoryBreakdown} />
            <SpendingStatistics expenses={expenses} dailySpendingData={dailySpending} />
          </div>
        </div>
      </div>
    </div>
  );
}
