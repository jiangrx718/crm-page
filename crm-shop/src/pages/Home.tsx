import React, { useMemo } from 'react';
import { Card, Typography } from 'antd';
const { Title, Paragraph } = Typography;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '上午好，欢迎进入CRM商品管理后台系统';
  if (hour >= 12 && hour < 13) return '中午好，欢迎进入CRM商品管理后台系统';
  if (hour >= 13 && hour < 18) return '下午好，欢迎进入CRM商品管理后台系统';
  return '晚上好，欢迎进入CRM商品管理后台系统';
}

const Home: React.FC = () => {
  const greeting = useMemo(getGreeting, []);

  return (
    <div className="page-container">
      <Card style={{ marginTop: 16 }}>
        <div style={{
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>{greeting}</Title>
            <Paragraph type="secondary" style={{ marginTop: 8 }}>欢迎进入CRM商品管理后台系统</Paragraph>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Home;