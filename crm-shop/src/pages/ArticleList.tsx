import React, { useState } from 'react';
import { Card, Form, Select, Input, Button, Table, Empty, Breadcrumb, Popconfirm, message, Switch, Divider, Upload, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import RichEditor from '../components/RichEditor';
import axios from 'axios';
import { API_BASE_URL } from '../config';

type Article = {
  serial: string;
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  time: string;
  status: 'on' | 'off';
};

const ArticleList: React.FC = () => {
  const [category, setCategory] = useState<string | undefined>();
  const [keyword, setKeyword] = useState<string>('');
  const [list, setList] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [categoryOptions, setCategoryOptions] = useState<{ label: string, value: string }[]>([]);
  const hasInitialized = React.useRef(false);

  const fetchCategoryMap = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/category/list`, { params: { category_type: 1 } });
      const data = res.data;
      if (data && data.code === 0 && data.data && Array.isArray(data.data.list)) {
        const opts: { label: string, value: string }[] = [];

        const process = (list: any[], level: number) => {
          list.forEach((item: any) => {
            const cid = String(item.category_id ?? '');
            const cname = String(item.category_name ?? '');
            if (cid) {
              const prefix = level > 0 ? '\u00A0\u00A0'.repeat(level) + '└ ' : '';
              opts.push({ label: prefix + cname, value: cid });
            }
            if (Array.isArray(item.child_list) && item.child_list.length > 0) {
              process(item.child_list, level + 1);
            }
          });
        };

        process(data.data.list, 0);
        setCategoryOptions(opts);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchArticleList = async (p: number = 1, ps: number = 10) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/article/list`, { params: { limit: ps, offset: p } });
      const data = res.data;
      if (data && data.code === 0 && data.data) {
        const arr = Array.isArray(data.data.list) ? data.data.list : [];
        const cnt = typeof data.data.count === 'number' ? data.data.count : 0;
        const rows: Article[] = arr.map((it: any) => ({
          serial: String(it.id ?? ''),
          id: String(it.article_id ?? ''),
          title: String(it.article_name ?? ''),
          categoryId: String(it.category_id ?? ''),
          categoryName: String(it.category_name ?? ''),
          time: String(it.created_at ?? ''),
          status: it.status === 'on' ? 'on' : 'off',
        }));
        setList(rows);
        setTotal(cnt);
        setPage(p);
        setPageSize(ps);
      } else {
        setList([]);
        setTotal(0);
      }
    } catch (e) {
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchCategoryMap().finally(() => {
        fetchArticleList(1, 10);
      });
    }
  }, []);



  const updateArticleStatusLocal = (id: string, checked: boolean) => {
    setList(prev => prev.map(a => a.id === id ? { ...a, status: checked ? 'on' : 'off' } : a));
  };

  const deleteArticle = async (id: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/article/delete`, { article_id: id });
      const data = res.data;
      if (data && data.code === 0) {
        message.success('操作成功');
        fetchArticleList(page, pageSize);
      } else {
        message.error((data && data.msg) || '删除失败');
      }
    } catch (e) {
      message.error('请求失败');
    }
  };

  const onAddOk = async () => {
    await addForm.validateFields();
    message.success('已添加文章');
    setAddOpen(false);
    addForm.resetFields();
  };

  const columns = [
    { title: '序号', dataIndex: 'serial', width: 100 },
    { title: 'ID', dataIndex: 'id', width: 240, render: (text: string) => (
      <Tooltip title={text}>
        <span style={{ maxWidth: 220, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {text}
        </span>
      </Tooltip>
    ) },
    { title: '文章名称', dataIndex: 'title' },
    { title: '所属分类', dataIndex: 'categoryName', width: 160 },
    { title: '发布状态', dataIndex: 'status', width: 160, render: (_: any, record: Article) => (
      <Switch
        checkedChildren="启用"
        unCheckedChildren="禁用"
        checked={record.status === 'on'}
        onChange={async (checked) => {
          try {
            const res = await axios.post(`${API_BASE_URL}/api/article/status`, {
              article_id: record.id,
              status: checked ? 'on' : 'off'
            });
            const data = res.data;
            if (data && data.code === 0) {
              message.success('状态更新成功');
              updateArticleStatusLocal(record.id, checked);
            } else {
              message.error((data && data.msg) || '状态更新失败');
            }
          } catch (e) {
            message.error('请求失败');
          }
        }}
      />
    ) },
    { title: '创建时间', dataIndex: 'time', width: 180 },
    { title: '操作', dataIndex: 'action', width: 200, render: (_: any, record: Article) => (
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="link">编辑</Button>
        <Popconfirm
          title="删除确认"
          description={`确定要删除${record.title}数据吗？`}
          okText="确定"
          cancelText="取消"
          onConfirm={() => deleteArticle(record.id)}
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
                  options={categoryOptions}
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
                dataSource={list}
                loading={loading}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 20, 50],
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: (p, ps) => { fetchArticleList(p, ps); },
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
                initialValues={{ title: '', category: undefined, content: '' }}
              >
                <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}> 
                  <Input placeholder="请输入" maxLength={80} showCount />
                </Form.Item>
                <Form.Item label="文章分类" name="category" rules={[{ required: true, message: '请选择分类' }]}> 
                  <Select placeholder="请选择" options={categoryOptions} />
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
