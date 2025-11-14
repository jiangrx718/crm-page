import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Steps, 
  Select, 
  Form, 
  Button, 
  Table, 
  message, 
  Radio, 
  InputNumber, 
  Modal, 
  Descriptions,
  Input,
  Spin,
  List,
  Tag
} from 'antd';
import { DownloadOutlined, FileTextOutlined, DownOutlined, EyeOutlined, LineChartOutlined, RedoOutlined, DeleteFilled } from '@ant-design/icons';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { Tooltip } from 'antd';
import { API_BASE_URL } from '../config';

const { Step } = Steps;

interface ModelParams {
  id: string;
  model_id: string;
  name: string;
  params: {
    learningRate: number;
    epochs: number;
    batchSize: number;
  };
  type: 'timeSeries' | 'topology';
}

interface DatasetItem {
  id: string;
  data_id: string;
  name: string;
}

interface ModelParamsResponse {
  SeqLen: number;
  PredLen: number;
  TrainEpochs: number;
  BatchSize: number;
  LearningRate: string;
  StationID: String;
}

interface TaskDetail {
  id: number;
  task_id: string;
  data_id: string;
  data_name: string;
  model_id: string;
  model_name: string;
  model_params: string;
  status: 'success' | 'failed' | 'running' | 'pending' | 'killed';
  data_type: number;
  train_path: string;
  train_path_list: string[];
  train_path_list_show: string[];
  train_path_download: string;
  log_path: string;
  log_path_download: string;
  failed_reason: string;
  created_at: string;
  mode?: string; // 新增可选的 mode 字段
  sh_pid?: string; // 新增可选的 pid 字段
  plan_id?: string; // 新增方案ID
  updated_at?: string; // 新增训练完成时间字段
  shell_info?: string;
}

interface TrainingTask {
  id: string;
  batchNo: string;
  dataset: string;
  modelName: string;
  parameters: any;
  status: string;
  createTime: string;
  rawData: TaskDetail;
}

interface ChartData {
  trueData: number[];
  predDataMulti: number[][];
  timeStrings: string[];
  predNames: string[];
  metrics: {
    rmse: number;
    mae: number;
    nse: number;
    mape: number;
  }[];
}

interface TopologyParamItem {
  key: string;
  value: string;
  name: string;
}

