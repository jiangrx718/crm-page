import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Radio, DatePicker, Button, message, Table, Modal, Tag, Space, Tooltip, ConfigProvider, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { API_BASE_URL } from '../config';

// 设置dayjs中文
dayjs.locale('zh-cn');

interface TaskRecord {
  key: string;
  id: number;
  taskName: string;
  batchNo: string;
  timeRange: string;
  dataType: string;
  url: string;
  status: 'running' | 'success' | 'failed';
  createTime: string;
  failedReason: string;
  startTime: string;
  endTime: string;
  progress?: number;
}

const DataConversion: React.FC = () => {
  const [form] = Form.useForm();
  const [taskList, setTaskList] = useState<TaskRecord[]>([]);
  // 新增metaDataMap用于详情展示
  const [metaDataMap, setMetaDataMap] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskRecord | null>(null);
  const [ncFileVisible, setNcFileVisible] = useState(false);
  const [currentNcContent, setCurrentNcContent] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [previewLoading, setPreviewLoading] = useState<Record<number, boolean>>({});
  const [retryLoading, setRetryLoading] = useState<Record<number, boolean>>({});
  const [isRetryMode, setIsRetryMode] = useState(false);
  const [retryTaskId, setRetryTaskId] = useState<number | null>(null);
  const [pollingIntervals, setPollingIntervals] = useState<Record<string, number>>({});
  const [stations, setStations] = useState<any[]>([]);
  const [stationSelectValues, setStationSelectValues] = useState<Record<string, string>>({});
  const [stationLoading, setStationLoading] = useState(false);
  // 新增：站点展开/收起控制
  const [stationExpanded, setStationExpanded] = useState(false);
  // 新增：标记是否已进行过站点获取，用于空数据提示
  const [stationFetched, setStationFetched] = useState(false);

  // 获取任务进度
  const fetchTaskProgress = async (batchId: string, taskId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/nc/convert/progress?batch_id=${batchId}`);
      const result = await response.json();
      
      if (result.code === 10000) {
        const progress = result.data.percent;
        const status = result.data.status;
        
        // 更新任务列表中的进度和状态
        setTaskList(prev => prev.map(task => 
          task.id === taskId ? { 
            ...task, 
            progress,
            status: status === 'running' ? 'running' : progress >= 100 ? 'success' : 'failed'
          } : task
        ));
        
        // 如果状态不是running或者进度完成，停止轮询
        if (status !== 'running' || progress >= 100) {
          stopPolling(batchId);
          // 延迟一下确保后端状态已更新
          setTimeout(() => {
            fetchTaskList(currentPage, pageSize);
          }, 1000);
          return true;
        }
        
        return false;
      }
      return false;
    } catch (error) {
      console.error('获取进度失败:', error);
      return false;
    }
  };

  // 开始轮询任务进度
  const startPolling = (batchId: string, taskId: number) => {
    // 如果已经有轮询，先停止
    if (pollingIntervals[batchId]) {
      clearInterval(pollingIntervals[batchId]);
    }
    
    // 立即获取一次进度
    fetchTaskProgress(batchId, taskId).then(isComplete => {
      if (isComplete) return;
      
      // 设置定时器轮询
      const interval = window.setInterval(async () => {
        const isComplete = await fetchTaskProgress(batchId, taskId);
        if (isComplete) {
          clearInterval(interval);
          setPollingIntervals(prev => {
            const newIntervals = { ...prev };
            delete newIntervals[batchId];
            return newIntervals;
          });
        }
      }, 10000);
      
      // 保存定时器引用
      setPollingIntervals(prev => ({
        ...prev,
        [batchId]: interval
      }));
    });
  };

  // 停止轮询
  const stopPolling = (batchId: string) => {
    if (pollingIntervals[batchId]) {
      clearInterval(pollingIntervals[batchId]);
      setPollingIntervals(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[batchId];
        return newIntervals;
      });
    }
  };

  // 组件卸载时清除所有轮询
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, [pollingIntervals]);

  const handleSubmit = async (values: any) => {
    try {
      const hasEmptyField = !values.taskName || !values.dataType || !values.startDate || !values.endDate || !values.url;
      if (hasEmptyField) {
        message.error('请确保输入数据不能为空');
        return;
      }
      // 组装 meta_data 参数，始终传递所有站点
      let meta_data: Array<{ sid: string; sttp: string; name: string; select: string }> = [];
      if (stations.length > 0 && stationSelectValues) {
        meta_data = stations
          .filter(st => stationSelectValues[st.stcd])
          .map(st => ({
            sid: st.stcd,
            sttp: st.sttp,
            name: st.name,
            select: stationSelectValues[st.stcd]
          }));
      }
      setLoading(true);
      
      const startDateStr = values.startDate.format('YYYY-MM-DD');
      const endDateStr = values.endDate.format('YYYY-MM-DD');
      const startTime = startDateStr.length === 10 ? `${startDateStr} 00:00:00` : values.startDate.format('YYYY-MM-DD HH:mm:ss');
      const endTime = endDateStr.length === 10 ? `${endDateStr} 23:00:00` : values.endDate.format('YYYY-MM-DD HH:mm:ss');
      const dataTypeNum = values.dataType === 'topology' ? 2 : 1;
      
      const requestData = {
        data_type: dataTypeNum,
        task_name: values.taskName,
        start_time: startTime,
        end_time: endTime,
        plan_id: values.url,
        meta_data // 新增meta_data参数
      };

      const apiUrl = isRetryMode && retryTaskId 
        ? `${API_BASE_URL}/api/v1/nc/convert/retry/new?task_id=${retryTaskId}`
        : `${API_BASE_URL}/api/v1/nc/convert/new`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      const result = await response.json();
      if (result.code !== 10000) {
        alert(result.msg);
        message.error(result.msg);
        return;
      }
      
      setIsRetryMode(false);
      setRetryTaskId(null);
      
      await fetchTaskList(currentPage, pageSize);
      
      // 如果是新任务且返回了批次ID，则开始轮询
      if (!isRetryMode && result.data?.batch_id) {
        startPolling(result.data.batch_id, result.data.id);
      }
      
      message.success(isRetryMode ? '任务重试成功！' : '任务提交成功！');
    } catch (error) {
      message.error(isRetryMode ? '任务重试失败，请重试！' : '数据转换失败，请重试！');
      console.error('转换错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setIsRetryMode(false);
    setRetryTaskId(null);
    message.info('已重置所有输入项');
  };

  const showDetail = (task: TaskRecord) => {
    setCurrentTask(task);
    setDetailVisible(true);
  };

  const showNcFile = async (record: TaskRecord) => {
    try {
      setPreviewLoading(prev => ({ ...prev, [record.id]: true }));

      const response = await fetch(`${API_BASE_URL}/api/v1/nc/preview/data/batch_id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch_id: record.batchNo }),
      });
      const result = await response.json();
      if (result.code !== 10000) {
        message.error(`获取 NC 文件内容失败: ${result.msg}`);
        return;
      }
      setCurrentNcContent(result.data.netcdf_variable_data || '无内容');
      setNcFileVisible(true);
    } catch (error) {
      message.error('获取 NC 文件内容失败');
    } finally {
      setPreviewLoading(prev => ({ ...prev, [record.id]: false }));
    }
  };

  const handleRetryTask = (record: TaskRecord) => {
    setRetryLoading(prev => ({ ...prev, [record.id]: true }));
    setIsRetryMode(true);
    setRetryTaskId(record.id);

    const [startTime, endTime] = record.timeRange.split(' - ');

    form.setFieldsValue({
      taskName: record.taskName,
      dataType: record.dataType === '拓扑数据' ? 'topology' : 'timeSeries',
      startDate: dayjs(startTime.trim()),
      endDate: dayjs(endTime.trim()),
      url: record.url
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    message.info('已回填原任务数据，请检查后点击"开始转换"');

    // 小延迟清除 loading
    setTimeout(() => {
      setRetryLoading(prev => ({ ...prev, [record.id]: false }));
    }, 300);
  };


  const columns: ColumnsType<TaskRecord> = [
    {
      title: '数据集名称',
      dataIndex: 'taskName',
      key: 'taskName',
      width: 220,
      render: (text: string) => (
        <Tooltip title={text} placement="topLeft">
          <div style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '210px',
            cursor: 'pointer'
          }}>{text}</div>
        </Tooltip>
      )
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 120,
      render: (text: string) => {
        if (text === '拓扑数据') {
          return <Tag color="#1B9CFC">拓扑类</Tag>;
        }
        if (text === '时序数据') {
          return <Tag color="#58B19F">时序类</Tag>;
        }
        return <Tag>{text}</Tag>;
      }
    },
    {
      title: '数据周期',
      dataIndex: 'timeRange',
      key: 'timeRange',
      width: 350,
      render: (text: string) => (
        <div style={{ whiteSpace: 'nowrap' }}>{text}</div>
      )
    },
    {
      title: '方案ID',
      dataIndex: 'url',
      key: 'url',
      width: 220,
      render: (text: string) => (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip
            placement="topLeft"
            title={
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8 }}>{text}</span>
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0 }}
                  onClick={e => {
                    e.stopPropagation();
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(text);
                      message.success('已复制URL');
                    } else {
                      // 兼容性处理
                      const input = document.createElement('input');
                      input.value = text;
                      document.body.appendChild(input);
                      input.select();
                      document.execCommand('copy');
                      document.body.removeChild(input);
                      message.success('已复制URL');
                    }
                  }}
                >复制</Button>
              </span>
            }
          >
            <div style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '220px',
              cursor: 'pointer'
            }}>{text}</div>
          </Tooltip>
          {text && (
            <Button
              size="small"
              style={{
                marginLeft: 8,
                border: '1px solid #1890ff',
                color: '#1890ff',
                background: '#fff',
                borderRadius: 4,
                fontSize: '10px',
                height: 16,
                lineHeight: '14px',
                padding: '0 6px',
                minWidth: 32
              }}
              onClick={e => {
                e.stopPropagation();
                const url = `http://10.1.17.108:8000/dyapi/gw-cloud-plan/app/plan/dyplanb/getById/519a0d836f124df680db/${text}?hasGeo=true`;
                window.open(url, '_blank');
              }}
            >
              预览
            </Button>
          )}
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: 'running' | 'success' | 'failed', record: TaskRecord) => {
        if (status === 'running') {
          return (
            <Tooltip title={`处理中，当前进度: ${record.progress || 0}%`}>
              <Progress 
                percent={record.progress || 0} 
                status="active" 
                strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                size="small"
              />
            </Tooltip>
          );
        }

        const statusConfig = {
          success: { color: 'green', text: '已完成' },
          failed: { color: 'red', text: '失败' },
          pending: { color: 'orange', text: '等待中' },
          running: { color: 'blue', text: '进行中' },
          stop: { color: 'blue', text: '停止' },
        };
        const { color, text } = statusConfig[status];

        // 成功且有failedReason时，标签后加问号气泡
        if (status === 'success' && record.failedReason && record.failedReason !== '未知错误') {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Tooltip title={record.failedReason}>
                <Tag color={color} style={{ marginRight: 4, cursor: 'pointer' }}>{text}</Tag>
              </Tooltip>
              <Tooltip title={record.failedReason}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#f5f5f5',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  justifyContent: 'center',
                  border: '1px solid #d9d9d9',
                  color: '#1890ff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer'
                }}>
                  ?
                </span>
              </Tooltip>
            </span>
          );
        }

        return (
          <Tooltip title={status === 'failed' ? record.failedReason : null}>
            <Tag color={color}>{text}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 150,
      render: (text: string) => (
        <div style={{ whiteSpace: 'nowrap' }}>{text}</div>
      )
    },
    { 
      title: '创建时间', 
      dataIndex: 'createTime',
      width: 180,
      render: (text: string) => (
        <div style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }} title={text}>
          {text}
        </div>
      )
    },
    {
      title: '完成时间',
      dataIndex: 'finishTime',
      width: 180,
      render: (_: string, record: TaskRecord & { finishTime?: string }) => (
        <div style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }} title={record.status === 'success' ? record.finishTime || '-' : '-'}>
          {record.status === 'success' ? (record.finishTime || '-') : '-'}
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right' as const,
      render: (_: unknown, record: TaskRecord) => (
        <Space size={4} style={{ marginLeft: -8 }}>
          <Button
            type="link"
            onClick={() => showDetail(record)}
            style={{ padding: '0 10px' }}
          >
            详情
          </Button>
          {record.status === 'failed' ? (
            <Button
              type="link"
              danger
              onClick={() => handleRetryTask(record)}
              loading={retryLoading[record.id]}
              style={{ padding: '0 10px', fontWeight: 600 }}
            >
              重新生成
            </Button>
          ) : (
            <>
              <Button
                type="link"
                onClick={() => showNcFile(record)}
                disabled={record.status !== 'success'}
                loading={previewLoading[record.id]}
                style={{ padding: '0 10px' }}
              >
                NC预览
              </Button>
              {record.status === 'success' && record.failedReason && record.failedReason !== '未知错误' && (
                <Button
                  type="link"
                  danger
                  onClick={() => handleRetryTask(record)}
                  loading={retryLoading[record.id]}
                  style={{ padding: '0 10px', fontWeight: 400 }}
                >
                  重新生成
                </Button>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  const fetchTaskList = async (page = 1, size = pageSize) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/nc/convert/list?page=${page}&size=${size}`);
      const result = await response.json();

      if (result.code !== 10000) {
        message.error(`获取任务列表失败: ${result.msg}`);
        return;
      }

      const taskList = result.data.list.map((item: any) => ({
        key: item.id.toString(),
        id: item.id,
        taskName: item.task_name,
        batchNo: item.batch_id,
        timeRange: `${item.start_time} - ${item.end_time}`,
        dataType: item.data_type === 2 ? '拓扑数据' : '时序数据',
        url: item.plan_id,
        status: item.status,
        createTime: item.create_time,
        finishTime: item.finish_time,
        failedReason: item.failed_reason || '未知错误',
        startTime: item.start_time,
        endTime: item.end_time,
        progress: item.progress || 0
      }));

      // 收集meta_data
      const metaMap: Record<number, any[]> = {};
      result.data.list.forEach((item: any) => {
        if (Array.isArray(item.meta_data)) {
          metaMap[item.id] = item.meta_data;
        }
      });
      setMetaDataMap(metaMap);

      setTaskList(taskList);
      setTotal(result.data.total || 0);
      
      // 检查是否有处理中的任务，如果有则开始轮询
      const runningTasks = taskList.filter((task: TaskRecord) => task.status === 'running');
      runningTasks.forEach((task: TaskRecord) => {
        if (!pollingIntervals[task.batchNo] && (task.progress || 0) < 100) {
          startPolling(task.batchNo, task.id);
        }
      });
    } catch (error) {
      console.error('获取任务列表失败:', error);
      message.error('获取任务列表失败');
    }
  };

  useEffect(() => {
    fetchTaskList(currentPage, pageSize);
    
    return () => {
      Object.values(pollingIntervals).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, [currentPage, pageSize]);

  const handlePageChange = (page: number, size = pageSize) => {
    setCurrentPage(page);
    setPageSize(size);
    fetchTaskList(page, size);
  };

  return (
    <ConfigProvider locale={zhCN}>
      <div className="data-conversion-page" style={{ margin: '0 auto', padding: '0 24px' }}>
        <div className="page-card">
          <div className="card-header">
            <h2>数据集转换配置</h2>
            <p>请填写以下信息进行数据转换</p>
            {isRetryMode && (
              <Tag color="orange" style={{ marginLeft: 10 }}>
                当前为任务重试模式
              </Tag>
            )}
          </div>

          <div className="form-container">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Form.Item
                label="数据集名称"
                name="taskName"
                rules={[{ required: true, message: '请输入数据集名称' }]}
              >
                <Input
                  placeholder="请输入数据集名称..."
                  style={{ width: '100%'}}
                />
              </Form.Item>

              <Form.Item
                label="数据集类型"
                name="dataType"
                rules={[{ required: true, message: '请选择数据集类型' }]}
              >
                <Radio.Group className="type-selection" style={{ width: '100%', textAlign: 'left' }}>
                  <Radio value="timeSeries" className="type-card">
                    <div className="type-card-content">
                      <Tag color="#58B19F">时序类数据</Tag>
                    </div>
                  </Radio>
                  <Radio value="topology" className="type-card">
                    <div className="type-card-content">
                      <Tag color="#1B9CFC">拓扑类数据</Tag>
                    </div>
                  </Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item label="时间周期" style={{ marginBottom: 10 }} required>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item
                    name="startDate"
                    rules={[{ required: true, message: '请选择起始日期' }]}
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <DatePicker
                      placeholder="起始日期"
                      style={{ width: '100%' }}
                      format="YYYY年MM月DD日"
                    />
                  </Form.Item>
                  <span style={{ alignSelf: 'center' }}>-</span>
                  <Form.Item
                    name="endDate"
                    rules={[{ required: true, message: '请选择截止日期' }]}
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <DatePicker
                      placeholder="截止日期"
                      style={{ width: '100%' }}
                      format="YYYY年MM月DD日"
                    />
                  </Form.Item>
                </div>
              </Form.Item>

              <Form.Item
                label="方案ID"
                name="url"
                rules={[{ required: true, message: '请输入方案ID' }]}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    placeholder="请输入方案ID"
                    style={{ width: '100%' }}
                  />
                  <Button
                    type="primary"
                    style={{ minWidth: 80 }}
                    loading={stationLoading}
                    onClick={async () => {
                      const planId = form.getFieldValue('url');
                      if (!planId) {
                        message.warning('请先输入方案ID');
                        return;
                      }
                      setStationLoading(true);
                      try {
                        const resp = await fetch(`${API_BASE_URL}/api/v1/query/station/by/plan_id`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ plan_id: planId })
                        });
                        const result = await resp.json();
                        if (result.code === 10000 && Array.isArray(result.data)) {
                          setStations(result.data);
                          setStationExpanded(false); // 默认收起
                          // 初始化每个站点的选项
                          const initValues: Record<string, string> = {};
                          result.data.forEach((item: any) => {
                            if (item.sttp === 'ZQ' || item.sttp === 'ZZ') {
                              initValues[item.stcd] = 'Q';
                            } else if (item.sttp === 'DD') {
                              initValues[item.stcd] = 'UPZ';
                            } else if (item.sttp === 'RR') {
                              initValues[item.stcd] = 'INQ';
                            }
                          });
                          setStationSelectValues(initValues);
                        } else {
                          setStations([]);
                          message.error(result.msg || '未获取到站点信息');
                        }
                      } catch (err) {
                        setStations([]);
                        message.error('获取站点失败');
                      } finally {
                        // 标记已完成一次获取流程（成功或失败）
                        setStationFetched(true);
                        setStationLoading(false);
                      }
                    }}
                  >
                    获取站点
                  </Button>
                </div>
              </Form.Item>

              {/* 方案ID下方展示站点选择或空数据提示 */}
              {(() => {
                const rrStations = stations.filter(st => st.sttp === 'RR');
                const ddStations = stations.filter(st => st.sttp === 'DD');
                const visibleCount = rrStations.length + ddStations.length;

                // 有可见站点时显示选择卡片
                if (visibleCount > 0) {
                  const visibleStations = stationExpanded
                    ? [...rrStations, ...ddStations]
                    : [
                        ...rrStations.slice(0, 5),
                        ...ddStations.slice(0, Math.max(0, 5 - rrStations.length))
                      ];
                  return (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 16,
                        marginTop: 8,
                        background: '#fafafa',
                        border: '1px solid #eee'
                      }}
                      bodyStyle={{ padding: '12px 16px' }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: 8 }}>站点信息选择：</div>
                      {visibleStations.map(st => (
                        <div key={st.stcd} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px dashed #eee' }}>
                          <div style={{ fontWeight: 500, marginBottom: 4 }}>
                            {st.name} <span style={{ color: '#888', fontSize: 12 }}>({st.stcd})</span>
                            <span style={{ color: '#1890ff', fontSize: 12, marginLeft: 12 }}>类型: {st.sttp}</span>
                          </div>
                          <Radio.Group
                            value={stationSelectValues[st.stcd]}
                            onChange={e => {
                              setStationSelectValues(prev => ({
                                ...prev,
                                [st.stcd]: e.target.value
                              }));
                            }}
                          >
                            {st.sttp === 'DD' && (
                              <>
                                <Radio value="UPZ">UPZ（闸上水位）</Radio>
                                <Radio value="DWZ">DWZ（闸下水位）</Radio>
                              </>
                            )}
                            {st.sttp === 'RR' && (
                              <>
                                <Radio value="INQ">INQ（入库流量）</Radio>
                                <Radio value="OTQ">OTQ（出库流量）</Radio>
                              </>
                            )}
                          </Radio.Group>
                        </div>
                      ))}
                      {visibleCount > 5 && (
                        <div style={{ marginTop: 8 }}>
                          <a
                            style={{ color: '#1890ff', cursor: 'pointer' }}
                            onClick={() => setStationExpanded(exp => !exp)}
                          >
                            {stationExpanded ? '收起' : '展开全部'}
                          </a>
                        </div>
                      )}
                    </Card>
                  );
                }

                // 无可见站点且已获取过，显示提示信息
                if (stationFetched) {
                  return (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 16,
                        marginTop: 8,
                        background: '#fafafa',
                        border: '1px solid #eee'
                      }}
                      bodyStyle={{ padding: '12px 16px' }}
                    >
                      <div style={{
                        background: '#fffbe6',
                        border: '1px solid #ffe58f',
                        color: '#ad8b00',
                        padding: '8px 12px',
                        borderRadius: 4
                      }}>
                        当前方案暂无 堰闸 与 水库 站点，可直接进行数据转换操作
                      </div>
                    </Card>
                  );
                }

                // 默认不展示
                return null;
              })()}

              <Form.Item>
                <div className="form-actions" style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                  <Button className="btn btn-secondary" onClick={handleReset}>
                    重置
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="btn btn-primary"
                  >
                    {isRetryMode ? '重新生成' : '开始转换'}
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </div>

          <Card
            title="数据集转换任务列表"
            className="task-list-card"
            style={{ marginTop: '24px' }}
          >
            <Table
              columns={columns}
              dataSource={taskList}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `共 ${total} 条，${Math.ceil(total / pageSize)} 页`,
                onChange: handlePageChange,
                onShowSizeChange: (_, size) => handlePageChange(1, size),
              }}
              loading={loading}
              scroll={{ x: 1600 }}
            />
          </Card>

          <Modal
            title="任务详情"
            open={detailVisible}
            onCancel={() => setDetailVisible(false)}
            footer={null}
            width={600}
          >
            {currentTask && (
              <div>
                <p><strong>数据集名称：</strong> {currentTask.taskName}</p>
                <p><strong>批次号：</strong> {currentTask.batchNo}</p>
                <p><strong>数据周期：</strong> {currentTask.timeRange}</p>
                <p><strong>数据类型：</strong> {currentTask.dataType}</p>
                <p><strong>方案ID：</strong> {currentTask.url}</p>
                <p><strong>状态：</strong> 
                  {(() => {
                    const status = currentTask.status;
                    const record = currentTask;
                    if (status === 'running') {
                      return (
                        <Tooltip title={`处理中，当前进度: ${record.progress || 0}%`}>
                          <Progress 
                            percent={record.progress || 0} 
                            status="active" 
                            strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                            size="small"
                            style={{ width: '200px' }}
                          />
                        </Tooltip>
                      );
                    }
                    const statusConfig = {
                      success: { color: 'green', text: '已完成' },
                      failed: { color: 'red', text: '失败' },
                      pending: { color: 'orange', text: '等待中' },
                      running: { color: 'blue', text: '进行中' },
                      stop: { color: 'blue', text: '停止' },
                    };
                    const { color, text } = statusConfig[status] || { color: 'default', text: status };
                    if (status === 'success' && record.failedReason && record.failedReason !== '未知错误') {
                      return (
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <Tooltip title={record.failedReason}>
                            <Tag color={color} style={{ marginRight: 4, cursor: 'pointer' }}>{text}</Tag>
                          </Tooltip>
                          <Tooltip title={record.failedReason}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: '#f5f5f5',
                              borderRadius: '50%',
                              width: 18,
                              height: 18,
                              justifyContent: 'center',
                              border: '1px solid #d9d9d9',
                              color: '#1890ff',
                              fontWeight: 700,
                              fontSize: 14,
                              cursor: 'pointer'
                            }}>
                              ?
                            </span>
                          </Tooltip>
                        </span>
                      );
                    }
                    return (
                      <Tooltip title={status === 'failed' ? record.failedReason : null}>
                        <Tag color={color}>{text}</Tag>
                      </Tooltip>
                    );
                  })()}
                </p>
                {currentTask.status === 'failed' && (
                  <p><strong>失败原因：</strong> {currentTask.failedReason}</p>
                )}
                {/* 展示 meta_data 字段，仅在成功时 */}
                {currentTask.status === 'success' && Array.isArray(metaDataMap[currentTask.id]) && (
                  <div style={{ marginTop: 16 }}>
                    <strong>站点信息：</strong>
                    <ul style={{ paddingLeft: 18 }}>
                      {/* 优先展示RR，其次DD，最后ZZ/ZQ */}
                      {[
                        ...metaDataMap[currentTask.id].filter((item: any) => item.sttp === 'RR'),
                        ...metaDataMap[currentTask.id].filter((item: any) => item.sttp === 'DD'),
                        ...metaDataMap[currentTask.id].filter((item: any) => item.sttp === 'ZZ' || item.sttp === 'ZQ')
                      ].map((item: any, idx: number) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          <span style={{ color: '#333' }}>
                            sid: <b>{item.sid}</b>，
                            sttp: <b>{item.sttp}</b>，
                            name: <b>{item.name}</b>，
                            select: <b>{item.select}</b>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Modal>

          <Modal
            title="NC文件内容"
            open={ncFileVisible}
            onCancel={() => setNcFileVisible(false)}
            footer={null}
            width={800}
            bodyStyle={{
              maxHeight: '600px',
              overflow: 'auto'
            }}
          >
            <div style={{
              backgroundColor: '#1e1e1e',
              padding: '20px',
              borderRadius: '6px',
              color: '#d4d4d4',
              fontFamily: '"Courier New", Consolas, monospace',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {currentNcContent}
              </pre>
            </div>
          </Modal>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default DataConversion;