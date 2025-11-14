import React, { useEffect, useRef, useState } from 'react';
import { Breadcrumb, Card, Tabs, Button } from 'antd';
import { Link } from 'react-router-dom';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const agreementTabs = [
  { key: 'vip', label: '付费会员协议' },
  { key: 'agent', label: '代理商协议' },
  { key: 'privacy', label: '隐私协议' },
  { key: 'user', label: '用户协议' },
  { key: 'law', label: '法律协议' },
  { key: 'point', label: '积分协议' },
  { key: 'distribution', label: '分销协议' },
];

const AgreementSettings: React.FC = () => {
  const [activeKey, setActiveKey] = useState(agreementTabs[0].key);
  const [content, setContent] = useState('');
  const quillContainerRef = useRef<HTMLDivElement | null>(null);
  const quillToolbarRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);

  // Quill 工具栏模块的简易类型，用于解决 addHandler 的类型报错
  type QuillToolbarModule = { addHandler: (name: string, handler: () => void) => void };

  const save = () => {
    // 这里可对当前 activeKey 的协议内容进行保存
  };

  // 初始化一次，避免重复创建导致出现两行工具栏
  useEffect(() => {
    if (!quillContainerRef.current) return;

    // 清理可能残留的 Quill DOM（工具栏/内容），避免重复渲染产生两行工具栏
    const wrapper = quillContainerRef.current.parentElement;
    wrapper?.querySelectorAll('.ql-toolbar').forEach(el => el.remove());
    quillContainerRef.current.innerHTML = '';

    quillRef.current = new Quill(quillContainerRef.current, {
      theme: 'snow',
      modules: {
        // 直接绑定到真实 DOM 元素，避免选择器未被正确识别
        toolbar: quillToolbarRef.current || '#agreement-toolbar',
      },
      formats: [
        'header', 'font', 'size',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background', 'script',
        'blockquote', 'code-block',
        'list', 'indent',
        'align', 'link', 'image', 'clean'
      ],
    });

    // 设置初始内容
    quillRef.current.root.innerHTML = content || '';

    // 图片上传（转Base64）
    const toolbar = quillRef.current.getModule('toolbar') as QuillToolbarModule;
    if (toolbar && typeof (toolbar as any).addHandler === 'function') {
      toolbar.addHandler('image', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const range = quillRef.current!.getSelection(true);
            quillRef.current!.insertEmbed(range ? range.index : 0, 'image', reader.result as string, 'user');
          };
          reader.readAsDataURL(file);
        };
        input.click();
      });
    }

    // 内容变更监听
    quillRef.current.on('text-change', () => {
      setContent(quillRef.current!.root.innerHTML);
    });

    return () => {
      if (quillRef.current) {
        quillRef.current.off('text-change');
      }
    };
  }, []);

  return (
    <div className="page-container">
      <Breadcrumb items={[{ title: <Link to="/home">首页</Link> }, { title: '系统设置' }, { title: '协议设置' }]} />

      <Card style={{ marginTop: 16 }}>
        <Tabs
          activeKey={activeKey}
          items={agreementTabs.map(t => ({ key: t.key, label: t.label }))}
          onChange={setActiveKey}
        />

        {/* 自定义中文工具栏容器 */}
        <div id="agreement-toolbar" ref={quillToolbarRef} className="ql-toolbar ql-snow" style={{ border: '1px solid #e5e6eb', borderRadius: 6, borderBottom: 'none' }}>
          <span className="ql-formats">
            <select className="ql-header" defaultValue="">
              <option value="">正文</option>
              <option value="1">标题1</option>
              <option value="2">标题2</option>
              <option value="3">标题3</option>
              <option value="4">标题4</option>
              <option value="5">标题5</option>
              <option value="6">标题6</option>
            </select>
            <select className="ql-font" defaultValue="">
              <option value="">默认字体</option>
              <option value="serif">衬线</option>
              <option value="monospace">等宽</option>
            </select>
            <select className="ql-size" defaultValue="">
              <option value="small">小</option>
              <option value="">标准</option>
              <option value="large">大</option>
              <option value="huge">超大</option>
            </select>
          </span>

          <span className="ql-formats">
            <button className="ql-bold" title="加粗" />
            <button className="ql-italic" title="斜体" />
            <button className="ql-underline" title="下划线" />
            <button className="ql-strike" title="删除线" />
          </span>

          <span className="ql-formats">
            <select className="ql-color" />
            <select className="ql-background" />
            <button className="ql-script" value="sub" title="下标" />
            <button className="ql-script" value="super" title="上标" />
          </span>

          <span className="ql-formats">
            <button className="ql-blockquote" title="引用" />
            <button className="ql-code-block" title="代码块" />
          </span>

          <span className="ql-formats">
            <button className="ql-list" value="ordered" title="有序列表" />
            <button className="ql-list" value="bullet" title="无序列表" />
            <button className="ql-indent" value="-1" title="减少缩进" />
            <button className="ql-indent" value="+1" title="增加缩进" />
          </span>

          <span className="ql-formats">
            <button className="ql-align" value="" title="左对齐" />
            <button className="ql-align" value="center" title="居中对齐" />
            <button className="ql-align" value="right" title="右对齐" />
            <button className="ql-align" value="justify" title="两端对齐" />
          </span>

          <span className="ql-formats">
            <button className="ql-link" title="插入链接" />
            <button className="ql-image" title="插入图片" />
            <button className="ql-clean" title="清除格式" />
          </span>
        </div>

        <div style={{ border: '1px solid #e5e6eb', borderRadius: 6, overflow: 'hidden' }}>
          <div ref={quillContainerRef} style={{ height: 420 }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <Button type="primary" onClick={save}>保存</Button>
        </div>
      </Card>
    </div>
  );
};

export default AgreementSettings;