const ModelTraining: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [modelType, setModelType] = useState<'topology' | 'timeSeries'>();
  const [selectedDataset, setSelectedDataset] = useState<string>();
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>();
  const [selectedModel, setSelectedModel] = useState<ModelParams>();
  const [mockDatasets, setMockDatasets] = useState<DatasetItem[]>([]);
  // 控制数据集下拉菜单是否打开
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);
  const [datasetPage, setDatasetPage] = useState(1);
  // const [datasetTotal, setDatasetTotal] = useState(0); // 已移除未使用的变量
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [datasetSearch, setDatasetSearch] = useState('');
  const [datasetHasMore, setDatasetHasMore] = useState(false);
  const [mockModels, setMockModels] = useState<ModelParams[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [tasksLoading, setTasksLoading] = useState(false);
  const [_, setModelParams] = useState<ModelParamsResponse | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskDetail | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [stationOptions, setStationOptions] = useState<{value: string; label: string}[]>([]);
  const [fetchingStations, setFetchingStations] = useState(false);
  const [showStationSelect, setShowStationSelect] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ 
    columns: string[], 
    data: any[],
    allData: any[],
    loadingMore: boolean,
    hasMore: boolean,
    currentPage: number,
    pageSize: number,
    currentFilePath: string
  }>({ 
    columns: [], 
    data: [],
    allData: [],
    loadingMore: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 50,
    currentFilePath: ''
  });
  const [chartModalVisible, setChartModalVisible] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const chartRef = useRef<any>(null); // 新增
  const [isRetraining, setIsRetraining] = useState(false);
  const [topologyParams, setTopologyParams] = useState<TopologyParamItem[]>([]);
  // 展开/收起拓扑参数字段的状态
  const [showAllParams, setShowAllParams] = useState(false);
  // 步骤切换到选择数据集时自动清空搜索内容和分页（只在 currentStep 变化时执行）
  useEffect(() => {
    if (currentStep === 1) {
      setDatasetSearch('');
      setDatasetPage(1);
      setDatasetHasMore(false);
    }
  }, [currentStep]);

  // 获取模型列表
  const fetchModels = async (type: 'topology' | 'timeSeries') => {
    try {
      setLoading(true);
      const typeId = type === 'timeSeries' ? 1 : 2;
      const response = await axios.get(`${API_BASE_URL}/api/v1/model/list`, {
        params: { type_id: typeId }
      });

      if (response.data.code === 10000) {
        const models = response.data.data.list.map((item: any) => ({
          id: String(item.id),
          model_id: item.model_id,
          name: item.model_name,
          params: {
            learningRate: 0.001,
            epochs: 100,
            batchSize: 32,
          },
          type: typeId === 1 ? 'timeSeries' : 'topology'
        }));
        setMockModels(models);
        return models;
      } else {
        message.error('获取模型列表失败: ' + response.data.msg);
        return [];
      }
    } catch (error) {
      message.error('请求模型列表失败');
      console.error('Error fetching models:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 获取模型参数
  const fetchModelParams = async (modelId: string, dataType: string, dataId?: string) => {
    try {
      setLoading(true);
      
      // 根据模型类型选择不同的API端点
      const isTopology = dataType === 'topology';
      const endpoint = isTopology 
        ? `${API_BASE_URL}/api/v1/model/params/topology/yaml` 
        : `${API_BASE_URL}/api/v1/model/params`;
      
      const response = await axios.get(endpoint, {
        params: { 
          model_id: modelId,
          data_id: dataId || (selectedDatasetId ? mockDatasets.find(d => d.id === selectedDatasetId)?.data_id : undefined)
        }
      });

      if (response.data.code !== 10000) {
        message.error(response.data.msg);
        return false;
      }
      
      if (isTopology) {
        // 处理拓扑类模型的参数
        const params = response.data.data;
        setTopologyParams(params);
        
        // 设置表单默认值
        const initialValues: Record<string, string> = {};
        params.forEach((item: TopologyParamItem) => {
          initialValues[item.key] = item.value;
        });
        form.setFieldsValue(initialValues);
      } else {
        // 处理时序类模型的参数
        const params = response.data.data;
        setModelParams(params);
        
        form.setFieldsValue({
          enc_in: params.EncIn,
          dec_in: params.DecIn,
          c_out: params.COut,
          seq_len: params.SeqLen,
          pred_len: params.PredLen,
          train_epochs: params.TrainEpochs,
          batch_size: params.BatchSize,
          learning_rate: params.LearningRate,
          model:params.Model,
          station_id: undefined
        });
      }
      
      return true;
    } catch (error) {
      message.error('请求模型参数失败');
      console.error('Error fetching model params:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 获取数据集，支持分页和追加
  const fetchDatasets = async (
    type: 'topology' | 'timeSeries',
    options?: { page?: number; search?: string; append?: boolean }
  ) => {
    try {
      setDatasetLoading(true);
      const typeId = type === 'timeSeries' ? 1 : 2;
      const page = options?.page || 1;
      const search = options?.search !== undefined ? options.search : datasetSearch;
      const append = !!options?.append;
      const response = await axios.get(`${API_BASE_URL}/api/v1/data/set/list`, {
        params: {
          type_id: typeId,
          page,
          data_name: search || undefined
        }
      });

      if (response.data.code === 10000) {
        const { list } = response.data.data;
        const datasets = list.map((item: any) => ({
          id: String(item.id),
          data_id: item.data_id,
          name: item.data_name
        }));
        setDatasetPage(page);
        setDatasetHasMore(false);
        if (append && page > 1) {
          // 平滑追加数据，保持下拉菜单打开，避免闪烁
          setMockDatasets(prev => {
            // 只追加新数据，避免重复
            const prevIds = new Set(prev.map(d => d.id));
            const newDatasets = datasets.filter((d: DatasetItem) => !prevIds.has(d.id));
            return [...prev, ...newDatasets];
          });
          setDatasetDropdownOpen(true); // 保持下拉菜单打开
        } else {
          setMockDatasets(datasets);
        }
        return datasets;
      } else {
        message.error('获取数据集失败: ' + response.data.msg);
        return [];
      }
    } catch (error) {
      message.error('请求数据集失败');
      console.error('Error fetching datasets:', error);
      return [];
    } finally {
      setDatasetLoading(false);
    }
  };

  // 获取站点ID选项
  const fetchStationOptions = async () => {
    if (!selectedDatasetId) {
      message.warning('请先选择数据集');
      return;
    }

    const selectedDataset = mockDatasets.find(d => d.id === selectedDatasetId);
    if (!selectedDataset || !selectedDataset.data_id) {
      message.warning('数据集文件路径不存在');
      return;
    }

    try {
      setFetchingStations(true);
      const response = await axios.post(`${API_BASE_URL}/api/v1/nc/stcd`, {
        data_id: selectedDataset.data_id
      });

      if (response.data.code === 10000) {
        const stations = response.data.data.map((station: string) => ({
          value: station,
          label: station
        }));
        if (stations.length === 0) {
          message.warning('未获取到站点ID，请检查数据集或后端接口');
          return;
        }
        setStationOptions(stations);
        setShowStationSelect(true);
        return stations;
      } else {
        message.error(`获取站点ID列表失败: ${response.data.msg}`);
        return [];
      }
    } catch (error) {
      message.error('请求站点ID列表失败，请检查网络或后端服务');
      console.error('Error fetching station options:', error);
      return [];
    } finally {
      setFetchingStations(false);
    }
  };

  // 获取训练任务列表
  const fetchTrainingTasks = async (page: number = 1, pageSize: number = 10) => {
    try {
      setTasksLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/v1/train/list`, {
        params: { page, size: pageSize }
      });

      if (response.data.code === 10000) {
        const { list, total } = response.data.data;
        const formattedTasks = list.map((task: any) => ({
          id: String(task.id),
          batchNo: task.task_id,
          dataType: task.data_type === 2 ? '拓扑类型' : '时序类型',
          mode: task.mode, // 新增
          plan_id: task.plan_id, // 新增
          dataset: task.data_name,
          modelName: task.model_name,
          parameters: task.model_params ? JSON.parse(task.model_params) : {},
          status: task.status,
          createTime: task.created_at,
          rawData: {
            ...task,
            mode: task.mode, // 确保 TaskDetail 也有 mode 字段
            train_path_download: task.train_path_download || '',
            log_path: task.log_path || '',
            log_path_download: task.log_path_download || '',
            train_path_list: task.train_path_list || [],
            train_path_list_show: task.train_path_list_show || []
          }
        }));

        setTasks(formattedTasks);
        setPagination(prev => ({
          ...prev,
          current: page,
          pageSize: pageSize,
          total: total,
        }));
      } else {
        message.error('获取训练任务失败: ' + response.data.msg);
      }
    } catch (error) {
      message.error('请求训练任务失败');
      console.error('Error fetching training tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  // 查看任务详情
  const showTaskDetail = (record: TrainingTask) => {
    if (record.rawData) {
      setCurrentTask(record.rawData);
      setDetailVisible(true);
    }
  };

  // 关闭详情模态框
  const handleDetailClose = () => {
    setDetailVisible(false);
    setCurrentTask(null);
  };

  // 下载训练结果
  const handleDownload = async (path: string) => {
    if (!path) {
      message.warning('没有可下载的文件路径');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/model/train/download`,
        { train_path: path },
        {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const fileName = path.split('/').pop() || 'download';
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      message.error('下载文件失败');
      console.error('Error downloading file:', error);
    }
  };

  // 查看日志
  const handleViewLog = async (path: string) => {
    if (!path) {
      message.warning('没有可查看的日志路径');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/model/train/log`,
        { log_path: path },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.code === 10000) {
        let logData = response.data.data;
        if (Array.isArray(logData)) {
          logData = logData.join('\n');
        }
        setLogContent(logData);
        setLogModalVisible(true);
      } else {
        message.error(response.data.msg || '获取日志失败');
      }
    } catch (error) {
      message.error('查看日志失败');
      console.error('Error viewing log:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载更多CSV数据
  const loadMoreCSVData = async () => {
    if (!previewContent.hasMore || previewContent.loadingMore) return;

    try {
      setPreviewContent(prev => ({
        ...prev,
        loadingMore: true
      }));

      const nextPage = previewContent.currentPage + 1;
      const startIndex = (nextPage - 1) * previewContent.pageSize;
      const endIndex = startIndex + previewContent.pageSize;
      const newData = previewContent.allData.slice(startIndex, endIndex);

      if (newData.length === 0) {
        setPreviewContent(prev => ({
          ...prev,
          hasMore: false,
          loadingMore: false
        }));
        return;
      }

      setPreviewContent(prev => ({
        ...prev,
        data: [...prev.data, ...newData],
        currentPage: nextPage,
        loadingMore: false,
        hasMore: endIndex < prev.allData.length
      }));
    } catch (error) {
      console.error('Error loading more CSV data:', error);
      setPreviewContent(prev => ({
        ...prev,
        loadingMore: false
      }));
    }
  };

  // 处理滚动事件 - 滚动加载更多
  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight + 50;
    
    if (isNearBottom && previewContent.hasMore && !previewContent.loadingMore) {
      loadMoreCSVData();
    }
  };

  const [currentLoadingFile, setCurrentLoadingFile] = useState<string | null>(null);
  // 在线预览CSV文件 - 分页加载
  const handlePreviewCSV = async (path: string) => {
    if (!path) {
      message.warning('没有可预览的文件路径');
      return;
    }

    try {
      setCurrentLoadingFile(path);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/model/train/download`,
        { train_path: path },
        { responseType: 'text' }
      );

      const csvData = response.data;
      const rows = csvData.split('\n').filter((row: string) => row.trim() !== '');
      if (rows.length === 0) {
        message.warning('CSV文件为空');
        return;
      }

      const headers = rows[0].split(',').map((header: string) => header.trim());
      const allData = rows.slice(1).map((row: string) => {
        const values = row.split(',').map((value: string) => {
          const trimmed = value.trim();
          // 仅处理科学计数法表示的值
          if (/^[+-]?\d*\.?\d+[eE][+-]?\d+$/.test(trimmed)) {
            // 转换为普通数字表示，最多保留15位小数
            return Number(trimmed).toFixed(15).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
          }
          return trimmed; // 非科学计数法保持原样
        });
        
        const rowData: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          rowData[header] = values[index] || '';
        });
        return rowData;
      });

      setPreviewContent({
        columns: headers,
        data: allData.slice(0, 50),
        allData,
        loadingMore: false,
        hasMore: allData.length > 50,
        currentPage: 1,
        pageSize: 50,
        currentFilePath: path
      });
      
      setPreviewModalVisible(true);
    } catch (error) {
      message.error('预览CSV文件失败');
      console.error('Error previewing CSV:', error);
    } finally {
      setCurrentLoadingFile(null);
    }
  };

  // 解析CSV数据用于图表
  const parseCSVForChart = (csv: string) => {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    
    // 查找各列索引
    const dateIndex = headers.indexOf('date');
    const trueIndex = headers.indexOf('true');
    
    // 提取预测列并排序
    const predColumns = headers
      .map((header, index) => ({ header, index }))
      .filter(item => item.header.startsWith('pred_'))
      .sort((a, b) => {
        const aHour = parseInt(a.header.split('_')[1]);
        const bHour = parseInt(b.header.split('_')[1]);
        return aHour - bHour;
      });
      
    if (dateIndex === -1 || trueIndex === -1 || predColumns.length === 0) {
      message.error('CSV格式错误：缺少必要的列(date, true或pred_*)');
      return null;
    }

    // 提取预测小时数（pred1对应2小时，pred71对应72小时）
    const predHours = predColumns.map(item => {
      const hour = parseInt(item.header.split('_')[1]);
      return hour + 1;
    });
    
    // 确定要显示的预测列索引
    const selectedIndices = [];
    const totalPreds = predColumns.length;
    
    // 根据预测总数选择不同的时间点
    if (totalPreds >= 72) {
      // 72个以上预测：覆盖短、中、长期预测
      selectedIndices.push(2);   // ~3小时
      selectedIndices.push(23);  // ~24小时
      selectedIndices.push(47);  // ~48小时
    } else if (totalPreds >= 48) {
      // 48-71个预测：覆盖短、中、长期预测
      selectedIndices.push(2);   // ~3小时
      selectedIndices.push(11);  // ~12小时
      selectedIndices.push(23);  // ~24小时
    } else if (totalPreds >= 24) {
      // 24-47个预测：覆盖短、中期预测
      selectedIndices.push(2);   // ~3小时
      selectedIndices.push(5);   // ~6小时
      selectedIndices.push(11);  // ~12小时
    } else if (totalPreds >= 12) {
      // 12-23个预测：覆盖短期预测
      selectedIndices.push(0);   // ~1小时
      selectedIndices.push(2);   // ~3小时
      selectedIndices.push(5);   // ~6小时
    } else if (totalPreds >= 6) {
      // 6-11个预测：覆盖关键短期预测
      selectedIndices.push(0);   // ~1小时
      selectedIndices.push(2);   // ~3小时
      selectedIndices.push(3);   // ~4小时
    } else if (totalPreds >= 3) {
      // 3-5个预测：至少显示3个点
      selectedIndices.push(0);
      selectedIndices.push(Math.floor(totalPreds / 2));
    } else if (totalPreds > 0) {
      // 1-2个预测：显示所有点
      for (let i = 0; i < totalPreds; i++) {
        selectedIndices.push(i);
      }
    }
    
    // 始终包含最后一个小时预测
    if (totalPreds > 0) {
      selectedIndices.push(totalPreds - 1);
    }

    // 初始化数据数组
    const trueData: number[] = [];
    const predDataMulti: number[][] = [];
    const timeStrings: string[] = [];

    // 处理每一行数据
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // 跳过空行
      
      const values = lines[i].split(',');
      if (values.length <= Math.max(dateIndex, trueIndex)) continue;
      
      // 解析日期
      const dateStr = values[dateIndex].trim();
      const date = dateStr ? new Date(dateStr) : new Date();
      timeStrings.push(date.toLocaleString());
      
      // 添加真实值
      trueData.push(parseFloat(values[trueIndex]) || 0);
      
      // 提取选中的预测值
      const predValues: number[] = [];
      for (const idx of selectedIndices) {
        const predValue = parseFloat(values[predColumns[idx].index]);
        predValues.push(isNaN(predValue) ? 0 : predValue);
      }
      
      predDataMulti.push(predValues);
    }

    // 转置预测数据
    const transposedPredData: number[][] = [];
    for (let j = 0; j < selectedIndices.length; j++) {
      const predSeries: number[] = [];
      for (let i = 0; i < predDataMulti.length; i++) {
        predSeries.push(predDataMulti[i][j]);
      }
      transposedPredData.push(predSeries);
    }

    // 构建预测名称
    const predNames = [];
    for (const idx of selectedIndices) {
      predNames.push(`${predHours[idx]}小时预测`);
    }

    // 计算评估指标
    const metrics = [];
    for (let i = 0; i < transposedPredData.length; i++) {
      const predList = transposedPredData[i];
      const validPairs: [number, number][] = [];
      
      for (let j = 0; j < trueData.length; j++) {
        const trueVal = trueData[j];
        const predVal = predList[j];
        if (!isNaN(trueVal) && !isNaN(predVal) && trueVal > 0.1) {
          validPairs.push([trueVal, predVal]);
        }
      }

      if (validPairs.length < 10) {
        metrics.push({
          rmse: 0,
          mae: 0,
          nse: 0,
          mape: 0
        });
        continue;
      }

      const y_true = validPairs.map(pair => pair[0]);
      const y_pred = validPairs.map(pair => pair[1]);

      const rmse = Math.sqrt(
        y_true.reduce((sum, val, idx) => sum + Math.pow(val - y_pred[idx], 2), 0) / y_true.length
      );
      
      const mae = y_true.reduce((sum, val, idx) => 
        sum + Math.abs(val - y_pred[idx]), 0) / y_true.length;

      const mean_true = y_true.reduce((s, v) => s + v, 0) / y_true.length;
      const denominator = y_true.reduce((sum, val) => 
        sum + Math.pow(val - mean_true, 2), 0);
      
      const nse = denominator !== 0 ? 
        1 - (y_true.reduce((sum, val, idx) => 
          sum + Math.pow(val - y_pred[idx], 2), 0) / denominator) : 0;

      let mape = y_true.reduce((sum, val, idx) => 
        sum + Math.abs((val - y_pred[idx]) / val), 0) * 100 / y_true.length;
      mape = isFinite(mape) ? mape : 0;

      metrics.push({
        rmse: parseFloat(rmse.toFixed(3)),
        mae: parseFloat(mae.toFixed(3)),  // Add this line
        nse: parseFloat(nse.toFixed(3)),
        mape: parseFloat(mape.toFixed(3))
      });
    }

    return {
      trueData,
      predDataMulti: transposedPredData,
      timeStrings,
      predNames,
      metrics
    };
  };

  const [currentLoadingChartFile, setCurrentLoadingChartFile] = useState<string | null>(null);
  // 查看图表
  const handleViewChart = async (path: string) => {
    if (!path) {
      message.warning('没有可查看的文件路径');
      return;
    }

    try {
      setCurrentLoadingChartFile(path); // 设置当前加载图表的文件路径
      setLoading(true);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/model/train/download`,
        { train_path: path },
        {
          responseType: 'text',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // 解析CSV内容
      const csvData = response.data;
      const parsedData = parseCSVForChart(csvData);
      
      if (!parsedData) {
        message.error('解析CSV数据失败');
        return;
      }

      setChartData(parsedData);
      setChartModalVisible(true);
    } catch (error) {
      message.error('生成图表失败');
      console.error('Error generating chart:', error);
    } finally {
      setCurrentLoadingChartFile(null); // 清除加载状态
      setLoading(false);
    }
  };

  // 修复弹窗图表首次显示尺寸异常
  useEffect(() => {
    if (chartModalVisible && chartRef.current) {
      setTimeout(() => {
        chartRef.current?.getEchartsInstance()?.resize();
      }, 100); // 延迟以确保Modal动画完成
    }
  }, [chartModalVisible]);

  // 关闭日志模态框
  const handleLogModalClose = () => {
    setLogModalVisible(false);
    setLogContent('');
  };

  // 关闭预览模态框
  const handlePreviewModalClose = () => {
    setPreviewModalVisible(false);
    setPreviewContent({ 
      columns: [], 
      data: [],
      allData: [],
      loadingMore: false,
      hasMore: true,
      currentPage: 1,
      pageSize: 50,
      currentFilePath: ''
    });
  };

  // 关闭图表模态框
  const handleChartModalClose = () => {
    setChartModalVisible(false);
    setChartData(null);
  };

  // 重置表单和选择状态
  const resetForm = () => {
    setCurrentStep(0);
    setModelType(undefined);
    setSelectedDataset(undefined);
    setSelectedDatasetId(undefined);
    setSelectedModel(undefined);
    setModelParams(null);
    setStationOptions([]);
    setShowStationSelect(false);
    setIsRetraining(false);
    form.resetFields();
  };

  // 提交训练任务
  const submitTrainingTask = async () => {
    if (!selectedDatasetId || !selectedModel?.model_id || !modelType) {
      message.warning('请先选择数据集和模型！');
      return;
    }

    try {
      setLoading(true);
      const dataType = modelType === 'topology' ? 2 : 1;
      const isTopology = modelType === 'topology';
      
      const selectedDataset = mockDatasets.find(d => d.id === selectedDatasetId);
      if (!selectedDataset) {
        message.warning('未找到选中的数据集信息！');
        return;
      }

      const formValues = await form.validateFields();

      // 合并默认参数和表单参数（时序类模型）
      let mergedParams = { ...formValues };
      if (!isTopology) {
        // 获取默认参数
        const defaultParams = form.getFieldsValue([
          'seq_len', 'pred_len', 'train_epochs', 'batch_size', 'learning_rate', 'station_id', 'enc_in', 'dec_in', 'c_out', 'model'
        ]);
        mergedParams = { ...defaultParams, ...formValues };
      }

      // 根据模型类型构建不同的请求数据和端点
      const endpoint = isTopology 
        ? `${API_BASE_URL}/api/v1/model/train/topology`
        : `${API_BASE_URL}/api/v1/model/train`;
      
      const requestData = isTopology ? {
        data_type: dataType,
        model_id: selectedModel.model_id,
        data_id: selectedDataset.data_id,
        ...Object.fromEntries(
          topologyParams.map(item => [item.key, formValues[item.key] || item.value])
        )
      } : {
        data_type: dataType,
        model_id: selectedModel.model_id,
        data_id: selectedDataset.data_id,
        seq_len: String(mergedParams.seq_len),
        pred_len: String(mergedParams.pred_len),
        train_epochs: String(mergedParams.train_epochs),
        batch_size: String(mergedParams.batch_size),
        learning_rate: String(mergedParams.learning_rate),
        station_id: String(mergedParams.station_id),
        enc_in: String(mergedParams.enc_in),
        dec_in: String(mergedParams.dec_in),
        c_out: String(mergedParams.c_out),
        model: String(mergedParams.model),
      };

      const response = await axios.post(endpoint, requestData);

      if (response.data.code === 10000) {
        message.success('训练任务已提交');
        await fetchTrainingTasks();
        resetForm();
        if (modelType) {
          await fetchDatasets(modelType);
          await fetchModels(modelType);
        }
      } else {
        message.error('提交训练任务失败: ' + response.data.msg);
      }
    } catch (error) {
      message.error('提交训练任务失败');
      console.error('Error submitting training task:', error);
    } finally {
      setLoading(false);
    }
  };

  // 重新训练任务
  const handleRetryTraining = async (taskId: string) => {
    try {
      setLoading(true);
      
      const formValues = await form.validateFields();
      const isTopology = modelType === 'topology';
      
      if (!selectedDatasetId || !selectedModel?.model_id || !modelType) {
        message.warning('请先选择数据集和模型！');
        return;
      }

      const selectedDataset = mockDatasets.find(d => d.id === selectedDatasetId);
      if (!selectedDataset) {
        message.warning('未找到选中的数据集信息！');
        return;
      }

      // 合并默认参数和表单参数（时序类模型）
      let mergedParams = { ...formValues };
      if (!isTopology) {
        const defaultParams = form.getFieldsValue([
          'seq_len', 'pred_len', 'train_epochs', 'batch_size', 'learning_rate', 'station_id', 'enc_in', 'dec_in', 'c_out', 'model'
        ]);
        mergedParams = { ...defaultParams, ...formValues };
      }

      const endpoint = isTopology 
        ? `${API_BASE_URL}/api/v1/model/train/topology/retry`
        : `${API_BASE_URL}/api/v1/model/train/retry`;
      
      const requestData = isTopology ? {
        data_type: 2,
        model_id: selectedModel.model_id,
        data_id: selectedDataset.data_id,
        ...Object.fromEntries(
          topologyParams.map(item => [item.key, formValues[item.key] || item.value])
        ),
        task_id: taskId
      } : {
        data_type: 1,
        model_id: selectedModel.model_id,
        data_id: selectedDataset.data_id,
        seq_len: String(mergedParams.seq_len),
        pred_len: String(mergedParams.pred_len),
        train_epochs: String(mergedParams.train_epochs),
        batch_size: String(mergedParams.batchSize),
        learning_rate: String(mergedParams.learningRate),
        station_id: String(mergedParams.station_id),
        enc_in: String(mergedParams.enc_in),
        dec_in: String(mergedParams.dec_in),
        c_out: String(mergedParams.c_out),
        model: String(mergedParams.model),
        task_id: taskId
      };

      const response = await axios.post(endpoint, requestData);

      if (response.data.code === 10000) {
        message.success('重新训练任务已提交');
        await fetchTrainingTasks();
        resetForm();
      } else {
        message.error('提交重新训练任务失败: ' + response.data.msg);
      }
    } catch (error) {
      message.error('提交重新训练任务失败');
      console.error('Error submitting retry training task:', error);
    } finally {
      setLoading(false);
    }
  };

  // 准备重新训练
  const handleRetrain = async (task: TaskDetail) => {
    try {
      setLoading(true);
      setDetailVisible(false);
      
      // 解析任务参数
      const taskParams = parseModelParams(task.model_params);
      if (!taskParams) {
        message.error('解析任务参数失败');
        return;
      }
  
      // 设置模型类型
      const type = task.data_type === 1 ? 'timeSeries' : 'topology';
      setModelType(type);
      
      // 获取数据集和模型列表
      const [datasets, models] = await Promise.all([
        fetchDatasets(type),
        fetchModels(type)
      ]);
  
      // 设置选中的数据集
      const dataset = datasets.find((d: DatasetItem) => d.data_id === task.data_id);
      if (!dataset) {
        message.error('未找到对应的数据集');
        return;
      }
      setSelectedDataset(dataset.name);
      setSelectedDatasetId(dataset.id);
  
      // 设置选中的模型
      const model = models.find((m: ModelParams) => m.model_id === task.model_id);
      if (!model) {
        message.error('未找到对应的模型');
        return;
      }
      setSelectedModel(model);
  
      console.log("type---------",type)
      // 获取模型参数并设置表单值
      const success = await fetchModelParams(model.model_id,type, dataset.data_id);
      if (!success) {
        message.error('获取模型参数失败');
        return;
      }
  
      // 对于拓扑类型训练，设置表单值为任务参数
      if (type === 'topology' && taskParams) {
        const initialValues: Record<string, string> = {};
        Object.keys(taskParams).forEach(key => {
          if (key !== 'data_type' && key !== 'model_id' && key !== 'data_id') {
            initialValues[key] = taskParams[key];
          }
        });
        form.setFieldsValue(initialValues);
      } else if (type === 'timeSeries') {
        // 对于时序类型训练，设置表单值
        form.setFieldsValue({
          seq_len: taskParams.seq_len,
          pred_len: taskParams.pred_len,
          train_epochs: taskParams.train_epochs,
          batch_size: taskParams.batch_size,
          learning_rate: taskParams.learning_rate,
          station_id: taskParams.station_id
        });
      }
  
      // 获取站点选项
      if (type === 'timeSeries' && taskParams.station_id) {
        await fetchStationOptions();
      }
  
      // 标记为重新训练流程
      setIsRetraining(true);
      
      // 直接跳转到参数调整步骤
      setCurrentStep(3);
      
      message.success('已加载失败任务的参数，请检查并重新提交训练');
    } catch (error) {
      message.error('准备重新训练失败');
      console.error('Error preparing retrain:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (modelType && !isRetraining) {
      fetchDatasets(modelType);
      fetchModels(modelType);
    }
  }, [modelType, isRetraining]);

  useEffect(() => {
    fetchTrainingTasks();
  }, []);

  
  const handleModelSelect = async (value: string) => {
    const model = mockModels.find(m => m.id === value);
    if (model) {
      setSelectedModel(model);
      const success = await fetchModelParams(model.model_id,model.type);
      if (success) {
        setCurrentStep(3);
      }
    }
  };

  const parseModelParams = (paramsString: string) => {
    try {
      return JSON.parse(paramsString);
    } catch (error) {
      console.error('解析模型参数失败:', error);
      return null;
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedDataset || !selectedModel) {
      message.warning('请先选择数据集和模型！');
      return;
    }
    
    try {
      const formValues = await form.validateFields();
      
      if (modelType !== 'topology' && !formValues.station_id) {
        message.warning('请选择站点ID！');
        return;
      }
      
      if (isRetraining && currentTask) {
        // 如果是重新训练流程，使用当前表单的最新值
        await handleRetryTraining(currentTask.task_id);
      } else {
        // 正常训练流程
        await submitTrainingTask();
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleTableChange = (pagination: any, _filters: any, _sorter: any) => {
    fetchTrainingTasks(pagination.current, pagination.pageSize);
  };

  // NC预览相关 hooks
  const [ncPreviewVisible, setNcPreviewVisible] = useState(false);
  const [ncPreviewContent, setNcPreviewContent] = useState('');
  const [ncPreviewLoadingId, setNcPreviewLoadingId] = useState<string | number | null>(null);
  // const [ncPreviewLoadingId, setNcPreviewLoadingId] = useState<string | number | null>(null); // 已移除未使用变量

  // NC预览处理函数
  const handleNcPreview = async (record: any) => {
    if (!record || !record.rawData?.data_id) {
      message.warning('无效的数据集ID');
      return;
    }
    setNcPreviewLoadingId(record.id || record.key || record.rawData?.id || record.rawData?.data_id || record.dataset || 'loading');
    setNcPreviewContent('');
    try {
      const resp = await axios.post(`${API_BASE_URL}/api/v1/train/preview/data_id`, { data_id: record.rawData.data_id });
      if (resp.data && resp.data.code === 10000) {
        setNcPreviewContent(resp.data.data?.netcdf_variable_data || '无内容');
        setNcPreviewVisible(true);
      } else {
        setNcPreviewContent(resp.data?.msg || '获取NC内容失败');
        setNcPreviewVisible(true);
      }
    } catch (err) {
      setNcPreviewContent('请求失败');
      setNcPreviewVisible(true);
    } finally {
      setNcPreviewLoadingId(null);
    }
  };

  // columns 定义
  const columns = [
    { 
      title: '任务批次号', 
      dataIndex: 'batchNo',
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
    // 新增模型类型列
    {
      title: '训练模式',
      dataIndex: 'mode',
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
      dataIndex: 'dataType',
      render: (text: string) => {
        if (text === '拓扑类型') {
          return <Tag color="#1B9CFC">拓扑类</Tag>;
        }
        if (text === '时序类型') {
          return <Tag color="#58B19F">时序类</Tag>;
        }
        return <Tag>{text}</Tag>;
      }
    },
    {
      title: '训练数据集',
      dataIndex: 'dataset',
      render: (text: string, record: any) => (
        <Tooltip title={text} placement="topLeft">
          <Button
            type="link"
            style={{
              padding: 0,
              minWidth: 80,
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left',
              display: 'inline-block'
            }}
            loading={ncPreviewLoadingId === (record.id || record.key || record.rawData?.id || record.rawData?.data_id || record.dataset)}
            onClick={() => handleNcPreview(record)}
          >
            {text || '-'}
          </Button>
        </Tooltip>
      ),
    },
    // 新增数据集周期列
    {
      title: '数据集周期',
      dataIndex: 'rawData',
      render: (rawData: any) => {
        const start = rawData?.data_start_time || '';
        const end = rawData?.data_end_time || '';
        const period = start && end ? `${start} ~ ${end}` : '-';
        return (
          <div style={{
            whiteSpace: 'nowrap',
            overflow: 'visible',
            textOverflow: 'initial',
            maxWidth: 'none'
          }} title={period}>
            {period}
          </div>
        );
      }
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
        if (val === 'killed') return <Tag color="purple">手动停止</Tag>;
        return val;
      }
    },
    { 
      title: '创建时间', 
      dataIndex: 'createTime',
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
      title: '训练完成时间',
      dataIndex: 'rawData',
      render: (rawData: TaskDetail, record: TrainingTask) => {
        // 仅在 status 为 success 时展示 updated_at，否则展示 "-"
        const status = record.status;
        const updatedAt = rawData?.updated_at;
        return (
          <div style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }} title={status === 'success' && updatedAt ? updatedAt : '-'}>
            {status === 'success' && updatedAt ? updatedAt : '-'}
          </div>
        );
      }
    },
    { 
      title: '选用模型', 
      dataIndex: 'modelName',
      render: (text: string) => (
        <div style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 200  // 可以设置最大宽度
        }} title={text}>
          {text || '-'}
        </div>
      )
    },
    {
      title: '方案ID',
      dataIndex: 'plan_id',
      key: 'plan_id',
      width: 200,
      render: (text: string) => (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip
            placement="topLeft"
            title={
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8 }}>{text}</span>
              </span>
            }
          >
            <div style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '120px',
              cursor: 'pointer'
            }}>{text || '-'}</div>
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
      title: '操作',
      key: 'action',
      render: (_: any, record: TrainingTask) => (
        <Button type="link" onClick={() => showTaskDetail(record)}>
          查看详情
        </Button>
      ),
    },
  ];

  // CSV预览表格列定义
  const previewColumns = previewContent.columns.map((col: string) => ({
    title: col,
    dataIndex: col,
    key: col,
    render: (text: string) => {
      // 保持原始显示，不进行额外处理
      return (
        <Tooltip title={text}>
          <span style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px'
          }}>
            {text}
          </span>
        </Tooltip>
      );
    }
  }));

  // 图表配置
  const getChartOption = () => {
    if (!chartData) return {};
    // 根据当前任务的 mode 决定 Y 轴名称和图表标题
    let yAxisName = '流量 (m³/s)';
    let chartTitle = '流量预测结果可视化';
    if (currentTask?.mode === 'z') {
      yAxisName = '水位 (m)';
      chartTitle = '水位预测结果可视化';
    }
    // 预定义颜色方案（固定前四种颜色）
    const colors = ['#91CC75', '#EE6666', '#73A6FF', '#3BA272'];
    // 图表系列配置
    const series = [
      {
        name: '观测值',
        type: 'line',
        data: chartData.trueData,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#5470C6', width: 2 },
        yAxisIndex: 0
      },
      ...chartData.predDataMulti.map((predData, i) => ({
        name: chartData.predNames[i],
        type: 'line',
        data: predData,
        smooth: true,
        symbol: 'none',
        lineStyle: { 
          color: colors[i % colors.length], 
          width: 1.5 
        },
        yAxisIndex: 0
      }))
    ];
    return {
      title: { 
        text: chartTitle, 
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999'
          }
        },
        formatter: function (params: any) {
          let result = params[0].name + '<br/>';
          params.forEach((param: any) => {
            result += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${param.color};"></span>
                      ${param.seriesName}: ${param.value !== null ? param.value.toFixed(2) : '数据缺失'}${yAxisName.includes('流量') ? ' m³/s' : ' m'}<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: ['观测值', ...chartData.predNames],
        top: 30,
        type: 'scroll',
        pageIconColor: '#2f4554',
        pageIconInactiveColor: '#aaa',
        pageTextStyle: {
          color: '#333'
        }
      },
      toolbox: {
        feature: {
          saveAsImage: {
            title: '保存为图片',
            pixelRatio: 2
          },
          dataZoom: { 
            yAxisIndex: false,
            title: {
              zoom: '区域缩放',
              back: '还原缩放'
            }
          },
          restore: {
            title: '还原'
          }
        }
      },
      xAxis: {
        type: 'category',
        data: chartData.timeStrings,
        axisLabel: {
          interval: Math.ceil(chartData.timeStrings.length / 10)
        }
      },
      yAxis: [
        {
          type: 'value',
          name: yAxisName,
          position: 'left',
          min: 0,
          axisLabel: {
            formatter: '{value}'
          }
        }
      ],
      dataZoom: [
        { 
          type: 'slider', 
          start: 0, 
          end: 100,
          height: 20,
          bottom: 20
        }, 
        { 
          type: 'inside' 
        }
      ],
      series: series,
      grid: {
        top: 80,
        bottom: 100,
        left: 60,
        right: 60
      }
    };
  };

  // 训练结果展开/收起状态
  const [showAllTrainResults, setShowAllTrainResults] = useState(false);

  return (
    <div>
      <Card title="AI模型训练配置">
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title="选择模型类型" />
          <Step title="选择数据集" />
          <Step title="选择模型" />
          <Step title="调整参数" />
        </Steps>

        <div style={{ marginTop: 24 }}>
          {currentStep === 0 && (
            <Form.Item label="模型类型" required>
              <Radio.Group
                value={modelType}
                onChange={(e) => {
                  setModelType(e.target.value);
                  setDatasetSearch('');
                  setDatasetPage(1);
                  setDatasetHasMore(false);
                  setSelectedDataset(undefined); // 切换模型类型时清空已选数据集
                  setSelectedDatasetId(undefined); // 清空已选数据集ID
                  setMockDatasets([]); // 清空数据集列表
                  setCurrentStep(1);
                }}
                style={{ marginTop: 16 }}
              >
                <Radio.Button value="topology">拓扑类模型训练</Radio.Button>
                <Radio.Button value="timeSeries">时序类模型训练</Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}

          {currentStep === 1 && (
            <>
              <Select
                style={{ width: '100%', marginBottom: 16 }}
                showSearch
                allowClear
                placeholder={datasetLoading ? '加载数据集中...' : '请选择数据集'}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                value={selectedDatasetId}
                onSearch={value => {
                  setDatasetSearch(value);
                }}
                dropdownRender={menu => (
                  <div>
                    <div
                      style={{ maxHeight: 320, overflow: 'auto' }}
                      onScroll={e => {
                        e.stopPropagation();
                      }}
                    >
                      {menu}
                    </div>
                  </div>
                )}
                onPopupScroll={e => {
                  const target = e.target as HTMLElement;
                  if (target.scrollHeight - target.scrollTop - target.clientHeight < 10 && !datasetLoading && datasetHasMore) {
                    const nextPage = datasetPage + 1;
                    setDatasetPage(nextPage);
                    setDatasetDropdownOpen(true);
                    fetchDatasets(modelType || 'topology', { page: nextPage, search: datasetSearch, append: true });
                  }
                }}
                options={mockDatasets.map(d => ({ label: d.name, value: d.id }))}
                onChange={async (value) => {
                  const selected = mockDatasets.find(d => d.id === value);
                  if (selected) {
                    setSelectedDataset(selected.name);
                    setSelectedDatasetId(selected.id);
                  }
                  setCurrentStep(2);
                  setDatasetDropdownOpen(false);
                  setDatasetSearch('');
                  setDatasetPage(1);
                  setDatasetHasMore(false);
                  await fetchDatasets(modelType || 'topology', { page: 1, search: '', append: false });
                }}
                loading={datasetLoading}
                disabled={datasetLoading}
                notFoundContent={
                  datasetLoading ? <Spin size="small" /> : (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                      未找到相关数据集
                    </div>
                  )
                }
                open={datasetDropdownOpen}
                onDropdownVisibleChange={visible => setDatasetDropdownOpen(visible)}
              />
              <Button onClick={handleBack} style={{ marginRight: 8 }}>
                上一步
              </Button>
            </>
          )}

          {currentStep === 2 && (
            <>
              <Select
                style={{ width: '100%', marginBottom: 16 }}
                placeholder="请选择模型"
                options={mockModels
                  .filter(m => m.type === modelType)
                  .map(m => ({ label: m.name, value: m.id }))}
                onChange={handleModelSelect}
                loading={loading}
              />
              <Button onClick={handleBack} style={{ marginRight: 8 }}>
                上一步
              </Button>
            </>
          )}

          {currentStep === 3 && selectedModel && (
            <Form
              form={form}
              layout="vertical"
            >
              {isRetraining && (
                <div style={{ marginBottom: 16, padding: '8px 16px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4 }}>
                  <strong>正在重新训练失败的任务</strong>
                  <p style={{ marginBottom: 0 }}>您可以修改以下参数，然后点击"重新训练"按钮</p>
                </div>
              )}
              <Form.Item label="选择的模型类型">
                <span>{modelType === 'topology' ? '拓扑类模型' : '时序类模型'}</span>
              </Form.Item>
              <Form.Item label="选择的模型">
                <span>{selectedModel.name}</span>
              </Form.Item>
              <Form.Item label="选择的数据集">
                <span>{selectedDataset}</span>
              </Form.Item>
              {modelType === 'topology' ? (
                <>
                  {(showAllParams ? topologyParams : topologyParams.slice(0, 5)).map((param) => {
                    // 自定义label渲染：括号及内容字体更细
                    const label = (() => {
                      const match = param.name.match(/^(.*?)(（.*）)$/);
                      if (match) {
                        return (
                          <span>
                            <span style={{ fontWeight: 500 }}>{match[1]}</span>
                            <span style={{ fontWeight: 400, fontSize: '90%', color: '#888' }}>{match[2]}</span>
                          </span>
                        );
                      } else {
                        return <span style={{ fontWeight: 500 }}>{param.name}</span>;
                      }
                    })();
                    return (
                      <Form.Item 
                        key={param.key}
                        label={label}
                        name={param.key}
                        initialValue={param.value}
                      >
                        <Input style={{ width: '100%' }} />
                      </Form.Item>
                    );
                  })}
                  {topologyParams.length > 5 && (
                    <div style={{ textAlign: 'center', margin: '12px 0' }}>
                      {!showAllParams ? (
                        <Button type="link" onClick={() => setShowAllParams(true)}>
                          展开
                        </Button>
                      ) : (
                        <Button type="link" onClick={() => setShowAllParams(false)}>
                          收起
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 站点ID放在预测目标特征（模式类型）前面 */}
                  {/* 字段定义，含括号的label特殊渲染 */}
                  {[
                    {
                      label: '站点ID',
                      name: 'station_id',
                      input: (
                        showStationSelect ? (
                          <Select
                            style={{ width: '100%' }}
                            placeholder={fetchingStations ? '加载站点ID中...' : '请选择站点ID'}
                            options={stationOptions}
                            loading={fetchingStations}
                            showSearch
                            optionFilterProp="label"
                            allowClear
                            onBlur={() => setShowStationSelect(false)}
                          />
                        ) : (
                          <Input
                            style={{ width: '100%' }}
                            placeholder="点击获取站点ID"
                            onClick={fetchStationOptions}
                            suffix={<DownOutlined />}
                            readOnly
                          />
                        )
                      ),
                      rules: [{ required: true, message: '请选择站点ID' }],
                    },
                    {
                      label: '预测目标特征（z：水位，q：流量）',
                      name: 'model',
                      input: <Input style={{ width: '100%' }} />,
                    },
                    {
                      label: '预报时间（输入72代表每次预测未来小时状态）',
                      name: 'pred_len',
                      input: <InputNumber min={1} style={{ width: '100%' }} />,
                    },
                    {
                      label: '历史时间（输入168代表模型使用历史168小时数据）',
                      name: 'seq_len',
                      input: <InputNumber min={1} style={{ width: '100%' }} />,
                    },
                    {
                      label: '训练轮数',
                      name: 'train_epochs',
                      input: <InputNumber min={1} style={{ width: '100%' }} />,
                    },
                    {
                      label: '批处理大小（每次训练数据条数，越大训练越快，但是太大可能会失败）',
                      name: 'batch_size',
                      input: <InputNumber min={1} style={{ width: '100%' }} />,
                    },
                    {
                      label: '编码器（站点数量*4）',
                      name: 'enc_in',
                      input: <InputNumber min={1} style={{ width: '100%' }} readOnly />,
                    },
                    {
                      label: '解码器（站点数量*4）',
                      name: 'dec_in',
                      input: <InputNumber min={1} style={{ width: '100%' }} readOnly />,
                    },
                    {
                      label: '输出（站点数量*3）',
                      name: 'c_out',
                      input: <InputNumber min={1} style={{ width: '100%' }} readOnly />,
                    },
                    {
                      label: '学习率',
                      name: 'learning_rate',
                      input: <InputNumber min={0} max={1} step={0.0001} style={{ width: '100%' }} />, 
                      rules: [
                        {
                          validator: (_: any, value: number) => {
                            if (value < 0) {
                              return Promise.reject('学习率不能小于0');
                            }
                            if (value > 1) {
                              return Promise.reject('学习率不能大于1');
                            }
                            return Promise.resolve();
                          },
                        },
                      ],
                    },
                  ].slice(0, showAllParams ? undefined : 10).map(field => {
                    const match = field.label.match(/^(.*?)(（.*）)$/);
                    const labelNode = match ? (
                      <span>
                        <span style={{ fontWeight: 500 }}>{match[1]}</span>
                        <span style={{ fontWeight: 400, fontSize: '90%', color: '#888' }}>{match[2]}</span>
                      </span>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{field.label}</span>
                    );
                    return (
                      <Form.Item key={field.name} label={labelNode} name={field.name} rules={field.rules}>
                        {field.input}
                      </Form.Item>
                    );
                  })}
                  {[
                    {
                      label: '站点ID',
                      name: 'station_id',
                      input: (
                        showStationSelect ? (
                          <Select
                            style={{ width: '100%' }}
                            placeholder={fetchingStations ? '加载站点ID中...' : '请选择站点ID'}
                            options={stationOptions}
                            loading={fetchingStations}
                            showSearch
                            optionFilterProp="label"
                            allowClear
                            onBlur={() => setShowStationSelect(false)}
                          />
                        ) : (
                          <Input
                            style={{ width: '100%' }}
                            placeholder="点击获取站点ID"
                            onClick={fetchStationOptions}
                            suffix={<DownOutlined />}
                            readOnly
                          />
                        )
                      ),
                      rules: [{ required: true, message: '请选择站点ID' }],
                    },
                    {
                      label: '预测目标特征（z：水位，q：流量）',
                      name: 'model',
                      input: <Input style={{ width: '100%' }} />,
                    },
                    {
                      label: '预报时间（输入72代表每次预测未来小时状态）',
                      name: 'pred_len',
                      input: <InputNumber min={1} style={{ width: '100%' }} />,
                    },
                    {
                      label: '历史时间（输入168代表模型使用历史168小时数据）',
                      name: 'seq_len',
                      input: <InputNumber min={1} style={{ width: '100%' }} />,
                    },
                    {
                      label: '训练轮数',
                      name: 'train_epochs',
                      input: <InputNumber min={1} style={{ width: '100%' }} />,
                    },
                    {
                      label: '批处理大小（每次训练数据条数，越大训练越快，但是太大可能会失败）',
                      name: 'batch_size',
                      input: <InputNumber min={1} style={{ width: '100%' }} />,
                    },
                    {
                      label: '编码器（站点数量*4）',
                      name: 'enc_in',
                      input: <InputNumber min={1} style={{ width: '100%' }} readOnly />,
                    },
                    {
                      label: '解码器（站点数量*4）',
                      name: 'dec_in',
                      input: <InputNumber min={1} style={{ width: '100%' }} readOnly />,
                    },
                    {
                      label: '输出（站点数量*3）',
                      name: 'c_out',
                      input: <InputNumber min={1} style={{ width: '100%' }} readOnly />,
                    },
                    {
                      label: '学习率',
                      name: 'learning_rate',
                      input: <InputNumber min={0} max={1} step={0.0001} style={{ width: '100%' }} />, 
                      rules: [
                        {
                          validator: (_: any, value: number) => {
                            if (value < 0) {
                              return Promise.reject('学习率不能小于0');
                            }
                            if (value > 1) {
                              return Promise.reject('学习率不能大于1');
                            }
                            return Promise.resolve();
                          },
                        },
                      ],
                    },
                  ].length > 10 && (
                    <div style={{ textAlign: 'center', margin: '12px 0' }}>
                      {!showAllParams ? (
                        <Button type="link" onClick={() => setShowAllParams(true)}>
                          展开
                        </Button>
                      ) : (
                        <Button type="link" onClick={() => setShowAllParams(false)}>
                          收起
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
              

              
              <Form.Item>
                {!isRetraining && (
                  <Button onClick={handleBack} style={{ marginRight: 8 }}>
                    上一步
                  </Button>
                )}
                {isRetraining ? (
                  <Button 
                    type="primary" 
                    onClick={handleStartTraining} 
                    loading={loading}
                    icon={<RedoOutlined />}
                  >
                    重新训练
                  </Button>
                ) : (
                  <Button 
                    type="primary" 
                    onClick={handleStartTraining} 
                    loading={loading}
                  >
                    开始训练
                  </Button>
                )}
              </Form.Item>
            </Form>
          )}
        </div>
      </Card>

      <Card title="AI模型训练列表" style={{ marginTop: 24 }}>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={tasksLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}  // 添加水平滚动条
          style={{ whiteSpace: 'nowrap' }}  // 全局不换行
        />
      </Card>

      {/* NC预览弹窗 */}
      <Modal
        title="NC文件内容"
        open={ncPreviewVisible}
        onCancel={() => setNcPreviewVisible(false)}
        footer={null}
        width={800}
        bodyStyle={{ maxHeight: '600px', overflow: 'auto' }}
      >
        <div style={{
          backgroundColor: '#1e1e1e',
          padding: '20px',
          borderRadius: '6px',
          color: '#d4d4d4',
          fontFamily: 'Courier New, Consolas, monospace',
          fontSize: '14px',
          lineHeight: '1.6',
          minHeight: '120px'
        }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{ncPreviewContent || '暂无内容'}</pre>
        </div>
      </Modal>

      {/* 任务详情模态框 */}
      <Modal
        title="训练任务详情"
        open={detailVisible}
        onCancel={handleDetailClose}
        footer={[
          currentTask?.status === 'failed' && (
            <Button 
              key="retrain" 
              type="primary" 
              onClick={() => currentTask && handleRetrain(currentTask)}
              icon={<RedoOutlined />}
              loading={loading}
            >
              重新训练
            </Button>
          ),
          <Button key="close" onClick={handleDetailClose}>
            关闭
          </Button>
        ]}
        width={1400}
      >
        {currentTask && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="任务ID">{currentTask.task_id}</Descriptions.Item>
            <Descriptions.Item label="模型名称">{currentTask.model_name}</Descriptions.Item>
            <Descriptions.Item label="数据集">{currentTask.data_name}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{currentTask.created_at}</Descriptions.Item>
            <Descriptions.Item label="状态" span={currentTask.status === 'running' ? 1 : 2}>
              <span style={{ 
                color: currentTask.status === 'success' ? 'green' : 
                      currentTask.status === 'failed' ? 'red' : 
                      currentTask.status === 'killed' ? 'red' : 
                      currentTask.status === 'running' ? 'blue' : 'orange'
              }}>
                {currentTask.status === 'success' ? '已完成' : 
                 currentTask.status === 'failed' ? '失败' : 
                 currentTask.status === 'killed' ? '手动停止' : 
                 currentTask.status === 'running' ? '运行中' : '等待中'}
              </span>
            </Descriptions.Item>
            {/* 仅在运行中时显示运行时PID */}
            {currentTask.status === 'running' && (
              <Descriptions.Item label="运行时PID">
                {currentTask.sh_pid}
                <Button
                  type="link"
                  size="small"
                  icon={<DeleteFilled />}
                  style={{ marginRight: 8 }}
                  onClick={async () => {
                    try {
                      const resp = await axios.post(
                        `${API_BASE_URL}/api/v1/model/train/kill`,
                        {
                          task_id: currentTask.task_id,
                          pid: currentTask.sh_pid
                        }
                      );
                      if (resp.data.code === 10000) {
                        message.success('已停止任务');
                        setDetailVisible(false);
                        setCurrentTask(null);
                        fetchTrainingTasks();
                      } else {
                        alert(resp.data.msg || '停止任务失败');
                      }
                    } catch (err: any) {
                      message.error('请求停止任务失败');
                    }
                  }}
                >
                  停止
                </Button>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="结果" span={2}>
              <div>
                {(() => {
                  const trainResultList = (currentTask.train_path_list_show && currentTask.train_path_list_show.length > 0)
                    ? currentTask.train_path_list_show
                    : (currentTask.train_path_list || []);
                  const pathList = (currentTask.train_path_list_show && currentTask.train_path_list_show.length > 0)
                    ? currentTask.train_path_list
                    : currentTask.train_path_list;
                  const displayList = showAllTrainResults ? trainResultList : trainResultList.slice(0, 8);
                  return <>
                    <List
                      size="small"
                      bordered
                      dataSource={displayList}
                      renderItem={(item: string, index: number) => {
                        const realIndex = showAllTrainResults ? index : index;
                        const filePath = pathList[realIndex];
                        return (
                          <List.Item>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <Tooltip title={item} placement="topLeft">
                                <span style={{
                                  flex: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  cursor: 'default'
                                }}>
                                  {item.split('/').pop()}
                                </span>
                              </Tooltip>
                              <div>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => handleDownload(filePath)}
                                  icon={<DownloadOutlined />}
                                  style={{ marginRight: 8 }}
                                >
                                  下载
                                </Button>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => handlePreviewCSV(filePath)}
                                  icon={<EyeOutlined />}
                                  style={{ marginRight: 8 }}
                                  loading={currentLoadingFile === filePath}
                                >
                                  {currentLoadingFile === filePath ? '加载中...' : '在线预览'}
                                </Button>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => handleViewChart(filePath)}
                                                                   icon={<LineChartOutlined />}
                                  loading={currentLoadingChartFile === filePath}
                                >
                                  {currentLoadingChartFile === filePath ? '加载中...' : '图表'}
                                </Button>
                              </div>
                            </div>
                          </List.Item>
                        );
                      }}
                    />
                    {trainResultList.length > 8 && (
                      <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Button type="link" onClick={() => setShowAllTrainResults(v => !v)}>
                          {showAllTrainResults ? '收起' : '展开'}
                        </Button>
                      </div>
                    )}
                  </>;
                })()}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="日志" span={2}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8 }}>
                  {currentTask.log_path || '暂无'}
                </span>
                {currentTask.log_path && (
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => handleViewLog(currentTask.log_path)}
                    icon={<FileTextOutlined />}
                  >
                    查看
                  </Button>
                )}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="命令" span={2}>{currentTask.shell_info}</Descriptions.Item>
            <Descriptions.Item label="参数" span={2}>
              <Descriptions bordered column={2} size="small">
                {(() => {
                  const params = parseModelParams(currentTask.model_params);
                  if (!params) return null;
                  
                  return (
                    <>
                      {currentTask.data_type === 1 ? (
                        <>
                          <Descriptions.Item label="序列长度">{params.seq_len}</Descriptions.Item>
                          <Descriptions.Item label="预测长度">{params.pred_len}</Descriptions.Item>
                          <Descriptions.Item label="训练轮次">{params.train_epochs}</Descriptions.Item>
                          <Descriptions.Item label="批次大小">{params.batch_size}</Descriptions.Item>
                          <Descriptions.Item label="学习率">{params.learning_rate}</Descriptions.Item>
                          <Descriptions.Item label="类型">{params.model}</Descriptions.Item>
                          {params.station_id && (
                            <Descriptions.Item label="站点ID">{params.station_id}</Descriptions.Item>
                          )}
                        </>
                      ) : (
                        // 拓扑类型参数展示
                        Object.entries(params).map(([key, value]) => {
                          if (key !== 'data_type' && key !== 'model_id' && key !== 'data_id') {
                            return (
                              <Descriptions.Item key={key} label={key}>
                                {String(value)}
                              </Descriptions.Item>
                            );
                          }
                          return null;
                        })
                      )}
                    </>
                  );
                })()}
              </Descriptions>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 日志详情模态框 */}
      <Modal
        title="训练日志详情"
        open={logModalVisible}
        onCancel={handleLogModalClose}
        footer={[
          <Button key="close" onClick={handleLogModalClose}>
            关闭
          </Button>
        ]}
        width="80%"
      >
        <div style={{ 
          maxHeight: '60vh', 
          overflow: 'auto',
          backgroundColor: '#f0f0f0',
          padding: '16px',
          borderRadius: '4px'
        }}>
          <pre style={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            {logContent}
          </pre>
        </div>
      </Modal>

      {/* CSV预览模态框 */}
      <Modal
              title={`CSV文件预览 - ${previewContent.currentFilePath.split('/').pop()}`}
              open={previewModalVisible}
              onCancel={handlePreviewModalClose}
              footer={[
                <Button key="close" onClick={handlePreviewModalClose}>
                  关闭
                </Button>
              ]}
              width="80%"
            >
              <div 
                style={{ 
                  maxHeight: '60vh', 
                  overflow: 'auto',
                  position: 'relative'
                }}
                onScroll={handleTableScroll}
              >
                <Table
                  columns={previewColumns}
                  dataSource={previewContent.data}
                  rowKey={(_record, index) => String(index)}
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  loading={previewContent.loadingMore}
                />
                {previewContent.loadingMore && (
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    padding: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    <Spin tip="加载更多数据..." />
                  </div>
                )}
                {!previewContent.hasMore && previewContent.data.length > 0 && (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '8px',
                    color: '#999'
                  }}>
                    已加载全部数据
                  </div>
                )}
              </div>
      </Modal>

      {/* 图表模态框 */}
      <Modal
        title={currentTask?.mode === 'z' ? '水位预测结果可视化' : '流量预测结果可视化'}
        open={chartModalVisible}
        onCancel={handleChartModalClose}
        footer={[
          <Button key="close" onClick={handleChartModalClose}>
            关闭
          </Button>
        ]}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ padding: '24px' }}
      >
        {chartData && (
          <div>
            <div style={{ 
              margin: '20px 0', 
              padding: '15px', 
              background: '#f8f9fa', 
              borderRadius: '5px' 
            }}>
              <h3 style={{ marginBottom: '16px' }}>总体评估指标</h3>
              {chartData.metrics.map((metric, index) => (
                <div key={index} style={{ margin: '5px 0', color: '#666' }}>
                  <Tag color="#2db7f5">{chartData.predNames[index]}</Tag>
                  RMSE: {metric.rmse.toFixed(3)} | 
                  MAE: {metric.mae.toFixed(3)} | 
                  NSE: {metric.nse.toFixed(3)} | 
                  MAPE: {metric.mape.toFixed(3)}%
                </div>
              ))}
            </div>
            <div style={{ 
              height: '600px', 
              width: '100%', 
              marginTop: '30px',
              border: '1px solid #f0f0f0',
              borderRadius: '4px',
              padding: '10px'
            }}>
              <ReactECharts 
                ref={chartRef}
                option={getChartOption()} 
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ModelTraining;