import axios from 'axios';
const isLocal = typeof window !== 'undefined' && window.location.origin.startsWith('http://localhost');
export const API_BASE_URL = isLocal ? 'http://127.0.0.1:8080' : 'http://127.0.0.1:8080';

// 配置 axios
axios.defaults.timeout = 30000;
axios.defaults.withCredentials = false;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// 请求拦截器：动态获取并设置 token
axios.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) {
      config.headers['Authorization'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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
