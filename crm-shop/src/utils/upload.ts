import axios from 'axios';

// 使用后端代理上传接口
const UPLOAD_API_URL = '/api/file/upload';

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

    if (response.data && response.data.url) {
      return response.data.url;
    } else if (typeof response.data === 'string') {
        return response.data;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error("File upload failed:", error);
    throw error;
  }
};
