import { Layout, App as AntdApp, Spin } from 'antd';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom'; // 修改这里：BrowserRouter → HashRouter
import { useEffect, useState } from 'react';
import { eventBus } from './utils/eventBus';
import SideMenu from './components/SideMenu';
import UserMenu from './components/UserMenu';
import RoleManagement from './pages/RoleManagement';
import AdminList from './pages/AdminList';
import PermissionSettings from './pages/PermissionSettings';
import ProductCategory from './pages/ProductCategory';
import ProductList from './pages/ProductList';
import BaseSettings from './pages/BaseSettings';
import AgreementSettings from './pages/AgreementSettings';
import Home from './pages/Home';
import OrderList from './pages/OrderList';
import OrderStatistics from './pages/OrderStatistics';
import ArticleCategory from './pages/ArticleCategory';
import ArticleList from './pages/ArticleList';
import Login from './pages/Login';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';

const { Header, Content, Sider } = Layout;

// 全局错误监听组件，必须在 AntdApp 内部使用
const GlobalErrorListener = () => {
  const { modal } = AntdApp.useApp();

  useEffect(() => {
    const handleGlobalError = (data: any) => {
      console.log('Handling global error in component:', data);
      const config = {
        title: '提示',
        content: data.content,
        okText: '知道了',
        centered: true,
      };
      
      if (data.type === 'warning') {
        modal.warning(config);
      } else {
        modal.error(config);
      }
    };

    eventBus.on('global_error', handleGlobalError);
    return () => {
      eventBus.off('global_error', handleGlobalError);
    };
  }, [modal]);

  return null;
};

function AppLayout() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let timer: any;
    const handleStartLoading = () => {
      setIsLoading(true);
      // Safety timeout: auto-hide after 1.5s if no request finishes (e.g. static page)
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    };

    const handleStopLoading = () => {
      if (timer) clearTimeout(timer);
      // Add a small delay to prevent flickering for very fast requests
      setTimeout(() => setIsLoading(false), 200);
    };

    eventBus.on('start_loading', handleStartLoading);
    eventBus.on('stop_loading', handleStopLoading);
    return () => {
      eventBus.off('start_loading', handleStartLoading);
      eventBus.off('stop_loading', handleStopLoading);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <Layout className="app-container">
      <Header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 }}>
        <div className="app-logo">CRM商品管理后台系统</div>
        <UserMenu />
      </Header>
      <Layout className="app-layout">
        <Sider className="app-sider" width={200}>
          <SideMenu />
        </Sider>
        <Layout>
          <Content className="app-content" style={{ position: 'relative', minHeight: '100%' }}>
            {isLoading && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(255, 255, 255, 0.6)',
                zIndex: 1000,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backdropFilter: 'blur(2px)'
              }}>
                <Spin size="large" tip="加载中..." />
              </div>
            )}
            <div style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Home />} />
                <Route path="/roles" element={<RoleManagement />} />
                <Route path="/admins" element={<AdminList />} />
                <Route path="/permissions" element={<PermissionSettings />} />
                <Route path="/product-category" element={<ProductCategory />} />
                <Route path="/product-list" element={<ProductList />} />
                <Route path="/article-category" element={<ArticleCategory />} />
                <Route path="/article-list" element={<ArticleList />} />
                <Route path="/order-list" element={<OrderList />} />
                <Route path="/order-statistics" element={<OrderStatistics />} />
                <Route path="/base-settings" element={<BaseSettings />} />
                <Route path="/agreement-settings" element={<AgreementSettings />} />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <AntdApp>
      <GlobalErrorListener />
      <AuthProvider>
        <Router>
          <Routes>
            {/* 独立登录页：不需要登录态授权，也不嵌入主布局 */}
            <Route path="/login" element={<Login />} />
            {/* 其他业务页面统一走主布局（整体受 PrivateRoute 保护，避免闪现） */}
            <Route path="/*" element={<PrivateRoute><AppLayout /></PrivateRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </AntdApp>
  );
}

export default App;
