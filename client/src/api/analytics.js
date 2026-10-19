import api from './index';

export const getAnalyticsSummary = async (dateRange) => {
  const response = await api.get('/analytics/summary', { params: dateRange });
  return response.data;
};

export const getMonthlyTrends = async (dateRange) => {
  const response = await api.get('/analytics/monthly-trends', { params: dateRange });
  return response.data;
};

export const getCategoryBreakdown = async (dateRange) => {
  const response = await api.get('/analytics/category-breakdown', { params: dateRange });
  return response.data;
};

export const getDailySpending = async (dateRange) => {
  const response = await api.get('/analytics/daily-spending', { params: dateRange });
  return response.data;
};
