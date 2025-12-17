import React from 'react';
import { Dropdown } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const UserMenu: React.FC = () => {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!username) {
    return null;
  }

  const items = [
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8,
          paddingLeft: 16,
          paddingRight: 16,
          height: '100%',
          backgroundColor: '#1677ff',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#0958d9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#1677ff';
        }}
      >
        <UserOutlined style={{ color: '#fff', fontSize: 14 }} />
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{username}</span>
      </div>
    </Dropdown>
  );
};

export default UserMenu;
