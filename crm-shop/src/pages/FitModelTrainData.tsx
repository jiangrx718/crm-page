import React, { useState, useEffect } from 'react';
import { Card, Form, Input, DatePicker, Button, message, Table, Modal, Tag, Space, Tooltip, ConfigProvider, Progress, Radio } from 'antd';

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
  url: string;
  status: 'running' | 'success' | 'failed';
  createTime: string;
  failedReason: string;
  startTime: string;
  endTime: string;
  progress?: number;
}

const FitModelTrainData: React.FC = () => {
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
  // 站点相关
  // 修改类型定义，包含sttp字段
  const [stationList, setStationList] = useState<Array<{ stcd: string; name: string; sttp: string }>>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [stationLoading, setStationLoading] = useState(false);
  // 控制站点多选区域展开/折叠
  const [stationListExpanded, setStationListExpanded] = useState(false);
  // URL输入受控
  const [urlVal, setUrlVal] = useState('');
  // 新增：每个站点的类型选择
  const [stationTypeSelect, setStationTypeSelect] = useState<Record<string, string>>({});


  // 获取任务进度
  const fetchTaskProgress = async (batchId: string, taskId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/fit/model/train/data/progress?batch_id=${batchId}`);
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
      const hasEmptyField = !values.taskName || !values.startDate || !values.endDate || !values.url;
      if (hasEmptyField) {
        message.error('请确保输入数据不能为空');
        return;
      }
      if (!selectedStations || selectedStations.length === 0) {
        message.error('请至少选择一个站点');
        return;
      }
      // 组装 meta_data 参数
      let meta_data: Array<{ sid: string; sttp: string; select: string; name: string }> = [];
      if (stationList.length > 0 && stationTypeSelect) {
        meta_data = stationList
          .filter(st => selectedStations.includes(st.stcd) && stationTypeSelect[st.stcd])
          .map(st => ({
            sid: st.stcd,
            sttp: st.sttp,
            name: st.name,
            select: stationTypeSelect[st.stcd]
          }));
      }
      setLoading(true);

      const startDateStr = values.startDate.format('YYYY-MM-DD');
      const endDateStr = values.endDate.format('YYYY-MM-DD');
      const startTime = startDateStr.length === 10 ? `${startDateStr} 00:00:00` : values.startDate.format('YYYY-MM-DD HH:mm:ss');
      const endTime = endDateStr.length === 10 ? `${endDateStr} 23:00:00` : values.endDate.format('YYYY-MM-DD HH:mm:ss');

      // 拼接选中的站点id
      let station_id = '';
      if (selectedStations && selectedStations.length > 0) {
        station_id = selectedStations.join(',');
      }

      const requestData: any = {
        task_name: values.taskName,
        start_time: startTime,
        end_time: endTime,
        plan_id: values.url,
        meta_data // 新增meta_data参数
      };
      if (station_id) {
        requestData.station_id = station_id;
      }

      const apiUrl = isRetryMode && retryTaskId 
        ? `${API_BASE_URL}/api/v1/fit/model/train/data/retry?task_id=${retryTaskId}`
        : `${API_BASE_URL}/api/v1/fit/model/train/data`;

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

      // 请求成功后刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 500);
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
    // 刷新当前页面
    window.location.reload();
  };

  const showDetail = (task: TaskRecord) => {
    setCurrentTask(task);
    setDetailVisible(true);
  };

  const showNcFile = async (record: TaskRecord) => {
    try {
      setPreviewLoading(prev => ({ ...prev, [record.id]: true }));

      const response = await fetch(`${API_BASE_URL}/api/v1/fit/model/train/data/preview`, {
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
      title: '数据周期',
      dataIndex: 'timeRange',
      key: 'timeRange',
      width: 300,
      render: (text: string) => (
        <div style={{ whiteSpace: 'nowrap' }}>{text}</div>
      )
    },
    {
      title: '方案ID',
      dataIndex: 'url',
      key: 'url',
      width: 180,
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
              maxWidth: '180px',
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
      const response = await fetch(`${API_BASE_URL}/api/v1/fit/model/train/data/list?page=${page}&size=${size}`);
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
      <div className="data-conversion-page" style={{ minWidth: '800px', margin: '0 auto', padding: '0 0' }}>
        <div className="page-card">
          <div className="card-header">
            <h2>机理拟合模型训练数据集转换配置</h2>
            <p>请填写以下信息进行数据转换</p>
            {isRetryMode && (
              <Tag color="orange" style={{ marginLeft: 10 }}>
                当前为任务重试模式
              </Tag>
            )}
          </div>

          <div className="form-container" style={{ minWidth: 800, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #f0f1f2', padding: 32 }}>
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
                  style={{ width: '100%' }}
                />
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
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Input
                      placeholder="请输入方案ID"
                      style={{ flex: 1 }}
                      disabled={stationLoading}
                      value={urlVal}
                      onChange={e => {
                        setUrlVal(e.target.value);
                        form.setFieldsValue({ url: e.target.value });
                      }}
                    />
                    <Button
                      type="primary"
                      style={{ minWidth: 100 }}
                      loading={stationLoading}
                      onClick={async () => {
                        try {
                          if (!urlVal) {
                            message.warning('请先输入方案URL');
                            return;
                          }
                          setStationLoading(true);
                          setStationList([]);
                          setSelectedStations([]);
                          setStationListExpanded(false);
                          const resp = await fetch(`${API_BASE_URL}/api/v1/query/station/by/plan_id`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ plan_id: urlVal })
                          });
                          const result = await resp.json();
                          if (result.code === 10000 && Array.isArray(result.data)) {
                            // 按照 RR > DD > ZZ/ZQ 的优先级排序
                            const sortedStations = [...result.data].sort((a, b) => {
                              const getOrder = (sttp: string) => {
                                if (sttp === 'RR') return 1;
                                if (sttp === 'DD') return 2;
                                if (sttp === 'ZZ' || sttp === 'ZQ') return 3;
                                return 4; // 其他类型排在最后
                              };
                              return getOrder(a.sttp) - getOrder(b.sttp);
                            });
                            
                            setStationList(sortedStations);
                            // 初始化类型选择
                            const typeInit: Record<string, string> = {};
                            sortedStations.forEach((item: any) => {
                              if (item.sttp === 'ZQ' || item.sttp === 'ZZ') {
                                typeInit[item.stcd] = 'Q';
                              } else if (item.sttp === 'DD') {
                                typeInit[item.stcd] = 'UPZ';
                              } else if (item.sttp === 'RR') {
                                typeInit[item.stcd] = 'INQ';
                              }
                            });
                            setStationTypeSelect(typeInit);
                            message.success('获取站点成功');
                          } else {
                            setStationList([]);
                            setStationTypeSelect({});
                            message.error(result.msg || '获取站点失败');
                          }
                        } catch (e) {
                          setStationList([]);
                          setStationTypeSelect({});
                          message.error('请求失败');
                        } finally {
                          setStationLoading(false);
                        }
                      }}
                    >
                      获取站点
                    </Button>
                    {/* 全选按钮 */}
                    {stationList.length > 0 && (
                    <>
                      <Button
                        type="default"
                        style={{ minWidth: 80 }}
                        onClick={() => {
                          setSelectedStations(stationList.map(station => station.stcd));
                        }}
                      >
                        全选
                      </Button>
                      {/* 反选按钮 */}
                      <Button
                        type="default"
                        style={{ minWidth: 80, marginLeft: 8 }}
                        onClick={() => {
                          // 获取所有站点ID
                          const allStationIds = stationList.map(station => station.stcd);
                          // 获取未选中的站点ID
                          const unselectedStationIds = allStationIds.filter(stcd => !selectedStations.includes(stcd));
                          // 选中未选中的站点，取消选中已选中的站点
                          setSelectedStations(unselectedStationIds);
                        }}
                      >
                        反选
                      </Button>
                    </>
                  )}
                  </div>
                  {/* 站点多选展示，每个站点后面跟着类型单选框 */}
                  {stationList.length > 0 && (
                    <>
                      <div
                        style={{
                          marginTop: 16,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 12,
                          maxHeight: !stationListExpanded ? 3 * 55 : 'none',
                          overflow: !stationListExpanded && stationList.length > 0 ? 'hidden' : 'visible',
                          position: 'relative',
                          transition: 'max-height 0.3s'
                        }}
                      >
                        {(stationListExpanded ? stationList : stationList.slice(0, 3 * Math.floor(800 / 120)))
                          .map(station => (
                          <div
                            key={station.stcd}
                            style={{
                              padding: '6px 18px',
                              borderRadius: 16,
                              border: selectedStations.includes(station.stcd) ? '2px solid #1890ff' : '1px solid #d9d9d9',
                              background: selectedStations.includes(station.stcd) ? '#e6f7ff' : '#fafafa',
                              color: selectedStations.includes(station.stcd) ? '#1890ff' : '#222',
                              cursor: 'pointer',
                              fontWeight: 500,
                              userSelect: 'none',
                              transition: 'all 0.2s',
                              minWidth: 60,
                              textAlign: 'center',
                              boxShadow: selectedStations.includes(station.stcd) ? '0 0 4px #91d5ff' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8
                            }}
                            onClick={() => {
                              setSelectedStations(prev =>
                                prev.includes(station.stcd)
                                  ? prev.filter(id => id !== station.stcd)
                                  : [...prev, station.stcd]
                              );
                            }}
                          >
                            <span>{station.name}-{station.stcd}</span>
                            <span style={{ marginLeft: 8 }}>
                              <Radio.Group
                                value={stationTypeSelect[station.stcd]}
                                onChange={e => {
                                  setStationTypeSelect(prev => ({
                                    ...prev,
                                    [station.stcd]: e.target.value
                                  }));
                                }}
                                // 移除 onClick，Radio.Group 没有 onClick 属性
                                style={{ marginLeft: 4 }}
                                disabled={station.sttp === 'ZZ' || station.sttp === 'ZQ'}
                              >
                                {/* {(station.sttp === 'ZQ' || station.sttp === 'ZZ') && (
                                  <>
                                    <Radio value="Z">Z</Radio>
                                    <Radio value="Q">Q</Radio>
                                  </>
                                )} */}
                                {station.sttp === 'DD' && (
                                  <>
                                    <Radio value="UPZ">UPZ（闸上水位）</Radio>
                                    <Radio value="DWZ">DWZ（闸下水位）</Radio>
                                  </>
                                )}
                                {station.sttp === 'RR' && (
                                  <>
                                    <Radio value="INQ">INQ（入库流量）</Radio>
                                    <Radio value="OTQ">OTQ（出库流量）</Radio>
                                  </>
                                )}
                              </Radio.Group>
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* 展开/收起按钮 */}
                      {stationList.length > 3 * Math.floor(800 / 120) && !stationListExpanded && (
                        <div style={{ marginTop: 8 }}>
                          <a style={{ color: '#1890ff', cursor: 'pointer' }} onClick={() => setStationListExpanded(true)}>
                            展开全部
                          </a>
                        </div>
                      )}
                      {stationListExpanded && stationList.length > 3 * Math.floor(800 / 120) && (
                        <div style={{ marginTop: 8 }}>
                          <a style={{ color: '#1890ff', cursor: 'pointer' }} onClick={() => setStationListExpanded(false)}>
                            收起
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </>
              </Form.Item>

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
                      {metaDataMap[currentTask.id].map((item: any, idx: number) => (
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

export default FitModelTrainData;