import { createContext, useContext, useState, useEffect } from 'react';
import {
  login,
  loginWithGoogle,
  signupWithGoogle,
  register,
  getCurrentUser,
  logout as logoutRequest
} from '../api/auth';

const AuthContext = createContext(null);

const getAuthErrorMessage = (error, fallback) => (
  error.response?.data?.error ||
  (error.request
    ? 'Unable to reach the API server. Check that the backend is running and VITE_API_URL is correct.'
    : error.message) ||
  fallback
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const initializeAuth = async () => {
      try {
        const userData = await getCurrentUser();
        if (isActive) {
          setUser(userData);
        }
      } catch {
        if (isActive) {
          setUser(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    try {
      localStorage.removeItem('token');
    } catch (error) {
      console.error('Failed to remove a legacy authentication token:', error);
    }
    initializeAuth();

    return () => {
      isActive = false;
    };
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const response = await login({ email, password });
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error, 'Login failed')
      };
    }
  };

  const handleGoogleLogin = async (credential) => {
    try {
      const response = await loginWithGoogle(credential);
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error, 'Google sign-in failed')
      };
    }
  };

  const handleGoogleSignup = async (credential) => {
    try {
      const response = await signupWithGoogle(credential);
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error, 'Google sign-up failed')
      };
    }
  };

  const handleRegister = async (fullName, email, password, confirmPassword) => {
    try {
      const response = await register({ fullName, email, password, confirmPassword });
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error, 'Registration failed')
      };
    }
  };

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.error('Failed to revoke the current session:', error);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login: handleLogin,
    loginWithGoogle: handleGoogleLogin,
    signupWithGoogle: handleGoogleSignup,
    register: handleRegister,
    logout: handleLogout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
