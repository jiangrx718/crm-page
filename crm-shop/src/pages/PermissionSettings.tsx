import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Card, Form, Input, Button, Table, Empty, Breadcrumb, Modal, InputNumber, Switch, TreeSelect, Tooltip, Popconfirm, Radio, Spin, message } from 'antd';

import { Link } from 'react-router-dom';

type Permission = {
  id: number;
  name: string;
  type: string;
  sort: number;
  visible: boolean;
  icon?: string;
  parentId?: number;
  children?: Permission[];
  permission_id?: string;
  permission_name?: string;
  permission_url?: string;
  parent_id?: string;
  status?: 'on' | 'off';
  position?: number;
  created_at?: string;
  child_list?: Permission[];
};

const PermissionSettings: React.FC = () => {
  const [openAdd, setOpenAdd] = useState(false);
  const [form] = Form.useForm();
  const [showEdit, setShowEdit] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(false);

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    fetchPermissions();
  }, []);

  // 自动展开所有行
  useEffect(() => {
    if (permissions.length > 0) {
      const allKeys = extractAllKeys(permissions);
      setExpandedRowKeys(allKeys);
    }
  }, [permissions]);

  const extractAllKeys = (items: Permission[]): React.Key[] => {
    const keys: React.Key[] = [];
    const collect = (items: Permission[]) => {
      items.forEach((item) => {
        keys.push(item.id);
        if (item.children && item.children.length > 0) {
          collect(item.children);
        }
      });
    };
    collect(items);
    return keys;
  };

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/permission/list`);
      const data = res.data;
      if (data && data.code === 0 && data.data && Array.isArray(data.data.list)) {
        const converted = convertPermissions(data.data.list);
        setPermissions(converted);
      } else {
        message.error('获取权限列表失败');
      }
    } catch (e) {
      message.error('请求权限列表出错');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const convertPermissions = (items: any[]): Permission[] => {
    return items.map((item, index) => ({
      id: index + Math.random() * 100000,
      name: item.permission_name,
      type: item.permission_url,
      sort: item.position,
      visible: item.status === 'on',
      permission_id: item.permission_id,
      permission_name: item.permission_name,
      permission_url: item.permission_url,
      parent_id: item.parent_id,
      status: item.status,
      position: item.position,
      created_at: item.created_at,
      parentId: item.parent_id ? Math.random() * 100000 : undefined,
      children: item.child_list && item.child_list.length > 0 ? convertPermissions(item.child_list) : undefined,
      child_list: item.child_list || [],
    }));
  };

  const updateById = (items: Permission[], id: number, updater: (it: Permission) => Permission): Permission[] => {
    return items.map((it) => {
      if (it.id === id) {
        return updater(it);
      }
      return it.children
        ? { ...it, children: updateById(it.children, id, updater) }
        : it;
    });
  };



  const toTreeData = (items: Permission[]): any[] =>
    items.map((it) => ({
      value: it.id,
      title: it.name,
      children: it.children ? toTreeData(it.children) : undefined,
    }));

  const addUnderParent = (items: Permission[], parentId: number, child: Permission): Permission[] =>
    items.map((it) => {
      if (it.id === parentId) {
        const children = it.children ? [child, ...it.children] : [child];
        return { ...it, children };
      }
      return it.children
        ? { ...it, children: addUnderParent(it.children, parentId, child) }
        : it;
    });

  const findPermissionById = (items: Permission[], id: number): Permission | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findPermissionById(item.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const removeById = (items: Permission[], id: number): Permission[] => {
    const walk = (list: Permission[]): Permission[] =>
      list
        .filter((node) => node.id !== id)
        .map((node) =>
          node.children ? { ...node, children: walk(node.children) } : node
        )
        .map((node) => {
          if (node.children && node.children.length === 0) {
            const { children, ...rest } = node as any;
            return rest as Permission;
          }
          return node;
        });
    return walk(items);
  };

  const treeOptions = React.useMemo(() => toTreeData(permissions), [permissions]);

  const onEdit = (record: Permission) => {
    setEditing(record);
    setShowEdit(true);
    editForm.setFieldsValue({
      name: record.name,
      type: record.type,
      sort: record.sort,
      visible: record.visible,
      parentId: record.parentId,
    });
  };

  const columns = [
    { title: '权限名称', dataIndex: 'name', width: 200 },
    { title: '权限路径', dataIndex: 'type', width: 260 },
    { title: '排序', dataIndex: 'sort', width: 120 },
    {
      title: '显示状态',
      dataIndex: 'visible',
      width: 120,
      render: (_: any, record: Permission) => (
        <Switch
          checked={record.visible}
          checkedChildren="开启"
          unCheckedChildren="关闭"
          onChange={(checked) => {
            setPermissions((prev) => updateById(prev, record.id, (it) => ({ ...it, visible: checked })));
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Permission) => {
        const hasChildren = Array.isArray(record.children) && record.children.length > 0;
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="link" size="small" onClick={() => onEdit(record)}>编辑</Button>
            {hasChildren ? (
              <Tooltip title="存在下级分类，请先删除下级分类">
                <Button type="link" size="small" danger disabled>删除</Button>
              </Tooltip>
            ) : (
              <Popconfirm
                title="确认删除该权限项？"
                description={`删除后不可恢复（名称：${record.name}）。`}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => {
                  setPermissions((prev) => removeById(prev, record.id));
                }}
              >
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <Card>
        <Breadcrumb
          style={{ marginBottom: 20 }}
          items={[
            { title: <Link to="/home">首页</Link> },
            { title: '管理权限' },
            { title: '权限设置' },
          ]}
        />

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
          <Button
                    type="primary"
                    size="small"
                    style={{ height: 30, fontSize: 14, padding: '10px' }}
                    onClick={() => setOpenAdd(true)}
                  >
                    添加权限项
                  </Button>
        </div>

        <div style={{ marginTop: 16 }} className="upload-like-box">
          <Spin spinning={loading}>
            <Table
              columns={columns as any}
              dataSource={permissions}
              pagination={false}
              size="small"
              indentSize={16}
              expandedRowKeys={expandedRowKeys}
              onExpand={(expanded, record) => {
                if (expanded) {
                  setExpandedRowKeys((prev) => [...prev, record.id]);
                } else {
                  setExpandedRowKeys((prev) => prev.filter((key) => key !== record.id));
                }
              }}
              locale={{ emptyText: <Empty description="暂无数据" /> }}
              rowKey="id"
            />
          </Spin>
        </div>
      </Card>

      <Modal
        title="添加权限项"
        open={openAdd}
        width={640}
        destroyOnClose
        className="compact-modal"
        bodyStyle={{ padding: 12, maxHeight: '60vh', overflow: 'auto' }}
        onCancel={() => setOpenAdd(false)}
        footer={[
          <Button key="cancel" onClick={() => setOpenAdd(false)}>取消</Button>,
          <Button
            key="ok"
            type="primary"
            onClick={() => {
              form.validateFields().then((vals) => {
                const parentPermission = vals.parentId ? findPermissionById(permissions, vals.parentId) : null;
                const parentId = parentPermission?.permission_id || '';
                
                const payload = {
                  permission_name: vals.name,
                  permission_url: vals.type,
                  parent_id: parentId,
                  status: vals.visible ? 'on' : 'off',
                  position: Number(vals.sort || 0),
                };

                axios.post(`${API_BASE_URL}/api/permission/create`, payload).then(() => {
                  message.success('权限项添加成功');
                  setOpenAdd(false);
                  form.resetFields();
                  fetchPermissions();
                }).catch((error) => {
                  message.error('添加权限项失败');
                  console.error(error);
                });
              });
            }}
          >
            提交
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item label="权限名称" name="name" rules={[{ required: true, message: '请输入权限名称' }]}> 
            <Input placeholder="请输入权限名称" />
          </Form.Item>
          <Form.Item label="父级分类" name="parentId">
            <TreeSelect
              placeholder="请选择"
              allowClear
              treeData={treeOptions}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="权限路径" name="type" rules={[{ required: true, message: '请输入权限路径' }]}> 
            <Input placeholder="例如：/home" />
          </Form.Item>
          <Form.Item label="排序" name="sort" initialValue={100} rules={[{ required: true, message: '请输入排序值' }]}> 
            <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入排序" />
          </Form.Item>
          <Form.Item label="状态" name="visible" initialValue={true}> 
            <Radio.Group>
              <Radio value={true}>显示</Radio>
              <Radio value={false}>隐藏</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑权限项"
        open={showEdit}
        width={640}
        destroyOnClose
        className="compact-modal"
        bodyStyle={{ padding: 12, maxHeight: '60vh', overflow: 'auto' }}
        onCancel={() => {
          setShowEdit(false);
          setEditing(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => { setShowEdit(false); setEditing(null); }}>取消</Button>,
          <Button
            key="ok"
            type="primary"
            onClick={() => {
              editForm.validateFields().then((vals) => {
                if (!editing) return;
                const updated: Permission = {
                  ...editing,
                  name: vals.name,
                  type: vals.type,
                  sort: Number(vals.sort || 0),
                  visible: !!vals.visible,
                  parentId: vals.parentId,
                };
                setPermissions((prev) => {
                  const afterRemoval = removeById(prev, editing.id);
                  if (updated.parentId) {
                    return addUnderParent(afterRemoval, updated.parentId, updated);
                  }
                  return [updated, ...afterRemoval];
                });
                setShowEdit(false);
                setEditing(null);
              });
            }}
          >
            提交
          </Button>,
        ]}
      >
        <Form form={editForm} layout="vertical" requiredMark={false}>
          <Form.Item label="权限名称" name="name" rules={[{ required: true, message: '请输入权限名称' }]}> 
            <Input placeholder="请输入权限名称" />
          </Form.Item>
          <Form.Item label="父级分类" name="parentId">
            <TreeSelect
              placeholder="请选择"
              allowClear
              treeData={treeOptions}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="权限路径" name="type" rules={[{ required: true, message: '请输入权限路径' }]}> 
            <Input placeholder="例如：/admin/index" />
          </Form.Item>
          <Form.Item label="排序" name="sort" rules={[{ required: true, message: '请输入排序值' }]}> 
            <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入排序" />
          </Form.Item>
          <Form.Item label="状态" name="visible"> 
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

export default PermissionSettings;
