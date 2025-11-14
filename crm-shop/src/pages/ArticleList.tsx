import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, Form, Select, Input, Button, Table, Empty, Breadcrumb, Popconfirm, message, Switch, Divider, Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

type Article = {
  id: number;
  title: string;
  category: string;
  views: number;
  time: string; // YYYY-MM-DD HH:mm
  status: 'published' | 'draft';
};

const categories = ['品牌资讯', '生活家居', '潮流文化', '🎧分类'];

const initialData: Article[] = Array.from({ length: 36 }, (_, i) => {
  const id = 237 + i;
  const cat = categories[i % categories.length];
  const titlePool = [
    '电影评谈 “618” 回归｜破圈新风尚',
    '联博观察｜考究美学迈向文化潮新时代',
    '鉴宇｜国内外KOL，初创团队评审会吵',
    '把温柔的日子放在盘里',
    '街头艺术周刊｜跨界装置展精选',
    '球鞋文化速递｜热门联名一览',
  ];
  return {
    id,
    title: titlePool[i % titlePool.length],
    category: cat,
    views: 200 + (i * 7) % 1300,
    time: `2025-04-${String(1 + (i % 9)).padStart(2, '0')} 16:${String(20 + (i % 40)).padStart(2, '0')}`,
    status: i % 3 === 0 ? 'draft' : 'published',
  };
});

