import React, { useEffect, useState } from 'react';
import { Card, Form, Select, Input, Button, Table, Empty, Breadcrumb, Modal, Radio, message, Tag } from 'antd';
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

  const columns = [
    { title: '管理员ID', dataIndex: 'admin_id' },
    { title: '管理员昵称', dataIndex: 'user_name' },
    { title: '手机号码', dataIndex: 'user_phone' },
    { title: '角色ID', dataIndex: 'department_id' },
    { title: '状态', dataIndex: 'status', render: (val: string) => (
      <Tag color={val === 'on' ? 'green' : 'red'}>{val === 'on' ? '启用' : '禁用'}</Tag>
    ) },
    { title: '创建时间', dataIndex: 'created_at' }
  ];

  const fetchAdminList = async (p: number = 1, ps: number = 10) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/admin/list`, {
        params: { limit: ps, offset: p }
      });
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
    fetchAdminList(page, pageSize);
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
              options={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '禁用' }]}
              allowClear
            />
          </Form.Item>
          <Form.Item label="身份昵称">
            <Input
              style={{ width: 280 }}
              placeholder="请输入身份昵称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary">查询</Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
          <Button type="primary" size="small" onClick={() => setOpenAdd(true)}>添加管理员</Button>
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
        title="管理员添加"
        open={openAdd}
        onCancel={() => setOpenAdd(false)}
        width={800}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => setOpenAdd(false)}>取消</Button>,
          <Button key="ok" type="primary" onClick={() => {
            form
              .validateFields()
              .then(async (values) => {
                const body = {
                  user_name: values.nickname,
                  user_phone: values.account,
                  password: values.password,
                  department_id: typeof values.role === 'number' ? values.role : (values.role === 'super' ? 1 : values.role === 'ops' ? 2 : values.role === 'viewer' ? 3 : 0),
                  status: values.enabled ? 1 : 0
                };
                try {
                  const res = await axios.post(`${API_BASE_URL}/api/admin/create`, body, { headers: { 'Content-Type': 'application/json' } });
                  const data = res.data;
                  if (data && data.code === 0) {
                    message.success('操作成功');
                    setOpenAdd(false);
                    fetchAdminList(page, pageSize);
                  } else {
                    message.error((data && data.msg) || '新增失败');
                  }
                } catch (e) {
                  message.error('请求失败');
                }
              })
              .catch(() => {});
          }}>确定</Button>
        ]}
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
          <Form.Item label="管理员账号" name="account" rules={[{ required: true, message: '请输入管理员账号' }]}> 
            <Input placeholder="请输入手机号码" />
          </Form.Item>
          <Form.Item label="管理员密码" name="password" rules={[{ required: true, message: '请输入管理员密码' }]}> 
            <Input.Password placeholder="请输入管理员密码" />
          </Form.Item>
          <Form.Item label="确认密码" name="confirm" dependencies={["password"]} rules={[
            { required: true, message: '请再次输入密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              }
            })
          ]}>
            <Input.Password placeholder="请确认密码" />
          </Form.Item>
          <Form.Item label="管理员昵称" name="nickname" rules={[{ required: true, message: '请输入管理员昵称' }]}> 
            <Input placeholder="请输入管理员昵称" />
          </Form.Item>
          <Form.Item label="管理员角色" name="role" rules={[{ required: true, message: '请选择管理员角色' }]}> 
            <Select placeholder="请选择角色" options={[
              { value: 1, label: '超级管理员' },
              { value: 2, label: '运营管理员' },
              { value: 3, label: '只读管理员' }
            ]} />
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
