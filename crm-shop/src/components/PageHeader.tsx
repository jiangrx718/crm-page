import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  breadcrumbs: Array<{ path?: string; name: string }>;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, breadcrumbs }) => {
  return (
    <div className="page-header">
      <Breadcrumb
        className="breadcrumb"
        items={breadcrumbs.map((item) => ({
          title: item.path ? <Link to={item.path}>{item.name}</Link> : item.name,
        }))}
      />
      <h1 className="page-title">{title}</h1>
    </div>
  );
};

export default PageHeader;
