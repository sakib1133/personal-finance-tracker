import api from './index';

let currentUserRequest;

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const loginWithGoogle = async (credential) => {
  const response = await api.post('/auth/google', { credential });
  return response.data;
};

export const signupWithGoogle = async (credential) => {
  const response = await api.post('/auth/google/signup', { credential });
  return response.data;
};

export const getCurrentUser = async () => {
  if (!currentUserRequest) {
    currentUserRequest = api.get('/auth/me')
      .then((response) => response.data)
      .catch((error) => {
        if (error.response?.status === 401) {
          return null;
        }

        console.error('Failed to initialize the authentication session:', error);
        throw error;
      })
      .finally(() => {
        currentUserRequest = null;
      });
  }

  return currentUserRequest;
};

export const logout = async () => {
  await api.post('/auth/logout');
};
