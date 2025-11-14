import React from 'react';
import { Breadcrumb, Card, Form, Input, Select, Button, Tabs, Table, Tag, Empty, Dropdown, Modal, message, Drawer, Descriptions, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';

type OrderItem = {
  id: string;
  status: 'unpaid' | 'pending' | 'shipped' | 'finished' | 'refunded' | 'deleted';
  user: { name: string; id: number };
  goods: { title: string; price: number; cover?: string };
  payMethod: string;
  payTime?: string;
  amount: number;
};

// 小标题左侧标志样式组件
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, margin: '12px 0 8px' }}>
    <span style={{ display: 'inline-block', width: 4, height: 16, background: '#1677ff', borderRadius: 2, marginRight: 8 }} />
    <span>{children}</span>
  </div>
);

const statusMap: Record<OrderItem['status'], { label: string; color: string }> = {
  unpaid: { label: '未支付', color: 'default' },
  pending: { label: '待发货', color: 'processing' },
  shipped: { label: '待收货', color: 'warning' },
  finished: { label: '已完成', color: 'success' },
  refunded: { label: '已退款', color: 'error' },
  deleted: { label: '已删除', color: 'default' },
};

const allMock: OrderItem[] = Array.from({ length: 21 }).map((_, i) => {
  const statuses: OrderItem['status'][] = ['unpaid', 'pending', 'shipped', 'finished'];
  const st = statuses[i % statuses.length];
  return {
    id: `cp${Date.now()}${i}`,
    status: st,
    user: { name: ['张三', '李四', '王五', '赵六'][i % 4], id: 50000 + i },
    goods: { title: ['阿迪达斯鞋', 'NIKE卫衣', '华为手机壳', '小米蓝牙耳机'][i % 4], price: 99 + i },
    payMethod: st === 'unpaid' ? '--' : ['微信支付', '支付宝', '云闪付'][i % 3],
    payTime: st === 'unpaid' ? undefined : '2025-01-01 10:00:00',
    amount: 9.9 + i,
  };
});

