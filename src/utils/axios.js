// lib/axios.js
import axios from 'axios';


export const baseImg = process.env.NEXT_PUBLIC_BACKEND_URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL + "/api/v1",
  timeout: 30000,
});


// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjM2ZWFlNjc0LWEwNjMtNDI4Ny1iMzc4LWUzY2FiMDM2NGI5MSIsImlhdCI6MTc1Nzg0ODQ3NSwiZXhwIjoxNzU4MDIxMjc1fQ.fBWNLL_Rmcz3AM79Vdh5fkxZ88NmFy7gViuW7QiK06o"
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // localStorage.removeItem('accessToken');
      // localStorage.removeItem('user');
      // window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;