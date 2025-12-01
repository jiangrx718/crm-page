import { Layout } from 'antd';
import { HashRouter as Router, Route, Routes } from 'react-router-dom'; // 修改这里：BrowserRouter → HashRouter
import SideMenu from './components/SideMenu';
import DataConversion from './pages/DataConversion';
import ModelTraining from './pages/ModelTraining';
import DataInference from './pages/DataInference';
import RoleManagement from './pages/RoleManagement';
import AdminList from './pages/AdminList';
import PermissionSettings from './pages/PermissionSettings';
import FitModelTrainData from './pages/FitModelTrainData';
import FitModelTrain from './pages/FitModelTrain';
import FitModelTrainDataInference from './pages/FitModelTrainDataInference';
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

function AppLayout() {
  return (
    <Layout className="app-container">
      <Header className="app-header">
        <div className="app-logo">CRM商品管理后台系统</div>
      </Header>
      <Layout className="app-layout">
        <Sider className="app-sider" width={200}>
          <SideMenu />
        </Sider>
        <Layout>
          <Content className="app-content">
            <Routes>
              <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
              <Route path="/" element={<PrivateRoute><DataConversion /></PrivateRoute>} />
              <Route path="/model-training" element={<PrivateRoute><ModelTraining /></PrivateRoute>} />
              <Route path="/data-inference" element={<PrivateRoute><DataInference /></PrivateRoute>} />
              <Route path="/fit-model-train-data" element={<PrivateRoute><FitModelTrainData /></PrivateRoute>} />
              <Route path="/fit-model-train" element={<PrivateRoute><FitModelTrain /></PrivateRoute>} />
              <Route path="/fit-model-train-data-inference" element={<PrivateRoute><FitModelTrainDataInference /></PrivateRoute>} />
              <Route path="/roles" element={<PrivateRoute><RoleManagement /></PrivateRoute>} />
              <Route path="/admins" element={<PrivateRoute><AdminList /></PrivateRoute>} />
              <Route path="/permissions" element={<PrivateRoute><PermissionSettings /></PrivateRoute>} />
              <Route path="/product-category" element={<PrivateRoute><ProductCategory /></PrivateRoute>} />
              <Route path="/product-list" element={<PrivateRoute><ProductList /></PrivateRoute>} />
              <Route path="/article-category" element={<PrivateRoute><ArticleCategory /></PrivateRoute>} />
              <Route path="/article-list" element={<PrivateRoute><ArticleList /></PrivateRoute>} />
              <Route path="/order-list" element={<PrivateRoute><OrderList /></PrivateRoute>} />
              <Route path="/order-statistics" element={<PrivateRoute><OrderStatistics /></PrivateRoute>} />
              <Route path="/base-settings" element={<PrivateRoute><BaseSettings /></PrivateRoute>} />
              <Route path="/agreement-settings" element={<PrivateRoute><AgreementSettings /></PrivateRoute>} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 独立登录页：不需要登录态授权，也不嵌入主布局 */}
          <Route path="/login" element={<Login />} />
          {/* 其他业务页面统一走主布局 */}
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;