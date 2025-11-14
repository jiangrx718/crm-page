import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Card, 
  Button, 
  Form, 
  Input, 
  Select, 
  message, 
  Table, 
  Tag, 
  Modal, 
  Descriptions, 
  Tooltip, 
  List
} from 'antd';
import { DownloadOutlined, FileTextOutlined, LineChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { API_BASE_URL } from '../config';

// 引入Tailwind CSS
const style = document.createElement('style');
style.textContent = `
  @layer utilities {
    .chart-container {
      height: 350px;
    }
    .z-metrics {
      background-color: white;
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
    }
    .q-metrics {
      background-color: white;
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
    }
    .z-chart {
      background-color: white;
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      margin-bottom: 1rem;
    }
    .q-chart {
      background-color: white;
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
    }
    .text-sm {
      font-size: 0.875rem;
      line-height: 1.25rem;
    }
    .text-gray-500 {
      color: #6b7280;
    }
    .text-xl {
      font-size: 1.25rem;
      line-height: 1.75rem;
    }
    .font-bold {
      font-weight: 700;
    }
    .font-semibold {
      font-weight: 600;
    }
    .mb-2 {
      margin-bottom: 0.5rem;
    }
    .mb-3 {
      margin-bottom: 0.75rem;
    }
    .mb-4 {
      margin-bottom: 1rem;
    }
    .hidden {
      display: none;
    }
    .grid {
      display: grid;
    }
    .grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .md\\:grid-cols-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .gap-3 {
      gap: 0.75rem;
    }
}
`;
document.head.appendChild(style);

const FitModelTrain: React.FC = () => {
  // 图表相关 state
  const [chartModalVisible, setChartModalVisible] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [currentLoadingChartFile, setCurrentLoadingChartFile] = useState<string | null>(null);
  const [fileType, setFileType] = useState({ hasZ: false, hasQ: false }); // 记录文件类型
  
  // ECharts实例ref
  const waterChartRef = useRef<any>(null);
  const flowChartRef = useRef<any>(null);

  // 解析CSV数据用于图表
  const parseCSVForChart = (csv: string, fileName: string) => {
    const lines = csv.split('\n');
    if (lines.length < 2) return null;
    const headers = lines[0].split(',').map(header => header.trim());
    
    // 分析文件名确定文件类型
    const lowerFileName = fileName.toLowerCase();
    const hasZQ = lowerFileName.includes('_zq_');
    const hasZ = hasZQ || lowerFileName.includes('_z_');
    const hasQ = hasZQ || lowerFileName.includes('_q_');
    
    setFileType({ hasZ, hasQ });
    
    // 验证文件类型
    if (!hasZ && !hasQ) {
      message.error('文件名必须包含_z_、_q_或_zq_以指明数据类型');
      return null;
    }
    
    // 查找必要的列索引
    const timeIndex = headers.indexOf('time');
    const predZIndex = headers.indexOf('pred_z');
    const predQIndex = headers.indexOf('pred_q');
    const trueZIndex = headers.indexOf('true_z');
    const trueQIndex = headers.indexOf('true_q');
    
    // 根据文件类型验证必要的列
    if (hasZ && (predZIndex === -1 || trueZIndex === -1)) {
      message.error('CSV文件缺少水位相关列，请确保包含pred_z和true_z列');
      return null;
    }
    if (hasQ && (predQIndex === -1 || trueQIndex === -1)) {
      message.error('CSV文件缺少流量相关列，请确保包含pred_q和true_q列');
      return null;
    }
    if (timeIndex === -1) {
      message.error('CSV文件必须包含time列');
      return null;
    }
    
    // 解析数据
    const processedData: {
      time: string[];
      pred_z: number[];
      pred_q: number[];
      true_z: number[];
      true_q: number[];
      z_error: number[];
      q_error: number[];
    } = {
      time: [],
      pred_z: [],
      pred_q: [],
      true_z: [],
      true_q: [],
      z_error: [],
      q_error: []
    };
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',');
      if (values.length <= Math.max(timeIndex, predZIndex, predQIndex, trueZIndex, trueQIndex)) {
        continue;  // 跳过不完整的行
      }
      
      // 处理时间戳
      let timeValue = values[timeIndex];
      if (!isNaN(parseFloat(timeValue)) && isFinite(Number(timeValue))) {
        timeValue = new Date(parseFloat(timeValue) * (timeValue.length > 10 ? 1 : 1000)).toISOString();
      } else {
        timeValue = new Date(timeValue).toISOString();
      }
      
      processedData.time.push(timeValue);
      
      // 只解析文件类型对应的列
      if (hasZ) {
        processedData.pred_z.push(parseFloat(values[predZIndex]));
        processedData.true_z.push(parseFloat(values[trueZIndex]));
        processedData.z_error.push(parseFloat(values[predZIndex]) - parseFloat(values[trueZIndex]));
      }
      if (hasQ) {
        processedData.pred_q.push(parseFloat(values[predQIndex]));
        processedData.true_q.push(parseFloat(values[trueQIndex]));
        processedData.q_error.push(parseFloat(values[predQIndex]) - parseFloat(values[trueQIndex]));
      }
    }

    // 计算评估指标
    const metrics: any = {};
    if (hasZ) {
      metrics.z_mae = processedData.z_error.reduce((sum: number, error: number) => sum + Math.abs(error), 0) / processedData.z_error.length;
      metrics.z_nse = calculateNSE(processedData.true_z, processedData.pred_z);
    }
    if (hasQ) {
      metrics.q_mae = processedData.q_error.reduce((sum: number, error: number) => sum + Math.abs(error), 0) / processedData.q_error.length;
      metrics.q_nse = calculateNSE(processedData.true_q, processedData.pred_q);
    }
    
    setChartData({
      ...processedData,
      metrics
    });
    
    return true;
  };

  // 计算NSE (Nash-Sutcliffe Efficiency)
  const calculateNSE = (observed: number[], predicted: number[]) => {
    const meanObserved = observed.reduce((sum, val) => sum + val, 0) / observed.length;
    const numerator = observed.reduce((sum, val, idx) => sum + Math.pow(val - predicted[idx], 2), 0);
    const denominator = observed.reduce((sum, val) => sum + Math.pow(val - meanObserved, 2), 0);
    
    return 1 - (numerator / denominator);
  };

  // 水位图表配置
  const getWaterLevelChartOption = () => {
    if (!chartData || !fileType.hasZ) return {};
    
    // 计算Y轴范围
    const allZValues = [...chartData.pred_z, ...chartData.true_z].filter(v => !isNaN(v));
    const zMin = Math.min(...allZValues);
    const zMax = Math.max(...allZValues);
    const zPadding = (zMax - zMin) * 0.1;
    
    return {
      tooltip: {
        trigger: 'axis',
        formatter: function(params: any) {
          let result = `<div>${new Date(params[0].name).toLocaleString()}</div>`;
          params.forEach((param: any) => {
            result += `<div>${param.seriesName}: ${param.value.toFixed(2)}</div>`;
          });
          return result;
        }
      },
      legend: {
        data: ['预测值', '实际值'],
        top: 0
      },
      xAxis: {
        type: 'category',
        data: chartData.time,
        axisLabel: {
          interval: Math.floor(chartData.time.length / 10),
          formatter: function(value: string) {
            return new Date(value).toLocaleDateString();
          },
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        name: '水位 (m)',
        min: zMin - zPadding,
        max: zMax + zPadding
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0
        }
      ],
      series: [
        {
          name: '预测值',
          type: 'line',
          data: chartData.pred_z,
          color: '#165DFF'
        },
        {
          name: '实际值',
          type: 'line',
          data: chartData.true_z,
          color: '#FAAD14'
        }
      ]
    };
  };
  
  // 流量图表配置
  const getFlowDischargeChartOption = () => {
    if (!chartData || !fileType.hasQ) return {};
    
    return {
      tooltip: {
        trigger: 'axis',
        formatter: function(params: any) {
          let result = `<div>${new Date(params[0].name).toLocaleString()}</div>`;
          params.forEach((param: any) => {
            result += `<div>${param.seriesName}: ${param.value.toFixed(2)}</div>`;
          });
          return result;
        }
      },
      legend: {
        data: ['预测值', '实际值'],
        top: 0
      },
      xAxis: {
        type: 'category',
        data: chartData.time,
        axisLabel: {
          interval: Math.floor(chartData.time.length / 10),
          formatter: function(value: string) {
            return new Date(value).toLocaleDateString();
          },
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        name: '流量 (m³/s)'
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0
        }
      ],
      series: [
        {
          name: '预测值',
          type: 'line',
          data: chartData.pred_q,
          color: '#36CFC9'
        },
        {
          name: '实际值',
          type: 'line',
          data: chartData.true_q,
          color: '#FAAD14'
        }
      ]
    };
  };

  // 查看图表
  const handleViewChart = async (path: string) => {
    if (!path) {
      message.warning('没有可查看的文件路径');
      return;
    }
    try {
      setCurrentLoadingChartFile(path);
      setLoading(true);
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/model/train/download`,
        { train_path: path },
        {
          responseType: 'text',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const csvData = response.data;
      // 从路径获取文件名
      const fileName = path.split('/').pop() || '';
      const parseResult = parseCSVForChart(csvData, fileName);
      if (!parseResult) {
        message.error('解析CSV数据失败');
        return;
      }
      setChartModalVisible(true);
    } catch (error) {
      message.error('生成图表失败');
      console.error('Error generating chart:', error);
    } finally {
      setCurrentLoadingChartFile(null);
      setLoading(false);
    }
  };

  // 关闭图表模态框
  const handleChartModalClose = () => {
    setChartModalVisible(false);
    setChartData(null);
    setFileType({ hasZ: false, hasQ: false });
  };

  // Modal首次打开时强制resize ECharts，保证图表完整显示
  useEffect(() => {
    if (chartModalVisible) {
      setTimeout(() => {
        if (waterChartRef.current && waterChartRef.current.getEchartsInstance) {
          waterChartRef.current.getEchartsInstance().resize();
        }
        if (flowChartRef.current && flowChartRef.current.getEchartsInstance) {
          flowChartRef.current.getEchartsInstance().resize();
        }
      }, 100);
    }
  }, [chartModalVisible]);
  
  // 训练任务列表
  const [taskList, setTaskList] = useState<any[]>([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [taskLoading, setTaskLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 详情弹窗相关
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState<any>(null);

  const [logContent, setLogContent] = useState<string>('');
  const [logModalVisible, setLogModalVisible] = useState(false);


  // 训练结果下载逻辑
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

  const fetchTaskList = async (page = 1, size = pageSize) => {
    setTaskLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/fit/model/train/list`, { params: { page, size } });
      if (res.data && res.data.code === 10000 && res.data.data) {
        setTaskList(res.data.data.list || []);
        setTaskTotal(res.data.data.total || 0);
      }
    } catch {
      setTaskList([]);
      setTaskTotal(0);
    }
    setTaskLoading(false);
  };

  useEffect(() => {
    fetchTaskList(1, pageSize);
  }, [pageSize]);
  
  // 模型和数据集选项
  const [datasetOptions, setDatasetOptions] = useState<any[]>([]);
  const [modelOptions, setModelOptions] = useState<any[]>([]);
  
  // 模型类型下拉框展开时请求接口
  const handleModelDropdownVisibleChange = async (open: boolean) => {
    if (open && modelOptions.length === 0) {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/model/list`, { params: { type_id: 3 } });
        if (res.data && res.data.code === 10000) {
          const opts = res.data.data.list.map((item: any) => ({
            label: item.model_name,
            value: item.model_name,
            model_id: item.model_id,
            ...item
          }));
          setModelOptions(opts);
        }
      } catch (e) {
        // 错误处理
      }
    }
  };
  
  // 状态管理
  const [selectedDataset, setSelectedDataset] = useState();
  const [selectedModel, setSelectedModel] = useState();
  const [selectedDatasetObj, setSelectedDatasetObj] = useState<any>();
  const [selectedModelObj, setSelectedModelObj] = useState<any>();
  // 添加模型参数状态
  const [modelParams, setModelParams] = useState<Record<string, any>>({});
  const [stationOptions, setStationOptions] = useState<any[]>([]);
  const [selectedPredictStation, setSelectedPredictStation] = useState();
  const [selectedInputStations, setSelectedInputStations] = useState<any[]>([]);
  const [stationLoading, setStationLoading] = useState(false);
  const [form] = Form.useForm();

  // 数据集下拉框展开时请求接口
  const handleDatasetDropdownVisibleChange = async (open: boolean) => {
    if (open && datasetOptions.length === 0) {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/fit/model/train/data/set/list`, { params: { page: 1, size: 10 } });
        if (res.data && res.data.code === 10000) {
          const opts = res.data.data.list.map((item: any) => ({
            label: item.data_name,
            value: item.data_name,
            batch_id: item.data_id
          }));
          setDatasetOptions(opts);
        }
      } catch (e) {
        // 错误处理
      }
    }
  };

  // 选择数据集后，重置站点选项
  useEffect(() => {
    setStationOptions([]);
    setSelectedPredictStation(undefined);
    setSelectedInputStations([]);
  }, [selectedDataset]);

  // 预测站点下拉框展开时请求接口
  const handleStationDropdownVisibleChange = async (open: boolean) => {
    if (open && stationOptions.length === 0 && selectedDataset) {
      setStationLoading(true);
      const selected = datasetOptions.find((d: any) => d.value === selectedDataset);
      if (!selected || !selected.batch_id) {
        setStationOptions([]);
        setStationLoading(false);
        return;
      }
      try {
        const res = await axios.post(`${API_BASE_URL}/api/v1/fit/model/train/params`, { data_id: selected.batch_id });
        if (res.data && res.data.code === 10000 && Array.isArray(res.data.data)) {
          const opts = res.data.data.map((item: any) => ({ label: item.name, value: item.stcd, stcd: item.stcd, name: item.name }));
          setStationOptions(opts);
        } else {
          setStationOptions([]);
        }
      } catch {
        setStationOptions([]);
      }
      setStationLoading(false);
    }
  };

  // 选择模型时，保存完整对象并请求参数
  const handleModelChange = (val: any) => {
    setSelectedModel(val);
    const obj = modelOptions.find((item) => item.value === val);
    setSelectedModelObj(obj);
    
    // 如果选择了模型，请求参数接口
    if (obj && obj.model_id) {
      fetchModelParams(obj.model_id);
    } else {
      // 清空参数
      setModelParams({});
    }
  };
  
  // 请求模型参数接口
  const fetchModelParams = async (modelId: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/fit/model/param?model_id=${modelId}`);
      if (res.data && res.data.code === 10000) {
        setModelParams(res.data.data || {});
      } else {
        setModelParams({});
      }
    } catch (error) {
      console.error('获取模型参数失败:', error);
      setModelParams({});
    }
  };
  
  // 选择数据集时，保存完整对象
  const handleDatasetChange = (val: any) => {
    setSelectedDataset(val);
    const obj = datasetOptions.find((item) => item.value === val);
    setSelectedDatasetObj(obj);
  };

  // 预测目标特征多选
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  // 输入站点及其目标特征
  const [inputStationTargets, setInputStationTargets] = useState<Record<string, string[]>>({});

  // 输入站点变化时，自动补全目标特征
  useEffect(() => {
    // 保留已选站点的目标特征，新增的站点默认全选z,q
    setInputStationTargets(prev => {
      const next: Record<string, string[]> = {};
      selectedInputStations.forEach(stcd => {
        next[stcd] = prev[stcd] || ['z', 'q'];
      });
      return next;
    });
    // eslint-disable-next-line
  }, [selectedInputStations]);

  // 训练按钮点击事件
  const handleTrain = async () => {
    if (!selectedModelObj || !selectedDatasetObj || !selectedPredictStation || !selectedInputStations.length || !selectedTargets.length) {
      alert('请完整选择模型、数据集、预测站点和输入站点和预测目标特征');
      return;
    }
    for (const stcd of selectedInputStations) {
      if (!inputStationTargets[stcd] || inputStationTargets[stcd].length === 0) {
        alert('请为每个输入站点选择目标特征');
        return;
      }
    }
    setLoading(true);
    try {
      const targetSite = selectedPredictStation;
      const inputSites = selectedInputStations.join(',');
      const inputs = selectedInputStations.map(stcd => ({
        [stcd]: inputStationTargets[stcd].join(',')
      }));

      const formValues = form.getFieldsValue();

      // 保证参数为 float64 类型
      function toFloat(val: any) {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      }

      const params = {
        input_sites: inputSites,
        target_site: targetSite,
        data_id: selectedDatasetObj.batch_id,
        model_id: selectedModelObj.model_id,
        targets: selectedTargets.join(','),
        inputs,
        hidden_size: toFloat(formValues.hidden_size ?? modelParams.hidden_size),
        num_layers: toFloat(formValues.num_layers ?? modelParams.num_layers),
        dropout: toFloat(formValues.dropout ?? modelParams.dropout),
        output_size: toFloat(formValues.output_size ?? modelParams.output_size),
        learning_rate: toFloat(formValues.learning_rate ?? modelParams.learning_rate),
        epochs: toFloat(formValues.epochs ?? modelParams.epochs),
        early_stop_patience: toFloat(formValues.early_stop_patience ?? modelParams.early_stop_patience),
        batch_size: toFloat(formValues.batch_size ?? modelParams.batch_size),
      };
      const res = await axios.post(`${API_BASE_URL}/api/v1/fit/model/train`, params);
      if (res.data && res.data.code === 10000) {
        window.location.reload();
      } else {
        alert(res.data?.msg || '训练任务提交失败');
      }
    } catch (e) {
      alert('训练任务提交失败');
    }
    setLoading(false);
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

  // 关闭日志模态框
  const handleLogModalClose = () => {
    setLogModalVisible(false);
    setLogContent('');
  };
  // NC预览相关 hooks
  const [ncPreviewVisible, setNcPreviewVisible] = useState(false);
  const [ncPreviewContent, setNcPreviewContent] = useState('');
  // 只对当前点击的按钮loading，key用record唯一id
  const [ncPreviewLoadingRowKey, setNcPreviewLoadingRowKey] = useState<string | number | null>(null);

  // NC预览处理函数
  const handleNcPreview = async (record: any) => {
    // 用表格rowKey唯一标识（如id）
    const rowKey = record?.id;
    const dataId = record?.data_id || record?.batch_id || record?.id;
    if (!dataId || !rowKey) {
      message.warning('无效的数据集ID');
      return;
    }
    setNcPreviewLoadingRowKey(rowKey);
    setNcPreviewContent('');
    try {
      const resp = await axios.post(`${API_BASE_URL}/api/v1/fit/model/train/preview/data_id`, { data_id: dataId });
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
      setNcPreviewLoadingRowKey(null);
    }
  };
  
  return (
    <>
      <Card title="机理模型训练" style={{ minWidth: 800, margin: '40px auto' }}>
        <Form form={form} layout="vertical">
          <Form.Item 
            label="选择模型" 
            name="model"
            rules={[{ required: true, message: '请选择模型' }]}
          >
            <Select
              placeholder="请选择模型"
              options={modelOptions}
              value={selectedModel}
              onChange={handleModelChange}
              allowClear
              showSearch
              onDropdownVisibleChange={handleModelDropdownVisibleChange}
            />
          </Form.Item>
          
          {/* 模型参数输入框 */}
          {modelParams && Object.keys(modelParams).length > 0 && (
            <>
              <Form.Item label="隐藏层大小" name="hidden_size">
                <Input 
                  type="number" 
                  defaultValue={modelParams.hidden_size || 64}
                  placeholder="请输入隐藏层大小"
                />
              </Form.Item>
              
              <Form.Item label="模型层数" name="num_layers">
                <Input 
                  type="number" 
                  defaultValue={modelParams.num_layers || 2}
                  placeholder="请输入模型层数"
                />
              </Form.Item>
              
              <Form.Item label="Dropout概率" name="dropout">
                <Input 
                  type="number" 
                  defaultValue={modelParams.dropout || 0.3}
                  placeholder="请输入Dropout概率"
                  step="0.1"
                  min="0"
                  max="1"
                />
              </Form.Item>
              
              <Form.Item label="输出层大小" name="output_size">
                <Input 
                  type="number" 
                  defaultValue={modelParams.output_size || 2}
                  placeholder="请输入输出层大小"
                />
              </Form.Item>
              
              <Form.Item label="学习率" name="learning_rate">
                <Input 
                  type="number" 
                  defaultValue={modelParams.learning_rate || 0.001}
                  placeholder="请输入学习率"
                  step="0.001"
                />
              </Form.Item>
              
              <Form.Item label="训练轮数" name="epochs">
                <Input 
                  type="number" 
                  defaultValue={modelParams.epochs || 20}
                  placeholder="请输入训练轮数"
                />
              </Form.Item>
              
              <Form.Item label="早停止耐心值" name="early_stop_patience">
                <Input 
                  type="number" 
                  defaultValue={modelParams.early_stop_patience || 3}
                  placeholder="请输入早停止耐心值"
                />
              </Form.Item>
              
              <Form.Item label="批处理大小" name="batch_size">
                <Input 
                  type="number" 
                  defaultValue={modelParams.batch_size || 64}
                  placeholder="请输入批处理大小"
                />
              </Form.Item>
            </>
          )}
          <Form.Item 
            label="选择数据集" 
            name="dataset"
            rules={[{ required: true, message: '请选择数据集' }]}
          >
            <Select
              placeholder="请选择数据集"
              options={datasetOptions}
              value={selectedDataset}
              onChange={handleDatasetChange}
              allowClear
              showSearch
              onDropdownVisibleChange={handleDatasetDropdownVisibleChange}
            />
          </Form.Item>

          {selectedDataset && (
            <>
              <Form.Item label="选择预测站点" name="predictStation" rules={[{ required: true, message: '请选择预测站点' }]}> 
                <Select
                  placeholder={stationLoading ? '加载中...' : '请选择预测站点'}
                  options={stationOptions}
                  value={selectedPredictStation}
                  onChange={val => {
                    setSelectedPredictStation(val);
                    // 预测站点变化时，移除输入站点中已选的预测站点
                    setSelectedInputStations(prev => prev.filter(stcd => stcd !== val));
                    setInputStationTargets(prev => {
                      const next: Record<string, string[]> = {};
                      Object.keys(prev).forEach(stcd => {
                        if (stcd !== val) next[stcd] = prev[stcd];
                      });
                      return next;
                    });
                  }}
                  allowClear
                  showSearch
                  loading={stationLoading}
                  notFoundContent={stationLoading ? '加载中...' : '暂无数据'}
                  onDropdownVisibleChange={handleStationDropdownVisibleChange}
                  disabled={!selectedDataset}
                />
              </Form.Item>
              {selectedPredictStation && (
                <Form.Item label="预测目标特征" name="targets" rules={[{ required: true, message: '请选择预测目标特征' }]}>
                  <Select
                    mode="multiple"
                    placeholder="请选择预测目标特征"
                    value={selectedTargets}
                    onChange={setSelectedTargets}
                    options={[
                      { label: 'z：水位', value: 'z' },
                      { label: 'q：流量', value: 'q' }
                    ]}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              )}
              <Form.Item label="输入站点(多选)" name="inputStations" rules={[{ required: true, message: '请选择输入站点' }]}> 
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Select
                      mode="multiple"
                      placeholder="请选择输入站点"
                      options={
                        selectedPredictStation
                          ? stationOptions.filter(opt => opt.value !== selectedPredictStation)
                          : stationOptions
                      }
                      value={selectedInputStations.filter(stcd => stcd !== selectedPredictStation)}
                      onChange={vals => {
                        // 输入站点变化时，自动补全目标特征，并移除预测站点
                        const filteredVals = selectedPredictStation
                          ? vals.filter(stcd => stcd !== selectedPredictStation)
                          : vals;
                        setSelectedInputStations(filteredVals);
                        setInputStationTargets(prev => {
                          const next: Record<string, string[]> = {};
                          filteredVals.forEach(stcd => {
                            next[stcd] = prev[stcd] || ['z', 'q'];
                          });
                          return next;
                        });
                      }}
                      allowClear
                      showSearch
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      type="default"
                      onClick={() => {
                        // 全选（不包含预测站点）
                        const all = selectedPredictStation
                          ? stationOptions.filter(opt => opt.value !== selectedPredictStation).map(opt => opt.value)
                          : stationOptions.map(opt => opt.value);
                        setSelectedInputStations(all);
                        setInputStationTargets(prev => {
                          const next: Record<string, string[]> = {};
                          // 保留已有选择，否则默认 ['z','q']
                          all.forEach(stcd => {
                            next[stcd] = prev[stcd] || ['z', 'q'];
                          });
                          return next;
                        });
                      }}
                    >
                      全选
                    </Button>
                    <Button
                      type="default"
                      onClick={() => {
                        // 反选（在候选集合中取未被选中的项）
                        const all = selectedPredictStation
                          ? stationOptions.filter(opt => opt.value !== selectedPredictStation).map(opt => opt.value)
                          : stationOptions.map(opt => opt.value);
                        const inverse = all.filter(id => !selectedInputStations.includes(id));
                        setSelectedInputStations(inverse);
                        setInputStationTargets(prev => {
                          const next: Record<string, string[]> = {};
                          inverse.forEach(stcd => {
                            next[stcd] = prev[stcd] || ['z', 'q'];
                          });
                          return next;
                        });
                      }}
                    >
                      反选
                    </Button>
                  </div>
                </div>
               </Form.Item>
              {selectedInputStations.map(stcd => {
                const station = stationOptions.find(opt => opt.value === stcd);
                return (
                  <Form.Item
                    key={stcd}
                    label={`输入站点 ${station?.label || stcd} 的目标特征`}
                    required
                  >
                    <Select
                      mode="multiple"
                      placeholder="请选择目标特征"
                      value={inputStationTargets[stcd] || []}
                      onChange={vals => setInputStationTargets(prev => ({ ...prev, [stcd]: vals }))}
                      options={[
                        { label: 'z：水位', value: 'z' },
                        { label: 'q：流量', value: 'q' }
                      ]}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                );
              })}
              <Form.Item>
                <Button type="primary" loading={loading} onClick={handleTrain}>开始训练</Button>
              </Form.Item>
            </>
          )}
        </Form>
      </Card>
      
      <Card title="机理模型训练任务列表" style={{ minWidth: 800, margin: '40px auto', marginTop: 24 }}>
        <Table
          rowKey="id"
          loading={taskLoading}
          dataSource={taskList}
          pagination={{
            current: taskPage,
            pageSize: pageSize,
            total: taskTotal,
            pageSizeOptions: [10, 20, 50, 100],
            showSizeChanger: true,
            showQuickJumper: false,
            onChange: (page, size) => {
              setTaskPage(page);
              setPageSize(size);
              fetchTaskList(page, size);
            },
            showTotal: (total) => `共 ${total} 条`
          }}
          scroll={{ x: 'max-content' }}
          columns={[
            {
              title: '任务批次号',
              dataIndex: 'task_id',
              key: 'task_id',
              render: (text: string) => (
                <div style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={text}>{text}</div>
              )
            },
            {
              title: '训练数据集',
              dataIndex: 'data_name',
              key: 'data_name',
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
                    loading={ncPreviewLoadingRowKey === record.id}
                    onClick={() => handleNcPreview(record)}
                  >
                    {text}
                  </Button>
                </Tooltip>
              )
            },
            {
              title: '数据集周期',
              key: 'period',
              render: (_: any, row: any) => {
                const period = `${row.data_start_time || ''} ~ ${row.data_end_time || ''}`;
                return <div style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={period}>{period}</div>;
              }
            },
            {
              title: '选用模型',
              dataIndex: 'model_name',
              key: 'model_name',
              render: (text: string) => (
                <div style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={text}>{text}</div>
              )
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
            {
              title: '创建时间',
              dataIndex: 'created_at',
              key: 'created_at',
              render: (text: string) => (
                <div style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={text}>{text}</div>
              )
            },
            {
              title: '训练完成时间',
              key: 'updated_at',
              render: (_: any, row: any) => {
                const val = row.status === 'success' ? row.updated_at : '-';
                return <div style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={val}>{val}</div>;
              }
            },
            {
              title: '操作',
              key: 'action',
              render: (_: any, record: any) => (
                <Button type="link" onClick={() => {
                  setCurrentTask(record);
                  setDetailVisible(true);
                }}>查看详情</Button>
              )
            }
          ]}
        />
      </Card>

      {/* 任务详情模态框 */}
      <Modal
        title="训练任务详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>
        ]}
        width={1300}
      >
        {currentTask && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="任务ID">{currentTask.task_id}</Descriptions.Item>
            <Descriptions.Item label="模型名称">{currentTask.model_name}</Descriptions.Item>
            <Descriptions.Item label="数据集">{currentTask.data_name}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{currentTask.created_at}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>
              <span style={{
                color: currentTask.status === 'success' ? 'green' :
                      currentTask.status === 'failed' ? 'red' :
                      currentTask.status === 'running' ? 'blue' : 'orange'
              }}>
                {currentTask.status === 'success' ? '已完成' :
                 currentTask.status === 'failed' ? '失败' :
                 currentTask.status === 'running' ? '运行中' : '等待中'}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="预测站点" span={2}>
              {currentTask.target_site || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="输入站点" span={2}>
              {Array.isArray(currentTask.input_site) ? currentTask.input_site.join('，') : (currentTask.input_site || '-')}
            </Descriptions.Item>
            <Descriptions.Item label="训练结果" span={2}>
              <div>
                {Array.isArray(currentTask.train_path_list_show) && currentTask.train_path_list_show.length > 0 && Array.isArray(currentTask.train_path_list) && currentTask.train_path_list.length === currentTask.train_path_list_show.length ? (
                  <List
                    size="small"
                    bordered
                    dataSource={currentTask.train_path_list_show.map((showPath: string, idx: number) => ({
                      showPath,
                      realPath: currentTask.train_path_list[idx]
                    }))}
                    renderItem={(item: { showPath: string, realPath: string }) => (
                      <List.Item>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <Tooltip title={item.realPath} placement="topLeft">
                            <span style={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'default'
                            }}>
                              {item.showPath.split('/').pop()}
                            </span>
                          </Tooltip>
                          <div>
                            <Button type="link" size="small" style={{ marginRight: 8 }} onClick={() => handleDownload(item.realPath)} icon={<DownloadOutlined />}>下载</Button>
                            <Button type="link" size="small" onClick={() => handleViewChart(item.realPath)} icon={<LineChartOutlined />} loading={currentLoadingChartFile === item.realPath}>图表</Button>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : '暂无'}
              </div>
            </Descriptions.Item>
             <Descriptions.Item label="训练日志" span={2}>
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
            <Descriptions.Item label="执行命令" span={2}>{currentTask.shell_info}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 图表模态框 - 与HTML页面样式一致 */}
      <Modal
        title="水文数据可视化"
        open={chartModalVisible}
        onCancel={handleChartModalClose}
        footer={[
          <Button key="close" onClick={handleChartModalClose}>关闭</Button>
        ]}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ padding: '24px', backgroundColor: '#f9fafb' }}
      >
        {chartData && (
          <div>
            {/* 评估指标 - 使用与HTML相同的样式 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className={`z-metrics ${!fileType.hasZ ? 'hidden' : ''}`}>
                <p className="text-sm text-gray-500">水位MAE</p>
                <h3 id="z-mae" className="text-xl font-bold">{chartData.metrics.z_mae?.toFixed(4)}</h3>
              </div>
              <div className={`q-metrics ${!fileType.hasQ ? 'hidden' : ''}`}>
                <p className="text-sm text-gray-500">流量MAE</p>
                <h3 id="q-mae" className="text-xl font-bold">{chartData.metrics.q_mae?.toFixed(4)}</h3>
              </div>
              <div className={`z-metrics ${!fileType.hasZ ? 'hidden' : ''}`}>
                <p className="text-sm text-gray-500">水位NSE</p>
                <h3 id="z-nse" className="text-xl font-bold">{chartData.metrics.z_nse?.toFixed(4)}</h3>
              </div>
              <div className={`q-metrics ${!fileType.hasQ ? 'hidden' : ''}`}>
                <p className="text-sm text-gray-500">流量NSE</p>
                <h3 id="q-nse" className="text-xl font-bold">{chartData.metrics.q_nse?.toFixed(4)}</h3>
              </div>
            </div>

            {/* 水位预测图表 */}
            <div className={`z-chart ${!fileType.hasZ ? 'hidden' : ''}`}>
              <h2 className="text-lg font-semibold mb-2">水位预测与实际值对比</h2>
              <div className="chart-container">
                <ReactECharts
                  ref={waterChartRef}
                  option={getWaterLevelChartOption()}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </div>
            </div>

            {/* 流量预测图表 */}
            <div className={`q-chart ${!fileType.hasQ ? 'hidden' : ''}`}>
              <h2 className="text-lg font-semibold mb-2">流量预测与实际值对比</h2>
              <div className="chart-container">
                <ReactECharts
                  ref={flowChartRef}
                  option={getFlowDischargeChartOption()}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

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
    </>
  );
}

export default FitModelTrain;