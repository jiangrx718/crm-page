import axios from 'axios';
import { eventBus } from './utils/eventBus';

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
  (response) => {
    const res = response.data;
    const url = response.config.url || '';
    
    // 判断是否为模型相关接口 (包含 /api/v1/)
    const isModelApi = url.includes('/api/v1/');
    
    // 定义成功状态码：模型接口为 10000，其他（如 CRM）为 0
    const isSuccess = isModelApi 
      ? (res.code == 10000) 
      : (res.code == 0);

    if (res && typeof res.code !== 'undefined' && !isSuccess) {
      console.log('Global Error Interceptor Triggered:', res);
      eventBus.emit('global_error', {
        type: 'warning',
        content: res.msg || '操作失败'
      });
    }
    return response;
  },
  (error) => {
    console.error('Global Error Interceptor (Network):', error);
    if (error.response) {
      // 优先显示接口返回的 msg
      const msg = error.response.data?.msg || '网络请求失败';
      eventBus.emit('global_error', {
        type: 'error',
        content: msg
      });
      
      if (error.response.status === 401) {
        try {
          localStorage.removeItem('authToken');
        } catch {}
        if (typeof window !== 'undefined') {
          window.location.hash = '#/login';
        }
      }
    } else {
      eventBus.emit('global_error', {
        type: 'error',
        content: error.message || '网络请求失败'
      });
    }
    return Promise.reject(error);
  }
);
