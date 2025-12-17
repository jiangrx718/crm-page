import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Table, Empty, Breadcrumb, Modal, Radio, Tree, Spin, message, Tag, Popconfirm } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const RoleManagement: React.FC = () => {
  // 移除未使用的筛选状态与关键词
  const [openAdd, setOpenAdd] = useState(false);
  const [form] = Form.useForm();
  const [checkedKeys, setCheckedKeys] = useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<any[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [permLoading, setPermLoading] = useState(false);
  const [permTreeData, setPermTreeData] = useState<any[]>([]);
  const [roleList, setRoleList] = useState<any[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const hasInitialized = React.useRef(false);
  const [editing, setEditing] = useState(false);
  const [currentRole, setCurrentRole] = useState<any | null>(null);

  const toTreeNodes = (items: any[]): any[] =>
    items.map((item) => ({
      key: item.permission_id,
      title: item.permission_name,
      children: Array.isArray(item.child_list) && item.child_list.length ? toTreeNodes(item.child_list) : undefined,
    }));

  useEffect(() => {
    if (openAdd) {
      setPermLoading(true);
      axios
        .get(`${API_BASE_URL}/api/permission/list`)
        .then((res) => {
          const data = res.data;
          if (data && data.code === 0 && data.data && Array.isArray(data.data.list)) {
            const nodes = toTreeNodes(data.data.list);
            setPermTreeData(nodes);
            setExpandedKeys(nodes.map((n) => n.key));
            setAutoExpandParent(false);
          } else {
            message.error('获取权限列表失败');
            setPermTreeData([]);
          }
        })
        .catch(() => {
          message.error('请求权限列表出错');
          setPermTreeData([]);
        })
        .finally(() => setPermLoading(false));
    }
  }, [openAdd]);

  const fetchRoleList = async (p: number = 1, ps: number = 10) => {
    try {
      setRoleLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/role/list`, { params: { limit: ps, offset: p } });
      const data = res.data;
      if (data && data.code === 0 && data.data) {
        const arr = Array.isArray(data.data.list) ? data.data.list : [];
        const cnt = typeof data.data.count === 'number' ? data.data.count : 0;
        setRoleList(arr);
        setTotal(cnt);
        setPage(p);
        setPageSize(ps);
      } else {
        setRoleList([]);
        setTotal(0);
      }
    } catch {
      setRoleList([]);
      setTotal(0);
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchRoleList(page, pageSize);
    }
  }, []);

  const columns = [
    { title: '角色ID', dataIndex: 'role_id' },
    { title: '角色名称', dataIndex: 'role_name' },
    { title: '状态', dataIndex: 'status', render: (val: string) => (
      <Tag color={val === 'on' ? 'green' : 'red'}>{val === 'on' ? '启用' : '禁用'}</Tag>
    ) },
    { title: '创建时间', dataIndex: 'created_at' },
    { title: '操作', key: 'action', render: (_: any, record: any) => (
      <div style={{ display: 'flex', gap: 16 }}>
        <Button
          type="link"
          size="small"
          style={{ padding: 0, color: '#1677ff' }}
          onClick={() => {
            setEditing(true);
            setCurrentRole(record);
            setOpenAdd(true);
            form.setFieldsValue({
              roleName: record.role_name,
              enabled: record.status === 'on',
            });
            setCheckedKeys(Array.isArray(record.permission) ? record.permission : []);
          }}
        >
          编辑
        </Button>
        <Popconfirm
          title="删除确认"
          description={`确定要删除角色【${record.role_name}】吗？`}
          okText="确定"
          cancelText="取消"
          onConfirm={async () => {
            try {
              const res = await axios.post(
                `${API_BASE_URL}/api/role/delete`,
                { role_id: record.role_id },
                { headers: { 'Content-Type': 'application/json' } }
              );
              const data = res.data;
              if (data && data.code === 0) {
                message.success('操作成功');
                fetchRoleList(page, pageSize);
              } else {
                message.error((data && data.msg) || '删除失败');
              }
            } catch {
              message.error('请求失败');
            }
          }}
        >
          <Button type="link" danger size="small" style={{ padding: 0 }}>删除</Button>
        </Popconfirm>
      </div>
    ) },
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

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
          <Button
              type="primary"
              size="small"
              style={{ height: 30, fontSize: 14, padding: '10px' }}
              onClick={() => {
                setEditing(false);
                setCurrentRole(null);
                form.resetFields();
                setCheckedKeys([]);
                setOpenAdd(true);
              }}
            >
              添加角色
            </Button>
        </div>

        <div style={{ marginTop: 16 }}>
          <Table
            columns={columns}
            dataSource={roleList}
            loading={roleLoading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: false,
              onChange: (cp) => fetchRoleList(cp, pageSize)
            }}
            locale={{ emptyText: <Empty description="暂无数据" /> }}
            rowKey="role_id"
          />
        </div>
      </Card>

      {/* 添加角色弹层 */}
      <Modal
        title={editing ? '修改角色' : '添加角色'}
        open={openAdd}
        width={800}
        destroyOnClose
        onCancel={() => {
          setOpenAdd(false);
          setEditing(false);
          setCurrentRole(null);
          form.resetFields();
          setCheckedKeys([]);
        }}
        footer={[
          <Button key="cancel" onClick={() => setOpenAdd(false)}>取消</Button>,
          <Button key="ok" type="primary" onClick={() => {
            form.validateFields().then(async (vals) => {
              const payload = {
                role_name: vals.roleName,
                status: vals.enabled ? 'on' : 'off',
                permission: Array.isArray(checkedKeys) ? checkedKeys : [],
              };
              try {
                let res;
                if (editing && currentRole?.role_id) {
                  res = await axios.post(`${API_BASE_URL}/api/role/edit`, { role_id: currentRole.role_id, ...payload }, { headers: { 'Content-Type': 'application/json' } });
                } else {
                  res = await axios.post(`${API_BASE_URL}/api/role/create`, payload, { headers: { 'Content-Type': 'application/json' } });
                }
                const data = res.data;
                if (data && data.code === 0) {
                  message.success('操作成功');
                  setOpenAdd(false);
                  setEditing(false);
                  setCurrentRole(null);
                  form.resetFields();
                  setCheckedKeys([]);
                  fetchRoleList(page, pageSize);
                } else {
                  message.error((data && data.msg) || (editing ? '编辑失败' : '新增失败'));
                }
              } catch {
                message.error('请求失败');
              }
            });
          }}>提交</Button>
        ]}
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
          <Form.Item label="角色名称" name="roleName" rules={[{ required: true, message: '请输入角色名称' }]}> 
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item label="状态" name="enabled" initialValue={true}> 
            <Radio.Group>
              <Radio value={true}>启用</Radio>
              <Radio value={false}>禁用</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="权限">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span></span>
              <Button type="link" onClick={() => {
                if (expandedKeys.length) {
                  setExpandedKeys([]);
                } else {
                  setExpandedKeys(permTreeData.map(n => (n as any).key));
                }
                setAutoExpandParent(false);
              }}>折叠</Button>
            </div>
            <Spin spinning={permLoading}>
              <Tree
                checkable
                selectable={false}
                treeData={permTreeData as any}
                checkedKeys={checkedKeys}
                expandedKeys={expandedKeys}
                autoExpandParent={autoExpandParent}
                onExpand={(keys) => { setExpandedKeys(keys as any); setAutoExpandParent(false); }}
                onCheck={(keys) => setCheckedKeys(keys as any)}
              />
            </Spin>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagement;