const ArticleList: React.FC = () => {
  const [category, setCategory] = useState<string | undefined>();
  const [keyword, setKeyword] = useState<string>('');
  const [data, setData] = useState<Article[]>(initialData);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [content, setContent] = useState('');
  const quillContainerRef = useRef<HTMLDivElement | null>(null);
  const quillToolbarRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');
  // 全屏自适应高度：记录工具栏高度与视口高度
  const [toolbarHeight, setToolbarHeight] = useState(48);
  const [viewportHeight, setViewportHeight] = useState<number>(() => (typeof window !== 'undefined' ? window.innerHeight : 800));
  // 解决 toolbar handler 闭包状态不更新的问题
  const isHtmlModeRef = useRef<boolean>(false);
  const htmlSourceRef = useRef<string>('');
  useEffect(() => { isHtmlModeRef.current = isHtmlMode; }, [isHtmlMode]);
  useEffect(() => { htmlSourceRef.current = htmlSource; }, [htmlSource]);

  // 监听窗口变化并测量工具栏高度，用于全屏时动态计算编辑区高度
  useEffect(() => {
    const measure = () => {
      setToolbarHeight(quillToolbarRef.current?.offsetHeight || 48);
      if (typeof window !== 'undefined') setViewportHeight(window.innerHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [addOpen, isFullscreen, isHtmlMode]);

  const filtered = useMemo(() => (
    data.filter(item => {
      const byCat = category ? item.category === category : true;
      const byKw = keyword ? item.title.includes(keyword) : true;
      return byCat && byKw;
    })
  ), [data, category, keyword]);

  const paged = useMemo(() => (
    filtered.slice((page - 1) * pageSize, page * pageSize)
  ), [filtered, page, pageSize]);

  const removeById = (id: number) => {
    setData(prev => prev.filter(a => a.id !== id));
    message.success('已删除文章');
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const onAddOk = async () => {
    const values = await addForm.validateFields();
    const now = new Date();
    const time = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const nextId = Math.max(...data.map(d => d.id)) + 1;
    setData(prev => [
      { id: nextId, title: values.title, category: values.category, views: 0, time, status: 'draft' },
      ...prev,
    ]);
    message.success('已添加文章');
    setAddOpen(false);
    addForm.resetFields();
    setContent('');
  };

  // 初始化 Quill 编辑器（进入添加页时）
  useEffect(() => {
    if (!addOpen) return;
    if (!quillContainerRef.current) return;

    // 清理可能残留的工具栏与内容容器
    const wrapper = quillContainerRef.current.parentElement;
    wrapper?.querySelectorAll('.ql-toolbar').forEach(el => el.remove());
    quillContainerRef.current.innerHTML = '';

    // 注册分隔线 Blot（<hr/>）
    const BlockEmbed: any = (Quill as any).import('blots/block/embed');
    class DividerBlot extends BlockEmbed { static blotName = 'divider'; static tagName = 'hr'; }
    (Quill as any).register(DividerBlot);

    quillRef.current = new Quill(quillContainerRef.current, {
      theme: 'snow',
      modules: {
        toolbar: {
          container: quillToolbarRef.current || '#article-toolbar',
          handlers: {
            image: () => {
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
            },
            video: () => {
              const url = window.prompt('请输入视频地址（支持外链）');
              if (url) {
                const range = quillRef.current!.getSelection(true);
                quillRef.current!.insertEmbed(range ? range.index : 0, 'video', url, 'user');
              }
            },
            divider: () => {
              const range = quillRef.current!.getSelection(true);
              quillRef.current!.insertEmbed(range ? range.index : 0, 'divider', true, 'user');
            },
            fullscreen: () => {
              setIsFullscreen(prev => !prev);
            },
            html: () => {
              const next = !isHtmlModeRef.current;
              if (next) {
                const html = quillRef.current!.root.innerHTML;
                setHtmlSource(html);
                setIsHtmlMode(true);
                setContent(html);
                addForm.setFieldValue('content', html);
              } else {
                const html = htmlSourceRef.current || '';
                quillRef.current!.root.innerHTML = html;
                setIsHtmlMode(false);
                setContent(html);
                addForm.setFieldValue('content', html);
              }
            },
          }
        },
      },
      formats: [
        'header', 'font', 'size',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background', 'script',
        'blockquote', 'code-block',
        'list', 'indent',
        'align', 'link', 'image', 'video', 'divider'
      ],
    });

    // 初始内容同步
    const initHtml = addForm.getFieldValue('content') || content || '';
    quillRef.current.root.innerHTML = initHtml;

    // 监听文本变化同步到表单
    quillRef.current.on('text-change', () => {
      const html = quillRef.current!.root.innerHTML;
      setContent(html);
      addForm.setFieldValue('content', html);
    });

    return () => {
      if (quillRef.current) {
        quillRef.current.off('text-change');
      }
    };
  }, [addOpen]);

  // HTML 源码模式时，同步内容到表单
  useEffect(() => {
    if (isHtmlMode) {
      addForm.setFieldValue('content', htmlSource);
      setContent(htmlSource);
    }
  }, [isHtmlMode, htmlSource]);

  // 在源码模式下支持 ESC 快捷键返回富文本
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isHtmlMode && e.key === 'Escape' && quillRef.current) {
        quillRef.current.root.innerHTML = htmlSource || '';
        setIsHtmlMode(false);
        setContent(htmlSource || '');
        addForm.setFieldValue('content', htmlSource || '');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isHtmlMode, htmlSource]);

  // 全屏时禁用页面滚动
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFullscreen]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '文章名称', dataIndex: 'title' },
    { title: '所属分类', dataIndex: 'category', width: 160 },
    { title: '发布状态', dataIndex: 'status', width: 120, render: (_: any, record: Article) => (
      <Switch
        checkedChildren="已发布"
        unCheckedChildren="未发布"
        checked={record.status === 'published'}
        onChange={(checked) => setData(prev => prev.map(a => a.id === record.id ? { ...a, status: checked ? 'published' : 'draft' } : a))}
      />
    ) },
    { title: '浏览量', dataIndex: 'views', width: 100 },
    { title: '时间', dataIndex: 'time', width: 180 },
    { title: '操作', dataIndex: 'action', width: 200, render: (_: any, record: Article) => (
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="link">编辑</Button>
        <Popconfirm
          title="确认删除当前文章吗？"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => removeById(record.id)}
        >
          <Button type="link" danger>删除</Button>
        </Popconfirm>
      </div>
    ) }
  ];

  return (
    <div>
      <Card>
        <Breadcrumb style={{ marginBottom: 20 }}>
          <Breadcrumb.Item>
            <Link to="/home">首页</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>内容管理</Breadcrumb.Item>
          <Breadcrumb.Item>文章列表</Breadcrumb.Item>
        </Breadcrumb>

        {/* 列表视图 / 添加视图 切换渲染在红框区域 */}
        {!addOpen ? (
          <>
            <Form layout="inline" style={{ background: '#f7f8fa', padding: 16, borderRadius: 8 }}>
              <Form.Item label="文章分类">
                <Select
                  style={{ width: 220 }}
                  placeholder="请选择"
                  value={category}
                  onChange={setCategory}
                  options={categories.map(c => ({ value: c, label: c }))}
                  allowClear
                />
              </Form.Item>
              <Form.Item label="文章搜索">
                <Input
                  style={{ width: 280 }}
                  placeholder="请输入"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary">查询</Button>
              </Form.Item>
            </Form>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
              <Button type="primary" size="small" onClick={() => setAddOpen(true)}>添加文章</Button>
            </div>

            <div style={{ marginTop: 16 }}>
              <Table
                columns={columns}
                dataSource={paged}
                pagination={{
                  current: page,
                  pageSize,
                  total: filtered.length,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 20, 50],
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                }}
                locale={{ emptyText: <Empty description="暂无数据" /> }}
                rowKey="id"
              />
            </div>
          </>
        ) : (
          <div style={{ marginTop: 8 }}>
            {/* 顶部操作栏 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>添加文章</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => { setAddOpen(false); addForm.resetFields(); }}>取消</Button>
                <Button type="primary" onClick={onAddOk}>保存</Button>
              </div>
            </div>

            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, background: '#fff', maxHeight: '70vh', overflow: 'auto' }}>
              <Divider orientation="center">文章信息</Divider>
              <Form
                form={addForm}
                layout="vertical"
                initialValues={{ title: '', author: '', summary: '', category: undefined, content: '' }}
              >
                <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}> 
                  <Input placeholder="请输入" maxLength={80} showCount />
                </Form.Item>
                <Form.Item label="文章分类" name="category" rules={[{ required: true, message: '请选择分类' }]}> 
                  <Select placeholder="请选择" options={categories.map(c => ({ value: c, label: c }))} />
                </Form.Item>
                <Form.Item 
                  label={(
                    <span>
                      图文封面
                      <span style={{ color: '#999', fontSize: 12, marginLeft: 6 }}>(建议尺寸：500 x 312 px)</span>
                    </span>
                  )}
                  name="cover"
                  valuePropName="fileList"
                  getValueFromEvent={(e) => e?.fileList}
                > 
                  <Upload listType="picture-card" beforeUpload={() => false}>
                    <div>
                      <PlusOutlined />
                    </div>
                  </Upload>
                </Form.Item>
                {/* 尺寸提示已合并到标签中 */}
                <Form.Item label="作者" name="author"> 
                  <Input placeholder="请输入" maxLength={10} showCount />
                </Form.Item>
                <Form.Item label="文章简介" name="summary"> 
                  <Input.TextArea placeholder="请输入" rows={3} maxLength={300} showCount />
                </Form.Item>
                {/* 封面上传区域如上，保持与上传图样式一致 */}

                <Divider orientation="center">文章内容</Divider>
                <Form.Item label="文章内容" name="content" rules={[{ required: true, message: '请输入文章内容' }]}> 
                  <div ref={editorWrapperRef} style={isFullscreen ? { position: 'fixed', inset: 0, zIndex: 1000, background: '#fff', padding: 16 } : undefined}>
                    {/* 工具栏：与协议设置页一致，并补充 HTML/分隔线/全屏 */}
                    <div id="article-toolbar" ref={quillToolbarRef} className="ql-toolbar ql-snow" style={{ border: '1px solid #e5e6eb', borderRadius: 6, borderBottom: 'none', display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 4, overflowX: 'auto', position: 'sticky', top: 0, zIndex: 5, background: '#fff', width: '100%' }}>
                      <span className="ql-formats">
                        <button
                          className="ql-html"
                          title={isHtmlMode ? '可视化界面' : 'HTML'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 28,
                            lineHeight: '28px',
                            width: 'auto',
                            minWidth: 44,
                            padding: '0 10px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            background: isHtmlMode ? '#efefef' : 'transparent',
                          }}
                        >
                          {isHtmlMode ? '可视化界面' : 'HTML'}
                        </button>
                      </span>
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
                        <button className="ql-divider" title="分隔线">
                          {/* 自定义分隔线图标：一条水平线 */}
                          <svg viewBox="0 0 18 18" width="18" height="18">
                            <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        </button>
                        <button className="ql-video" title="插入视频" />
                        <button className="ql-fullscreen" title="全屏" aria-label="全屏">
                          {/* 全屏图标：四角扩展 */}
                          <svg viewBox="0 0 18 18" width="18" height="18">
                            <path d="M3 7V3h4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M15 11v4h-4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M7 15H3v-4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M11 3h4v4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        </button>
                      </span>
                    </div>
                    <div style={{ border: '1px solid #e5e6eb', borderRadius: 6, overflow: 'hidden' }}>
                      {/* 始终保留 Quill 容器，避免切换模式时卸载导致编辑器失效 */}
                      <div ref={quillContainerRef} style={{ height: isFullscreen ? Math.max(300, viewportHeight - 32 - toolbarHeight) : 560, display: isHtmlMode ? 'none' : 'block' }} />
                      {isHtmlMode && (
                        <textarea
                          value={htmlSource}
                          onChange={(e) => setHtmlSource(e.target.value)}
                          style={{ height: isFullscreen ? Math.max(300, viewportHeight - 32 - toolbarHeight) : 560, width: '100%', fontFamily: 'monospace', fontSize: 12, lineHeight: '20px', border: 'none', outline: 'none', padding: 12 }}
                        />
                      )}
                    </div>
                    {isFullscreen && (
                      <div style={{ position: 'fixed', top: 12, right: 16, zIndex: 1001 }}>
                        <Button onClick={() => setIsFullscreen(false)}>退出全屏</Button>
                      </div>
                    )}
                  </div>
                </Form.Item>
              </Form>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ArticleList;