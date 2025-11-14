// lib/axios.js
import axios from 'axios';

export const baseImg = process.env.NEXT_PUBLIC_BASE_URL;
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL + '/api/v1',
  timeout: 30000,
});

// Detect lang from current URL
function detectLangFromURL() {
  if (typeof window === 'undefined') return 'en';
  const path = window.location.pathname; // e.g. "/ar/dashboard/nutrition"
  const firstSegment = path.split('/')[1]; // "ar"
  // Adjust if your supported locales list differs
  return ['ar', 'en'].includes(firstSegment) ? firstSegment : 'en';
}

// Request interceptor to add auth token + lang param
api.interceptors.request.use(
  config => {
    // Auth
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Lang injection
    const lang = detectLangFromURL();
    config.params = {
      ...(config.params || {}),
      lang: config.params?.lang || lang, // only inject if not explicitly provided
    };

    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  },
);

export default api;
