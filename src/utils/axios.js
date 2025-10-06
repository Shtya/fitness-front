// lib/axios.js
import axios from 'axios';

export const baseImg = process.env.NEXT_PUBLIC_BASE_URL;
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL + '/api/v1',
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  config => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // localStorage.removeItem('accessToken');
      // localStorage.removeItem('user');
      // window.location.href = '/auth';
    }
    return Promise.reject(error);
  },
);

export default api;
