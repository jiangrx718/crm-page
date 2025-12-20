import React, { useRef, useMemo } from 'react';
import { Editor } from '@tinymce/tinymce-react';
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
    images_upload_handler: (blobInfo: any, _progress: any) => new Promise<string>((resolve, reject) => {
      const blob = blobInfo.blob();
      uploadFileToBackend(blob)
        .then((url) => {
          resolve(url);
        })
        .catch((err) => {
          reject('Image upload failed: ' + (err.message || err));
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
                // TinyMCE 的 file_picker_callback 没有标准的错误回调方式，通常只能 alert 或 console
                alert('Media upload failed: ' + (err.message || err));
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
