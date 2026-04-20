import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';
// Note: Empty string works well with relative paths if frontend/backend are on same domain,
// but for Render they are separate, so VITE_API_URL must be set in Render dashboard.

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accesspass_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accesspass_token');
      localStorage.removeItem('accesspass_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default client;
export { API_BASE };
