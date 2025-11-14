import React, { useState } from 'react';
import { Breadcrumb, Card, Form, Input, Button, Space, Tabs, Radio } from 'antd';
import { Link } from 'react-router-dom';

const BaseSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>('basic');

  const onSubmit = () => {
    form.validateFields().then(() => {
      // 这里可集成保存接口
    });
  };

  const settingsTabs = [
    { key: 'basic', label: '基础配置' },
    { key: 'share', label: '分享配置' },
    { key: 'logo', label: 'LOGO设置' },
    { key: 'customjs', label: '自定义JS' },
    { key: 'map', label: '地图配置' },
    { key: 'icp', label: '备案配置' },
    { key: 'module', label: '模块配置' },
    { key: 'page', label: '逐页配置' },
    { key: 'waf', label: 'WAF配置' },
  ];

  return (
    <div className="page-container">
      <Breadcrumb items={[{ title: <Link to="/home">首页</Link> }, { title: '系统设置' }, { title: '基础设置' }]} />

      <Card style={{ marginTop: 16 }}>
        {/* 顶部标签布局，视觉与上传图片页面保持一致 */}
        <Tabs items={settingsTabs} activeKey={activeTab} onChange={setActiveTab} style={{ marginBottom: 16 }} />

        {/* 内容区：不同小菜单显示个性化内容 */}
        {activeTab === 'icp' ? (
          <div className="upload-like-box">
            <Form form={form} layout="vertical" requiredMark={false}>
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Form.Item label="备案号" name="recordNo" rules={[{ required: true, message: '请输入备案号' }]} extra="网站的备案号，显示在H5和PC端底部">
                  <Input placeholder="如：陕ICP备14011498号-3" />
                </Form.Item>

                <Form.Item label="ICP备案链接" name="icpLink" rules={[{ type: 'url', message: '请输入合法的URL' }]} extra="H5和PC底部显示的ICP备案号点击跳转的链接">
                  <Input placeholder="https://beian.miit.gov.cn/" />
                </Form.Item>

                <Form.Item label="网安备案" name="psbRecord" extra="公安部门登记的备案信息，显示在PC底部">
                  <Input placeholder="请输入网安备案" />
                </Form.Item>

                <Form.Item label="网安备案链接" name="psbLink" rules={[{ type: 'url', message: '请输入合法的URL' }]} extra="H5和PC底部显示的网安备案号点击跳转的链接">
                  <Input placeholder="请输入网安备案链接" />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" onClick={onSubmit}>提交</Button>
                </Form.Item>
              </Space>
            </Form>
          </div>
        ) : activeTab === 'basic' ? (
          <div className="upload-like-box">
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              initialValues={{
                siteEnabled: true,
                siteName: 'CRMEB标准版',
                siteUrl: 'https://v5.crmeb.net',
                mqEnabled: false,
                hotline: '',
                licenseKey: ''
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Form.Item label="站点开启" name="siteEnabled" extra="站点开始关闭（用于升级等临时关闭），关闭后前端会弹窗显示站点升级中，请稍后访问">
                  <Radio.Group>
                    <Radio value={true}>开启</Radio>
                    <Radio value={false}>关闭</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label="网站名称" name="siteName" rules={[{ required: true, message: '请输入网站名称' }]}> 
                  <Input placeholder="CRMEB标准版" />
                </Form.Item>

                <Form.Item label="网站地址" name="siteUrl" rules={[{ required: true, message: '请输入网站地址' }, { type: 'url', message: '请输入合法的URL' }]} >
                  <Input placeholder="https://v5.crmeb.net" />
                </Form.Item>

                <Form.Item label="消息队列" name="mqEnabled" >
                  <Radio.Group>
                    <Radio value={true}>开启</Radio>
                    <Radio value={false}>关闭</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label="联系电话" name="hotline">
                  <Input placeholder="请输入联系电话" />
                </Form.Item>

                <Form.Item label="授权密钥" name="licenseKey">
                  <Input placeholder="请输入授权密钥" />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" onClick={onSubmit}>提交</Button>
                </Form.Item>
              </Space>
            </Form>
          </div>
        ) : (
          <div className="upload-like-box" style={{ color: '#999' }}>该配置内容暂未接入，可按需求补充相应字段。</div>
        )}
      </Card>
    </div>
  );
};

export default BaseSettings;