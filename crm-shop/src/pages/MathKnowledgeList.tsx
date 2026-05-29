import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Button, Table, Empty, Popconfirm, message, Modal, Switch, Divider } from 'antd';
import { showError } from '../utils/notify';
import { PlusOutlined, ArrowLeftOutlined, MinusCircleOutlined } from '@ant-design/icons';
import PageHeader from '../components/PageHeader';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

type KnowledgePoint = {
  id: string;
  title: string;
  summary: string;
  explanation: string;
  tips: string[];
  examples: { scenario: string; question: string; steps: string[]; answer: string }[];
  status: string;
  position: number;
  exerciseCount: number;
  time: string;
};

const MathKnowledgeList: React.FC = () => {
  const navigate = useNavigate();
  const { chapterId } = useParams<{ chapterId: string }>();
  const location = useLocation();
  const gradeName = (location.state as any)?.gradeName || '';
  const chapterName = (location.state as any)?.chapterName || '';

  const [list, setList] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const hasInitialized = useRef(false);

  const fetchList = async (p = 1, ps = 10) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/mathematics/knowledge/list`, {
        params: { chapter_id: chapterId, limit: ps, offset: (p - 1) * ps }
      });
      const data = res.data;
      if (data?.code === 0 && data.data) {
        const arr = Array.isArray(data.data.list) ? data.data.list : [];
        const cnt = typeof data.data.count === 'number' ? data.data.count : 0;
        setList(arr.map((it: any) => ({
          id: String(it.knowledge_id ?? ''),
          title: String(it.title ?? ''),
          summary: String(it.summary ?? ''),
          explanation: String(it.explanation ?? ''),
          tips: Array.isArray(it.tips) ? it.tips : [],
          examples: Array.isArray(it.examples) ? it.examples : [],
          exerciseCount: Number(it.exercise_count ?? 0),
          status: String(it.status ?? 'on'),
          position: Number(it.position ?? 0),
          time: String(it.created_at ?? ''),
        })));
        setTotal(cnt);
        setPage(p);
        setPageSize(ps);
      } else {
        setList([]);
      }
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchList(1, 10);
    }
  }, []);

  const handleToggleStatus = async (record: KnowledgePoint) => {
    try {
      const newStatus = record.status === 'on' ? 'off' : 'on';
      const res = await axios.post(`${API_BASE_URL}/api/mathematics/knowledge/status`, {
        knowledge_id: record.id,
        status: newStatus,
      });
      if (res.data?.code === 0) {
        message.success(newStatus === 'on' ? '已开启' : '已关闭');
        fetchList(page, pageSize);
      } else {
        showError();
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/mathematics/knowledge/delete`, { knowledge_id: id });
      if (res.data?.code === 0) {
        message.success('删除成功');
        fetchList(page, pageSize);
      } else {
        showError();
      }
    } catch { /* ignore */ }
  };

  const handleEdit = (record: KnowledgePoint) => {
    setEditId(record.id);
    addForm.setFieldsValue({
      title: record.title,
      summary: record.summary,
      explanation: record.explanation,
      tips: record.tips.length > 0 ? record.tips : [''],
      examples: record.examples.length > 0 ? record.examples : undefined,
    });
    setAddOpen(true);
  };

  const onAddOk = async () => {
    try {
      const values = await addForm.validateFields();
      const tips = (values.tips || []).filter((t: string) => t && t.trim());
      const examples = (values.examples || []).map((ex: any) => ({
        scenario: ex.scenario || '',
        question: ex.question || '',
        steps: (ex.steps || []).filter((s: string) => s && s.trim()),
        answer: ex.answer || '',
      }));

      if (editId) {
        await axios.post(`${API_BASE_URL}/api/mathematics/knowledge/update`, {
          knowledge_id: editId, title: values.title, summary: values.summary,
          explanation: values.explanation, tips: JSON.stringify(tips), examples: JSON.stringify(examples)
        });
        message.success('更新成功');
      } else {
        await axios.post(`${API_BASE_URL}/api/mathematics/knowledge/create`, {
          chapter_id: chapterId, title: values.title, summary: values.summary,
          explanation: values.explanation, tips: JSON.stringify(tips), examples: JSON.stringify(examples)
        });
        message.success('添加成功');
      }
      setAddOpen(false);
      addForm.resetFields();
      setEditId(undefined);
      fetchList();
    } catch { /* validation or api error */ }
  };

  const columns = [
    { title: '标题', dataIndex: 'title' },
    {
      title: '概要', dataIndex: 'summary', ellipsis: true,
      render: (text: string) => <span title={text}>{text}</span>,
    },
    { title: '练习题数', dataIndex: 'exerciseCount', width: 100 },
    { title: '排序', dataIndex: 'position', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (status: string, record: KnowledgePoint) => (
        <Switch
          checked={status === 'on'}
          checkedChildren="开启"
          unCheckedChildren="关闭"
          onChange={() => handleToggleStatus(record)}
        />
      ),
    },
    { title: '创建时间', dataIndex: 'time', width: 180 },
    {
      title: '操作', width: 280,
      render: (_: any, record: KnowledgePoint) => (
        <div className="table-actions">
          <Button type="link" onClick={() => navigate(`/mathematics/exercises/${record.id}`, {
            state: { gradeName, chapterName, pointTitle: record.title }
          })}>管理练习题</Button>
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除吗？" okText="确定" cancelText="取消" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[{ name: `${gradeName} - 章节管理` }, { name: `${chapterName} - 知识点管理` }]}
        onRefresh={() => fetchList(page, pageSize)}
      />
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回章节列表</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditId(undefined);
            addForm.resetFields();
            setAddOpen(true);
          }}>添加知识点</Button>
        </div>
        <Table rowKey="id" columns={columns} dataSource={list} loading={loading}
          pagination={{ current: page, pageSize, total, onChange: (p, ps) => fetchList(p, ps) }}
          locale={{ emptyText: <Empty description="暂无数据" /> }}
        />
      </Card>

      <Modal
        title={editId ? '编辑知识点' : '添加知识点'}
        open={addOpen} onOk={onAddOk}
        onCancel={() => { setAddOpen(false); addForm.resetFields(); setEditId(undefined); }}
        width={1000} maskClosable={false}
        style={{ top: 20 }}
      >
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: 8 }}>
          <Form form={addForm} layout="vertical">
            <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
              <Input placeholder="如：小数乘法" />
            </Form.Item>
            <Form.Item label="概要" name="summary" rules={[{ required: true, message: '请输入概要' }]}>
              <Input.TextArea rows={2} placeholder="简短描述知识点" />
            </Form.Item>
            <Form.Item label="详细解释" name="explanation">
              <Input.TextArea rows={6} placeholder="详细解释知识点内容" />
            </Form.Item>

            <Divider orientation="left">学习提示</Divider>
            <Form.List name="tips">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(field => (
                    <div key={field.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <Form.Item name={field.name} noStyle>
                        <Input placeholder="输入提示内容" style={{ flex: 1 }} />
                      </Form.Item>
                      <Button danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add('')} block icon={<PlusOutlined />}>添加提示</Button>
                </>
              )}
            </Form.List>

            <Divider orientation="left">例题</Divider>
            <Form.List name="examples">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(field => (
                    <Card key={field.key} size="small" style={{ marginBottom: 16 }}
                      extra={<Button danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>删除例题</Button>}>
                      <Form.Item name={[field.name, 'scenario']} label="场景">
                        <Input.TextArea rows={2} placeholder="描述应用场景" />
                      </Form.Item>
                      <Form.Item name={[field.name, 'question']} label="问题">
                        <Input placeholder="提出问题" />
                      </Form.Item>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ marginBottom: 8, fontWeight: 500 }}>解题步骤</div>
                        <Form.List name={[field.name, 'steps']}>
                          {(stepFields, { add: addStep, remove: removeStep }) => (
                            <>
                              {stepFields.map(sf => (
                                <div key={sf.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                  <Form.Item name={sf.name} noStyle>
                                    <Input placeholder={`步骤 ${sf.name + 1}`} style={{ flex: 1 }} />
                                  </Form.Item>
                                  <Button danger icon={<MinusCircleOutlined />} onClick={() => removeStep(sf.name)} />
                                </div>
                              ))}
                              <Button type="dashed" size="small" onClick={() => addStep('')} icon={<PlusOutlined />}>添加步骤</Button>
                            </>
                          )}
                        </Form.List>
                      </div>
                      <Form.Item name={[field.name, 'answer']} label="答案">
                        <Input placeholder="最终答案" />
                      </Form.Item>
                    </Card>
                  ))}
                  <Button type="dashed" onClick={() => add({ scenario: '', question: '', steps: [''], answer: '' })}
                    block icon={<PlusOutlined />}>添加例题</Button>
                </>
              )}
            </Form.List>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default MathKnowledgeList;
