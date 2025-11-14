import React from 'react';
import { Breadcrumb, Card, Tabs, Table, Row, Col, Statistic, DatePicker, Progress } from 'antd';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');

// 移除未使用的类型声明以修复构建错误

const OrderStatistics: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<string>('today');
  const [range, setRange] = React.useState<[any, any]>([dayjs().subtract(30, 'day'), dayjs()]);

  // 顶部概要指标（Mock）
  const summary = React.useMemo(() => ({
    count: 198,
    sales: 725822.38,
    refundCount: 0,
    refundAmount: 0,
  }), []);

  // 生成时间范围内的每日趋势数据（Mock）
  const dailyLabels = React.useMemo(() => {
    const start = range[0];
    const end = range[1];
    const days = end.diff(start, 'day');
    return Array.from({ length: days + 1 }).map((_, i) => start.add(i, 'day').format('MM-DD'));
  }, [range]);

  const dailyAmount = React.useMemo(() => dailyLabels.map((_, i) => Math.max(0, Math.round(Math.sin(i / 2) * 80000 + (i % 7) * 3000 + 10000))), [dailyLabels]);
  const dailyCount = React.useMemo(() => dailyLabels.map((_, i) => Math.max(0, Math.round(Math.cos(i / 3) * 120 + (i % 5) * 10 + 30))), [dailyLabels]);

  const lineOption = React.useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['订单金额', '订单数量'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: dailyLabels },
    yAxis: { type: 'value' },
    series: [
      { name: '订单金额', type: 'line', smooth: true, data: dailyAmount },
      { name: '订单数量', type: 'line', smooth: true, data: dailyCount },
    ],
  }), [dailyLabels, dailyAmount, dailyCount]);

  // 订单来源分析（Mock）
  const sourceData = [
    { name: '公众号', value: 12 },
    { name: '小程序', value: 58 },
    { name: 'H5', value: 15 },
    { name: 'PC', value: 12 },
    { name: 'APP', value: 3 },
  ];

  const pieOption = React.useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: 0, top: 'middle' },
    series: [
      {
        name: '来源占比',
        type: 'pie',
        radius: '60%',
        center: ['35%', '50%'],
        data: sourceData.map(s => ({ name: s.name, value: s.value })),
        label: { formatter: '{b}: {d}%'}
      }
    ]
  }), []);

  // 订单类型分析（Mock）
  const typeRows = [
    { key: '1', source: '普通订单', amount: 676894.18, ratio: 0.9325 },
    { key: '2', source: '秒杀订单', amount: 36162, ratio: 0.0498 },
    { key: '3', source: '拼团订单', amount: 10617, ratio: 0.0145 },
    { key: '4', source: '砍价订单', amount: 2149.2, ratio: 0.0029 },
    { key: '5', source: '砍价订单', amount: 0, ratio: 0 },
  ];

  return (
    <div>
      <Card>
        <Breadcrumb style={{ marginBottom: 16 }} items={[{ title: <Link to="/home">首页</Link> }, { title: '订单管理' }, { title: '订单统计' }]} />

        <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
          <Col flex="none">
            <Tabs
              items={[
                { key: 'today', label: '今日' },
                { key: 'week', label: '本周' },
                { key: 'month', label: '本月' },
              ]}
              activeKey={activeTab}
              onChange={setActiveTab}
            />
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <DatePicker.RangePicker
              value={range as any}
              onChange={(v) => v && setRange([v[0], v[1]])}
            />
          </Col>
        </Row>

        {/* 顶部概要卡片 */}
        <Row gutter={16} style={{ marginBottom: 12 }}>
          <Col span={6}><Card><Statistic title="订单量" value={summary.count} /></Card></Col>
          <Col span={6}><Card><Statistic title="订单销售额" value={summary.sales} precision={2} /></Card></Col>
          <Col span={6}><Card><Statistic title="退款订单数" value={summary.refundCount} /></Card></Col>
          <Col span={6}><Card><Statistic title="退款金额" value={summary.refundAmount} precision={2} /></Card></Col>
        </Row>

        {/* 营业趋势折线图 */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>营业趋势</div>
          <ReactECharts option={lineOption} style={{ height: 300 }} />
        </Card>

        <Row gutter={16}>
          {/* 订单来源分析 饼图 */}
          <Col span={10}>
            <Card>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>订单来源分析</div>
              <ReactECharts option={pieOption} style={{ height: 260 }} />
            </Card>
          </Col>
          {/* 订单类型分析 表 */}
          <Col span={14}>
            <Card>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>订单类型分析</div>
              <Table
                columns={[
                  { title: '序号', dataIndex: 'key', width: 60 },
                  { title: '来源', dataIndex: 'source', width: 140 },
                  { title: '金额', dataIndex: 'amount', render: (v: number) => v.toLocaleString(), width: 140 },
                  { title: '占比', dataIndex: 'ratio', render: (r: number) => <Progress percent={Math.round(r * 100)} size="small" /> },
                ]}
                dataSource={typeRows}
                pagination={false}
                rowKey="key"
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default OrderStatistics;