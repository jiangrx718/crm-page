import React, { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface RichEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  height?: number;
}

const RichEditor: React.FC<RichEditorProps> = ({ value, onChange, height = 500 }) => {
  const editorRef = useRef<any>(null);

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
        initialValue={value}
        value={value}
        onEditorChange={(newValue) => {
          if (onChange) {
            onChange(newValue);
          }
        }}
        init={{
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
        }}
      />
    </>
  );
};

export default RichEditor;
