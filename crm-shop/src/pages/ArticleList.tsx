import React, { useMemo, useState } from 'react';
import { Card, Form, Select, Input, Button, Table, Empty, Breadcrumb, Popconfirm, message, Switch, Divider, Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import RichEditor from '../components/RichEditor';

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
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '文章名称', dataIndex: 'title' },
    { title: '所属分类', dataIndex: 'category', width: 160 },
    { title: '发布状态', dataIndex: 'status', width: 120, render: (_: any, record: Article) => (
      <Switch
        checkedChildren="已发布"
        unCheckedChildren="未发布"
        checked={record.status === 'published'}
        onChange={(checked) => setData(prev => prev.map(a => a.id === record.id ? { ...a, status: (checked ? 'published' : 'draft') as Article['status'] } : a))}
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
        <Breadcrumb
          style={{ marginBottom: 20 }}
          items={[
            { title: <Link to="/home">首页</Link> },
            { title: '内容管理' },
            { title: '文章列表' },
          ]}
        />

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
                  <RichEditor />
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