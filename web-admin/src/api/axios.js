import axios from 'axios';

// When running inside Tauri desktop, API calls must use absolute URL
// since the frontend is served from local files, not from nginx.
// In browser (Docker/nginx), relative '/api' works fine.
const isTauri = Boolean(window.__TAURI_INTERNALS__);
const baseURL = import.meta.env.VITE_API_URL
  || (isTauri ? 'http://localhost/api' : '/api');

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Note: The request interceptor that attaches the JWT is now managed
// by AuthContext (token is stored in memory, not localStorage).

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
