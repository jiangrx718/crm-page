import React, { useState } from 'react';
import { Card, Form, Select, Input, Button, Table, Empty, Breadcrumb, Switch, Modal, InputNumber, Upload, Radio, Popconfirm, message, Tooltip } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

type Cat = { id: string | number; name: string; icon?: string; status: 'show' | 'hide'; desc?: string; sort?: number; parentId?: string | number; children?: Cat[] };

const ProductCategory: React.FC = () => {
  const [status] = useState<string | undefined>();
  const [keyword] = useState<string>('');
  const [data, setData] = useState<Cat[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [form] = Form.useForm();
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState<Cat | null>(null);
  const hasInitialized = React.useRef(false);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/category/list?category_type=2`);
      if (res.data.code === 0 && res.data.data && res.data.data.list) {
        const mapApiToCat = (item: any): Cat => ({
          id: item.category_id,
          name: item.category_name,
          icon: item.category_image,
          status: item.status === 'on' ? 'show' : 'hide',
          desc: '',
          sort: item.position,
          parentId: item.parent_id || 0,
          children: item.child_list ? item.child_list.map(mapApiToCat) : [],
        });
        setData(res.data.data.list.map(mapApiToCat));
      }
    } catch (e) {
      console.error('Failed to fetch categories', e);
      message.error('获取分类列表失败');
    }
  };

  React.useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchCategories();
    }
  }, []);

  const filterTree = (items: Cat[]): Cat[] => {
    const matchItem = (it: Cat) => {
      const byStatus = status ? (status === 'show' ? it.status === 'show' : it.status === 'hide') : true;
      const byKeyword = keyword ? it.name.includes(keyword) : true;
      return byStatus && byKeyword;
    };
    const next: Cat[] = [];
    items.forEach((it) => {
      const child = it.children ? filterTree(it.children) : [];
      if (matchItem(it) || child.length) {
        next.push({ ...it, children: child });
      }
    });
    return next;
  };
  const filtered = filterTree(data);

  const updateStatusById = (items: Cat[], id: string | number, enabled: boolean): Cat[] =>
    items.map((item) => {
      const updated: Cat = {
        ...item,
        status: item.id === id ? (enabled ? 'show' : 'hide') : item.status,
      };
      if (item.children && item.children.length) {
        updated.children = updateStatusById(item.children, id, enabled);
      }
      return updated;
    });

  const removeCatById = (list: Cat[], id: string | number): Cat[] =>
    list
      .filter((it) => it.id !== id)
      .map((it) => ({ ...it, children: it.children ? removeCatById(it.children, id) : undefined }));

  const insertCatToParent = (list: Cat[], pid: string | number, item: Cat): Cat[] => {
    if (pid === 0 || pid === "") return [...list, item];
    return list.map((it) => {
      if (it.id === pid) {
        return { ...it, children: [...(it.children || []), item] };
      }
      return { ...it, children: it.children ? insertCatToParent(it.children, pid, item) : it.children };
    });
  };

  const columns = [
    { title: '栏目名称', dataIndex: 'name'},
    { title: '栏目ID', dataIndex: 'id'},
    { title: '排序', dataIndex: 'sort', width: 100 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_: any, record: Cat) => (
      <Switch
        checkedChildren="开启"
        unCheckedChildren="关闭"
        checked={record.status === 'show'}
        onChange={(checked) => setData(prev => updateStatusById(prev, record.id, checked))}
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
              title="删除确认"
              description={`确定要删除${record.name}数据吗？`}
              okText="确定"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  const res = await axios.post(`${API_BASE_URL}/api/category/delete`, { category_id: record.id });
                  if (res.data.code === 0) {
                    message.success('已删除当前类别');
                    fetchCategories();
                  } else {
                    message.error(res.data.msg || '删除失败');
                  }
                } catch (error) {
                  console.error(error);
                  message.error('删除请求失败');
                }
              }}
            >
              <Button type="link" danger>删除</Button>
            </Popconfirm>
          )}
        </div>
      );
    } },
  ];

  const toFileList = (url?: string) => (url ? [{ uid: '1', url, status: 'done', name: 'image' }] : []);

  const onEdit = (record: Cat) => {
    setEditing(record);
    editForm.setFieldsValue({
      parentId: record.parentId ?? 0,
      name: record.name,
      desc: record.desc,
      icon: toFileList(record.icon),
      sort: record.sort ?? 0,
      status: record.status,
    });
    setOpenEdit(true);
  };

  const onEditCancel = () => {
    setOpenEdit(false);
    editForm.resetFields();
    setEditing(null);
  };

  const onEditOk = async () => {
    try {
      const values = await editForm.validateFields();
      const file = values.icon?.[0];
      const iconUrl = file?.url || file?.thumbUrl || editing?.icon || '';

      if (!editing?.id) {
        message.error('编辑失败：无法获取分类ID');
        return;
      }

      const payload = {
        category_id: editing.id,
        parent_id: values.parentId === 0 ? "" : values.parentId,
        category_image: iconUrl,
        position: values.sort ?? 0,
        category_name: values.name,
        category_type:2,
        status: values.status === 'show' ? 'on' : 'off'
      };

      await axios.post(`${API_BASE_URL}/api/category/update`, payload);
      message.success('分类更新成功');

      fetchCategories();
      onEditCancel();
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        message.error('更新失败: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const onAddOk = async () => {
    try {
      const values = await form.validateFields();
      
      const file = values.icon?.[0];
      const iconUrl = file?.url || file?.thumbUrl || '';

      const payload = {
        parent_id: values.parentId === 0 ? "" : values.parentId,
        category_image: iconUrl,
        position: values.sort ?? 0,
        category_name: values.name,
        category_type:2,
        status: values.status === 'show' ? 'on' : 'off'
      };

      await axios.post(`${API_BASE_URL}/api/category/create`, payload);
      message.success('分类添加成功');

      // Refresh list to get the real ID and data
      fetchCategories();
      form.resetFields();
      setOpenAdd(false);
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        message.error('添加失败: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  return (
    <div>
      <Card>
        {/* 面包屑导航 */}
        <Breadcrumb
          style={{ marginBottom: 20 }}
          items={[
            { title: <Link to="/home">首页</Link> },
            { title: '商品管理' },
            { title: '商品分类' },
          ]}
        />

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
            <Button
                      type="primary"
                      size="small"
                      style={{ height: 30, fontSize: 14, padding: '10px' }}
                      onClick={() => setOpenAdd(true)}
                    >
                      添加商品分类
                    </Button>
            </div>

        <div style={{ marginTop: 16 }}>
          <Table
            columns={columns}
            dataSource={filtered}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无数据" /> }}
            rowKey="id"
            expandable={{
              indentSize: 20,
              rowExpandable: (record: Cat) => Array.isArray(record.children) && record.children.length > 0,
              expandIcon: ({ expanded, onExpand, record }) => {
                if (!record.children || record.children.length === 0) {
                  return <span style={{ display: 'inline-block', width: 20, marginRight: 8 }}></span>;
                }
                return (
                  <span
                    style={{ marginRight: 8, cursor: 'pointer' }}
                    onClick={e => onExpand(record, e)}
                  >
                    {expanded ? '▼' : '▶'}
                  </span>
                );
              }
            }}
          />
        </div>

        <Modal
          title="添加分类"
          open={openAdd}
          onOk={onAddOk}
          onCancel={() => { setOpenAdd(false); form.resetFields(); }}
          okText="确定"
          cancelText="取消"
          width={640}
          rootClassName="compact-modal"
          styles={{ body: { padding: 12, maxHeight: '60vh', overflow: 'auto' } }}
        >
          <Form
            form={form}
            layout="horizontal"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            requiredMark={true}
            initialValues={{ parentId: 0, status: 'show', sort: 0 }}
          >
            <Form.Item label="上级分类" name="parentId">
              <Select
                style={{ width: 240 }}
                options={[{ value: 0, label: '顶级分类' }, ...data.map(it => ({ value: it.id, label: it.name }))]}
              />
            </Form.Item>

            <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }]}> 
              <Input placeholder="请输入分类名称" />
            </Form.Item>

            <Form.Item label="分类图片" name="icon" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
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
        </Modal>

        <Modal
          title="编辑分类"
          open={openEdit}
          onOk={onEditOk}
          onCancel={onEditCancel}
          okText="保存"
          cancelText="取消"
          width={640}
          rootClassName="compact-modal"
          styles={{ body: { padding: 12, maxHeight: '60vh', overflow: 'auto' } }}
        >
          <Form
            form={editForm}
            layout="horizontal"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            requiredMark={true}
            initialValues={{ parentId: 0, status: 'show', sort: 0 }}
          >
            <Form.Item label="上级分类" name="parentId">
              <Select
                style={{ width: 240 }}
                options={[{ value: 0, label: '顶级分类' }, ...data.map(it => ({ value: it.id, label: it.name }))]}
              />
            </Form.Item>

            <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }]}> 
              <Input placeholder="请输入分类名称" />
            </Form.Item>

            <Form.Item label="分类图片" name="icon" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
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
        </Modal>
      </Card>
    </div>
  );
};

export default ProductCategory;