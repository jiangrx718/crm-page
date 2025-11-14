import React, { useState, useEffect, useRef } from 'react';
import { Checkbox } from 'antd';
import { Card, Button, Select, Table, message, Radio, Input, Tag, Modal, DatePicker, ConfigProvider, InputNumber } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import { DownloadOutlined, LineChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { API_BASE_URL } from '../config';

interface ModelItem {
  id: number;
  task_id: string;
  data_id: string;
  model_id: string;
  model_name: string;
  pred_len?: number; // 新增，兼容预见期参数
}

interface ModelListResponse {
  code: number;
  msg: string;
  data: {
    list: ModelItem[];
  };
}

interface InferenceTask {
  id: number | string;
  reasoning_id: string;
  created_at: string;
  status: 'processing' | 'success' | 'failed' | 'running' | string;
  data_id?: string;
  model_id?: string;
  data_type?: number;
  reasoning_path?: string;
  log_path?: string;
  task_name?: string; // 新增，兼容接口返回
  taskName?: string;
  createTime?: string;
  reasoning_path_list?: string[]; // 新增，兼容多文件
  reasoning_path_list_show?: string[]; // 新增，展示用
  mode?: string; // 新增，兼容接口返回的 mode 字段
  model_task_id?: string; // 新增，模型训练批次
}

interface GenerateStatus {
  status: 'idle' | 'generating' | 'success' | 'failed';
  batchId?: string;
}



interface CSVData {
  part1XAxisData: string[];
  part1TrueData: (number | null)[];
  part1PredData: (number | null)[];
  part2XAxisData: string[];
  part2PredData: (number | null)[];
  nseValue: number | null;
  separatorDate: string;
}

dayjs.locale('zh-cn');

const DataInference: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [rowBatchButtons, setRowBatchButtons] = useState<Set<string>>(new Set());
  const [rowItemCounts, setRowItemCounts] = useState<Record<string, number>>({});
  const [inferenceType, setInferenceType] = useState<'topology' | 'timeSeries'>();
  const [selectedModel, setSelectedModel] = useState<string>();
  const [modelList, setModelList] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskList, setTaskList] = useState<InferenceTask[]>([]);
  const [taskTotal, setTaskTotal] = useState(0); // 新增总数
  const [taskDetailVisible, setTaskDetailVisible] = useState(false);
  const [currentTask] = useState<InferenceTask | null>(null); // 移除 setCurrentTask

  const [selectedModelData, setSelectedModelData] = useState<ModelItem | null>(null);
  const selectRef = useRef<React.ComponentRef<typeof Select>>(null);

  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>({ status: 'idle' });
  const pollingIntervalRef = useRef<number | null>(null);
  const isPollingActive = useRef(false);

  const [showDateTime, setShowDateTime] = useState(false);
  const [dateTime, setDateTime] = useState<dayjs.Dayjs>(dayjs().minute(0).second(0));

  const [taskNameError, setTaskNameError] = useState(false);

  const [chartModalVisible, setChartModalVisible] = useState(false);
  const [chartData, setChartData] = useState<CSVData | null>(null);
  const [currentChartTask, setCurrentChartTask] = useState<InferenceTask | null>(null);

  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logContent, setLogContent] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);


  // 清除轮询
  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingActive.current = false;
  };

  // 使用 ReturnType<typeof setInterval> 兼容浏览器与 Node 类型差异
  const pollingTaskTimers = useRef<{ [id: string]: ReturnType<typeof setInterval> }>({});

  // 轮询单个推理任务状态
  const pollTaskStatus = (taskId: number | string) => {
    if (pollingTaskTimers.current[taskId]) return; // 已有定时器则不重复
    // 使用 window.setInterval 确保返回 number 类型（DOM）
    pollingTaskTimers.current[taskId] = window.setInterval(async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/v1/data/reasoning/info?id=${taskId}`);
        const data = await resp.json();
        if (data.code === 10000 && data.data) {
          if (data.data.status === 'success' || data.data.status === 'failed') {
            clearInterval(pollingTaskTimers.current[taskId]);
            delete pollingTaskTimers.current[taskId];
            // 轮询到 success 时刷新整个列表
            fetchTaskList();
          }
        }
      } catch (e) {
        // 忽略错误
      }
    }, 5000);
  };

  // 清理所有推理任务轮询
  const clearAllTaskPolling = () => {
    Object.values(pollingTaskTimers.current).forEach(timer => clearInterval(timer));
    pollingTaskTimers.current = {};
  };

  // 检查数据集生成状态
  const [generateFailedReason, setGenerateFailedReason] = useState<string>(''); // 新增：生成失败原因

  const checkDatasetStatus = async (batchId: string) => {
    if (!isPollingActive.current) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/data/reasoning/set?data_id=${batchId}`);
      const data = await response.json();

      if (data.code === 10000 && data.data) {
        const status = data.data.status;
        const failedReason = data.data.failed_reason || '';
        if (status === 'success') {
          clearPolling();
          setGenerateStatus({ status: 'success', batchId });
          setGenerateFailedReason('');
          message.success('推理数据集生成成功！');
        } else if (status === 'failed') {
          clearPolling();
          setGenerateStatus({ status: 'failed', batchId });
          setGenerateFailedReason(failedReason);
        } else if (status === 'running') {
          // 继续轮询
          setGenerateStatus({ status: 'generating', batchId });
          setGenerateFailedReason('');
        }
      }
    } catch (error) {
      console.error('检查数据集状态失败:', error);
      clearPolling();
      setGenerateStatus({ status: 'failed' });
      setGenerateFailedReason('接口请求失败');
    }
  };



  // 生成数据推理数据集
  const handleGenerateDataset = async () => {
    if (!selectedModelData) {
      message.warning('请先选择模型！');
      return;
    }
    if (!taskName.trim()) {
      message.warning('请输入任务名称！');
      setTaskNameError(true);
      return;
    } else {
      setTaskNameError(false);
    }
    if (!inferenceType) {
      message.warning('请选择推理类型！');
      return;
    }
    if (!dateTime) {
      message.warning('请选择时间点！');
      return;
    }

    clearPolling();

    setGenerateStatus({ status: 'generating' });
    try {
      const requestData = {
        task_id: selectedModelData.task_id,
        time_point: dateTime.format('YYYY-MM-DD HH:mm:ss'),
        task_name: taskName.trim(),
        data_type: inferenceType === 'topology' ? 2 : 1,
        ppr: forecastModel, // 新增：预报模型
        period: warmupHours, // 新增：预热期
        seen: selectedModelData?.pred_len ?? 0 // 新增：预见期
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/data/reasoning/parameters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      if (data.code === 10000) {
        const batchId = data.data.batch_id;
        setGenerateStatus({ status: 'generating', batchId });
        message.success('数据集生成任务已提交，正在生成中...');
        
        isPollingActive.current = true;
        pollingIntervalRef.current = window.setInterval(() => {
          checkDatasetStatus(batchId);
        }, 5000);
      } else {
        setGenerateStatus({ status: 'failed' });
        alert(data.msg);
        message.error(data.msg || '数据推理数据集生成失败');
      }
    } catch (error) {
      setGenerateStatus({ status: 'failed' });
      message.error('数据推理数据集生成失败');
      console.error('Error generating dataset:', error);
      clearPolling();
    }
  };


  // 获取模型列表
  const fetchModelList = async (typeId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/train/type/list?type_id=${typeId}`);
      const data: ModelListResponse = await response.json();
      
      if (data.code === 10000) {
        setModelList(data.data.list);
      } else {
        message.error(data.msg || '获取模型列表失败');
      }
    } catch (error) {
      message.error('获取模型列表失败');
      console.error('Error fetching model list:', error);
    }
  };

  // 记录分页参数，保证切换时能正确传递
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const handleTableChange = (paginationInfo: any) => {
    setPagination({ current: paginationInfo.current, pageSize: paginationInfo.pageSize });
    fetchTaskList(paginationInfo.current, paginationInfo.pageSize);
  };

  // 修改 fetchTaskList，支持默认参数，并对 running 状态任务轮询
  const fetchTaskList = async (page?: number, size?: number) => {
    const currentPage = page || pagination.current || 1;
    const pageSize = size || pagination.pageSize || 10;
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/data/reasoning/list?page=${currentPage}&size=${pageSize}`);
      const data = await response.json();
      if (data.code === 10000) {
        setTaskList(data.data.list);
        setTaskTotal(data.data.total || 0);
        // 对 running 状态的任务进行轮询
        if (Array.isArray(data.data.list)) {
          data.data.list.forEach((task: InferenceTask) => {
            if (task.status === 'running' && task.id) {
              pollTaskStatus(task.id);
            }
          });
        }
      } else {
        message.error(data.msg || '获取任务列表失败');
      }
    } catch (error) {
      message.error('获取任务列表失败');
      console.error('Error fetching task list:', error);
    }
  };

  // 初始化获取任务列表，带上分页参数
  useEffect(() => {
    fetchTaskList(pagination.current, pagination.pageSize);
    // eslint-disable-next-line
  }, []);

  // 当选择的模型变化时
  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    const model = modelList.find(m => m.model_name === value);
    setSelectedModelData(model || null);
    if (model) {
      setDateTime(dayjs().minute(0).second(0));
      setShowDateTime(true);
    } else {
      setShowDateTime(false);
    }
  };

  // 修改Radio.Group的onChange事件处理
  const handleInferenceTypeChange = (e: any) => {
    setInferenceType(e.target.value);
    setShowDateTime(false);
  };

  // 当推理类型变化时，获取对应的模型列表
  useEffect(() => {
    if (inferenceType) {
      const typeId = inferenceType === 'topology' ? 2 : 1;
      fetchModelList(typeId);
      setSelectedModel(undefined);
      setSelectedModelData(null);
      setShowDateTime(false);
    } else {
      setModelList([]);
      setShowDateTime(false);
    }
  }, [inferenceType]);

  // 计算选择框宽度
