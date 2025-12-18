import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ExperimentOutlined, DownOutlined, RightOutlined, SafetyOutlined, ShoppingOutlined, SettingOutlined, HomeOutlined, ShoppingCartOutlined, ReadOutlined, AppstoreOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface Permission {
  permission_id: string;
  permission_name: string;
  permission_url: string;
  parent_id: string;
  status: string;
  position: number;
  created_at: string;
  child_list: Permission[];
}

const SideMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [menuData, setMenuData] = useState<Permission[]>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const fetchMenu = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/permission/list?status=on&menu=1`);
        if (res.data && res.data.code === 0 && res.data.data && Array.isArray(res.data.data.list)) {
          setMenuData(res.data.data.list);
        }
      } catch (e) {
        console.error('Failed to fetch menu data', e);
      }
    };
    fetchMenu();
  }, []);

  const getIcon = (name: string) => {
    switch (name) {
      case '首页': return <HomeOutlined />;
      case '模型训练': return <ExperimentOutlined />;
      case '管理权限': return <SafetyOutlined />;
      case '商品管理': return <ShoppingOutlined />;
      case '订单管理': return <ShoppingCartOutlined />;
      case '内容管理': return <ReadOutlined />;
      case '系统设置': return <SettingOutlined />;
      default: return <AppstoreOutlined />;
    }
  };

  const isChildActive = (item: Permission): boolean => {
    if (item.permission_url === currentPath) return true;
    if (item.child_list && item.child_list.length > 0) {
      return item.child_list.some(child => child.permission_url === currentPath);
    }
    return false;
  };

  const handleParentClick = (item: Permission) => {
    // If it has no children, navigate
    if (!item.child_list || item.child_list.length === 0) {
      navigate(item.permission_url);
      // Close all other menus? Not necessarily for leaf nodes like Home.
      // But maybe we want to close expanded menus if we go to a top level page?
      // Current behavior doesn't seem to enforce closing when clicking Home, but accordion usually applies to expandable items.
      return;
    }

    // It has children, toggle expand
    const isOpen = openKeys.includes(item.permission_id);
    if (isOpen) {
      setOpenKeys([]);
    } else {
      setOpenKeys([item.permission_id]); // Accordion: only one open
    }
    
    // If the parent itself has a valid link (not just a container), navigate?
    // Usually container nodes have url="/" or similar which is not a page.
    // The example data has permission_url="/" for containers.
    if (item.permission_url && item.permission_url !== '/') {
        navigate(item.permission_url);
    }
  };

  return (
    <div className="menu-container" style={{ height: '100vh', overflowY: 'auto', overscrollBehavior: 'contain', paddingBottom: 12 }}>
      {menuData.map(item => {
        const hasChildren = item.child_list && item.child_list.length > 0;
        const isOpen = openKeys.includes(item.permission_id);
        const active = isChildActive(item);

        return (
          <div key={item.permission_id}>
            <div
              className={`menu-item ${active ? 'active' : ''}`}
              onClick={() => handleParentClick(item)}
            >
              <span className="menu-icon">{getIcon(item.permission_name)}</span>
              <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>{item.permission_name}</span>
              {hasChildren && (
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                  {isOpen ? <DownOutlined /> : <RightOutlined />}
                </span>
              )}
            </div>

            {hasChildren && isOpen && (
              <div className="submenu-container">
                {item.child_list.map(subItem => (
                  <div
                    key={subItem.permission_id}
                    className={`submenu-item ${currentPath === subItem.permission_url ? 'active' : ''}`}
                    onClick={() => navigate(subItem.permission_url)}
                  >
                    <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>{subItem.permission_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


export default SideMenu;
