import React, { useState } from 'react';
import { Card, Form, Select, Input, Button, Table, Empty, Breadcrumb, Modal, Radio } from 'antd';
import { Link } from 'react-router-dom';

const AdminList: React.FC = () => {
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState<string>('');
  const [openAdd, setOpenAdd] = useState(false);
  const [form] = Form.useForm();

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: '身份昵称', dataIndex: 'name' },
    { title: '状态', dataIndex: 'status' },
    { title: '操作', dataIndex: 'action' }
  ];

  return (
    <div>
      <Card>
        {/* 面包屑导航 */}
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
            dataSource={[]}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无数据" /> }}
            rowKey="id"
          />
        </div>
      </Card>

      {/* 添加管理员弹层 */}
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
              .then(() => {
                // 提交逻辑可在此接入接口
                setOpenAdd(false);
              })
              .catch(() => {});
          }}>确定</Button>
        ]}
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
          <Form.Item label="管理员账号" name="account" rules={[{ required: true, message: '请输入管理员账号' }]}> 
            <Input placeholder="请输入管理员账号" />
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
              { value: 'super', label: '超级管理员' },
              { value: 'ops', label: '运营管理员' },
              { value: 'viewer', label: '只读管理员' }
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