const calculateSelectWidth = (value: string | undefined) => {
  if (!value) return 300;
  const span = document.createElement('span');
  span.style.visibility = 'hidden';
  span.style.position = 'absolute';
  span.style.whiteSpace = 'nowrap';
  span.style.fontSize = '14px';
  span.textContent = value;
  document.body.appendChild(span);
  const width = span.offsetWidth + 40;
  document.body.removeChild(span);
  return Math.min(Math.max(width, 300), 600);
};

// per-file 下载
  const handleDownloadFile = async (_record: InferenceTask, filePath: string) => {
    if (!filePath) {
      message.warning('无可下载的结果文件');
      return;
    }
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/data/reasoning/download`,
        { reasoning_path: filePath },
        {
          responseType: 'blob',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const fileName = filePath.split('/').pop() || 'download';
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      message.error('下载任务结果失败');
    }
  };

  // 计算NSE (Nash-Sutcliffe Efficiency)
  const calculateNSE = (observed: (number | null)[], predicted: (number | null)[]) => {
    // 过滤掉null值的数据对
    const validPairs: { obs: number; pred: number }[] = [];
    for (let i = 0; i < Math.min(observed.length, predicted.length); i++) {
      if (
        observed[i] !== null &&
        predicted[i] !== null &&
        !isNaN(observed[i] as number) &&
        !isNaN(predicted[i] as number)
      ) {
        validPairs.push({
          obs: observed[i] as number,
          pred: predicted[i] as number
        });
      }
    }

    if (validPairs.length === 0) return null;

    // 计算观测值的平均值
    const meanObserved = validPairs.reduce((sum, pair) => sum + pair.obs, 0) / validPairs.length;

    // 计算分子：(观测值 - 预测值)^2 的和
    const numerator = validPairs.reduce((sum, pair) => sum + Math.pow(pair.obs - pair.pred, 2), 0);

    // 计算分母：(观测值 - 观测值平均值)^2 的和
    const denominator = validPairs.reduce(
      (sum, pair) => sum + Math.pow(pair.obs - meanObserved, 2),
      0
    );

    // NSE = 1 - (分子/分母)
    const nse = denominator === 0 ? (numerator === 0 ? 1 : -Infinity) : 1 - numerator / denominator;

    return nse;
  };

  // per-file 查看图表
  const handleShowChartFile = async (_record: InferenceTask, filePath: string) => {
    if (!filePath) {
      message.warning('无可展示的图表数据');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/v1/data/reasoning/download`, {
        reasoning_path: filePath
      });
      if (response.data) {
        const csvText = response.data;
        const lines = csvText.split('\n').filter((line: string) => line.trim() !== '');
        if (lines.length < 2) {
          message.error('CSV数据格式异常，请检查！');
          return;
        }

        // 解析所有数据行，过滤掉空行和无效行
        const dataRows = lines
          .slice(1)
          .map((line: string) => line.split(',').map((item: string) => item.trim()))
          .filter((row: string[]) => {
            // 过滤条件：第一列（日期）不为空，第二列（TRUE值）不为空
            return row.length > 1 && row[0] && row[1] && row[0] !== '' && row[1] !== '';
          });

        // 第一部分：历史数据对比
        const part1XAxisData: string[] = [];
        const part1TrueData: (number | null)[] = [];
        const part1PredData: (number | null)[] = [];

        for (let i = 0; i < dataRows.length; i++) {
          const currentRow = dataRows[i];

          // 验证当前行的有效性
          if (!currentRow || currentRow.length < 2 || !currentRow[0] || !currentRow[1]) {
            console.warn(`跳过无效行 ${i}:`, currentRow);
            continue;
          }

          const currentTime = currentRow[0];
          const currentTrue = parseFloat(currentRow[1]);

          // 只处理有效的数值
          if (isNaN(currentTrue)) {
            console.warn(`跳过无效TRUE值 ${i}:`, currentRow[1]);
            continue;
          }

          part1XAxisData.push(currentTime);
          part1TrueData.push(currentTrue);

          if (i === 0) {
            // 第一个date没有前一行的pred_0，所以为null
            part1PredData.push(null);
          } else {
            // 取前一行的pred_0（第3列，索引为2）
            const prevRow = dataRows[i - 1];
            if (prevRow && prevRow.length > 2) {
              const prevPred0 = parseFloat(prevRow[2]);
              part1PredData.push(isNaN(prevPred0) ? null : prevPred0);
            } else {
              part1PredData.push(null);
            }
          }
        }

        // 第二部分：未来预测
        // 找到最后一个有效的数据行
        let lastValidRow = null;
        for (let i = dataRows.length - 1; i >= 0; i--) {
          const row = dataRows[i];
          if (row && row.length > 2 && row[0] && row[1]) {
            lastValidRow = row;
            break;
          }
        }

        if (!lastValidRow) {
          message.error('未找到有效的数据行！');
          return;
        }

        const lastTime = lastValidRow[0];
        const part2XAxisData: string[] = [];
        const part2PredData: (number | null)[] = [];

        // 取最后一行的pred_0到pred_71（共72个值）
        for (let i = 0; i < 72; i++) {
          const predIndex = i + 2; // pred_0在第3列（索引2），pred_1在第4列（索引3）...
          if (predIndex < lastValidRow.length) {
            const dateObj = new Date(lastTime);
            dateObj.setHours(dateObj.getHours() + i + 1); // +1小时到+72小时
            part2XAxisData.push(dateObj.toLocaleString());
            const predValue = parseFloat(lastValidRow[predIndex]);
            part2PredData.push(isNaN(predValue) ? null : predValue);
          }
        }

        // 分隔线位置 - 修改为与HTML版本一致
        const separatorIndex = part1XAxisData.length - 1;

        // 计算第一部分的NSE
        const nseValue = calculateNSE(part1TrueData, part1PredData);

        // 获取分隔线对应的日期 - 修改为与HTML版本一致
        const separatorDate = part1XAxisData[separatorIndex] || '未知';

        // 构造图表数据
        const chartData: CSVData = {
          part1XAxisData,
          part1TrueData,
          part1PredData,
          part2XAxisData,
          part2PredData,
          nseValue,
          separatorDate
        };

        setChartData(chartData);
        setCurrentChartTask(_record);
        setChartModalVisible(true);
      } else {
        message.error('获取图表数据失败');
      }
    } catch (error) {
      message.error('获取图表数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 预览推理数据集
  const handlePreviewDataset = async () => {
    if (!generateStatus.batchId) {
      message.warning('无可预览的数据集');
      return;
    }
    setPreviewLoading(true);
    setPreviewModalVisible(true);
    setPreviewData('');
    try {
      // 假设接口与下载接口一致，返回为 netcdf_variable_data 字段
      const response = await axios.post(`${API_BASE_URL}/api/v1/data/reasoning/preview/data_id`, {
        batch_id: generateStatus.batchId
      });
      let content = '';
      if (response.data && response.data.data && typeof response.data.data.netcdf_variable_data === 'string') {
        content = response.data.data.netcdf_variable_data;
      } else {
        content = '无数据';
      }
      setPreviewData(content);
    } catch (error) {
      setPreviewData('数据集获取失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  // 记录每行的展开状态
  const [expandedRows, setExpandedRows] = useState<{ [id: string]: boolean }>({});

  const taskColumns = [
    {
      title: '任务批次号',
      dataIndex: 'reasoning_id',
      key: 'reasoning_id',
      render: (text: string, record: InferenceTask) => text || record.reasoning_id || record.reasoning_id || record.taskName || '未命名任务'
    },
    {
      title: '模式类型',
      dataIndex: 'mode',
      key: 'mode',
      align: 'center' as const,
      render: (mode: string) => {
        if (mode === 'q') {
          return <Tag color="orange">q</Tag>;
        }
        if (mode === 'z') {
          return <Tag color="green">z</Tag>;
        }
        return <Tag>{mode || '-'}</Tag>;
      }
    },
    { 
      title: '模型类型', 
      dataIndex: 'data_type',
      key: 'data_type',
      render: (val: number) => {
        if (val == 2) {
          return <Tag color="#1B9CFC">拓扑类</Tag>;
        }
        if (val === 1) {
          return <Tag color="#58B19F">时序类</Tag>;
        }
        return <Tag>{val}</Tag>;
      }
    },
    {
      title: '任务名称',
      dataIndex: 'task_name',
      key: 'task_name',
      render: (text: string, record: InferenceTask) => text || record.task_name || record.reasoning_id || record.taskName || '未命名任务'
    },
    {
      title: '模型训练批次',
      dataIndex: 'model_task_id',
      key: 'model_task_id',
      render: (text: string, record: InferenceTask) => text || record.model_task_id || '-',
    },
    {
      title: '推理数据集',
      dataIndex: 'data_name',
      key: 'data_name',
      render: (text: string, record: any) => (
        <Button type="link" onClick={async () => {
          setPreviewLoading(true);
          setPreviewModalVisible(true);
          setPreviewData('');
          try {
            const resp = await fetch(`${API_BASE_URL}/api/v1/data/reasoning/preview/data_id`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ batch_id: record.data_id || record.id })
            });
            const result = await resp.json();
            if (result.code === 10000 && result.data) {
              setPreviewData(result.data.netcdf_variable_data || JSON.stringify(result.data, null, 2));
            } else {
              setPreviewData(result.msg || '获取数据失败');
            }
          } catch (e) {
            setPreviewData('请求失败');
          } finally {
            setPreviewLoading(false);
          }
        }}>{text || "-"}</Button>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string, record: InferenceTask) =>
        dayjs(text || record.createTime).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => {
        if (val === 'success') return <Tag color="green">成功</Tag>;
        if (val === 'failed') return <Tag color="red">失败</Tag>;
        if (val === 'running') return <Tag color="blue">运行中</Tag>;
        if (val === 'pending') return <Tag color="orange">等待中</Tag>;
        return val;
      }
    },
    // 新增：预报模型
    {
      title: '预报模型',
      dataIndex: 'ppr',
      key: 'ppr',
      render: (val: string) => {
        const pprMap: Record<string, string> = {
          ecthin_ppr: '欧洲',
          german_ppr: '德国',
          rjtd_ppr: 'rjtd',
          gfs_ppr: '美国',
          grapes_ppr: '中国',
          nwp_ppr: '军队',
          dyv2_ppr: '多源融合',
          slnwp_ppr: '水利区域模式',
          zkg_ppr: '水利人工主客观',
          rgyb_ppr: '水利人工欧洲时程',
          byyz_pre: '暴雨移植模式'
        };
        return pprMap[val] || val || '-';
      }
    },
    // 新增：预报依据时间
    {
      title: '预报依据时间',
      dataIndex: 'based_time',
      key: 'based_time',
      render: (val: string) => val ? val : '-'
    },
    // 新增：预热期
    {
      title: '预热期(小时)',
      dataIndex: 'period',
      key: 'period',
      render: (val: number) => val ?? '-'
    },
    // 新增：预见期
    {
      title: '预见期(小时)',
      dataIndex: 'seen',
      key: 'seen',
      render: (val: number) => val ?? '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: InferenceTask) => {
        const isFailed = record.status === 'failed';
        let fileListShow = record.reasoning_path_list_show || [];
        let fileList = record.reasoning_path_list || [];
        if (record.status === 'success' && (!fileListShow || fileListShow.length === 0) && fileList && fileList.length > 0) {
          fileListShow = fileList;
        }
        const rowKey = String(record.id);
        const isExpanded = expandedRows[rowKey] || false;
        const displayList = fileListShow.length > 4 && !isExpanded ? fileListShow.slice(0, 4) : fileListShow;
        const allItemKeys = fileListShow.map((_: string, idx: number) => `${record.id}-${idx}`);
            const allChecked = allItemKeys.length > 0 && allItemKeys.every(key => selectedItems.has(key));
            
            return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div onClick={(e: any) => {
                e.stopPropagation();
                const newSelected = new Set(selectedItems);
                if (!allChecked) {
                  allItemKeys.forEach(key => newSelected.add(key));
                } else {
                  allItemKeys.forEach(key => newSelected.delete(key));
                }
                setSelectedItems(newSelected);
                
                // 控制当前行的批量发布按钮显示
                const newBatchButtons = new Set(rowBatchButtons);
                if (!allChecked) {
                  newBatchButtons.add(rowKey);
                } else {
                  newBatchButtons.delete(rowKey);
                }
                setRowBatchButtons(newBatchButtons);
                
                // 保存当前行的选中项数量
                const newRowItemCounts: Record<string, number> = {...rowItemCounts};
                if (!allChecked) {
                  newRowItemCounts[rowKey] = allItemKeys.length;
                } else {
                  newRowItemCounts[rowKey] = 0;
                }
                setRowItemCounts(newRowItemCounts);
              }} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <Checkbox
                  checked={allChecked}
                  onChange={(e: any) => {
                    e.stopPropagation();
                    const newSelected = new Set(selectedItems);
                    if (e.target.checked) {
                      allItemKeys.forEach(key => newSelected.add(key));
                    } else {
                      allItemKeys.forEach(key => newSelected.delete(key));
                    }
                    setSelectedItems(newSelected);
                    
                    // 控制当前行的批量发布按钮显示
                    const newBatchButtons = new Set(rowBatchButtons);
                    if (e.target.checked) {
                      newBatchButtons.add(rowKey);
                    } else {
                      newBatchButtons.delete(rowKey);
                    }
                    setRowBatchButtons(newBatchButtons);
                    
                    // 保存当前行的选中项数量
                    const newRowItemCounts: Record<string, number> = {...rowItemCounts};
                    if (e.target.checked) {
                      newRowItemCounts[rowKey] = allItemKeys.length;
                    } else {
                      newRowItemCounts[rowKey] = 0;
                    }
                    setRowItemCounts(newRowItemCounts);
                  }}
                />
                <span>全选</span>
              </div>
              {rowBatchButtons.has(rowKey) && rowItemCounts[rowKey] > 0 && (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    handleBatchPublish(record);
                    // 点击后不清空选中项，保持批量发布按钮显示
                  }}
                  disabled={loading}
                  style={{ marginLeft: 8, padding: '0 4px', fontSize: '14px', height: '24px' }}
                >
                  批量发布 ({rowItemCounts[rowKey]})
                </Button>
              )}
            </div>
            {displayList.length > 0 ? displayList.map((fileShow: string, _: number) => {
              // idx 需映射到原始 fileList
              const realIdx = fileListShow.indexOf(fileShow);
              const fileName = fileShow.split('/').pop();
              const filePath = fileList[realIdx];
              const itemKey = `${record.id}-${realIdx}`;
              const isChecked = selectedItems.has(itemKey);
              return (
                <div key={fileShow} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ minWidth: 120 }}>{fileName}</span>
                  <Button
                    type="link"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownloadFile(record, filePath)}
                    disabled={isFailed}
                    style={{ padding: 0 }}
                  >下载结果</Button>
                  <Button
                    type="link"
                    icon={<LineChartOutlined />}
                    onClick={() => handleShowChartFile(record, filePath)}
                    disabled={isFailed}
                    style={{ padding: 0 }}
                  >查看图表</Button>
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => {
                      const newSelected = new Set(selectedItems);
                      if (e.target.checked) {
                        newSelected.add(itemKey);
                        // 选中任意一个选择框后显示对应的批量发布按钮
                        const newBatchButtons = new Set(rowBatchButtons);
                        newBatchButtons.add(rowKey);
                        setRowBatchButtons(newBatchButtons);
                        
                        // 更新当前行的选中项数量
                        const newRowItemCounts: Record<string, number> = {...rowItemCounts};
                        newRowItemCounts[rowKey] = (newRowItemCounts[rowKey] || 0) + 1;
                        setRowItemCounts(newRowItemCounts);
                      } else {
                        newSelected.delete(itemKey);
                        // 取消选中时，如果该行没有选中的项了，隐藏批量发布按钮
                        if (!allItemKeys.some(key => newSelected.has(key))) {
                          const newBatchButtons = new Set(rowBatchButtons);
                          newBatchButtons.delete(rowKey);
                          setRowBatchButtons(newBatchButtons);
                        }
                        
                        // 更新当前行的选中项数量
                        const newRowItemCounts: Record<string, number> = {...rowItemCounts};
                        newRowItemCounts[rowKey] = Math.max(0, (newRowItemCounts[rowKey] || 0) - 1);
                        setRowItemCounts(newRowItemCounts);
                      }
                      setSelectedItems(newSelected);
                    }}
                  />
                  <span 
                    onClick={() => {
                      const newSelected = new Set(selectedItems);
                      if (!isChecked) {
                        newSelected.add(itemKey);
                        // 选中任意一个选择框后显示对应的批量发布按钮
                        const newBatchButtons = new Set(rowBatchButtons);
                        newBatchButtons.add(rowKey);
                        setRowBatchButtons(newBatchButtons);
                        
                        // 更新当前行的选中项数量
                        const newRowItemCounts: Record<string, number> = {...rowItemCounts};
                        newRowItemCounts[rowKey] = (newRowItemCounts[rowKey] || 0) + 1;
                        setRowItemCounts(newRowItemCounts);
                      } else {
                        newSelected.delete(itemKey);
                        // 取消选中时，如果该行没有选中的项了，隐藏批量发布按钮
                        if (!allItemKeys.some(key => newSelected.has(key))) {
                          const newBatchButtons = new Set(rowBatchButtons);
                          newBatchButtons.delete(rowKey);
                          setRowBatchButtons(newBatchButtons);
                        }
                        
                        // 更新当前行的选中项数量
                        const newRowItemCounts: Record<string, number> = {...rowItemCounts};
                        newRowItemCounts[rowKey] = Math.max(0, (newRowItemCounts[rowKey] || 0) - 1);
                        setRowItemCounts(newRowItemCounts);
                      }
                      setSelectedItems(newSelected);
                    }}
                    style={{ cursor: 'pointer', color: '#ff0000', textDecoration: 'none', marginLeft: 0 }}
                  >发布
                  </span>
                </div>
              );
            }) : (
              <span style={{ color: '#aaa' }}>无结果文件</span>
            )}
            {/* 展开/收起按钮 */}
            {fileListShow.length > 4 && (
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <Button type="link" size="small" onClick={() => setExpandedRows(prev => ({ ...prev, [rowKey]: !isExpanded }))}>
                  {isExpanded ? '收起' : '展开'}
                </Button>
              </div>
            )}
            {/* 失败任务显示日志按钮 */}
            {isFailed && (
              <Button type="link" onClick={() => handleShowLog(record)} style={{ padding: 0 }}>
                查看日志
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const handleBatchPublish = async (record: InferenceTask) => {
  if (selectedItems.size === 0) {
    message.warning('请先选择要发布的任务！');
    return;
  }
  setLoading(true);
  try {
    // 获取当前行选中的文件路径
    const selectedFilePaths: string[] = [];
    const fileList = record.reasoning_path_list || [];
    
    // 遍历所有可能的项目键值，找出当前行中被选中的项目
    fileList.forEach((filePath: string, idx: number) => {
      const itemKey = `${record.id}-${idx}`;
      if (selectedItems.has(itemKey)) {
        selectedFilePaths.push(filePath);
      }
    });
    
    // 调用新的API接口
    const response = await fetch(`${API_BASE_URL}/api/v1/publish/ai/infer/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reasoning_id: record.reasoning_id,
        files_path: selectedFilePaths,
        infer_type:1,
      })
    });
    
    const data = await response.json();
    
    if (data.code === 10000) {
      alert('批量发布成功');
      // 不再清空选中状态，保持按钮显示
      fetchTaskList(); // 刷新列表
    } else {
      alert(data.msg || '批量发布失败');
    }
  } catch (error) {
    console.error('Error batch publishing:', error);
    alert('批量发布失败');
  } finally {
    setLoading(false);
  }
};

const handleInference = async () => {
    if (!taskName.trim()) {
      message.warning('请输入任务名称！');
      setTaskNameError(true);
      return;
    }
    if (!inferenceType) {
      message.warning('请选择推理类型！');
      return;
    }
    if (!selectedModel || !selectedModelData) {
      message.warning('请选择模型！');
      return;
    }
    if (!generateStatus.batchId) {
      message.warning('请先生成推理数据集！');
      return;
    }

    setTaskNameError(false);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/data/reasoning/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_name: taskName.trim(),
          data_type: inferenceType === 'topology' ? 2 : 1,
          task_id: selectedModelData.task_id,
          data_id: generateStatus.batchId,
          based_time: dateTime.format('YYYY-MM-DD HH:mm:ss'), // 新增：依据时间
          period: warmupHours, // 新增：预热期
          seen: selectedModelData?.pred_len ?? 0, // 新增：预见期
          ppr: forecastModel // 新增：预报模型参数
        })
      });

      const data = await response.json();
      
      if (data.code === 10000) {
        message.success('推理任务已成功启动');
        fetchTaskList();
        // 重置输入项，相当于刷新页面
        setTaskName('');
        setSelectedModel(undefined);
        setSelectedModelData(null);
        setInferenceType(undefined);
        setShowDateTime(false);
        setDateTime(dayjs('2025-06-30 10:00:00'));
        setGenerateStatus({ status: 'idle' }); // 重置生成推理数据集状态
      } else {
        alert(data.msg)
        message.error(data.msg || '推理任务启动失败');
      }
    } catch (error) {
      console.error('Error starting inference:', error);
      message.error('推理任务启动失败');
    } finally {
      setLoading(false);
    }
  };

  // 渲染预报依据时间部分
  const renderDateTimeSection = () => {
    if (!showDateTime) return null;

    return (
      <ConfigProvider locale={zhCN}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              width: '100px', 
              textAlign: 'right', 
              marginRight: '10px',
              color: '#666'
            }}>预报依据时间：</span>
            <DatePicker
              showTime={{
                format: 'HH:00:00',
                defaultValue: dayjs().minute(0).second(0),
              }}
              format="YYYY-MM-DD HH:mm:ss"
              value={dateTime}
              onChange={(dt) => {
                if (dt) setDateTime(dt.minute(0).second(0));
              }}
              onOk={(dt) => {
                if (dt) setDateTime(dt.minute(0).second(0));
              }}
              style={{ width: '250px', marginRight: '16px' }}
            />
            {generateStatus.status === 'success' ? (
              <>
                <Tag color="green">成功</Tag>
                <Button style={{ marginLeft: 12 }} onClick={handlePreviewDataset}>
                  预览数据集
                </Button>
                {/* 可增加查询详情按钮 */}
                {/* <Button style={{ marginLeft: 12 }} onClick={handlePreviewDataset}>查询数据集详情</Button> */}
              </>
            ) : generateStatus.status === 'failed' ? (
              <>
                <Tag color="red" style={{ marginRight: 8 }}>
                  失败
                </Tag>
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
                }}
                  title={generateFailedReason || '失败原因未知'}
                >
                  ?
                </span>
              </>
            ) : (
              <Button 
                type="primary" 
                onClick={handleGenerateDataset}
                loading={generateStatus.status === 'generating'}
                disabled={generateStatus.status === 'generating'}
              >
                生成推理数据集
              </Button>
            )}
          </div>
        </div>
      </ConfigProvider>
    );
  };

  // 渲染图表弹窗
  const renderChartModal = () => {
    if (!chartData || !currentChartTask) return null;

    const mode = currentChartTask.mode;
    let chartTitle = '流量预测结果';
    let yAxisName = '流量值';
    let trueSeriesName = '真实值';
    let predHistorySeriesName = '预测值（历史对比）';
    let predFutureSeriesName = '未来预测';
    if (mode === 'q') {
      chartTitle = '流量预测结果';
      yAxisName = '流量值 (m³/s)';
    } else if (mode === 'z') {
      chartTitle = '水位预测结果';
      yAxisName = '水位值 (m)';
      trueSeriesName = '真实值';
      predHistorySeriesName = '预测值（历史对比）';
      predFutureSeriesName = '未来预测';
    }

    const allXAxisData = [...chartData.part1XAxisData, ...chartData.part2XAxisData];
    const separatorIndex = chartData.part1XAxisData.length;

    // 构造图表配置
    const option = {
      title: [
        {
          text: chartTitle,
          left: 'center',
          top: '5%'
        },
        {
          text: chartData.nseValue !== null ? `NSE: ${chartData.nseValue.toFixed(4)}` : 'NSE: 计算失败',
          left: 'center',
          top: '12%',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: chartData.nseValue !== null && chartData.nseValue > 0.5 ? '#52c41a' : '#ff4d4f'
          }
        }
      ],
      tooltip: {
        trigger: 'axis',
        formatter: function (params: any) {
          let result = `时间：${params[0].name}<br/>`;
          params.forEach((param: any) => {
            if (param.value !== null && param.value !== undefined) {
              result += `${param.seriesName}：${param.value}<br/>`;
            }
          });
          return result;
        }
      },
      legend: {
        data: [trueSeriesName, predHistorySeriesName, predFutureSeriesName],
        top: '18%',
        left: 'center',
        type: 'scroll',
        pageIconColor: '#2f4554',
        pageIconInactiveColor: '#aaa',
        pageTextStyle: {
          color: '#333'
        }
      },
      grid: {
        top: '25%',  // 为NSE显示留出更多空间
        bottom: '15%',  // 为x轴标签留出更多空间
        left: '60',   // 为y轴标签留出空间
        right: '60',  // 为y轴标签留出空间
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: allXAxisData,
        axisLabel: {
          formatter: function(value: string, index: number) {
            // 在分隔线位置添加"based time"标注
            if (index === separatorIndex - 1) {
              return value + '\n(based time)';
            }
            return value;
          }
        }
      },
      yAxis: {
        type: 'value',
        name: yAxisName
      },
      // dataZoom: [
      //   { 
      //     type: 'slider', 
      //     start: 0, 
      //     end: 100,
      //     height: 20,
      //     bottom: 20
      //   }, 
      //   { 
      //     type: 'inside' 
      //   }
      // ],
      series: [
        {
          name: trueSeriesName,
          type: 'line',
          data: [...chartData.part1TrueData, ...new Array(chartData.part2XAxisData.length).fill(null)],
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#5470c6',
            width: 2
          },
          itemStyle: {
            color: '#5470c6'
          },
          connectNulls: true, // 修改为true，连接空值
          z: 10
        },
        {
          name: predHistorySeriesName,
          type: 'line',
          data: [...chartData.part1PredData, ...new Array(chartData.part2XAxisData.length).fill(null)],
          smooth: true,
          symbol: 'triangle',
          symbolSize: 6,
          lineStyle: {
            color: '#91cc75',
            width: 2,
            type: 'dashed'
          },
          itemStyle: {
            color: '#91cc75'
          },
          connectNulls: true, // 修改为true，连接空值
          z: 10
        },
        {
          name: predFutureSeriesName,
          type: 'line',
          data: [...new Array(chartData.part1XAxisData.length - 1).fill(null), chartData.part1PredData[chartData.part1PredData.length - 1], ...chartData.part2PredData],
          smooth: true,
          symbol: 'diamond',
          symbolSize: 6,
          lineStyle: {
            color: '#fac858',
            width: 2
          },
          itemStyle: {
            color: '#fac858'
          },
          connectNulls: true, // 修改为true，连接空值
          z: 10
        }
      ],
      graphic: [
        {
          type: 'line',
          shape: {
            x1: 0, y1: 0, x2: 0, y2: 0
          },
          style: {
            stroke: '#ff0000',
            lineWidth: 2,
            lineDash: [5, 5]
          },
          z: 5,
          id: 'separator-line'
        },
        {
          type: 'text',
          style: {
            text: chartData.separatorDate,
            x: 0,
            y: 0,
            textAlign: 'center',
            textVerticalAlign: 'bottom',
            fontSize: 12,
            fontWeight: 'bold',
            fill: '#ff0000'
          },
          z: 5,
          id: 'separator-text'
        }
      ]
    };

    // 动态设置分隔线和文本位置
    const onChartReady = (echartsInstance: any) => {
      setTimeout(() => {
        try {
          const model = echartsInstance.getModel();
          const gridComp = model.getComponent('grid', 0);
          if (gridComp) {
            const coordSys = gridComp.coordinateSystem;
            if (coordSys && typeof coordSys.getRect === 'function') {
              const gridRect = coordSys.getRect();
              if (gridRect) {
                // 修复分隔线位置计算，与HTML版本保持一致
                // const separatorPos = gridRect.x + (gridRect.width * separatorIndex / allXAxisData.length);
                const separatorPos = gridRect.x + (gridRect.width * (separatorIndex - 0.5) / allXAxisData.length);
                echartsInstance.setOption({
                  graphic: [
                    {
                      type: 'line',
                      shape: {
                        x1: separatorPos,
                        y1: gridRect.y,
                        x2: separatorPos,
                        y2: gridRect.y + gridRect.height
                      },
                      style: {
                        stroke: '#ff0000',
                        lineWidth: 2,
                        lineDash: [5, 5]
                      },
                      z: 5,
                      id: 'separator-line'
                    },
                    {
                      type: 'text',
                      style: {
                        text: chartData.separatorDate,
                        x: separatorPos,
                        y: gridRect.y - 10,
                        textAlign: 'center',
                        textVerticalAlign: 'bottom',
                        fontSize: 12,
                        fontWeight: 'bold',
                        fill: '#ff0000'
                      },
                      z: 5,
                      id: 'separator-text'
                    }
                  ]
                }, false);
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }, 100);
    };

    // 监听dataZoom事件，动态更新分隔线位置
    const onEvents = {
      datazoom: (_params: any, echartsInstance: any) => {
        try {
          // 获取当前dataZoom的范围
          const option = echartsInstance.getOption();
          const dataZoom = option.dataZoom;
          if (dataZoom && dataZoom.length > 0) {
            const zoom = dataZoom[0];
            const start = zoom.start / 100;
            const end = zoom.end / 100;
            
            // 计算当前显示的数据范围
            const totalLength = allXAxisData.length;
            const startIndex = Math.floor(start * totalLength);
            const endIndex = Math.floor(end * totalLength);
            
            // 如果分隔线在当前显示范围内，则更新其位置
            if (separatorIndex >= startIndex && separatorIndex <= endIndex) {
              const model = echartsInstance.getModel();
              const gridComp = model.getComponent('grid', 0);
              if (gridComp) {
                const coordSys = gridComp.coordinateSystem;
                if (coordSys && typeof coordSys.getRect === 'function') {
                  const gridRect = coordSys.getRect();
                  if (gridRect) {
                    // 修复分隔线位置计算，与HTML版本保持一致
                    const viewRange = endIndex - startIndex;
                    // const separatorRelativePos = (separatorIndex - startIndex) / viewRange;
                    const separatorRelativePos = (separatorIndex - startIndex - 0.5) / viewRange;
                    const separatorPos = gridRect.x + (gridRect.width * separatorRelativePos);
                    
                    echartsInstance.setOption({
                      graphic: [
                        {
                          type: 'line',
                          shape: {
                            x1: separatorPos,
                            y1: gridRect.y,
                            x2: separatorPos,
                            y2: gridRect.y + gridRect.height
                          },
                          style: {
                            stroke: '#ff0000',
                            lineWidth: 2,
                            lineDash: [5, 5]
                          },
                          z: 5,
                          id: 'separator-line'
                        },
                        {
                          type: 'text',
                          style: {
                            text: chartData.separatorDate,
                            x: separatorPos,
                            y: gridRect.y - 10,
                            textAlign: 'center',
                            textVerticalAlign: 'bottom',
                            fontSize: 12,
                            fontWeight: 'bold',
                            fill: '#ff0000'
                          },
                          z: 5,
                          id: 'separator-text'
                        }
                      ]
                    }, false);
                  }
                }
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }
    };

    return (
      <Modal
        title={`${chartTitle} - ${currentChartTask.reasoning_id || currentChartTask.taskName || '未命名任务'}`}
        open={chartModalVisible}
        onCancel={() => setChartModalVisible(false)}
        footer={null}
        width={1600}
        destroyOnClose
        bodyStyle={{
          height: '600px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ReactECharts
          option={option}
          style={{ width: '1500px', height: '560px', minWidth: '600px', minHeight: '400px' }}
          onChartReady={onChartReady}
          onEvents={onEvents}
        />
      </Modal>
    );
  };

  // 初始化获取任务列表
  useEffect(() => {
    fetchTaskList();
  }, []);

  // 组件卸载时清除轮询
  useEffect(() => {
    return () => {
      clearPolling();
      clearAllTaskPolling();
    };
  }, []);

  // 查看日志内容
  const handleShowLog = async (record: InferenceTask) => {
    if (!record.log_path) {
      message.warning('该任务没有日志路径');
      return;
    }
    setLogLoading(true);
    setLogModalVisible(true);
    setLogContent('');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/data/reasoning/log`, {
        log_path: record.log_path
      });
      // 只显示 data 字段内容
      let content = '';
      if (response.data && Array.isArray(response.data.data)) {
        content = response.data.data.join('\n');
      } else if (typeof response.data.data === 'string') {
        content = response.data.data;
      } else {
        content = '日志内容为空';
      }
      setLogContent(content);
    } catch (error) {
      setLogContent('日志获取失败');
    } finally {
      setLogLoading(false);
    }
  };

  // 新增：预报模型参数
  const [forecastModel, setForecastModel] = useState<string>('ecthin_ppr');
  // 新增：预热期参数
  const [warmupHours, setWarmupHours] = useState<number>(0);

  return (
    <div>
      <Card title="AI模型数据推理配置">
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              width: '80px', 
              textAlign: 'right', 
              marginRight: '10px',
            }}>任务名称：</span>
            <Input
              placeholder="请输入任务名称"
              value={taskName}
              onChange={e => {
                setTaskName(e.target.value);
                setTaskNameError(false);
              }}
              style={{ 
                width: '300px',
                borderColor: taskNameError ? '#ff4d4f' : undefined 
              }}
            />
            {taskNameError && (
              <div style={{ color: '#ff4d4f', marginTop: 8 }}>
                请输入有效的任务名称
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Radio.Group
            value={inferenceType}
            onChange={handleInferenceTypeChange}
            style={{ marginBottom: 16 }}
          >
            <Radio.Button value="topology">拓扑类推理</Radio.Button>
            <Radio.Button value="timeSeries">时序类推理</Radio.Button>
          </Radio.Group>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              width: '80px', 
              textAlign: 'right', 
              marginRight: '10px',
              color: '#666'
            }}>模型选择：</span>
            <Select
              ref={selectRef}
              style={{ 
                width: calculateSelectWidth(selectedModel), 
                minWidth: 600,
                maxWidth: 700,
                marginRight: '16px' 
              }}
              placeholder="选择已训练的模型"
              optionLabelProp="label"
              options={modelList.map(m => ({ 
                label: (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{m.model_name}</span>
                  </div>
                ),
                value: m.model_name,
                title: `${m.model_name}`
              }))}
              onChange={handleModelChange}
              disabled={!inferenceType}
              value={selectedModel}
              popupMatchSelectWidth={false}
              styles={{ popup: { root: { minWidth: 300 } } }}
              showSearch
              filterOption={(input, option) => {
                return option?.title?.toLowerCase().includes(input.toLowerCase()) || false;
              }}
              optionFilterProp="title"
            />
          </div>
        </div>
        {/* 只有选了模型后才显示 预报模型、预热期、预见期 */}
        {selectedModelData && (
          <>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
              <span style={{ width: '80px', textAlign: 'right', marginRight: '10px', color: '#666' }}>预报模型：</span>
              <Radio.Group
                value={forecastModel}
                onChange={e => setForecastModel(e.target.value)}
                style={{ marginLeft: 0 }}
              >
                <Radio value="ecthin_ppr">欧洲</Radio>
                <Radio value="german_ppr">德国</Radio>
                <Radio value="rjtd_ppr">rjtd</Radio>
                <Radio value="gfs_ppr">美国</Radio>
                <Radio value="grapes_ppr">中国</Radio>
                <Radio value="nwp_ppr">军队</Radio>
                <Radio value="dyv2_ppr">多源融合</Radio>
                <Radio value="slnwp_ppr">水利区域模式</Radio>
                <Radio value="zkg_ppr">水利人工主客观</Radio>
                <Radio value="rgyb_ppr">水利人工欧洲时程</Radio>
                <Radio value="byyz_pre">暴雨移植模式</Radio>
              </Radio.Group>
            </div>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
              <span style={{ width: '80px', textAlign: 'right', marginRight: '10px', color: '#666' }}>预热期：</span>
              <InputNumber
                min={0}
                value={warmupHours}
                onChange={v => setWarmupHours(v ?? 0)}
                style={{ width: 120, marginRight: 8 }}
                placeholder="小时"
              />
              <span style={{ color: '#666' }}>小时</span>
            </div>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
              <span style={{ width: '80px', textAlign: 'right', marginRight: '10px', color: '#666' }}>预见期：</span>
              <InputNumber
                value={selectedModelData?.pred_len ?? 0}
                readOnly
                disabled
                style={{ width: 120, marginRight: 8 }}
                placeholder="小时"
              />
              <span style={{ color: '#666' }}>小时</span>
            </div>
          </>
        )}

        {renderDateTimeSection()}

        <Button 
          type="primary" 
          onClick={handleInference}
          loading={loading}
          style={{ marginBottom: 24 }}
          disabled={!selectedModel}
        >
          开始推理
        </Button>
      </Card>

      <Card title="AI模型数据推理列表" style={{ marginTop: 24 }}>
        <Table 
          columns={taskColumns}
          dataSource={taskList}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `共 ${total} 条`,
            total: taskTotal,
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }} // 增加横向滚动条
          style={{ whiteSpace: 'nowrap' }} // 全局不换行
        />
      </Card>

      <Modal
        title="任务详情"
        open={taskDetailVisible}
        onCancel={() => setTaskDetailVisible(false)}
        footer={null}
        width={800}
      >
        {currentTask && (
          <div>
            <p><strong>任务ID：</strong> {currentTask.id}</p>
            <p><strong>任务名称：</strong> {currentTask.reasoning_id || currentTask.taskName || '未命名'}</p>
            <p><strong>创建时间：</strong> 
              {dayjs(currentTask.created_at || currentTask.createTime).format('YYYY-MM-DD HH:mm:ss')}
            </p>
            <p><strong>状态：</strong> 
              <Tag color={currentTask.status === 'success' ? 'green' : 
                        currentTask.status === 'failed' ? 'red' : 'blue'}>
                {currentTask.status === 'success' ? '完成' : 
                currentTask.status === 'failed' ? '失败' : '处理中'}
              </Tag>
            </p>
            <p><strong>数据ID：</strong> {currentTask.data_id}</p>
            <p><strong>模型ID：</strong> {currentTask.model_id}</p>
            <p><strong>数据类型：</strong> {currentTask.data_type === 1 ? '时序类' : '拓扑类'}</p>
            <p><strong>推理结果路径：</strong> {currentTask.reasoning_path}</p>
            <p><strong>日志路径：</strong> {currentTask.log_path}</p>
          </div>
        )}
      </Modal>

      {renderChartModal()}

      {/* 日志弹窗 */}
      <Modal
        title="任务日志"
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={null}
        width={1100}
      >
        {logLoading ? (
          <div>日志加载中...</div>
        ) : (
          <pre style={{ maxHeight: 500, overflow: 'auto', background: '#f6f6f6', padding: 16 }}>
            {logContent && String(logContent).trim() !== '' ? logContent : '暂无日志内容'}
          </pre>
        )}
      </Modal>

      {/* 预览数据集弹窗 */}
      <Modal
        title="推理数据集预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width={900}
      >
        {previewLoading ? (
          <div>数据加载中...</div>
        ) : (
          <pre style={{ maxHeight: 500, overflow: 'auto', background: '#111', color: '#fff', padding: 16 }}>{previewData}</pre>
        )}
      </Modal>
    </div>
  );
};

export default DataInference;