import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Button, Table, Empty, Popconfirm, message, Modal, Select, Radio, Tag, Switch } from 'antd';
import { showError } from '../utils/notify';
import { PlusOutlined, ArrowLeftOutlined, MinusCircleOutlined } from '@ant-design/icons';
import PageHeader from '../components/PageHeader';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

type ExerciseType = 'calculation' | 'choice' | 'trueOrFalse' | 'fillBlank';

type Exercise = {
  id: string;
  type: ExerciseType;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty: number;
  status: string;
  position: number;
  createdAt: string;
};

const TYPE_MAP: Record<ExerciseType, { label: string; color: string }> = {
  calculation: { label: '计算题', color: 'blue' },
  choice: { label: '选择题', color: 'green' },
  trueOrFalse: { label: '判断题', color: 'orange' },
  fillBlank: { label: '填空题', color: 'purple' },
};

const DIFFICULTY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '简单', color: 'green' },
  2: { label: '中等', color: 'orange' },
  3: { label: '困难', color: 'red' },
};

const MathExerciseList: React.FC = () => {
  const navigate = useNavigate();
  const { pointId } = useParams<{ pointId: string }>();
  const location = useLocation();
  const gradeName = (location.state as any)?.gradeName || '';
  const chapterName = (location.state as any)?.chapterName || '';
  const pointTitle = (location.state as any)?.pointTitle || '';

  const [list, setList] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [exerciseType, setExerciseType] = useState<ExerciseType>('calculation');
  const hasInitialized = useRef(false);

  const fetchList = async (p = 1, ps = 10) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/mathematics/exercise/list`, {
        params: { knowledge_id: pointId, limit: ps, offset: (p - 1) * ps }
      });
      const data = res.data;
      if (data?.code === 0 && data.data) {
        const arr = Array.isArray(data.data.list) ? data.data.list : [];
        const cnt = typeof data.data.count === 'number' ? data.data.count : 0;
        setList(arr.map((it: any) => ({
          id: String(it.exercise_id ?? ''),
          type: String(it.type ?? 'calculation') as ExerciseType,
          question: String(it.question ?? ''),
          options: Array.isArray(it.options) ? it.options : [],
          answer: String(it.answer ?? ''),
          explanation: String(it.explanation ?? ''),
          difficulty: Number(it.difficulty ?? 1),
          status: String(it.status ?? 'on'),
          position: Number(it.position ?? 0),
          createdAt: String(it.created_at ?? ''),
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

  const handleDelete = async (id: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/mathematics/exercise/delete`, { exercise_id: id });
      if (res.data?.code === 0) {
        message.success('删除成功');
        fetchList(page, pageSize);
      } else {
        showError();
      }
    } catch { /* ignore */ }
  };

  const handleEdit = (record: Exercise) => {
    setEditId(record.id);
    setExerciseType(record.type);
    addForm.setFieldsValue({
      type: record.type,
      question: record.question,
      options: record.type === 'choice' ? (record.options.length > 0 ? record.options : ['']) : undefined,
      answer: record.answer,
      explanation: record.explanation,
      difficulty: record.difficulty,
      status: record.status,
    });
    setAddOpen(true);
  };

  const handleToggleStatus = async (record: Exercise) => {
    try {
      const newStatus = record.status === 'on' ? 'off' : 'on';
      const res = await axios.post(`${API_BASE_URL}/api/mathematics/exercise/status`, {
        exercise_id: record.id,
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

  const onAddOk = async () => {
    try {
      const values = await addForm.validateFields();
      const params: any = {
        type: values.type,
        question: values.question,
        answer: values.answer,
        explanation: values.explanation || '',
        difficulty: values.difficulty,
        status: values.status ?? 'on',
      };
      if (values.type === 'choice') {
        params.options = JSON.stringify((values.options || []).filter((o: string) => o && o.trim()));
      }

      if (editId) {
        params.exercise_id = editId;
        await axios.post(`${API_BASE_URL}/api/mathematics/exercise/update`, params);
        message.success('更新成功');
      } else {
        params.knowledge_id = pointId;
        await axios.post(`${API_BASE_URL}/api/mathematics/exercise/create`, params);
        message.success('添加成功');
      }
      setAddOpen(false);
      addForm.resetFields();
      setEditId(undefined);
      setExerciseType('calculation');
      fetchList();
    } catch { /* validation or api error */ }
  };

  const columns = [
    {
      title: '题型', dataIndex: 'type', width: 100,
      render: (type: ExerciseType) => {
        const info = TYPE_MAP[type];
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '题目', dataIndex: 'question', ellipsis: true,
      render: (text: string) => <span title={text}>{text}</span>,
    },
    {
      title: '难度', dataIndex: 'difficulty', width: 80,
      render: (d: number) => {
        const info = DIFFICULTY_MAP[d] || DIFFICULTY_MAP[1];
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    { title: '排序', dataIndex: 'position', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (status: string, record: Exercise) => (
        <Switch checked={status === 'on'} checkedChildren="开启" unCheckedChildren="关闭"
          onChange={() => handleToggleStatus(record)} />
      ),
    },
    {
      title: '添加时间', dataIndex: 'createdAt', width: 180,
    },
    {
      title: '操作', width: 200,
      render: (_: any, record: Exercise) => (
        <div className="table-actions">
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
        breadcrumbs={[{ name: `${chapterName} - 知识点管理` }, { name: `${pointTitle} - 练习题管理` }]}
        onRefresh={() => fetchList(page, pageSize)}
      />
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回知识点列表</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditId(undefined);
            setExerciseType('calculation');
            addForm.resetFields();
            addForm.setFieldsValue({ type: 'calculation', difficulty: 2, status: 'on' });
            setAddOpen(true);
          }}>添加练习题</Button>
        </div>
        <Table rowKey="id" columns={columns} dataSource={list} loading={loading}
          pagination={{ current: page, pageSize, total, onChange: (p, ps) => fetchList(p, ps) }}
          locale={{ emptyText: <Empty description="暂无数据" /> }}
        />
      </Card>

      <Modal
        title={editId ? '编辑练习题' : '添加练习题'}
        open={addOpen} onOk={onAddOk}
        onCancel={() => { setAddOpen(false); addForm.resetFields(); setEditId(undefined); }}
        width={700} maskClosable={false}
      >
        <Form form={addForm} layout="vertical">
          <Form.Item label="题目类型" name="type" rules={[{ required: true, message: '请选择题目类型' }]}>
            <Select onChange={(val: ExerciseType) => {
              setExerciseType(val);
              addForm.setFieldValue('answer', undefined);
              addForm.setFieldValue('options', undefined);
            }}>
              <Select.Option value="calculation">计算题</Select.Option>
              <Select.Option value="choice">选择题</Select.Option>
              <Select.Option value="trueOrFalse">判断题</Select.Option>
              <Select.Option value="fillBlank">填空题</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="题目" name="question" rules={[{ required: true, message: '请输入题目' }]}>
            <Input.TextArea rows={3} placeholder="请输入题目内容" />
          </Form.Item>

          {exerciseType === 'choice' && (
            <Form.List name="options">
              {(fields, { add, remove }) => (
                <>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>选项</div>
                  {fields.map((field, index) => (
                    <div key={field.key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <span style={{ width: 24, textAlign: 'center', fontWeight: 500 }}>
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <Form.Item name={field.name} noStyle rules={[{ required: true, message: '请输入选项内容' }]}>
                        <Input placeholder={`选项 ${String.fromCharCode(65 + index)}`} style={{ flex: 1 }} />
                      </Form.Item>
                      {fields.length > 2 && (
                        <Button danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
                      )}
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add('')} block icon={<PlusOutlined />}
                    disabled={fields.length >= 6}>添加选项</Button>
                </>
              )}
            </Form.List>
          )}

          {exerciseType === 'trueOrFalse' ? (
            <Form.Item label="答案" name="answer" rules={[{ required: true, message: '请选择答案' }]}>
              <Radio.Group>
                <Radio value="true">正确</Radio>
                <Radio value="false">错误</Radio>
              </Radio.Group>
            </Form.Item>
          ) : (
            <Form.Item label="答案" name="answer" rules={[{ required: true, message: '请输入答案' }]}>
              <Input placeholder="请输入答案" />
            </Form.Item>
          )}

          <Form.Item label="解析" name="explanation">
            <Input.TextArea rows={3} placeholder="请输入解析说明" />
          </Form.Item>

          <Form.Item label="难度" name="difficulty" rules={[{ required: true, message: '请选择难度' }]}>
            <Select>
              <Select.Option value={1}>简单</Select.Option>
              <Select.Option value={2}>中等</Select.Option>
              <Select.Option value={3}>困难</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="状态" name="status">
            <Switch checkedChildren="开启" unCheckedChildren="关闭"
              checked={addForm.getFieldValue('status') === 'on'}
              onChange={(checked) => addForm.setFieldValue('status', checked ? 'on' : 'off')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MathExerciseList;
