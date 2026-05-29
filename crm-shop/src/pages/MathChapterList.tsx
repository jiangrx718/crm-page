import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Button, Table, Empty, Popconfirm, message, Modal, Switch, InputNumber } from 'antd';
import { showError } from '../utils/notify';
import { PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import PageHeader from '../components/PageHeader';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

type Chapter = {
  id: string;
  name: string;
  icon: string;
  status: string;
  position: number;
  pointCount: number;
  time: string;
};

const MathChapterList: React.FC = () => {
  const navigate = useNavigate();
  const { gradeId } = useParams<{ gradeId: string }>();
  const location = useLocation();
  const gradeName = (location.state as any)?.gradeName || '';

  const [list, setList] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const hasInitialized = useRef(false);

  const fetchList = async (p = 1, ps = 10) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/mathematics/chapter/list`, {
        params: { mathematics_id: gradeId, limit: ps, offset: (p - 1) * ps }
      });
      const data = res.data;
      if (data?.code === 0 && data.data) {
        const arr = Array.isArray(data.data.list) ? data.data.list : [];
        const cnt = typeof data.data.count === 'number' ? data.data.count : 0;
        setList(arr.map((it: any) => ({
          id: String(it.chapter_id ?? ''),
          name: String(it.name ?? ''),
          icon: String(it.icon ?? ''),
          status: String(it.status ?? 'on'),
          position: Number(it.position ?? 0),
          pointCount: Number(it.knowledge_count ?? 0),
          time: String(it.created_at ?? ''),
        })));
        setTotal(cnt);
        setPage(p);
        setPageSize(ps);
      } else {
        setList([]);
      }
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchList(1, 10);
    }
  }, []);

  const handleToggleStatus = async (record: Chapter) => {
    try {
      const newStatus = record.status === 'on' ? 'off' : 'on';
      const res = await axios.post(`${API_BASE_URL}/api/mathematics/chapter/status`, {
        chapter_id: record.id,
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

  const handleDelete = async (record: Chapter) => {
    if (record.pointCount > 0) {
      message.warning('该章节下存在知识点，无法删除');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE_URL}/api/mathematics/chapter/delete`, { chapter_id: record.id });
      if (res.data?.code === 0) {
        message.success('删除成功');
        fetchList(page, pageSize);
      } else {
        showError();
      }
    } catch { /* ignore */ }
  };

  const handleEdit = (record: Chapter) => {
    setEditId(record.id);
    addForm.setFieldsValue({
      name: record.name,
      icon: record.icon,
      position: record.position,
    });
    setAddOpen(true);
  };

  const onAddOk = async () => {
    try {
      const values = await addForm.validateFields();
      if (editId) {
        await axios.post(`${API_BASE_URL}/api/mathematics/chapter/update`, {
          chapter_id: editId, name: values.name, icon: values.icon, position: values.position
        });
        message.success('更新成功');
      } else {
        await axios.post(`${API_BASE_URL}/api/mathematics/chapter/create`, {
          mathematics_id: gradeId, name: values.name, icon: values.icon, position: values.position
        });
        message.success('添加成功');
      }
      setAddOpen(false);
      addForm.resetFields();
      setEditId(undefined);
      fetchList();
    } catch { /* validation or api error */ }
  };

  const columns = [
    {
      title: '图标', dataIndex: 'icon', width: 80,
      render: (icon: string) => <span style={{ fontSize: 24 }}>{icon}</span>,
    },
    { title: '章节名称', dataIndex: 'name' },
    { title: '知识点数', dataIndex: 'pointCount', width: 100 },
    { title: '排序', dataIndex: 'position', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (status: string, record: Chapter) => (
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
      title: '操作', width: 280,
      render: (_: any, record: Chapter) => (
        <div className="table-actions">
          <Button type="link" onClick={() => navigate(`/mathematics/knowledge/${record.id}`, {
            state: { gradeName, chapterName: record.name }
          })}>管理知识点</Button>
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除吗？" okText="确定" cancelText="取消" onConfirm={() => handleDelete(record)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[{ name: '数学管理' }, { name: `${gradeName} - 章节管理` }]}
        onRefresh={() => fetchList(page, pageSize)}
      />
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/mathematics')}>返回年级列表</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditId(undefined);
            addForm.resetFields();
            addForm.setFieldsValue({ position: 100 });
            setAddOpen(true);
          }}>添加章节</Button>
        </div>
        <Table rowKey="id" columns={columns} dataSource={list} loading={loading}
          pagination={{ current: page, pageSize, total, onChange: (p, ps) => fetchList(p, ps) }}
          locale={{ emptyText: <Empty description="暂无数据" /> }}
        />
      </Card>
      <Modal title={editId ? '编辑章节' : '添加章节'} open={addOpen} onOk={onAddOk}
        onCancel={() => { setAddOpen(false); addForm.resetFields(); setEditId(undefined); }}
        maskClosable={false}>
        <Form form={addForm} layout="vertical">
          <Form.Item label="章节名称" name="name" rules={[{ required: true, message: '请输入章节名称' }]}>
            <Input placeholder="如：小数乘除法" />
          </Form.Item>
          <Form.Item label="图标" name="icon">
            <Input placeholder="输入emoji图标，如：🔢" />
          </Form.Item>
          <Form.Item label="排序" name="position" rules={[{ required: true, message: '请输入排序' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入排序" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MathChapterList;
