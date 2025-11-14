import React, { useState } from 'react';
import { Card, Form, Select, Input, Button, Table, Empty, Breadcrumb, Modal, Radio, Tree } from 'antd';
import { Link } from 'react-router-dom';

const RoleManagement: React.FC = () => {
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState<string>('');
  const [openAdd, setOpenAdd] = useState(false);
  const [form] = Form.useForm();
  const [checkedKeys, setCheckedKeys] = useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<any[]>(['home','user','user-manage','device-tag','ops-group','gift-member']);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  const treeData = [
    { key: 'home', title: '主页', children: [] },
    { key: 'user', title: '用户', children: [{ key: 'user-stat', title: '用户统计' }] },
    { key: 'user-manage', title: '用户管理', children: [
      { key: 'edit-parent', title: '修改上级推广人' },
      { key: 'edit-parent-2', title: '修改上级推广人' },
      { key: 'add-common-admin', title: '新增普通管理员列表' }
    ] },
    { key: 'device-tag', title: '设备标签', children: [
      { key: 'set-unset-tag', title: '设置和取消用户标签' },
      { key: 'get-user-tag', title: '获取用户标签' }
    ] },
    { key: 'ops-group', title: '运营组', children: [
      { key: 'set-user-group', title: '设置用户分组' },
      { key: 'user-group-form', title: '用户分组表单' }
    ] },
    { key: 'gift-member', title: '赠送会员', children: [
      { key: 'gift-paid-time', title: '执行赠送付费会员时长' }
    ] }
  ];

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
          <Breadcrumb.Item>角色管理</Breadcrumb.Item>
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
          <Button type="primary" size="small" onClick={() => setOpenAdd(true)}>添加角色</Button>
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

      {/* 添加角色弹层 */}
      <Modal
        title="添加角色"
        open={openAdd}
        width={800}
        destroyOnClose
        onCancel={() => setOpenAdd(false)}
        footer={[
          <Button key="cancel" onClick={() => setOpenAdd(false)}>取消</Button>,
          <Button key="ok" type="primary" onClick={() => {
            form.validateFields().then(() => {
              setOpenAdd(false);
            });
          }}>提交</Button>
        ]}
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
          <Form.Item label="角色名称" name="roleName" rules={[{ required: true, message: '请输入角色名称' }]}> 
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item label="是否开启" name="enabled" initialValue={true}> 
            <Radio.Group>
              <Radio value={true}>开启</Radio>
              <Radio value={false}>关闭</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="权限">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span></span>
              <Button type="link" onClick={() => {
                if (expandedKeys.length) {
                  setExpandedKeys([]);
                } else {
                  setExpandedKeys(treeData.map(n => (n as any).key));
                }
                setAutoExpandParent(false);
              }}>折叠</Button>
            </div>
            <Tree
              checkable
              selectable={false}
              treeData={treeData as any}
              checkedKeys={checkedKeys}
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              onExpand={(keys) => { setExpandedKeys(keys as any); setAutoExpandParent(false); }}
              onCheck={(keys) => setCheckedKeys(keys as any)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagement;