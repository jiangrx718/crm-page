import axios from 'axios';
import { eventBus } from './utils/eventBus';
import { showError } from './utils/notify';

const isLocal = typeof window !== 'undefined' && window.location.origin.startsWith('http://localhost');
export const API_BASE_URL = isLocal ? 'http://127.0.0.1:8080' : 'http://192.168.64.2:30080';

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
    // 任何接口响应都尝试结束全局 loading
    eventBus.emit('stop_loading');

    const res = response.data;
    const url = response.config.url || '';
    const status = (response as any)?.status;
    
    // 判断是否为模型相关接口 (包含 /api/v1/)
    const isModelApi = url.includes('/api/v1/');
    
    // 定义成功状态码：模型接口为 10000，其他（如 CRM）为 0
    const isSuccess = isModelApi 
      ? (res.code == 10000) 
      : (res.code == 0);

    if (res && typeof res.code !== 'undefined' && !isSuccess) {
      const rawMsg = res.msg || '';
      const isForbidden =
        status === 403 ||
        res.code === 403 ||
        (typeof rawMsg === 'string' && /forbidden/i.test(rawMsg));
      if (isForbidden) {
        showError('Request failed with status code 403');
      } else {
        eventBus.emit('global_error', {
          type: 'error',
          content: rawMsg || '操作失败'
        });
      }
    }
    return response;
  },
  (error) => {
    // 接口错误也尝试结束全局 loading
    eventBus.emit('stop_loading');

    console.error('Global Error Interceptor (Network):', error);
    if (error.response) {
      // 优先显示接口返回的 msg
      const status = error.response.status;
      const serverMsg = error.response.data?.msg;
      const isForbidden =
        status === 403 ||
        (typeof serverMsg === 'string' && /forbidden/i.test(serverMsg));
      if (isForbidden) {
        showError('Request failed with status code 403');
      } else {
        const msg = serverMsg || '网络请求失败';
        eventBus.emit('global_error', {
          type: 'error',
          content: msg
        });
      }
      
      if (error.response.status === 401) {
        try {
          localStorage.removeItem('authToken');
        } catch {}
        if (typeof window !== 'undefined') {
          window.location.hash = '#/login';
        }
      }
    } else {
      showError(error.message || '网络请求失败');
    }
    return Promise.reject(error);
  }
);
