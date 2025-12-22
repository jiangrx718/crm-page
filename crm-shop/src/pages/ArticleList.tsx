import React, { useState } from 'react';
import { Card, Form, Select, Input, Button, Table, Empty, Breadcrumb, Popconfirm, message, Switch, Divider, Upload, Tooltip, Radio, DatePicker } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import RichEditor from '../components/RichEditor';
import axios from 'axios';
import dayjs from 'dayjs';
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
  const [isScheduled, setIsScheduled] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
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
      const res = await axios.get(`${API_BASE_URL}/api/article/list`, { 
        params: { 
          limit: ps, 
          offset: p,
          article_name: keyword,
          category_id: category || ''
        } 
      });
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

  const handleEdit = async (record: Article) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/article/detail`, { params: { article_id: record.id } });
      const data = res.data;
      if (data && data.code === 0 && data.data) {
        const d = data.data;
        setEditId(record.id);
        setAddOpen(true);
        setIsScheduled(!!d.publish_time);
        addForm.setFieldsValue({
          title: d.article_name,
          category: String(d.category_id),
          content: d.article_content,
          status: d.status,
          is_scheduled: !!d.publish_time,
          publish_time: d.publish_time ? dayjs(d.publish_time) : undefined,
          position: d.position || 0,
          cover: d.article_image ? [{
            uid: '-1',
            name: 'image.png',
            status: 'done',
            url: d.article_image,
            object_name: d.article_image,
          }] : []
        });
      } else {
        message.error((data && data.msg) || '获取详情失败');
      }
    } catch (e) {
      message.error('请求失败');
    }
  };

  const onAddOk = async () => {
    try {
      const values = await addForm.validateFields();
      const coverItem = values.cover?.[0];
      const articleImage = coverItem?.object_name || coverItem?.response?.data?.object_name || '';
      const params: any = {
        category_id: values.category,
        article_name: values.title,
        article_image: articleImage,
        position: Number(values.position) || 0,
        status: values.status,
        article_content: values.content,
        publish_time: values.is_scheduled && values.publish_time ? values.publish_time.format('YYYY-MM-DD HH:mm:ss') : ''
      };

      let res;
      if (editId) {
        params.article_id = editId;
        res = await axios.post(`${API_BASE_URL}/api/article/update`, params);
      } else {
        res = await axios.post(`${API_BASE_URL}/api/article/create`, params);
      }

      if (res.data.code === 0) {
        message.success(editId ? '已保存文章' : '已添加文章');
        setAddOpen(false);
        addForm.resetFields();
        setIsScheduled(false);
        setEditId(undefined);
        fetchArticleList(page, pageSize); // Keep current page if editing? usually go to first page or refresh. user didn't specify. I'll stick to current page logic if possible but usually adding goes to 1. editing stays.
        // Line 144 was fetchArticleList(1, pageSize);
        // I should probably keep page for edit, reset to 1 for add.
        // But for simplicity, I'll follow existing pattern or improve it.
        // If edit, page is page. If add, 1.
        if (editId) {
            fetchArticleList(page, pageSize);
        } else {
            fetchArticleList(1, pageSize);
        }
      } else {
        message.error(res.data.msg || (editId ? '保存失败' : '添加失败'));
      }
    } catch (e) {
      // form validation error or api error
      console.error(e);
      if (axios.isAxiosError(e)) {
         message.error('请求失败');
      }
    }
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
        <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
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
                <Button type="primary" onClick={() => fetchArticleList(1, pageSize)}>查询</Button>
              </Form.Item>
            </Form>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
              <Button type="primary" size="small" onClick={() => {
                setEditId(undefined);
                addForm.resetFields();
                setIsScheduled(false);
                setAddOpen(true);
              }}>添加文章</Button>
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
              <div style={{ fontWeight: 600 }}>{editId ? '编辑文章' : '添加文章'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => { setAddOpen(false); addForm.resetFields(); setIsScheduled(false); setEditId(undefined); }}>取消</Button>
                <Button type="primary" onClick={onAddOk}>保存</Button>
              </div>
            </div>

            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, background: '#fff', maxHeight: '70vh', overflow: 'auto' }}>
              <Divider orientation="center">文章信息</Divider>
              <Form
                form={addForm}
                layout="vertical"
                initialValues={{ title: '', category: undefined, content: '', status: 'on', is_scheduled: false, position: 0 }}
                onValuesChange={(changedValues) => {
                  if (changedValues.is_scheduled !== undefined) {
                    setIsScheduled(changedValues.is_scheduled);
                  }
                }}
              >
                <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}> 
                  <Input placeholder="请输入" maxLength={80} showCount />
                </Form.Item>
                <Form.Item label="文章分类" name="category" rules={[{ required: true, message: '请选择分类' }]}> 
                  <Select placeholder="请选择" options={categoryOptions} />
                </Form.Item>
                <Form.Item label="排序" name="position">
                  <Input type="number" placeholder="请输入排序值" />
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
                  <Upload
                    listType="picture-card"
                    maxCount={1}
                    customRequest={async (options: any) => {
                      const { file, onSuccess, onError, onProgress } = options;
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const res = await axios.post(`${API_BASE_URL}/api/file/upload`, formData, {
                          headers: { 'Content-Type': 'multipart/form-data' },
                          onUploadProgress: (evt) => {
                            const total = evt.total || 1;
                            const percent = Math.round((evt.loaded / total) * 100);
                            onProgress?.({ percent });
                          }
                        });
                        if (res?.data?.code === 0) {
                          const previewUrl = res.data?.data?.preview_url || '';
                          const objectName = res.data?.data?.object_name || '';
                          // 将预览地址写入文件项的 url，便于表单直接读取
                          options.file.url = previewUrl;
                          (options.file as any).object_name = objectName;
                          onSuccess?.(res.data);
                        } else {
                          onError?.(new Error(res?.data?.message || res?.data?.msg || '上传失败'));
                        }
                      } catch (err: any) {
                        onError?.(err);
                      }
                    }}
                    onChange={({ file, fileList }) => {
                      if (file.status === 'done') {
                        const url = (file as any)?.url || (file as any)?.response?.data?.preview_url || '';
                        const objectName = (file as any)?.object_name || (file as any)?.response?.data?.object_name || '';
                        const patched = fileList.map((f: any) => (f.uid === file.uid ? { ...f, url, object_name: objectName } : f));
                        addForm.setFieldsValue({ cover: patched });
                      }
                    }}
                  >
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
                <Form.Item label="状态" name="status">
                  <Radio.Group>
                    <Radio value="on">启用</Radio>
                    <Radio value="off">禁用</Radio>
                  </Radio.Group>
                </Form.Item>
                <Form.Item label="定时发布" name="is_scheduled" valuePropName="checked">
                  <Switch />
                </Form.Item>
                {isScheduled && (
                  <Form.Item label="发布时间" name="publish_time" rules={[{ required: true, message: '请选择发布时间' }]}>
                    <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" placeholder="请选择发布时间" />
                  </Form.Item>
                )}
              </Form>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ArticleList;
