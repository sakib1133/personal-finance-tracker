import api from './index';

export const getBudgets = async () => {
  const response = await api.get('/budgets');
  return response.data;
};

export const createBudget = async (budget) => {
  const response = await api.post('/budgets', budget);
  return response.data;
};

export const updateBudget = async (id, budget) => {
  const response = await api.put(`/budgets/${id}`, budget);
  return response.data;
};

export const deleteBudget = async (id) => {
  const response = await api.delete(`/budgets/${id}`);
  return response.data;
};
