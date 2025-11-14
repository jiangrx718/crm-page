import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // 图形验证码（本地生成）
  const [captchaText, setCaptchaText] = useState('');
  const [captchaDataUrl, setCaptchaDataUrl] = useState<string>('');

  const genCaptchaText = (len = 4) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  const drawCaptcha = (text: string) => {
    const w = 120, h = 40;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#e6f4ff');
    grad.addColorStop(1, '#f7fbff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 24px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const x = 16 + i * 26 + Math.random() * 4;
      const y = h / 2 + (Math.random() * 6 - 3);
      const rot = (Math.random() - 0.5) * 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = ['#1677ff', '#0958d9', '#40a9ff'][i % 3];
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = 'rgba(64,169,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.quadraticCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    setCaptchaDataUrl(canvas.toDataURL('image/png'));
  };

  const refreshCaptcha = () => {
    const t = genCaptchaText();
    setCaptchaText(t);
    drawCaptcha(t);
    form.setFields([{ name: 'captcha', value: '' }]);
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const onFinish = () => {
    // 这里不做登录态校验，提交后直接进入后台首页
    navigate('/home');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* 背景：与项目蓝色主色调相匹配的渐变与星空点缀 */}
      <style>
        {`
          .login-bg::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(1000px 600px at 20% 30%, rgba(22,119,255,0.25), transparent),
                        radial-gradient(800px 500px at 80% 70%, rgba(64,169,255,0.25), transparent),
                        linear-gradient(120deg, #0d1b2a 0%, #1b263b 40%, #12253a 100%);
            z-index: -2;
          }
          .login-bg::after {
            content: '';
            position: absolute;
            inset: 0;
            background-image: radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px);
            background-size: 3px 3px;
            opacity: 0.3;
            z-index: -1;
          }
        `}
      </style>

      <div className="login-bg" style={{ position: 'absolute', inset: 0 }} />

      {/* 登录卡片：左右布局，右侧表单符合 Ant Design 风格 */}
      <Card style={{ width: 780, borderRadius: 12, overflow: 'hidden', padding: 0 }} bodyStyle={{ padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {/* 左侧品牌/插图 */}
          <div style={{ background: 'linear-gradient(180deg, #e6f4ff 0%, #f7fbff 100%)', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: 320 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#1677ff', marginBottom: 8 }}>CRM后台管理系统</div>
              <div style={{ color: '#666' }}>自己的，才是最好的。每个企业都应该拥有自己的CRM系统。</div>
              <div style={{ marginTop: 16, height: 160, borderRadius: 8, background: 'url(https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop) center/cover no-repeat' }} />
            </div>
          </div>
          {/* 右侧表单 */}
          <div style={{ padding: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <img src="/vite.svg" alt="logo" width={32} height={32} />
              <div style={{ fontSize: 20, fontWeight: 600 }}>CRM商品管理后台系统</div>
            </div>
            <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} initialValues={{ account: '' }}>
              <Form.Item label="账号" name="account" rules={[{ required: true, message: '请输入账号' }]}> 
                <Input placeholder="" />
              </Form.Item>
              <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}> 
                <Input.Password placeholder="" />
              </Form.Item>
              <Form.Item 
                label="验证码" 
                name="captcha" 
                validateFirst
                rules={[
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.reject('请输入验证码');
                      if (String(value).toLowerCase() !== captchaText.toLowerCase()) return Promise.reject('验证码错误');
                      return Promise.resolve();
                    }
                  }
                ]}
              > 
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Input placeholder="请输入验证码" style={{ flex: 1 }} />
                  <img
                    src={captchaDataUrl}
                    alt="图形验证码"
                    width={120}
                    height={40}
                    style={{ cursor: 'pointer', border: '1px solid #e5e6eb', borderRadius: 6 }}
                    onClick={refreshCaptcha}
                  />
                  <Button icon={<ReloadOutlined />} onClick={refreshCaptcha} title="换一张" />
                </div>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>登录</Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;