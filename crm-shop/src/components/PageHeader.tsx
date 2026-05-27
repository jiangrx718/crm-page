import { Breadcrumb, Button, Tooltip } from 'antd';
import { Link } from 'react-router-dom';
import { ReloadOutlined } from '@ant-design/icons';

interface PageHeaderProps {
  breadcrumbs: Array<{ path?: string; name: string }>;
  onRefresh?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ breadcrumbs, onRefresh }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <Breadcrumb
        items={breadcrumbs.map((item) => ({
          title: item.path ? <Link to={item.path}>{item.name}</Link> : item.name,
        }))}
      />
      {onRefresh && (
        <Tooltip title="刷新数据">
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            style={{ color: '#1677ff' }}
          />
        </Tooltip>
      )}
    </div>
  );
};

export default PageHeader;
