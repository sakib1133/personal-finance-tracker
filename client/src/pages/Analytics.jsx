import { useState, useEffect, useRef } from 'react';
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

const getDefaultDateRange = () => {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 29);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
};

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [dailySpending, setDailySpending] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const requestId = useRef(0);
  const hasLoadedData = useRef(false);

  useEffect(() => {
    loadAnalyticsData(dateRange);

    // Re-fetch data when the page becomes visible (tab switch, PWA resume)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('Analytics page became visible, refreshing data...');
        loadAnalyticsData(dateRange);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      requestId.current += 1;
    };
  }, [dateRange]);

  const loadAnalyticsData = async (selectedDateRange = dateRange) => {
    const activeRequestId = ++requestId.current;
    try {
      if (!hasLoadedData.current) {
        setLoading(true);
      }
      const [summaryData, trendsData, categoryData, dailyData, expensesData] = await Promise.all([
        getAnalyticsSummary(selectedDateRange),
        getMonthlyTrends(selectedDateRange),
        getCategoryBreakdown(selectedDateRange),
        getDailySpending(selectedDateRange),
        getExpenses()
      ]);

      if (activeRequestId !== requestId.current) {
        return;
      }

      setSummary(summaryData);
      setMonthlyTrends(trendsData);
      setCategoryBreakdown(categoryData);
      setDailySpending(dailyData);
      setExpenses(expensesData.filter((expense) =>
        expense.date >= selectedDateRange.startDate &&
        expense.date <= selectedDateRange.endDate
      ));
      hasLoadedData.current = true;
      setError(null);
    } catch (err) {
      if (activeRequestId !== requestId.current) {
        return;
      }
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      if (activeRequestId === requestId.current) {
        setLoading(false);
      }
    }
  };

  const handleFilterChange = (selectedDateRange) => {
    setDateRange(selectedDateRange);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Navbar />
      
      <div className="app-content py-4 sm:py-8 px-2 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="app-page-title text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-8" style={{ color: 'var(--text-primary)' }}>
            Analytics Dashboard
          </h1>

          <AnalyticsFilter onFilterChange={handleFilterChange} />

          {error && !hasLoadedData.current ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-700 text-center">{error}</p>
              <button
                onClick={() => loadAnalyticsData()}
                className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="py-12 text-center" role="status" aria-live="polite">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
                  <p>{error}</p>
                  <button onClick={() => loadAnalyticsData()} className="mt-2 font-semibold underline">
                    Retry
                  </button>
                </div>
              )}

              <div className="mb-4 sm:mb-8">
                <FinancialInsights data={summary} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-8">
                <div className="app-surface bg-white rounded-xl shadow-md p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Monthly Spending Trend</h3>
                  <MonthlyTrendChart data={monthlyTrends} />
                </div>

                <div className="app-surface bg-white rounded-xl shadow-md p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Category Breakdown</h3>
                  <CategoryBreakdownChart data={categoryBreakdown} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-8">
                <div className="app-surface lg:col-span-2 bg-white rounded-xl shadow-md p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Daily Spending Pattern</h3>
                  <DailySpendingChart data={dailySpending?.dailyData || []} />
                  {dailySpending && (
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="app-stat-tile rounded-lg p-3 sm:p-4">
                        <p className="text-xs sm:text-sm mb-1">Highest Spending Day</p>
                        <p className="text-base sm:text-lg font-bold">{dailySpending.highestSpendingDay.day}</p>
                        <p className="text-xs sm:text-sm">₹{Number(dailySpending?.highestSpendingDay?.amount ?? 0).toFixed(2)}</p>
                      </div>
                      <div className="app-stat-tile rounded-lg p-3 sm:p-4">
                        <p className="text-xs sm:text-sm mb-1">Average Daily Spending</p>
                        <p className="text-base sm:text-lg font-bold">₹{Number(dailySpending?.averageDailySpending ?? 0).toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <MonthlyComparison
                    currentPeriod={summary.selectedPeriodSpending}
                    previousPeriod={summary.previousPeriodSpending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-8">
                <TopSpendingCategories data={categoryBreakdown} />
                <SpendingStatistics expenses={expenses} dateRange={dateRange} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
