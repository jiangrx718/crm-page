import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Button, Table, Empty, Popconfirm, message, Modal, Switch, InputNumber } from 'antd';
import { showError } from '../utils/notify';
import { PlusOutlined } from '@ant-design/icons';
import PageHeader from '../components/PageHeader';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

type Grade = {
  id: string;
  name: string;
  status: string;
  position: number;
  chapterCount: number;
  time: string;
};

const MathematicsList: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<Grade[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const hasInitialized = useRef(false);

  const fetchList = async (p = 1, ps = 10) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/mathematics/list`, {
        params: { limit: ps, offset: (p - 1) * ps, name: keyword }
      });
      const data = res.data;
      if (data?.code === 0 && data.data) {
        const arr = Array.isArray(data.data.list) ? data.data.list : [];
        const cnt = typeof data.data.count === 'number' ? data.data.count : 0;
        setList(arr.map((it: any) => ({
          id: String(it.mathematics_id ?? ''),
          name: String(it.name ?? ''),
          status: String(it.status ?? 'on'),
          position: Number(it.position ?? 0),
          chapterCount: Number(it.chapter_count ?? 0),
          time: String(it.created_at ?? ''),
        })));
        setTotal(cnt);
        setPage(p);
        setPageSize(ps);
      } else {
        setList([]);
        setTotal(0);
      }
    } catch {
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchList();
    }
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/mathematics/delete`, { mathematics_id: id });
      if (res.data?.code === 0) {
        message.success('删除成功');
        fetchList(page, pageSize);
      } else {
        showError();
      }
    } catch { /* ignore */ }
  };

  const handleToggleStatus = async (record: Grade) => {
    try {
      const newStatus = record.status === 'on' ? 'off' : 'on';
      const res = await axios.post(`${API_BASE_URL}/api/mathematics/status`, {
        mathematics_id: record.id,
        status: newStatus,
      });
      if (res.data?.code === 0) {
        message.success(newStatus === 'on' ? '已开启' : '已关闭');
        fetchList(page, pageSize);
      } else {
        showError();
      }
    } catch { /* ignore */ }
  };

  const handleEdit = (record: Grade) => {
    setEditId(record.id);
    addForm.setFieldsValue({ name: record.name, position: record.position });
    setAddOpen(true);
  };

  const onAddOk = async () => {
    try {
      const values = await addForm.validateFields();
      if (editId) {
        await axios.post(`${API_BASE_URL}/api/mathematics/update`, {
          mathematics_id: editId,
          name: values.name,
          position: values.position ?? 0,
        });
        message.success('更新成功');
      } else {
        await axios.post(`${API_BASE_URL}/api/mathematics/create`, {
          name: values.name,
          position: values.position ?? 0,
        });
        message.success('添加成功');
      }
      setAddOpen(false);
      addForm.resetFields();
      setEditId(undefined);
      fetchList(page, pageSize);
    } catch { /* validation or api error */ }
  };

  const columns = [
    { title: '名称', dataIndex: 'name' },
    { title: '章节数', dataIndex: 'chapterCount', width: 100 },
    {
      title: '排序', dataIndex: 'position', width: 80,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (status: string, record: Grade) => (
        <Switch
          checked={status === 'on'}
          checkedChildren="开启"
          unCheckedChildren="关闭"
          onChange={() => handleToggleStatus(record)}
        />
      ),
    },
    { title: '创建时间', dataIndex: 'time', width: 180 },
    {
      title: '操作',
      width: 250,
      render: (_: any, record: Grade) => (
        <div className="table-actions">
          <Button type="link" onClick={() => navigate(`/mathematics/chapters/${record.id}`, { state: { gradeName: record.name } })}>管理章节</Button>
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
      <PageHeader
        breadcrumbs={[{ name: '内容管理' }, { name: '数学管理' }]}
        onRefresh={() => fetchList(page, pageSize)}
      />
      <Card>
        <div className="filter-container" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Input placeholder="输入名称搜索" style={{ width: 200 }} value={keyword}
              onChange={e => setKeyword(e.target.value)} onPressEnter={() => fetchList(1, pageSize)} />
            <Button type="primary" onClick={() => fetchList(1, pageSize)}>搜索</Button>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditId(undefined);
            addForm.resetFields();
            addForm.setFieldsValue({ position: 100 });
            setAddOpen(true);
          }}>添加年级</Button>
        </div>
        <Table rowKey="id" columns={columns} dataSource={list} loading={loading}
          pagination={{ current: page, pageSize, total, onChange: (p, ps) => fetchList(p, ps) }}
          locale={{ emptyText: <Empty description="暂无数据" /> }}
        />
      </Card>
      <Modal title={editId ? '编辑年级' : '添加年级'} open={addOpen} onOk={onAddOk}
        onCancel={() => { setAddOpen(false); addForm.resetFields(); setEditId(undefined); }}
        maskClosable={false}>
        <Form form={addForm} layout="vertical">
          <Form.Item label="年级名称" name="name" rules={[{ required: true, message: '请输入年级名称' }]}>
            <Input placeholder="请输入年级名称，如：五年级" />
          </Form.Item>
          <Form.Item label="排序" name="position">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="数值越大越靠前" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MathematicsList;
