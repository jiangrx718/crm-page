import { Modal } from 'antd';

declare global {
  interface Window {
    __errorModalOpen?: boolean;
    __errorLastShownAt?: number;
    __errorModalInst?: { destroy: () => void } | null;
  }
}

const THROTTLE_MS = 3000;

export const showError = (_msg?: string) => {
  const now = Date.now();
  const open = !!window.__errorModalOpen;
  const last = window.__errorLastShownAt || 0;
  if (open || now - last < THROTTLE_MS) return;
  window.__errorLastShownAt = now;
  window.__errorModalOpen = true;
  // 保证只存在一个错误弹窗
  Modal.destroyAll();
  window.__errorModalInst = Modal.error({
    title: '提示',
    content: (_msg && String(_msg).trim()) || '请求失败，请稍后重试',
    okText: '知道了',
    onOk: () => {
      window.__errorModalOpen = false;
      window.__errorModalInst?.destroy();
      window.__errorModalInst = null;
    },
    onCancel: () => {
      window.__errorModalOpen = false;
      window.__errorModalInst?.destroy();
      window.__errorModalInst = null;
    },
  });
};
