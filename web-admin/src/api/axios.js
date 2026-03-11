import axios from 'axios';

// When running inside Tauri desktop, API calls must use absolute URL
// since the frontend is served from local files, not from nginx.
// In browser (Docker/nginx), relative '/api' works fine.
const isTauri = Boolean(window.__TAURI_INTERNALS__);

function getBaseURL() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (!isTauri) return '/api';
  // Desktop: read saved server URL or prompt user via login page
  const saved = localStorage.getItem('serverUrl');
  return saved ? `${saved.replace(/\/+$/, '')}/api` : '/api';
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Update the API base URL at runtime (used by desktop app server config).
 */
export function setServerUrl(url) {
  const normalized = url.replace(/\/+$/, '');
  localStorage.setItem('serverUrl', normalized);
  api.defaults.baseURL = `${normalized}/api`;
}

export function getServerUrl() {
  return localStorage.getItem('serverUrl') || '';
}

export { isTauri };

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
