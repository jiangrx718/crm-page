import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Table, Empty, Breadcrumb, Modal, Radio, Tree, Spin, message } from 'antd';
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

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
          <Button
              type="primary"
              size="small"
              style={{ height: 30, fontSize: 14, padding: '10px' }}
              onClick={() => setOpenAdd(true)}
            >
              添加角色
            </Button>
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
