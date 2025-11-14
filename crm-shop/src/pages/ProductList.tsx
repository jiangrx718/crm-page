import React, { useState } from 'react';
import { Card, Form, Select, Input, Button, Table, Empty, Image, Tag, Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';

const ProductList: React.FC = () => {
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState<string>('');

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '商品名称', dataIndex: 'name' },
    { title: '缩略图', dataIndex: 'thumb', render: (src: string) => src ? <Image src={src} width={40} height={40} /> : '-' },
    { title: '价格', dataIndex: 'price', width: 120 },
    { title: '库存', dataIndex: 'stock', width: 100 },
    { title: '状态', dataIndex: 'status', width: 120, render: (s: string) => <Tag color={s === 'enabled' ? 'blue' : 'default'}>{s === 'enabled' ? '开启' : '关闭'}</Tag> },
    { title: '操作', dataIndex: 'action', width: 200, render: () => <div style={{ display: 'flex', gap: 8 }}><Button type="link">编辑</Button><Button type="link" danger>删除</Button></div> }
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
          <Breadcrumb.Item>商品列表</Breadcrumb.Item>
        </Breadcrumb>
        <Form layout="inline" style={{ background: '#f7f8fa', padding: 16, borderRadius: 8 }}>
          <Form.Item label="商品分类">
            <Select
              style={{ width: 180 }}
              placeholder="请选择"
              value={categoryId}
              onChange={setCategoryId}
              options={[{ value: '1', label: '生活家居' }, { value: '2', label: '数码电器' }]}
              allowClear
            />
          </Form.Item>
          <Form.Item label="上架状态">
            <Select
              style={{ width: 180 }}
              placeholder="请选择"
              value={status}
              onChange={setStatus}
              options={[{ value: 'enabled', label: '已上架' }, { value: 'disabled', label: '未上架' }]}
              allowClear
            />
          </Form.Item>
          <Form.Item label="商品名称">
            <Input
              style={{ width: 280 }}
              placeholder="请输入商品名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary">查询</Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
          <Button type="primary" size="small">添加商品</Button>
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
    </div>
  );
};

export default ProductList;