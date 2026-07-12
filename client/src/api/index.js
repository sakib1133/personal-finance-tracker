import axios from 'axios';

const normalizeBaseUrl = (value) => (value || '').replace(/\/+$/, '');
const normalizeResponseData = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeResponseData);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, normalizeResponseData(entryValue)])
    );
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return value;
    }

    const normalized = trimmed.replace(/,/g, '');
    if (!/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
      return value;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
};

const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://personal-finance-tracker-g2oc.onrender.com' : '')
);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token and cache-busting to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Force no caching on all requests
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  config.headers['Pragma'] = 'no-cache';
  config.headers['Expires'] = '0';
  
  // Add timestamp to GET requests to bypass browser cache
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
