import axios from 'axios';
const isLocal = typeof window !== 'undefined' && window.location.origin.startsWith('http://localhost');
export const API_BASE_URL = isLocal ? 'http://127.0.0.1:8080' : 'http://127.0.0.1:8080';
const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// 配置 axios
axios.defaults.timeout = 30000;
axios.defaults.withCredentials = false;
axios.defaults.headers.common['Content-Type'] = 'application/json';

if (token) {
  axios.defaults.headers.common['Authorization'] = token;
}

// 响应拦截器
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error && error.response && error.response.status === 401) {
      try {
        localStorage.removeItem('authToken');
      } catch {}
      if (typeof window !== 'undefined') {
        window.location.hash = '#/login';
      }
    }
    return Promise.reject(error);
  }
);
