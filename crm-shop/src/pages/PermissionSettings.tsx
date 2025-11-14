import React, { useState } from 'react';
import { Card, Form, Input, Button, Table, Empty, Breadcrumb, Modal, InputNumber, Switch, TreeSelect, Tooltip, Popconfirm, Radio } from 'antd';
import { PictureOutlined, HomeOutlined, SearchOutlined, SettingOutlined, UserOutlined, PhoneOutlined, QuestionCircleOutlined, InfoCircleOutlined, MinusOutlined, PlusOutlined, CheckOutlined, CloseOutlined, ZoomInOutlined, ZoomOutOutlined, CloudUploadOutlined, CloudDownloadOutlined, CameraOutlined, AppstoreOutlined, DashboardOutlined, BellOutlined, CloudOutlined, SaveOutlined, EditOutlined, FileTextOutlined, ShopOutlined, ShareAltOutlined, UpOutlined, DownOutlined, LeftOutlined, RightOutlined, ArrowLeftOutlined, ArrowRightOutlined, ExperimentOutlined, SafetyOutlined, ShoppingOutlined, MenuFoldOutlined, MenuUnfoldOutlined, UnorderedListOutlined, BarsOutlined, DatabaseOutlined, ToolOutlined, FolderOutlined, FolderOpenOutlined, ContainerOutlined, ProfileOutlined, IdcardOutlined, CreditCardOutlined, BankOutlined, WalletOutlined, ProjectOutlined, ControlOutlined, FormOutlined, TableOutlined, CalendarOutlined, MoneyCollectOutlined, PayCircleOutlined, QrcodeOutlined, TagOutlined, TagsOutlined, DownloadOutlined, UploadOutlined, ShoppingCartOutlined, MailOutlined, MessageOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

type Permission = {
  id: number;
  name: string;
  type: string; // 路径/类型
  sort: number;
  visible: boolean;
  icon?: string; // 可选图标地址
  parentId?: number; // 父级ID
  children?: Permission[];
};

const PermissionSettings: React.FC = () => {
  const [keyword, setKeyword] = useState<string>('');
  const [openAdd, setOpenAdd] = useState(false);
  const [form] = Form.useForm();
  const [showEdit, setShowEdit] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState<Permission | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerTarget, setIconPickerTarget] = useState<'add' | 'edit'>('add');
  const [iconQuery, setIconQuery] = useState<string>('');

  // Mock 数据：与上传图片页面的列表视觉一致（有层级，可展开）
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 1001,
      name: '主页',
      type: '/admin/index',
      sort: 127,
      visible: true,
      children: [
        { id: 1101, name: '仪表盘', type: '/admin/dashboard', sort: 30, visible: true, parentId: 1001 },
        { id: 1102, name: '欢迎页', type: '/admin/welcome', sort: 20, visible: true, parentId: 1001 },
      ],
    },
    { id: 1002, name: '用户', type: '/admin/user', sort: 125, visible: true },
    { id: 1003, name: '订单', type: '/admin/order', sort: 120, visible: true },
    {
      id: 1004,
      name: '商品',
      type: '/admin/product',
      sort: 115,
      visible: true,
      children: [
        { id: 1401, name: '商品列表', type: '/admin/product/list', sort: 20, visible: true, parentId: 1004 },
        { id: 1402, name: '商品分类', type: '/admin/product/category', sort: 10, visible: true, parentId: 1004 },
      ],
    },
    { id: 1005, name: '营销', type: '/admin/marketing', sort: 110, visible: true },
    { id: 1006, name: '分销', type: '/admin/agent', sort: 105, visible: true },
    { id: 1007, name: '客服', type: '/admin/kefu', sort: 104, visible: true },
    { id: 1008, name: '财务', type: '/admin/finance', sort: 90, visible: true },
    { id: 1009, name: '内容', type: '/admin/cms', sort: 85, visible: true },
    { id: 1010, name: '统计', type: '/admin/setting/pages', sort: 80, visible: true },
    { id: 1011, name: '应用', type: '/admin/app', sort: 70, visible: true },
    { id: 1012, name: '设置', type: '/admin/setting', sort: 1, visible: true },
    { id: 1013, name: '超级', type: '/admin/system', sort: 0, visible: false },
  ]);

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

  // 图标候选列表（示例，带 s- 前缀与常用图标）
  const iconChoices = [
    { key: 's-home', icon: <HomeOutlined /> },
    { key: 's-search', icon: <SearchOutlined /> },
    { key: 's-setting', icon: <SettingOutlined /> },
    { key: 's-user', icon: <UserOutlined /> },
    { key: 's-phone', icon: <PhoneOutlined /> },
    { key: 's-help', icon: <QuestionCircleOutlined /> },
    { key: 's-info', icon: <InfoCircleOutlined /> },
    { key: 's-minus', icon: <MinusOutlined /> },
    { key: 's-plus', icon: <PlusOutlined /> },
    { key: 's-check', icon: <CheckOutlined /> },
    { key: 's-close', icon: <CloseOutlined /> },
    { key: 's-zoom-in', icon: <ZoomInOutlined /> },
    { key: 's-zoom-out', icon: <ZoomOutOutlined /> },
    { key: 's-cloud-up', icon: <CloudUploadOutlined /> },
    { key: 's-cloud-down', icon: <CloudDownloadOutlined /> },
    { key: 's-camera', icon: <CameraOutlined /> },
    { key: 's-app', icon: <AppstoreOutlined /> },
    { key: 's-dashboard', icon: <DashboardOutlined /> },
    { key: 's-bell', icon: <BellOutlined /> },
    { key: 's-cloud', icon: <CloudOutlined /> },
    { key: 's-save', icon: <SaveOutlined /> },
    { key: 's-edit', icon: <EditOutlined /> },
    { key: 's-file', icon: <FileTextOutlined /> },
    { key: 's-shop', icon: <ShopOutlined /> },
    { key: 's-shopping', icon: <ShoppingOutlined /> },
    { key: 's-shopping-cart', icon: <ShoppingCartOutlined /> },
    { key: 's-share', icon: <ShareAltOutlined /> },
    { key: 's-up', icon: <UpOutlined /> },
    { key: 's-down', icon: <DownOutlined /> },
    { key: 's-left', icon: <LeftOutlined /> },
    { key: 's-right', icon: <RightOutlined /> },
    { key: 's-arrow-left', icon: <ArrowLeftOutlined /> },
    { key: 's-arrow-right', icon: <ArrowRightOutlined /> },
    { key: 's-image', icon: <PictureOutlined /> },
    // 左侧菜单常用图标
    { key: 's-experiment', icon: <ExperimentOutlined /> },
    { key: 's-safety', icon: <SafetyOutlined /> },
    { key: 's-setting-gear', icon: <SettingOutlined /> },
    // 列表/菜单
    { key: 's-list', icon: <UnorderedListOutlined /> },
    { key: 's-bars', icon: <BarsOutlined /> },
    { key: 's-menu-fold', icon: <MenuFoldOutlined /> },
    { key: 's-menu-unfold', icon: <MenuUnfoldOutlined /> },
    // 数据/表格
    { key: 's-table', icon: <TableOutlined /> },
    { key: 's-database', icon: <DatabaseOutlined /> },
    // 文件/目录
    { key: 's-folder', icon: <FolderOutlined /> },
    { key: 's-folder-open', icon: <FolderOpenOutlined /> },
    { key: 's-container', icon: <ContainerOutlined /> },
    { key: 's-profile', icon: <ProfileOutlined /> },
    { key: 's-idcard', icon: <IdcardOutlined /> },
    { key: 's-credit-card', icon: <CreditCardOutlined /> },
    // 业务/财务
    { key: 's-bank', icon: <BankOutlined /> },
    { key: 's-wallet', icon: <WalletOutlined /> },
    { key: 's-money', icon: <MoneyCollectOutlined /> },
    { key: 's-pay', icon: <PayCircleOutlined /> },
    // 工具/表单
    { key: 's-tool', icon: <ToolOutlined /> },
    { key: 's-form', icon: <FormOutlined /> },
    // 通讯/消息
    { key: 's-mail', icon: <MailOutlined /> },
    { key: 's-message', icon: <MessageOutlined /> },
    // 项目/控制
    { key: 's-project', icon: <ProjectOutlined /> },
    { key: 's-control', icon: <ControlOutlined /> },
    // 下载/上传
    { key: 's-download', icon: <DownloadOutlined /> },
    { key: 's-upload', icon: <UploadOutlined /> },
    // 标签/二维码
    { key: 's-tag', icon: <TagOutlined /> },
    { key: 's-tags', icon: <TagsOutlined /> },
    { key: 's-qrcode', icon: <QrcodeOutlined /> },
    // 日历/时间
    { key: 's-calendar', icon: <CalendarOutlined /> },
  ];

  const openIconPicker = (target: 'add' | 'edit') => {
    setIconPickerTarget(target);
    setIconPickerOpen(true);
    setIconQuery('');
  };

  // 将权限列表转换为 TreeSelect 的数据结构
  const toTreeData = (items: Permission[]): any[] =>
    items.map((it) => ({
      value: it.id,
      title: it.name,
      children: it.children ? toTreeData(it.children) : undefined,
    }));

  // 在指定父节点下插入子节点（插入在前面，使新项靠前）
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

  // 从树中删除指定节点，返回新的树（不保留空 children）
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
      icon: record.icon,
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
                description={`删除后不可恢复（ID: ${record.id}，名称：${record.name}）。`}
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
        {/* 面包屑导航 - 使用 items 避免弃用警告 */}
        <Breadcrumb
          style={{ marginBottom: 20 }}
          items={[
            { title: <Link to="/home">首页</Link> },
            { title: '管理权限' },
            { title: '权限设置' },
          ]}
        />
        <Form layout="inline" style={{ background: '#f7f8fa', padding: 16, borderRadius: 8 }}>
          <Form.Item label="权限名称">
            <Input
              style={{ width: 280 }}
              placeholder="请输入权限名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary">查询</Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
          <Button type="primary" size="small" onClick={() => setOpenAdd(true)}>添加权限项</Button>
        </div>

        <div style={{ marginTop: 16 }} className="upload-like-box">
          <Table
            columns={columns as any}
            dataSource={permissions}
            pagination={false}
            size="small"
            indentSize={16}
            locale={{ emptyText: <Empty description="暂无数据" /> }}
            rowKey="id"
          />
        </div>
      </Card>
      {/* 添加权限项弹层 - 与上传图片页面保持一致的紧凑横向布局 */}
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
                const iconName = (vals.icon || '').trim();
                const newItem: Permission = {
                  id: Date.now(),
                  name: vals.name,
                  type: vals.type,
                  sort: Number(vals.sort || 0),
                  visible: !!vals.visible,
                  ...(iconName ? { icon: iconName } : {}),
                  ...(vals.parentId ? { parentId: vals.parentId } : {}),
                };
                setPermissions((prev) => {
                  if (vals.parentId) {
                    return addUnderParent(prev, vals.parentId, newItem);
                  }
                  return [newItem, ...prev];
                });
                setOpenAdd(false);
                form.resetFields();
              });
            }}
          >
            提交
          </Button>,
        ]}
      >
        <Form form={form} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} requiredMark={false}>
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
          <Form.Item label="图标" name="icon">
            <Input
              size="large"
              style={{ height: 40 }}
              placeholder="请输入图标名称，如：s-home"
              suffix={
                <Button
                  type="text"
                  size="large"
                  icon={<PictureOutlined />}
                  onClick={() => openIconPicker('add')}
                  style={{ height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              }
            />
          </Form.Item>
          <Form.Item label="排序" name="sort" rules={[{ required: true, message: '请输入排序值' }]}> 
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

      {/* 编辑权限项弹层 - 预填展示 */}
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
                const iconName = (vals.icon || '').trim();
                if (!editing) return;
                const updated: Permission = {
                  ...editing,
                  name: vals.name,
                  type: vals.type,
                  sort: Number(vals.sort || 0),
                  visible: !!vals.visible,
                  ...(iconName ? { icon: iconName } : {}),
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
        <Form form={editForm} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} requiredMark={false}>
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
          <Form.Item label="类型" name="type" rules={[{ required: true, message: '请输入类型路径' }]}> 
            <Input placeholder="例如：/admin/index" />
          </Form.Item>
          <Form.Item label="图标" name="icon">
            <Input
              size="large"
              style={{ height: 40 }}
              placeholder="请输入图标名称，如：s-home"
              suffix={
                <Button
                  type="text"
                  size="large"
                  icon={<PictureOutlined />}
                  onClick={() => openIconPicker('edit')}
                  style={{ height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              }
            />
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
      <Modal
        title="图标选择"
        open={iconPickerOpen}
        width={720}
        destroyOnClose
        bodyStyle={{ padding: 12, maxHeight: '60vh', overflow: 'auto' }}
        onCancel={() => setIconPickerOpen(false)}
        footer={[<Button key="close" onClick={() => setIconPickerOpen(false)}>关闭</Button>]}
      >
        <Input
          placeholder="输入关键词搜索，注意全是英文"
          value={iconQuery}
          onChange={(e) => setIconQuery(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 56px)', gap: 16 }}>
          {iconChoices
            .filter((it) => it.key.includes(iconQuery.trim().toLowerCase()))
            .map((it) => (
              <div
                key={it.key}
                onClick={() => {
                  if (iconPickerTarget === 'add') {
                    form.setFieldsValue({ icon: it.key });
                  } else {
                    editForm.setFieldsValue({ icon: it.key });
                  }
                  setIconPickerOpen(false);
                }}
                style={{
                  width: 56,
                  height: 56,
                  border: '1px solid #e5e6eb',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#4e5969',
                }}
                title={it.key}
              >
                {it.icon}
              </div>
            ))}
        </div>
      </Modal>
    </div>
  );
};

export default PermissionSettings;