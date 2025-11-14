import React, { useMemo, useState } from 'react';
import { Card, Form, Select, Input, Button, Table, Empty, Image, Breadcrumb, Switch, Modal, Radio, InputNumber, Upload, Popconfirm, Tooltip } from 'antd';
import { Link } from 'react-router-dom';

const ProductCategory: React.FC = () => {
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm] = Form.useForm();
  const [showEdit, setShowEdit] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState<Cat | null>(null);

  type Cat = {
    id: number;
    name: string;
    icon?: string;
    sort: number;
    status: 'enabled' | 'disabled';
    children?: Cat[];
  };

  const initialMockData: Cat[] = [
    {
      id: 7,
      name: '生活家居',
      icon: 'https://via.placeholder.com/32?text=家',
      sort: 999,
      status: 'enabled',
      children: [
        { id: 701, name: '收纳整理', icon: 'https://via.placeholder.com/32?text=收', sort: 30, status: 'enabled' },
        { id: 702, name: '床上用品', icon: 'https://via.placeholder.com/32?text=床', sort: 20, status: 'enabled', children: [
          { id: 70201, name: '被子', icon: 'https://via.placeholder.com/32?text=被', sort: 10, status: 'enabled' },
          { id: 70202, name: '枕头', icon: 'https://via.placeholder.com/32?text=枕', sort: 9, status: 'disabled' }
        ]},
      ]
    },
    {
      id: 53,
      name: '运动专区',
      icon: 'https://via.placeholder.com/32?text=运',
      sort: 995,
      status: 'enabled',
      children: [
        { id: 5301, name: '跑步', icon: 'https://via.placeholder.com/32?text=跑', sort: 12, status: 'enabled' },
        { id: 5302, name: '健身', icon: 'https://via.placeholder.com/32?text=健', sort: 11, status: 'enabled' },
        { id: 5303, name: '户外运动', icon: 'https://via.placeholder.com/32?text=外', sort: 10, status: 'disabled' },
        { id: 5304, name: '球类运动', icon: 'https://via.placeholder.com/32?text=球', sort: 8, status: 'enabled' }
      ]
    },
    {
      id: 8,
      name: '电子产品',
      icon: 'https://via.placeholder.com/32?text=电',
      sort: 17,
      status: 'enabled',
      children: [
        { id: 801, name: '手机', icon: 'https://via.placeholder.com/32?text=机', sort: 10, status: 'enabled' },
        { id: 802, name: '电脑', icon: 'https://via.placeholder.com/32?text=脑', sort: 9, status: 'enabled' },
        { id: 803, name: '智能穿戴', icon: 'https://via.placeholder.com/32?text=戴', sort: 8, status: 'disabled' },
      ]
    },
    {
      id: 1,
      name: '家用电器',
      icon: 'https://via.placeholder.com/32?text=器',
      sort: 9,
      status: 'enabled',
      children: [
        { id: 101, name: '冰箱', icon: 'https://via.placeholder.com/32?text=冰', sort: 10, status: 'enabled' },
        { id: 102, name: '洗衣机', icon: 'https://via.placeholder.com/32?text=洗', sort: 9, status: 'enabled' },
        { id: 103, name: '空调', icon: 'https://via.placeholder.com/32?text=调', sort: 8, status: 'disabled' },
      ]
    },
    {
      id: 3,
      name: '家具装饰',
      icon: 'https://via.placeholder.com/32?text=装',
      sort: 7,
      status: 'enabled',
      children: [
        { id: 301, name: '沙发', icon: 'https://via.placeholder.com/32?text=沙', sort: 10, status: 'enabled' },
        { id: 302, name: '餐桌', icon: 'https://via.placeholder.com/32?text=桌', sort: 9, status: 'enabled' },
        { id: 303, name: '灯具', icon: 'https://via.placeholder.com/32?text=灯', sort: 8, status: 'disabled' },
      ]
    },
    {
      id: 6,
      name: '美妆护肤',
      icon: 'https://via.placeholder.com/32?text=妆',
      sort: 6,
      status: 'enabled',
      children: [
        { id: 601, name: '面膜', icon: 'https://via.placeholder.com/32?text=膜', sort: 10, status: 'enabled' },
        { id: 602, name: '护肤乳', icon: 'https://via.placeholder.com/32?text=乳', sort: 9, status: 'enabled' },
        { id: 603, name: '口红', icon: 'https://via.placeholder.com/32?text=红', sort: 8, status: 'disabled' },
      ]
    },
    {
      id: 4,
      name: '居家餐厨',
      icon: 'https://via.placeholder.com/32?text=厨',
      sort: 6,
      status: 'enabled',
      children: [
        { id: 401, name: '锅具', icon: 'https://via.placeholder.com/32?text=锅', sort: 10, status: 'enabled' },
        { id: 402, name: '餐具', icon: 'https://via.placeholder.com/32?text=餐', sort: 9, status: 'enabled' },
        { id: 403, name: '刀具', icon: 'https://via.placeholder.com/32?text=刀', sort: 8, status: 'disabled' },
      ]
    },
    {
      id: 2,
      name: '电视影音',
      icon: 'https://via.placeholder.com/32?text=视',
      sort: 3,
      status: 'enabled',
      children: [
        { id: 201, name: '电视机', icon: 'https://via.placeholder.com/32?text=TV', sort: 10, status: 'enabled' },
        { id: 202, name: '音响', icon: 'https://via.placeholder.com/32?text=音', sort: 9, status: 'enabled' },
        { id: 203, name: '投影', icon: 'https://via.placeholder.com/32?text=影', sort: 8, status: 'disabled' },
      ]
    },
    {
      id: 9,
      name: '日用文创',
      icon: 'https://via.placeholder.com/32?text=文',
      sort: 1,
      status: 'enabled',
      children: [
        { id: 901, name: '文具', icon: 'https://via.placeholder.com/32?text=具', sort: 10, status: 'enabled' },
        { id: 902, name: '礼品', icon: 'https://via.placeholder.com/32?text=礼', sort: 9, status: 'enabled' },
        { id: 903, name: '创意摆件', icon: 'https://via.placeholder.com/32?text=件', sort: 8, status: 'disabled' },
      ]
    },
  ];

  const [baseData, setBaseData] = useState<Cat[]>(initialMockData);

  const updateStatusById = (items: Cat[], id: number, enabled: boolean): Cat[] =>
    items.map((item) => {
      const updated: Cat = {
        ...item,
        status: item.id === id ? (enabled ? 'enabled' : 'disabled') : item.status,
      };
      if (item.children && item.children.length) {
        updated.children = updateStatusById(item.children, id, enabled);
      }
      return updated;
    });

  const handleStatusChange = (id: number, checked: boolean) => {
    setBaseData((prev) => updateStatusById(prev, id, checked));
  };

  const dataSource = useMemo(() => {
    const filterByKeyword = (items: Cat[]): Cat[] =>
      items
        .filter((item) => (status ? item.status === status : true))
        .filter((item) => (keyword ? item.name.includes(keyword) : true))
        .map((item) => ({
          ...item,
          children: item.children ? filterByKeyword(item.children) : undefined,
        }));

    const filtered = filterByKeyword(baseData);
    if (!categoryId) return filtered;
    // 简单根据顶级分类ID过滤。
    return filtered.filter((item) => String(item.id) === String(categoryId));
  }, [categoryId, status, keyword, baseData]);

  const categoryOptions = useMemo(() => baseData.map((c) => ({ value: String(c.id), label: c.name })), [baseData]);

  const flatMaxId = (items: Cat[]): number => {
    let maxId = 0;
    const walk = (list: Cat[]) => {
      list.forEach((it) => {
        if (it.id > maxId) maxId = it.id;
        if (it.children && it.children.length) walk(it.children);
      });
    };
    walk(items);
    return maxId;
  };

  const onAddCancel = () => {
    setShowAdd(false);
    addForm.resetFields();
  };

  const onAddOk = async () => {
    const values = await addForm.validateFields();
    const nextId = flatMaxId(baseData) + 1;
    const newItem: Cat = {
      id: nextId,
      name: values.name,
      icon: values.icon?.[0]?.url || 'https://via.placeholder.com/32?text=新',
      sort: values.sort ?? 0,
      status: values.status === 'show' ? 'enabled' : 'disabled',
    };

    const pid = Number(values.parentId || 0);
    setBaseData((prev) => {
      if (pid === 0) {
        return [...prev, newItem];
      }
      return prev.map((cat) => {
        if (cat.id === pid) {
          return { ...cat, children: [...(cat.children || []), newItem] };
        }
        return cat;
      });
    });
    onAddCancel();
  };

  const containsId = (list: Cat[] | undefined, id: number): boolean => {
    if (!list) return false;
    for (const it of list) {
      if (it.id === id) return true;
      if (containsId(it.children, id)) return true;
    }
    return false;
  };

  const findTopParentId = (id: number): number => {
    for (const root of baseData) {
      if (root.id === id) return 0;
      if (containsId(root.children, id)) return root.id;
    }
    return 0;
  };

  const toFileList = (url?: string) => (url ? [{ uid: '1', url, status: 'done', name: 'image' }] : []);

  const onEdit = (record: Cat) => {
    setEditing(record);
    editForm.setFieldsValue({
      parentId: findTopParentId(record.id),
      name: record.name,
      icon: toFileList(record.icon),
      banner: [],
      sort: record.sort,
      status: record.status === 'enabled' ? 'show' : 'hide',
    });
    setShowEdit(true);
  };

  const onEditCancel = () => {
    setShowEdit(false);
    editForm.resetFields();
    setEditing(null);
  };

  const updateCatById = (items: Cat[], id: number, updater: (c: Cat) => Cat): Cat[] =>
    items.map((it) => {
      let next = it.id === id ? updater(it) : it;
      if (it.children && it.children.length) {
        next = { ...next, children: updateCatById(it.children, id, updater) } as Cat;
      }
      return next;
    });

  const removeCatById = (items: Cat[], id: number): Cat[] =>
    items
      .filter((it) => it.id !== id)
      .map((it) => ({
        ...it,
        children: it.children ? removeCatById(it.children, id) : it.children,
      }));
  // 删除逻辑通过操作列的 Popconfirm 直接调用 removeCatById，无需独立函数。

  const onEditOk = async () => {
    if (!editing) return;
    const values = await editForm.validateFields();
    const nextIcon = values.icon?.[0]?.url || editing.icon;
    setBaseData((prev) =>
      updateCatById(prev, editing.id, (c) => ({
        ...c,
        name: values.name,
        icon: nextIcon,
        sort: values.sort ?? c.sort,
        status: values.status === 'show' ? 'enabled' : 'disabled',
      }))
    );
    onEditCancel();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 100 },
    { title: '分类名称', dataIndex: 'name' },
    { title: '分类图标', dataIndex: 'icon', render: (src: string) => src ? <Image src={src} width={32} height={32} /> : '-' },
    { title: '排序', dataIndex: 'sort', width: 100 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_: any, record: Cat) => (
      <Switch
        checkedChildren="开启"
        unCheckedChildren="关闭"
        checked={record.status === 'enabled'}
        onChange={(checked) => handleStatusChange(record.id, checked)}
      />
    ) },
    { title: '操作', dataIndex: 'action', width: 200, render: (_: any, record: Cat) => {
      const hasChildren = Array.isArray(record.children) && record.children.length > 0;
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="link" onClick={() => onEdit(record)}>编辑</Button>
          {hasChildren ? (
            <Tooltip title="存在下级分类，请先删除下级分类">
              <Button type="link" danger disabled>删除</Button>
            </Tooltip>
          ) : (
            <Popconfirm
              title="确认删除该分类？"
              description={`删除后不可恢复（ID: ${record.id}，名称：${record.name}）。`}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => setBaseData((prev) => removeCatById(prev, record.id))}
            >
              <Button type="link" danger>删除</Button>
            </Popconfirm>
          )}
        </div>
      );
    } }
  ];

  return (
    <div>
      <Card>
        {/* 面包屑导航 */}
        <Breadcrumb style={{ marginBottom: 20 }}>
          <Breadcrumb.Item>
            <Link to="/home">首页</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>商品管理</Breadcrumb.Item>
          <Breadcrumb.Item>商品分类</Breadcrumb.Item>
        </Breadcrumb>

        <Form layout="inline" style={{ background: '#f7f8fa', padding: 16, borderRadius: 8 }}>
          <Form.Item label="商品分类">
            <Select
              style={{ width: 220 }}
              placeholder="请选择"
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
              allowClear
            />
          </Form.Item>
          <Form.Item label="分类状态">
            <Select
              style={{ width: 180 }}
              placeholder="请选择"
              value={status}
              onChange={setStatus}
              options={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '禁用' }]}
              allowClear
            />
          </Form.Item>
          <Form.Item label="分类名称">
            <Input
              style={{ width: 280 }}
              placeholder="请输入分类名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary">查询</Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
          <Button type="primary" size="small" onClick={() => setShowAdd(true)}>添加分类</Button>
        </div>

        <div style={{ marginTop: 16 }}>
          <Table
            columns={columns}
            dataSource={dataSource}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无数据" /> }}
            rowKey="id"
            expandable={{
              indentSize: 20,
              rowExpandable: (record: Cat) => Array.isArray(record.children) && record.children.length > 0,
            }}
          />
        </div>

        <Modal
          title="添加分类"
          open={showAdd}
          onOk={onAddOk}
          onCancel={onAddCancel}
          width={640}
          rootClassName="compact-modal"
          bodyStyle={{ padding: 12, maxHeight: '60vh', overflow: 'auto' }}
          okText="确定"
          cancelText="取消"
        >
          <div className="upload-like-box">
            <Form
              form={addForm}
              layout="horizontal"
              labelCol={{ span: 6 }}
              wrapperCol={{ span: 18 }}
              requiredMark={true}
              initialValues={{ parentId: 0, status: 'show', sort: 0 }}
            >
              <Form.Item label="上级分类" name="parentId">
                <Select style={{ width: 240 }} options={[{ value: 0, label: '顶级分类' }, ...categoryOptions]} />
              </Form.Item>

              <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }]}>
                <Input placeholder="请输入分类名称" />
              </Form.Item>

              <Form.Item label="分类图标 (180*180)" name="icon" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
                <Upload listType="picture-card" beforeUpload={() => false}>
                  +
                </Upload>
              </Form.Item>

              <Form.Item label="分类大图 (468*340)" name="banner" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
                <Upload listType="picture-card" beforeUpload={() => false}>
                  +
                </Upload>
              </Form.Item>

              <Form.Item label="排序" name="sort">
                <InputNumber min={0} style={{ width: 160 }} />
              </Form.Item>

              <Form.Item label="状态" name="status">
                <Radio.Group>
                  <Radio value="show">显示</Radio>
                  <Radio value="hide">隐藏</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </div>
        </Modal>

        <Modal
          title="编辑分类"
          open={showEdit}
          onOk={onEditOk}
          onCancel={onEditCancel}
          width={640}
          rootClassName="compact-modal"
          bodyStyle={{ padding: 12, maxHeight: '60vh', overflow: 'auto' }}
          okText="保存"
          cancelText="取消"
        >
          <div className="upload-like-box">
            <Form
              form={editForm}
              layout="horizontal"
              labelCol={{ span: 6 }}
              wrapperCol={{ span: 18 }}
              requiredMark={true}
              initialValues={{ parentId: 0, status: 'show', sort: 0 }}
            >
              <Form.Item label="上级分类" name="parentId">
                <Select style={{ width: 240 }} options={[{ value: 0, label: '顶级分类' }, ...categoryOptions]} />
              </Form.Item>

              <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }]}>
                <Input placeholder="请输入分类名称" />
              </Form.Item>

              <Form.Item label="分类图标 (180*180)" name="icon" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
                <Upload listType="picture-card" beforeUpload={() => false}>
                  +
                </Upload>
              </Form.Item>

              <Form.Item label="分类大图 (468*340)" name="banner" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
                <Upload listType="picture-card" beforeUpload={() => false}>
                  +
                </Upload>
              </Form.Item>

              <Form.Item label="排序" name="sort">
                <InputNumber min={0} style={{ width: 160 }} />
              </Form.Item>

              <Form.Item label="状态" name="status">
                <Radio.Group>
                  <Radio value="show">显示</Radio>
                  <Radio value="hide">隐藏</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </Card>
    </div>
  );
};

export default ProductCategory;