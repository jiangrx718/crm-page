import React, { useEffect, useState, useRef } from 'react';
import { Card, Form, Select, Input, Button, Table, Empty, Breadcrumb, Modal, Radio, message, Tag, Popconfirm } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AdminList: React.FC = () => {
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState<string>('');
  const [openAdd, setOpenAdd] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [editing, setEditing] = useState<boolean>(false);
  const [current, setCurrent] = useState<any | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Fetch roles for the select dropdown
    const fetchRoles = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/role/list?limit=100&offset=1`);
        if (res.data && res.data.code === 0 && res.data.data && Array.isArray(res.data.data.list)) {
          setRoles(res.data.data.list);
        }
      } catch (e) {
        console.error('Failed to fetch roles', e);
      }
    };
    fetchRoles();
  }, []);

  const columns = [
    { title: '管理员ID', dataIndex: 'admin_id' },
    { title: '手机号码', dataIndex: 'user_phone' },
    { title: '管理员昵称', dataIndex: 'user_name' },
    { title: '所属角色', dataIndex: 'department_id', render: (val: string) => {
      const role = roles.find(r => r.role_id === val);
      return role ? role.role_name : val;
    } },
    { title: '状态', dataIndex: 'status', render: (val: string) => (
      <Tag color={val === 'on' ? 'green' : 'red'}>{val === 'on' ? '启用' : '禁用'}</Tag>
    ) },
    { title: '创建时间', dataIndex: 'created_at' },
    { title: '操作', key: 'action', render: (_: any, record: any) => (
      <div style={{ display: 'flex', gap: 16 }}>
        <Button type="link" size="small" style={{ padding: 0, color: '#1677ff' }} onClick={() => {
          setEditing(true);
          setCurrent(record);
          setOpenAdd(true);
          form.setFieldsValue({
            account: record.user_phone,
            password: undefined,
            confirm: undefined,
            nickname: record.user_name,
            role: record.department_id,
            enabled: record.status === 'on'
          });
        }}>编辑</Button>
        <Popconfirm
          title="删除确认"
          description={`确定要删除${record.user_name}数据吗？`}
          okText="确定"
          cancelText="取消"
          onConfirm={async () => {
            try {
              const res = await axios.post(`${API_BASE_URL}/api/admin/delete`, { admin_id: record.admin_id }, { headers: { 'Content-Type': 'application/json' } });
              const data = res.data;
              if (data && data.code === 0) {
                message.success('操作成功');
                fetchAdminList(page, pageSize);
              } else {
                message.error((data && data.msg) || '删除失败');
              }
            } catch (e) {
              message.error('请求失败');
            }
          }}
        >
          <Button type="link" danger size="small" style={{ padding: 0 }}>删除</Button>
        </Popconfirm>
      </div>
    ) }
  ];

  const fetchAdminList = async (p: number = 1, ps: number = 10) => {
    try {
      setLoading(true);
      const params: any = { limit: ps, offset: p };
      if (status === 'on' || status === 'off') params.status = status;
      if (keyword) params.user_phone = keyword;
      const res = await axios.get(`${API_BASE_URL}/api/admin/list`, { params });
      const data = res.data;
      if (data && typeof data === 'object') {
        if (data.code === 0 && data.data) {
          const arr = Array.isArray(data.data.list) ? data.data.list : [];
          const cnt = typeof data.data.count === 'number' ? data.data.count : 0;
          setList(arr);
          setTotal(cnt);
          setPage(p);
          setPageSize(ps);
        } else {
          setList([]);
          setTotal(0);
        }
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

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchAdminList(page, pageSize);
    }
  }, []);

  return (
    <div>
      <Card>
        <Breadcrumb style={{ marginBottom: 20 }}>
          <Breadcrumb.Item>
            <Link to="/home">首页</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>管理权限</Breadcrumb.Item>
          <Breadcrumb.Item>管理员列表</Breadcrumb.Item>
        </Breadcrumb>
        <Form layout="inline" style={{ background: '#f7f8fa', padding: 16, borderRadius: 8 }}>
          <Form.Item label="状态">
            <Select
              style={{ width: 180 }}
              placeholder="请选择"
              value={status}
              onChange={setStatus}
              options={[{ value: 'on', label: '启用' }, { value: 'off', label: '禁用' }]}
              allowClear
            />
          </Form.Item>
          <Form.Item label="手机号">
            <Input
              style={{ width: 280 }}
              placeholder="请输入手机号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" size="small" style={{ height: 30, fontSize: 14, padding: '10 10px' }} onClick={() => { setPage(1); fetchAdminList(1, pageSize); }}>查询</Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            type="primary"
            size="small"
            style={{ height: 30, fontSize: 14, padding: '10px' }}
            onClick={() => { setEditing(false); setCurrent(null); form.resetFields(); setOpenAdd(true); }}
          >
            添加管理员
          </Button>
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
              showTotal: (t) => `共 ${t} 条`,
              onChange: (p, ps) => {
                fetchAdminList(p, ps);
              }
            }}
            locale={{ emptyText: <Empty description="暂无数据" /> }}
            rowKey="admin_id"
          />
        </div>
      </Card>

      <Modal
        title={editing ? '管理员编辑' : '管理员添加'}
        open={openAdd}
        onCancel={() => { setOpenAdd(false); setEditing(false); setCurrent(null); form.resetFields(); }}
        width={800}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => { setOpenAdd(false); setEditing(false); setCurrent(null); form.resetFields(); }}>取消</Button>,
          <Button key="ok" type="primary" onClick={() => {
            form
              .validateFields()
              .then(async (values) => {
                if (editing) {
                  const body = {
                    admin_id: current?.admin_id,
                    password: values.password,
                    role_id: values.role,
                    department_id: values.role,
                    status: values.enabled ? 'on' : 'off'
                  };
                  try {
                    const res = await axios.post(`${API_BASE_URL}/api/admin/edit`, body, { headers: { 'Content-Type': 'application/json' } });
                    const data = res.data;
                    if (data && data.code === 0) {
                      message.success('操作成功');
                      setOpenAdd(false);
                      setEditing(false);
                      setCurrent(null);
                      form.resetFields();
                      fetchAdminList(page, pageSize);
                    }
                  } catch (e) {
                    // 错误由全局拦截器处理
                  }
                } else {
                  const body = {
                    user_name: values.nickname,
                    user_phone: values.account,
                    password: values.password,
                    role_id: values.role,
                    department_id: values.role,
                    status: values.enabled ? "on" : "off"
                  };
                  try {
                    const res = await axios.post(`${API_BASE_URL}/api/admin/create`, body, { headers: { 'Content-Type': 'application/json' } });
                    const data = res.data;
                    if (data && data.code === 0) {
                      message.success('操作成功');
                      form.resetFields();
                      setOpenAdd(false);
                      fetchAdminList(page, pageSize);
                    }
                  } catch (e) {
                    // 错误由全局拦截器处理
                  }
                }
              })
              .catch(() => {});
          }}>确定</Button>
        ]}
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
          <Form.Item
            label="管理员账号"
            name="account"
            rules={[
              { required: true, message: '请输入管理员账号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码（11位）' }
            ]}
          > 
            <Input
              placeholder="请输入手机号码"
              disabled={editing}
              type="tel"
              inputMode="numeric"
              maxLength={11}
              onChange={(e) => {
                // 仅保留数字
                const v = e.target.value.replace(/\D/g, '');
                if (v !== e.target.value) {
                  // 同步到表单字段，保持只数字输入
                  form.setFieldsValue({ account: v });
                }
              }}
            />
          </Form.Item>
          <Form.Item label="管理员昵称" name="nickname" rules={[{ required: true, message: '请输入管理员昵称' }]}> 
            <Input placeholder="请输入管理员昵称" disabled={editing} />
          </Form.Item>
          <Form.Item label="管理员密码" name="password" rules={editing ? [] : [{ required: true, message: '请输入管理员密码' }]}> 
            <Input.Password placeholder="请输入管理员密码" />
          </Form.Item>
          <Form.Item label="确认密码" name="confirm" dependencies={["password"]} rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                const pwd = getFieldValue('password');
                if (!editing) {
                  if (!value) {
                    return Promise.reject(new Error('请再次输入密码'));
                  }
                  if (pwd !== value) {
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  }
                  return Promise.resolve();
                } else {
                  if (pwd) {
                    if (!value) {
                      return Promise.reject(new Error('请再次输入密码'));
                    }
                    if (pwd !== value) {
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    }
                  }
                  return Promise.resolve();
                }
              }
            })
          ]}>
            <Input.Password placeholder="请确认密码" />
          </Form.Item>
          <Form.Item label="管理员角色" name="role" rules={[{ required: true, message: '请选择管理员角色' }]}> 
            <Select 
              placeholder="请选择角色" 
              options={roles.map(r => ({ label: r.role_name, value: r.role_id }))} 
            />
          </Form.Item>
          <Form.Item label="状态" name="enabled" initialValue={true}>
            <Radio.Group>
              <Radio value={true}>开启</Radio>
              <Radio value={false}>关闭</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminList;