const OrderList: React.FC = () => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = React.useState<string>('all');
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [data, setData] = React.useState<OrderItem[]>(allMock);
  const [detailOpen, setDetailOpen] = React.useState<boolean>(false);
  const [detailOrder, setDetailOrder] = React.useState<OrderItem | null>(null);

  const filtered = React.useMemo(() => {
    if (activeTab === 'all') return data;
    const map: Record<string, OrderItem['status']> = {
      unpaid: 'unpaid', pending: 'pending', shipped: 'shipped', finished: 'finished', refunded: 'refunded', deleted: 'deleted'
    };
    return data.filter(o => o.status === map[activeTab]);
  }, [activeTab, data]);

  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const columns: ColumnsType<OrderItem> = [
    { title: '订单编号', dataIndex: 'id', width: 220 },
    { title: '商品信息', dataIndex: 'goods', render: (g: OrderItem['goods']) => `${g.title}` },
    { title: '用户信息', dataIndex: 'user', render: (u: OrderItem['user']) => `${u.name}｜${u.id}` },
    { title: '实付金额', dataIndex: 'amount', render: (v: number) => `￥${v.toFixed(2)}` },
    { title: '支付方式', dataIndex: 'payMethod' },
    { title: '支付时间', dataIndex: 'payTime', render: (v?: string) => v || '--' },
    { title: '订单状态', dataIndex: 'status', render: (s: OrderItem['status']) => <Tag color={statusMap[s].color}>{statusMap[s].label}</Tag> },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 120,
      render: (_: any, record: OrderItem) => (
        <Dropdown
          trigger={["click"]}
          getPopupContainer={() => document.body}
          menu={{
            items: [
              { key: 'detail', label: '订单详情' },
              { key: 'delete', label: '删除订单' },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent?.stopPropagation();
              if (key === 'delete') {
                Modal.confirm({
                  title: '确认删除当前订单信息吗?',
                  content: `删除后不可恢复（ID: ${record.id}）。`,
                  okText: '删除',
                  cancelText: '取消',
                  okButtonProps: { danger: true },
                  onOk: () => {
                    setData(prev => prev.filter(o => o.id !== record.id));
                    message.success('已删除订单');
                    setPage(1);
                  }
                });
              } else if (key === 'detail') {
                setDetailOrder(record);
                setDetailOpen(true);
              }
            }
          }}
        >
          <Button type="link">更多</Button>
        </Dropdown>
      )
    }
  ];

  return (
    <div>
      <Card>
        {/* 面包屑导航 */}
        <Breadcrumb style={{ marginBottom: 20 }} items={[{ title: <Link to="/home">首页</Link> }, { title: '订单管理' }, { title: '订单列表' }]} />

        {/* 顶部筛选栏：与上传图的布局风格一致 */}
        <Form form={form} layout="inline" style={{ background: '#f7f8fa', padding: 16, borderRadius: 8 }}>
          <Form.Item label="订单类型" name="type">
            <Select style={{ width: 160 }} placeholder="请选择" allowClear options={[{ value: 'all', label: '全部' }, { value: 'normal', label: '普通订单' }, { value: 'vip', label: '会员订单' }]} />
          </Form.Item>
          <Form.Item label="支付方式" name="pay">
            <Select style={{ width: 160 }} placeholder="请选择" allowClear options={[{ value: 'wechat', label: '微信支付' }, { value: 'alipay', label: '支付宝' }, { value: 'union', label: '云闪付' }]} />
          </Form.Item>
          <Form.Item label="关键词" name="kw">
            <Input style={{ width: 280 }} placeholder="商品名/订单号/用户" />
          </Form.Item>
          <Form.Item>
            <Button type="primary">查询</Button>
          </Form.Item>
        </Form>

        {/* 状态标签（使用 Tabs 实现视觉靠近上传图的顶部标签效果） */}
        <Tabs
          style={{ marginTop: 12 }}
          items={[
            { key: 'all', label: '全部' },
            { key: 'unpaid', label: '待支付' },
            { key: 'pending', label: '待发货' },
            { key: 'shipped', label: '待收货' },
            { key: 'finished', label: '已完成' },
            { key: 'refunded', label: '已退款' },
            { key: 'deleted', label: '已删除' },
          ]}
          activeKey={activeTab}
          onChange={(k) => { setActiveTab(k); setPage(1); }}
        />

        <div style={{ marginTop: 16 }} className="upload-like-box">
          <Table
            columns={columns}
            dataSource={paged}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              total: filtered.length,
              showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
              pageSizeOptions: [10, 20, 50],
            }}
            locale={{ emptyText: <Empty description="暂无数据" /> }}
          />
        </div>
      </Card>
      {/* 订单详情抽屉 */}
      <Drawer
        title="订单详情"
        width={760}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {detailOrder ? (
          <div>
            {/* 顶部概要 */}
            <Descriptions column={3} size="small" style={{ marginBottom: 8 }}>
              <Descriptions.Item label="订单编号">{detailOrder.id}</Descriptions.Item>
              <Descriptions.Item label="订单状态">{statusMap[detailOrder.status].label}</Descriptions.Item>
              <Descriptions.Item label="实付金额">￥{detailOrder.amount.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="支付方式">{detailOrder.payMethod}</Descriptions.Item>
              <Descriptions.Item label="支付时间">{detailOrder.payTime || '--'}</Descriptions.Item>
            </Descriptions>
            <Divider />

            {/* 订单信息 */}
            <SectionTitle>订单信息</SectionTitle>
            <Descriptions column={3} size="small" bordered>
              <Descriptions.Item label="用户昵称">{detailOrder.user.name}</Descriptions.Item>
              <Descriptions.Item label="用户ID">{detailOrder.user.id}</Descriptions.Item>
              <Descriptions.Item label="买家备注">--</Descriptions.Item>
              <Descriptions.Item label="收货人">张客户</Descriptions.Item>
              <Descriptions.Item label="收货电话">138****8625</Descriptions.Item>
              <Descriptions.Item label="收货地址">新疆维吾尔自治区 乌鲁木齐市 天山区</Descriptions.Item>
            </Descriptions>
            <Divider />

            {/* 商品信息 */}
            <SectionTitle>商品信息</SectionTitle>
            <Table
              size="small"
              columns={[
                { title: '商品名', dataIndex: ['goods','title'] },
                { title: '单价', dataIndex: ['goods','price'], render: (v: number) => `￥${v}` },
                { title: '数量', dataIndex: 'count', render: () => 1 },
                { title: '小计', dataIndex: 'amount', render: (_: any, r: OrderItem) => `￥${r.amount.toFixed(2)}` },
              ]}
              dataSource={[detailOrder]}
              rowKey="id"
              pagination={false}
            />
            <Divider />

            {/* 订单记录（Mock） */}
            <SectionTitle>订单记录</SectionTitle>
            <Table
              size="small"
              columns={[
                { title: '时间', dataIndex: 'time' },
                { title: '动作', dataIndex: 'action' },
              ]}
              dataSource={[
                { key: '1', time: '2025-01-05 00:42:21', action: '创建订单' },
                { key: '2', time: detailOrder.payTime || '—', action: '支付成功' },
              ]}
              pagination={false}
            />
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default OrderList;