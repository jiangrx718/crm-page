import axios from 'axios';
import { API_BASE_URL } from '../config';

// 使用后端代理上传接口
const UPLOAD_API_URL = `${API_BASE_URL}/api/file/upload`;

export const uploadFileToBackend = async (file: File | Blob): Promise<string> => {
  const formData = new FormData();
  // 如果是 Blob 且没有 name，给一个默认文件名
  if (file instanceof Blob && !(file as File).name) {
    formData.append('file', file, `file_${Date.now()}`);
  } else {
    formData.append('file', file);
  }

  try {
    const response = await axios.post(UPLOAD_API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = response.data;
    if (data && data.code === 0 && data.data) {
      const previewUrl = data.data.preview_url;
      if (previewUrl) {
        return previewUrl;
      }
      throw new Error('preview_url missing');
    }
    const msg = (data && (data.message || data.msg)) || '上传失败';
    throw new Error(msg);
  } catch (error) {
    console.error("File upload failed:", error);
    throw error;
  }
};
