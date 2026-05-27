import { Layout, App as AntdApp, Spin } from 'antd';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { eventBus } from './utils/eventBus';
import SideMenu from './components/SideMenu';
import UserMenu from './components/UserMenu';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Lazy load page components for code splitting
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const AdminList = lazy(() => import('./pages/AdminList'));
const PermissionSettings = lazy(() => import('./pages/PermissionSettings'));
const ProductCategory = lazy(() => import('./pages/ProductCategory'));
const ProductList = lazy(() => import('./pages/ProductList'));
const BaseSettings = lazy(() => import('./pages/BaseSettings'));
const AgreementSettings = lazy(() => import('./pages/AgreementSettings'));
const OrderList = lazy(() => import('./pages/OrderList'));
const OrderStatistics = lazy(() => import('./pages/OrderStatistics'));
const ArticleCategory = lazy(() => import('./pages/ArticleCategory'));
const ArticleList = lazy(() => import('./pages/ArticleList'));
const PictureBookList = lazy(() => import('./pages/PictureBookList'));

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

// Page loading fallback
const PageLoading = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 200px)',
  }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

function AppLayout() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingVisible, setLoadingVisible] = useState(false);

  useEffect(() => {
    let timer: any;
    let fadeTimer: any;

    const handleStartLoading = () => {
      setIsLoading(true);
      setLoadingVisible(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setIsLoading(false);
        fadeTimer = setTimeout(() => setLoadingVisible(false), 300);
      }, 1500);
    };

    const handleStopLoading = () => {
      if (timer) clearTimeout(timer);
      setTimeout(() => {
        setIsLoading(false);
        fadeTimer = setTimeout(() => setLoadingVisible(false), 300);
      }, 100);
    };

    eventBus.on('start_loading', handleStartLoading);
    eventBus.on('stop_loading', handleStopLoading);
    return () => {
      eventBus.off('start_loading', handleStartLoading);
      eventBus.off('stop_loading', handleStopLoading);
      if (timer) clearTimeout(timer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <Layout className="app-container">
      <Header className="app-header">
        <div className="app-logo">CRM商品管理后台系统</div>
        <UserMenu />
      </Header>
      <Layout className="app-layout">
        <Sider className="app-sider" width={200}>
          <SideMenu />
        </Sider>
        <Layout>
          <Content className="app-content" style={{ position: 'relative', minHeight: '100%' }}>
            {loadingVisible && (
              <div className={`loading-overlay ${isLoading ? 'loading-overlay-enter' : 'loading-overlay-exit'}`}>
                <Spin size="large" tip="加载中..." />
              </div>
            )}
            <div className="page-content-wrapper" style={{ opacity: isLoading ? 0.3 : 1, transition: 'opacity 0.3s ease' }}>
              <Suspense fallback={<PageLoading />}>
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
                  <Route path="/picture-book-list" element={<PictureBookList />} />
                  <Route path="/order-list" element={<OrderList />} />
                  <Route path="/order-statistics" element={<OrderStatistics />} />
                  <Route path="/base-settings" element={<BaseSettings />} />
                  <Route path="/agreement-settings" element={<AgreementSettings />} />
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
              </Suspense>
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
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<PrivateRoute><AppLayout /></PrivateRoute>} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </AntdApp>
  );
}

export default App;
