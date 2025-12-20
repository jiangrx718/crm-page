import React, { useRef, useMemo } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { message } from 'antd';
import { uploadFileToBackend } from '../utils/upload';

interface RichEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  height?: number;
}

const RichEditor: React.FC<RichEditorProps> = ({ value, onChange, height = 500 }) => {
  const editorRef = useRef<any>(null);
  // 使用 useRef 存储初始 value，确保 initialValue 在组件更新时不会变，避免 TinyMCE 重新初始化或重置光标
  const initialValueRef = useRef(value);

  const initConfig = useMemo(() => ({
    language: 'zh_CN',
    language_url: '/tinymce/langs/zh_CN.js',
    height: height,
    menubar: true,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
    ],
    toolbar: 'undo redo | blocks | ' +
      'bold italic forecolor | alignleft aligncenter ' +
      'alignright alignjustify | bullist numlist outdent indent | ' +
      'removeformat | help',
    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
    images_upload_handler: (blobInfo: any, _progress: any) => new Promise<string>((resolve, _reject) => {
      const blob = blobInfo.blob();
      uploadFileToBackend(blob)
        .then((url) => {
          resolve(url);
        })
        .catch((err) => {
          console.error('Image upload failed:', err);
          message.error('图片上传失败: ' + (err.message || err));
          
          // 为了避免 TinyMCE 弹出错误提示框，我们这里必须 resolve。
          // 策略：resolve 一个特定的“失败标识 URL”，然后利用 setTimeout 在编辑器渲染出这个图片后立即将其删除。
          // 这样既避开了弹窗，又不会在编辑器里留下垃圾图片。
          const failId = `upload-failed-${Date.now()}`;
          
          // 延迟执行删除操作，等待 TinyMCE 将 resolve 的 URL 插入到 DOM 中
          setTimeout(() => {
            if (editorRef.current) {
              // 查找 src 匹配 failId 的 img 标签并移除
              const imgs = editorRef.current.dom.select(`img[src="${failId}"]`);
              editorRef.current.dom.remove(imgs);
            }
          }, 100);
          
          resolve(failId);
        });
    }),
    file_picker_callback: (callback: any, _value: any, meta: any) => {
      // 仅处理多媒体文件（如视频、音频等），图片由 images_upload_handler 处理
      if (meta.filetype === 'media') {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'video/*,audio/*');
        input.onchange = function () {
          const file = (this as HTMLInputElement).files?.[0];
          if (file) {
            uploadFileToBackend(file)
              .then((url) => {
                callback(url, { title: file.name });
              })
              .catch((err) => {
                console.error('Media upload failed:', err);
                message.error('多媒体上传失败: ' + (err.message || err));
              });
          }
        };
        input.click();
      }
    },
  }), [height]);

  return (
    <>
      <style>{`
        /* 隐藏 TinyMCE 右上角的 "Explore trial" 推广按钮 */
        .tox-promotion {
          display: none !important;
        }
      `}</style>
      <Editor
        apiKey="cusr1xg6mls93emhkpuw2cp9kpzd6jlot5vek4wpzx38xotz"
        onInit={(_evt, editor) => editorRef.current = editor}
        initialValue={initialValueRef.current}
        onEditorChange={(newValue) => {
          if (onChange) {
            onChange(newValue);
          }
        }}
        init={initConfig}
      />
    </>
  );
};

export default RichEditor;
