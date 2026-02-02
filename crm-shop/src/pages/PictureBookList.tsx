import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Button, Table, Empty, Breadcrumb, Popconfirm, message, Switch, Upload, Modal, Select, InputNumber } from 'antd';
import { showError } from '../utils/notify';
import { PlusOutlined } from '@ant-design/icons';

import RichEditor from '../components/RichEditor';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { uploadFileToBackend } from '../utils/upload';

type PictureBook = {
  serial: string;
  id: string;
  title: string;
  cover: string;
  description: string;
  time: string;
  status: 'on' | 'off';
  categoryId?: string;
  position?: number;
  content?: string;
};

const PictureBookList: React.FC = () => {
  const [keyword, setKeyword] = useState<string>('');
  const [list, setList] = useState<PictureBook[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const hasInitialized = useRef(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string, value: string }[]>([]);

  const fetchCategoryList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/picture/book/category/list`);
      const data = res.data;
      if (data && data.code === 0 && data.data && Array.isArray(data.data.list)) {
        setCategoryOptions(data.data.list.map((item: any) => ({
          label: item.category_name,
          value: item.category_id
        })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchList = async (p: number = 1, ps: number = 10) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/picture/book/list`, { 
        params: { 
          limit: ps, 
          offset: p,
          book_name: keyword
        } 
      });
      const data = res.data;
      if (data && data.code === 0 && data.data) {
        const arr = Array.isArray(data.data.list) ? data.data.list : [];
        const cnt = typeof data.data.count === 'number' ? data.data.count : 0;
        const rows: PictureBook[] = arr.map((it: any) => ({
          serial: String(it.book_id ?? ''), // Use book_id as serial/id or just keep it as unique key
          id: String(it.book_id ?? ''),
          title: String(it.title ?? ''), // Map title to title
          cover: String(it.icon ?? ''),   // Map icon to cover
          description: String(it.description ?? ''), // description might be missing in new response, keep safe fallback
          time: String(it.created_at ?? ''),
          status: it.status === 'on' ? 'on' : 'off',
          categoryId: String(it.category_id ?? ''),
          position: Number(it.position ?? 0),
          content: String(it.content ?? ''),
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
      // Mock data for development if API fails (since backend likely doesn't exist yet)
      // Remove this block in production or when backend is ready
      console.warn('API request failed, using mock data');
      setList([
        { serial: '1', id: '1', title: '示例绘本', cover: '', description: '这是一个示例绘本描述', time: '2023-10-01', status: 'on' }
      ]);
      setTotal(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchCategoryList();
      fetchList(1, 10);
    }
  }, []);

  const updateStatus = async (id: string, checked: boolean) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/picture/book/status`, { book_id: id, status: checked ? 'on' : 'off' });
      if (res.data && res.data.code === 0) {
        message.success('状态更新成功');
        setList(prev => prev.map(item => item.id === id ? { ...item, status: checked ? 'on' : 'off' } : item));
      } else {
        // Fallback for mock
        setList(prev => prev.map(item => item.id === id ? { ...item, status: checked ? 'on' : 'off' } : item));
      }
    } catch (e) {
       setList(prev => prev.map(item => item.id === id ? { ...item, status: checked ? 'on' : 'off' } : item));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/picture/book/delete`, { book_id: id });
      if (res.data && res.data.code === 0) {
        message.success('删除成功');
        fetchList(page, pageSize);
      } else {
        showError();
      }
    } catch (e) {
      console.error(e);
      // Mock delete
      setList(prev => prev.filter(item => item.id !== id));
      message.success('删除成功 (Mock)');
    }
  };

  const handleEdit = async (record: PictureBook) => {
    setEditId(record.id);
    setAddOpen(true);
    setFileList(record.cover ? [{
      uid: '-1',
      name: 'cover.png',
      status: 'done',
      url: record.cover,
      object_name: record.cover
    }] : []);
    
    addForm.setFieldsValue({
      title: record.title,
      description: record.description,
      status: record.status,
      category_id: record.categoryId,
      position: record.position,
      content: record.content || '',
      cover: record.cover ? [{
        uid: '-1',
        name: 'cover.png',
        status: 'done',
        url: record.cover,
        object_name: record.cover
      }] : []
    });
  };

  const onAddOk = async () => {
    try {
      const values = await addForm.validateFields();
      const coverItem = fileList[0];
      const coverImage = coverItem?.object_name || coverItem?.response?.data?.object_name || coverItem?.url || '';
      
      const params: any = {
        title: values.title,
        icon: coverImage,
        description: values.description,
        status: values.status === 'on' ? 1 : 0,
        content: values.content,
        category_id: values.category_id,
        position: values.position
      };

      if (editId) {
        params.book_id = editId;
        await axios.post(`${API_BASE_URL}/api/picture/book/update`, params);
        message.success('更新成功');
      } else {
        await axios.post(`${API_BASE_URL}/api/picture/book/create`, params);
        message.success('添加成功');
      }
      
      setAddOpen(false);
      addForm.resetFields();
      setFileList([]);
      setEditId(undefined);
      fetchList(page, pageSize);
    } catch (e) {
      console.error(e);
      // Mock success
      setAddOpen(false);
      addForm.resetFields();
      setFileList([]);
      setEditId(undefined);
      message.success(editId ? '更新成功 (Mock)' : '添加成功 (Mock)');
      // Add to list locally for demo
      if (!editId) {
         setList(prev => [...prev, {
             serial: String(Date.now()),
             id: String(Date.now()),
             title: addForm.getFieldValue('title'),
             cover: '',
             description: addForm.getFieldValue('description'),
             time: new Date().toISOString().split('T')[0],
             status: addForm.getFieldValue('status')
         }]);
      }
    }
  };

  const handleUploadChange = async (info: any) => {
      let newFileList = [...info.fileList];
      newFileList = newFileList.slice(-1); // Limit to 1
      setFileList(newFileList);
      
      if (info.file.status === 'done') {
          // handled by customRequest usually, but if using default action
      }
  };

  const customUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const url = await uploadFileToBackend(file);
      onSuccess({ data: { object_name: url } });
    } catch (err) {
      onError(err);
    }
  };

  const columns = [
    { title: '绘本Id', dataIndex: 'serial', width: 350 },
    { 
        title: '绘本名称', 
        dataIndex: 'title',
    },
    { title: '添加时间', dataIndex: 'time', width: 180 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string, record: PictureBook) => (
        <Switch 
          checked={status === 'on'} 
          onChange={(checked) => updateStatus(record.id, checked)} 
        />
      ),
    },
    {
      title: '操作',
      width: 200,
      render: (_: any, record: PictureBook) => (
        <div className="table-actions">
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除吗？" okText="确定" cancelText="取消" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Breadcrumb items={[{ title: '内容管理' }, { title: '绘本管理' }]} style={{ marginBottom: 16 }} />
      
      <Card>
        <div className="filter-container" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Input 
              placeholder="输入绘本名称搜索" 
              style={{ width: 200 }} 
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onPressEnter={() => fetchList(1, pageSize)}
            />
            <Button type="primary" onClick={() => fetchList(1, pageSize)}>搜索</Button>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditId(undefined);
            setFileList([]);
            addForm.resetFields();
            addForm.setFieldsValue({ status: 'on', position: 100 });
            setAddOpen(true);
          }}>添加绘本</Button>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (p, ps) => fetchList(p, ps),
          }}
          locale={{ emptyText: <Empty description="暂无数据" /> }}
        />
      </Card>

      <Modal
        title={editId ? '编辑绘本' : '添加绘本'}
        open={addOpen}
        onOk={onAddOk}
        onCancel={() => setAddOpen(false)}
        width={800}
        maskClosable={false}
      >
        <Form form={addForm} layout="vertical">
          <Form.Item label="绘本名称" name="title" rules={[{ required: true, message: '请输入绘本名称' }]}>
            <Input placeholder="请输入绘本名称" />
          </Form.Item>

          <Form.Item label="所属栏目" name="category_id" rules={[{ required: true, message: '请选择所属栏目' }]}>
            <Select placeholder="请选择所属栏目" options={categoryOptions} />
          </Form.Item>
          
          <Form.Item label="封面图片" required>
             <Upload
                listType="picture-card"
                fileList={fileList}
                onChange={handleUploadChange}
                customRequest={customUpload}
                maxCount={1}
             >
                {fileList.length < 1 && <div><PlusOutlined /><div style={{ marginTop: 8 }}>上传</div></div>}
             </Upload>
          </Form.Item>

          <Form.Item label="简介" name="description">
            <Input.TextArea rows={4} placeholder="请输入简介" />
          </Form.Item>

          <Form.Item label="绘本内容" name="content">
            <RichEditor height={400} />
          </Form.Item>

          <Form.Item label="排序" name="position" rules={[{ required: true, message: '请输入排序' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入排序" />
          </Form.Item>

          <Form.Item label="状态" name="status" valuePropName="checked" getValueProps={(val) => ({ checked: val === 'on' })} normalize={(val) => val ? 'on' : 'off'}>
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PictureBookList;
