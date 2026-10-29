import axios from 'axios';
import { normalizeResponseData } from '../utils/normalizeResponseData';

const normalizeBaseUrl = (value) => (value || '').replace(/\/+$/, '');

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : normalizeBaseUrl(import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Prevent private API responses from being stored by intermediate caches.
api.interceptors.request.use((config) => {
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  config.headers['Pragma'] = 'no-cache';
  config.headers['Expires'] = '0';

  if (config.method === 'get') {
    config.params = config.params || {};
    config.params._t = Date.now();
  }
  
  return config;
});

api.interceptors.response.use((response) => {
  if (response?.data) {
    response.data = normalizeResponseData(response.data);
  }
  return response;
});

export default api;
