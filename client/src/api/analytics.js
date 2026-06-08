import api from './index';

export const getAnalyticsSummary = async () => {
  const response = await api.get('/analytics/summary');
  return response.data;
};

export const getMonthlyTrends = async () => {
  const response = await api.get('/analytics/monthly-trends');
  return response.data;
};

export const getCategoryBreakdown = async () => {
  const response = await api.get('/analytics/category-breakdown');
  return response.data;
};

export const getDailySpending = async () => {
  const response = await api.get('/analytics/daily-spending');
  return response.data;
};
