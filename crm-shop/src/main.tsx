import '@ant-design/v5-patch-for-react-19';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'antd/dist/reset.css';
import './App.css';
import axios from 'axios';
import { showError } from './utils/notify';

declare global {
  interface Window { __axios_interceptor_added?: boolean }
}
if (!window.__axios_interceptor_added) {
  window.__axios_interceptor_added = true;
  axios.interceptors.response.use(
    (resp) => resp,
    (error) => {
      showError(error?.message);
      return Promise.reject(error);
    }
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
