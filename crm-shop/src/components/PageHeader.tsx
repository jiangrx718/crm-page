import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  breadcrumbs: Array<{ path?: string; name: string }>;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, breadcrumbs }) => {
  return (
    <div className="page-header">
      <Breadcrumb className="breadcrumb">
        {breadcrumbs.map((item, index) => (
          <Breadcrumb.Item key={index}>
            {item.path ? <Link to={item.path}>{item.name}</Link> : item.name}
          </Breadcrumb.Item>
        ))}
      </Breadcrumb>
      <h1 className="page-title">{title}</h1>
    </div>
  );
};

export default PageHeader;
