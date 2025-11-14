import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Form, Row, Col, ConfigProvider, message, Table, Tag, Card, Modal, Select, DatePicker, Tooltip, InputNumber } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import { LineChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import 'dayjs/locale/zh-cn';
import { API_BASE_URL } from '../config';
import axios from 'axios';

dayjs.locale('zh-cn');

interface ChartDataExtended {
  allTimes: string[];
  historicalTimes: string[];
  futureTimes: string[];
  historicalTrueZ: (number | null)[];
  historicalTrueQ: (number | null)[];
  historicalPredZ: (number | null)[];
  historicalPredQ: (number | null)[];
  futurePredZ: (number | null)[];
  futurePredQ: (number | null)[];
  separatorIndex: number;
  separatorDate: string;
  nseZ: number | null;
  nseQ: number | null;
}

const FitModelTrainDataInference: React.FC = () => {
  // 获取数据按钮 loading 状态
  const [loadingGetData, setLoadingGetData] = useState(false);
  // 轮询管理
// 使用 ReturnType<typeof setTimeout> 以兼容浏览器与 Node 环境
const pollingRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [form] = Form.useForm();
  const [taskList, setTaskList] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [loading, setLoading] = React.useState(false);
  const [modelOptions, setModelOptions] = React.useState<{
    model_name: string,
    id: number,
    target_site?: { name: string }[],
    input_site?: { name: string, station_id?: string, stcd?: string }[]
  }[]>([]);
  const [selectedModel, setSelectedModel] = React.useState<any>(null);
  const [targetSites, setTargetSites] = React.useState<{ name: string, stcd?: string }[]>([]);
  const [inputSites, setInputSites] = React.useState<{ name: string, stcd?: string, station_id?: string }[]>([]);
  const [selectedInputSites, setSelectedInputSites] = React.useState<{ site: string, publishTime?: string }[]>([]);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  // 日志弹窗相关状态
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logContent, setLogContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState('');

  // Chart related states
  const [chartModalVisible, setChartModalVisible] = useState(false);
  const [chartData, setChartData] = useState<ChartDataExtended | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const chartDomRef = useRef<HTMLDivElement | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null); // 新增：存储当前文件名

  // 临时存储接口返回的各站点发布时间
  const [publishTimeOptions, setPublishTimeOptions] = React.useState<Record<string, {
    iymdh: string,
    stcd?: string,
    unitname?: string,
    comments?: string,
    fymdh?: string,
    plcd?: string
  }[]>>({});
  // 控制NC数据集相关控件显示
  const [showNCControls, setShowNCControls] = React.useState(false);
  // 轮询相关状态
  const [ncPolling, setNCPolling] = React.useState(false);
  const [ncPreviewVisible, setNCPreviewVisible] = useState(false);
  const [ncBatchId, setNCBatchId] = React.useState<string | null>(null);
  // 新增：NC 构建失败标志与原因
  const [ncFailed, setNCFailed] = useState(false);
  const [ncFailedReason, setNCFailedReason] = useState<string | null>(null);

  // 新增：预热期、预见期、预报依据时间
  const [warmupHours, setWarmupHours] = useState<number>(0); // 预热期（小时）
  const [seenHours, setSeenHours] = useState<number>(24);    // 预见期（小时）
  const [basedTime, setBasedTime] = useState<any>(dayjs().minute(0).second(0)); // 依据时间（dayjs）

  // 获取模型下拉选项
  React.useEffect(() => {
    const fetchModelOptions = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/v1/fit/model/train/success/list`);
        const result = await resp.json();
        if (result.code === 10000) {
          setModelOptions(result.data.list || []);
        }
      } catch (e) {
        message.error('获取模型列表失败');
      }
    };
    fetchModelOptions();
  }, []);


  // 预览推理数据集
  const handlePreviewDataset = async () => {
    if (!ncBatchId) {
      message.warning('无可预览的数据集');
      return;
    }
    setPreviewLoading(true);
    setPreviewModalVisible(true);
    setPreviewData('');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/fit/model/infer/data/preview`, {
        batch_id: ncBatchId
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

  // 获取任务列表
  const fetchTaskList = React.useCallback(async (pageNum = 1, size = 10) => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/fit/model/reasoning/list?page=${pageNum}&size=${size}`);
      const result = await resp.json();
      if (result.code === 10000) {
        setTaskList(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTaskList(page, pageSize);
  }, [page, pageSize, fetchTaskList]);

  // 监听任务列表，自动轮询 running 状态
  useEffect(() => {
    // 清理所有旧的轮询
    Object.values(pollingRefs.current).forEach(timer => clearTimeout(timer));
    pollingRefs.current = {};

    // 找出所有 running 状态的任务，分别轮询
    taskList.forEach(task => {
      if (task.status === 'running' && typeof task.id === 'number') {
        const pollStatus = async () => {
          try {
            const resp = await fetch(`${API_BASE_URL}/api/v1/fit/model/reasoning/status?id=${task.id}`);
            const result = await resp.json();
            if (
              result.code === 10000 &&
              result.data &&
              (result.data.status === 'success' || result.data.status === 'failed')
            ) {
              // 状态变为 success 或 failed，刷新列表并停止轮询
              fetchTaskList(page, pageSize);
              return;
            }
          } catch {}
          // 继续轮询
          // 使用 window.setTimeout 确保返回 number（DOM）
          pollingRefs.current[task.id] = window.setTimeout(pollStatus, 3000);
        };
        pollStatus();
      }
    });
    // 卸载时清理轮询
    return () => {
      Object.values(pollingRefs.current).forEach(timer => clearTimeout(timer));
      pollingRefs.current = {};
    };
  }, [taskList, page, pageSize, fetchTaskList]);

  // 提交表单
  const handleSubmit = async (values: any) => {
    try {
      // 获取task_id（选中模型的task_id）、task_name（表单内容）、data_id（infer接口返回的batch_id）
      const taskName = values.taskName;
      const taskId = selectedModel?.task_id || '';
      const dataId = ncBatchId || '';
      if (!taskName || !taskId || !dataId) {
        message.error('请确保已选择模型、填写任务名称并生成数据集');
        return;
      }
      const postData = {
        task_id: taskId,
        task_name: taskName,
        data_id: dataId,
        based_time: basedTime ? (basedTime.format ? basedTime.format('YYYY-MM-DD HH:mm:ss') : basedTime) : undefined,
        period: warmupHours,
        seen: seenHours
      };
      const response = await fetch(`${API_BASE_URL}/api/v1/fit/model/reasoning/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });
      const result = await response.json();
      if (result.code === 10000) {
        message.success('任务创建成功');
        form.resetFields();
        setSelectedInputSites([]);
        setPublishTimeOptions({}); // 清空临时存储
        fetchTaskList();
        window.location.reload();
      } else {
        message.error(result.message || '任务创建失败');
      }
    } catch (error) {
      message.error('提交失败，请稍后重试');
    }
  };


  // Process CSV data for charts - 修改为根据文件名处理
  const processChartData = (csvContent: string, fileName: string): ChartDataExtended | null => {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
        message.error('CSV文件内容为空或格式不正确');
        return null;
      }
      // const headers = lines[0].split(',').map(header => header.trim()); // 删除未使用的 headers
      const match = fileName.match(/_(\d+)\.csv$/);
      const separatorRowIndex = match ? parseInt(match[1]) + 1 : 7;
      const dataRows = lines.slice(1)
        .map(line => line.split(',').map(item => item.trim()))
        .filter(row => row.length > 2 && row[0] && row[1] && row[2] && row[0] !== '' && row[1] !== '' && row[2] !== '');
      const historicalData = dataRows.slice(0, separatorRowIndex);
      const futureData = dataRows.slice(separatorRowIndex);
      const historicalTimes = historicalData.map(row => row[0]);
      const historicalTrueZ = historicalData.map(row => parseFloat(row[3]) || null);
      const historicalTrueQ = historicalData.map(row => parseFloat(row[4]) || null);
      const historicalPredZ = historicalData.map(row => parseFloat(row[1]) || null);
      const historicalPredQ = historicalData.map(row => parseFloat(row[2]) || null);
      const futureTimes = futureData.map(row => row[0]);
      const futurePredZ = futureData.map(row => parseFloat(row[1]) || null);
      const futurePredQ = futureData.map(row => parseFloat(row[2]) || null);
      const allTimes = [...historicalTimes, ...futureTimes];
      const separatorIndex = historicalTimes.length - 1;
      function calculateNSE(observed: (number | null)[], predicted: (number | null)[]) {
        const validPairs = [];
        for (let i = 0; i < Math.min(observed.length, predicted.length); i++) {
          if (observed[i] !== null && predicted[i] !== null && !isNaN(observed[i]!) && !isNaN(predicted[i]!)) {
            validPairs.push({ obs: observed[i]!, pred: predicted[i]! });
          }
        }
        if (validPairs.length === 0) return null;
        const meanObserved = validPairs.reduce((sum, pair) => sum + pair.obs, 0) / validPairs.length;
        const numerator = validPairs.reduce((sum, pair) => sum + Math.pow(pair.obs - pair.pred, 2), 0);
        const denominator = validPairs.reduce((sum, pair) => sum + Math.pow(pair.obs - meanObserved, 2), 0);
        return denominator === 0 ? (numerator === 0 ? 1 : -Infinity) : 1 - (numerator / denominator);
      }
      const nseZ = calculateNSE(historicalTrueZ, historicalPredZ);
      const nseQ = calculateNSE(historicalTrueQ, historicalPredQ);
      const separatorDate = historicalTimes[separatorIndex] || '未知';
      return {
        allTimes,
        historicalTimes,
        futureTimes,
        historicalTrueZ,
        historicalTrueQ,
        historicalPredZ,
        historicalPredQ,
        futurePredZ,
        futurePredQ,
        separatorIndex,
        separatorDate,
        nseZ,
        nseQ,
      };
    } catch (error) {
      message.error('处理数据时出错');
      return null;
    }
  };

  // 初始化图表，完全复刻HTML样式
  const initCharts = () => {
    if (!chartData || !chartDomRef.current) return;
    if (chartRef.current) {
      chartRef.current.dispose();
      chartRef.current = null;
    }
    chartRef.current = echarts.init(chartDomRef.current);
    const {
      allTimes, historicalTimes, futureTimes,
      historicalTrueZ, historicalTrueQ, historicalPredZ, historicalPredQ,
      futurePredZ, futurePredQ, separatorIndex, separatorDate, nseZ, nseQ
    } = chartData;
    const option = {
      title: [
        {
          text: '水位流量预测结果',
          left: 'center',
          top: '1%'
        },
        {
          text: `水位NSE: ${nseZ !== null ? nseZ.toFixed(4) : '计算失败'} | 流量NSE: ${nseQ !== null ? nseQ.toFixed(4) : '计算失败'}`,
          left: 'center',
          top: '6%',
          textStyle: {
            fontSize: 14,
            fontWeight: 'bold',
            color: '#333'
          }
        }
      ],
      tooltip: {
        trigger: 'axis',
        formatter: function (params: any) {
          let result = `时间：${params[0].name}<br/>`;
          params.forEach((param: any) => {
            if (param.value !== null && param.value !== undefined) {
              result += `${param.seriesName}：${(typeof param.value === 'number' ? param.value.toFixed(2) : param.value)}<br/>`;
            }
          });
          return result;
        }
      },
      legend: {
        data: ['真实水位', '预测水位（历史）', '预测水位（未来）', '真实流量', '预测流量（历史）', '预测流量（未来）'],
        top: '10%',
        left: 'center'
      },
      grid: {
        top: '20%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: allTimes,
      },
      yAxis: [
        {
          type: 'value',
          name: '水位 (m)',
          position: 'left',
          axisLabel: { formatter: '{value}' }
        },
        {
          type: 'value',
          name: '流量 (m³/s)',
          position: 'right',
          axisLabel: { formatter: '{value}' }
        }
      ],
      series: [
        {
          name: '真实水位',
          type: 'line',
          yAxisIndex: 0,
          data: [...historicalTrueZ, ...new Array(futureTimes.length).fill(null)],
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#5470c6', width: 2 },
          itemStyle: { color: '#5470c6' }
        },
        {
          name: '预测水位（历史）',
          type: 'line',
          yAxisIndex: 0,
          data: [...historicalPredZ, ...new Array(futureTimes.length).fill(null)],
          smooth: true,
          symbol: 'triangle',
          symbolSize: 4,
          lineStyle: { color: '#91cc75', width: 2, type: 'dashed' },
          itemStyle: { color: '#91cc75' }
        },
        {
          name: '预测水位（未来）',
          type: 'line',
          yAxisIndex: 0,
          data: [...new Array(historicalTimes.length - 1).fill(null), historicalPredZ[historicalPredZ.length - 1], ...futurePredZ],
          smooth: true,
          symbol: 'diamond',
          symbolSize: 4,
          lineStyle: { color: '#fac858', width: 2 },
          itemStyle: { color: '#fac858' }
        },
        {
          name: '真实流量',
          type: 'line',
          yAxisIndex: 1,
          data: [...historicalTrueQ, ...new Array(futureTimes.length).fill(null)],
          smooth: true,
          symbol: 'rect',
          symbolSize: 4,
          lineStyle: { color: '#ee6666', width: 2 },
          itemStyle: { color: '#ee6666' }
        },
        {
          name: '预测流量（历史）',
          type: 'line',
          yAxisIndex: 1,
          data: [...historicalPredQ, ...new Array(futureTimes.length).fill(null)],
          smooth: true,
          symbol: 'roundRect',
          symbolSize: 4,
          lineStyle: { color: '#73c0de', width: 2, type: 'dashed' },
          itemStyle: { color: '#73c0de' }
        },
        {
          name: '预测流量（未来）',
          type: 'line',
          yAxisIndex: 1,
          data: [...new Array(historicalTimes.length - 1).fill(null), historicalPredQ[historicalPredQ.length - 1], ...futurePredQ],
          smooth: true,
          symbol: 'pin',
          symbolSize: 4,
          lineStyle: { color: '#fc8452', width: 2 },
          itemStyle: { color: '#fc8452' }
        }
      ]
    };
    chartRef.current.setOption(option);

    // 修正：每次都等待 ECharts 完全渲染后再添加分隔线，避免第二次打开时位置错误
    const drawSeparator = () => {
      if (!chartRef.current) return;
      // 先移除旧的 graphic（避免重复）
      chartRef.current.setOption({ graphic: [] }, false);

      // 计算分隔线像素位置
      const xAxisIndex = 0;
      const xValue = allTimes[separatorIndex];
      const xPixel = chartRef.current.convertToPixel({ xAxisIndex }, xValue);

      // 获取 grid 配置
      const option = chartRef.current.getOption() as echarts.EChartsOption & { grid?: any[] };
      const grid = (option.grid && Array.isArray(option.grid) ? option.grid[0] : {}) as { top?: number; bottom?: number };
      const chartHeight = chartRef.current.getHeight();
      const gridY = typeof grid.top === 'number' ? grid.top : chartHeight * 0.2;
      const gridHeight = chartHeight - gridY - (typeof grid.bottom === 'number' ? grid.bottom : chartHeight * 0.15);

      chartRef.current.setOption({
        graphic: [
          {
            type: 'line',
            shape: {
              x1: xPixel,
              y1: gridY,
              x2: xPixel,
              y2: gridY + gridHeight
            },
            style: {
              stroke: '#ff0000',
              lineWidth: 2,
              lineDash: [5, 5]
            }
          },
          {
            type: 'text',
            style: {
              text: ` ${separatorDate}`,
              x: xPixel,
              y: gridY - 10,
              textAlign: 'center',
              textVerticalAlign: 'bottom',
              fontSize: 12,
              fontWeight: 'bold',
              fill: '#ff0000'
            }
          }
        ]
      });
    };

    // 监听 ECharts 渲染完成事件，确保每次都能正确绘制分隔线
    const onRendered = () => {
      drawSeparator();
    };
    chartRef.current.on('finished', onRendered);

    // 首次渲染后立即绘制一次
    setTimeout(drawSeparator, 120);

    // resize
    const handleResize = () => {
      chartRef.current && chartRef.current.resize();
      // resize 后也需要重绘分隔线
      setTimeout(drawSeparator, 60);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.off('finished', onRendered);
        chartRef.current.dispose();
        chartRef.current = null;
      }
    };
  };

  // 加载推理结果并处理为新结构
  const loadChartFromReasoning = async (filePath: string) => {
    setChartLoading(true);
    try {
      const fileName = filePath.split('/').pop() || '';
      setCurrentFileName(fileName);
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/fit/model/reasoning/download`,
        { reasoning_path: filePath },
        { responseType: 'text' }
      );
      if (response.data && typeof response.data === 'string') {
        try {
          const json = JSON.parse(response.data);
          if (json && json.code === 400) {
            alert('文件未找到，无法展示图表');
            setChartLoading(false);
            return;
          }
        } catch {}
      }
      const processedData = processChartData(response.data, fileName);
      if (processedData) {
        setChartData(processedData);
        setChartModalVisible(true);
      } else {
        message.error('无法解析图表数据');
      }
    } catch (error) {
      message.error('加载图表数据失败');
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    if (chartModalVisible && chartData && currentFileName) {
      const cleanup = initCharts();
      setTimeout(() => {
        if (chartRef.current) chartRef.current.resize();
      }, 300);
      return cleanup;
    }
  }, [chartModalVisible, chartData, currentFileName]);

  // 表格列定义
  const columns = [
    {
      title: '任务批次号',
      dataIndex: 'reasoning_id',
      key: 'reasoning_id',
    },
    {
      title: '任务名称',
      dataIndex: 'task_name',
      key: 'task_name',
      render: (text: string) => (
        <Tooltip title={text}>
          <div style={{
            maxWidth: 160, // 约20汉字宽度
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'pointer'
          }}>
            {text}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '模型训练批次',
      dataIndex: 'model_task_id',
      key: 'model_task_id',
    },
    {
      title: '推理数据集',
      dataIndex: 'data_name',
      key: 'data_name',
      render: (text: string, record: any) => (
        <Tooltip title={text}>
          <Button
            type="link"
            style={{
              maxWidth: 160, // 约20汉字宽度
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'inline-block',
              verticalAlign: 'middle'
            }}
            onClick={async () => {
              setPreviewLoading(true);
              setPreviewModalVisible(true);
              setPreviewData('');
              try {
                const resp = await fetch(`${API_BASE_URL}/api/v1/fit/model/reasoning/preview/data_id`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ data_id: record.data_id || record.id })
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
            }}
          >
            {text}
          </Button>
        </Tooltip>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => (
        <div style={{ minWidth: 160  }}>
          {text}
        </div>
      ),
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
      title: '预报依据时间',
      dataIndex: 'based_time',
      key: 'based_time',
      render: (val: string) => val ? val : '-'
    },
    {
      title: '预热期(小时)',
      dataIndex: 'period',
      key: 'period',
      render: (val: number) => val ?? '-'
    },
    {
      title: '预见期(小时)',
      dataIndex: 'seen',
      key: 'seen',
      render: (val: number) => val ?? '-'
    },
    {
      title: '预测站点',
      dataIndex: 'target_site',
      key: 'target_site',
      render: (text: string) => (
        <div style={{ minWidth: 240  }}>
          {text}
        </div>
      ),
    },
    {
      title: '输入站点',
      dataIndex: 'input_site',
      key: 'input_site',
      render: (input_site: string[] | string) => {
        if (Array.isArray(input_site)) {
          if (input_site.length <= 3) {
            return input_site.join('、');
          }
          // 超过3个，显示前3个，剩余用省略号，hover显示全部
          const display = input_site.slice(0, 3).join('、') + '...';
          return (
            <span
              title={undefined}
              style={{ cursor: 'pointer', color: '#1677ff' }}
              onMouseEnter={e => {
                // 创建自定义大号气泡
                const tooltip = document.createElement('div');
                tooltip.innerText = input_site.join('、');
                tooltip.style.position = 'fixed';
                tooltip.style.zIndex = '9999';
                tooltip.style.background = '#fff';
                tooltip.style.color = '#333';
                tooltip.style.border = '1px solid #ddd';
                tooltip.style.borderRadius = '6px';
                tooltip.style.padding = '16px 24px';
                tooltip.style.fontSize = '16px';
                tooltip.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                tooltip.style.maxWidth = '80vw';
                tooltip.style.wordBreak = 'break-all';
                tooltip.style.pointerEvents = 'none';
                tooltip.className = 'custom-big-tooltip';
                // 定位到鼠标下方
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = rect.bottom + 8 + 'px';
                document.body.appendChild(tooltip);
              }}
              onMouseLeave={() => {
                document.querySelectorAll('.custom-big-tooltip').forEach(el => el.remove());
              }}
            >
              {display}
            </span>
          );
        }
        return input_site || '-';
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => {
        // 成功时展示推理结果文件列表及按钮，否则无操作
        if (record.status === 'success') {
          // 展示文件名用 reasoning_path_list_show（优先），下载用 reasoning_path_list 的原始路径
          const showList = Array.isArray(record.reasoning_path_list_show) && record.reasoning_path_list_show.length > 0
            ? record.reasoning_path_list_show
            : (Array.isArray(record.reasoning_path_list) ? record.reasoning_path_list : (record.reasoning_path_list ? record.reasoning_path_list.split(',') : []));
          const downloadList = Array.isArray(record.reasoning_path_list) ? record.reasoning_path_list : (record.reasoning_path_list ? record.reasoning_path_list.split(',') : []);
          const maxShow = 4;
          if (!record._showAllFiles) record._showAllFiles = false;
          const showFiles = record._showAllFiles ? showList : showList.slice(0, maxShow);
          const toggleShow = () => {
            record._showAllFiles = !record._showAllFiles;
            setTaskList(list => [...list]);
          };
          return (
            <div>
              {showFiles.map((showFile: string, idx: number) => {
                // 展示名可能带有 -xxx 后缀，下载路径用原始 downloadList
                // 下载路径取 downloadList[idx]，如果越界则用最后一个
                const downloadPath = downloadList[idx] || downloadList[downloadList.length - 1] || showFile;
                // 下载文件名直接取 downloadPath 的最后一段（真实文件名）
                const downloadFileName = downloadPath.split('/').pop() || 'result.csv';
                return (
                  <div key={showFile + idx} style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                    <span style={{ wordBreak: 'break-all', minWidth: 180 }}>{showFile.split('/').pop() || showFile}</span>
                    <span
                      style={{ marginLeft: 8, color: '#1677ff', cursor: 'pointer' }}
                      onClick={async () => {
                        try {
                          const response = await axios.post(
                            `${API_BASE_URL}/api/v1/fit/model/reasoning/download`,
                            { reasoning_path: downloadPath },
                            { responseType: 'blob' }
                          );
                          // 检查 blob 是否为错误 JSON
                          const text = await response.data.text();
                          let isError = false;
                          try {
                            const json = JSON.parse(text);
                            if (json && json.code === 400) {
                              alert('文件未找到，无法下载');
                              isError = true;
                            }
                          } catch {}
                          if (isError) return;
                          // 正常下载
                          const blob = new Blob([text]);
                          const downloadUrl = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = downloadUrl;
                          link.download = downloadFileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(downloadUrl);
                        } catch (e) {
                          message.error('下载失败');
                        }
                      }}
                    >
                      <svg style={{ verticalAlign: 'middle', marginRight: 2 }} width="16" height="16" viewBox="0 0 1024 1024" fill="currentColor"><path d="M512 64c247.4 0 448 200.6 448 448s-200.6 448-448 448S64 759.4 64 512 264.6 64 512 64zm0 64C300.3 128 128 300.3 128 512s172.3 384 384 384 384-172.3 384-384S723.7 128 512 128zm0 128a32 32 0 0132 32v256h96a32 32 0 0122.6 54.6l-128 128a32 32 0 01-45.2 0l-128-128A32 32 0 01384 544h96V288a32 32 0 0132-32z"/></svg>
                      下载结果
                    </span>
                    <span 
                      style={{ marginLeft: 24, color: '#1677ff', cursor: 'pointer' }} 
                      onClick={() => loadChartFromReasoning(downloadPath)}
                    >
                      <LineChartOutlined style={{ marginRight: 4 }} />
                      查看图表
                    </span>
                    <span 
                      style={{ 
                        marginLeft: 20, 
                        color: '#ff0000', 
                        cursor: 'pointer',
                        fontSize: 14
                      }} 
                      onClick={async () => {
                        try {
                          const response = await axios.post(`${API_BASE_URL}/api/v1/publish/fit/infer/data`, {
                            reasoning_id: record.reasoning_id,
                            files_path: [downloadPath],
                            infer_type:2,
                          });
                          if (response.data && response.data.code === 10000) {
                            alert('发布成功');
                          } else {
                            alert(response.data?.msg || '发布失败');
                          }
                        } catch (error) {
                          alert('发布请求失败');
                          console.error('发布请求失败:', error);
                        }
                      }}
                    >
                      发布
                    </span>
                  </div>
                );
              })}
              {showList.length > maxShow && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ color: '#1677ff', cursor: 'pointer', fontSize: 14 }} onClick={toggleShow}>
                    {record._showAllFiles ? '收起' : '展开'}
                  </span>
                </div>
              )}
            </div>
          );
        }
        if (record.status === 'failed') {
          return (
            <Button type="link" onClick={async () => {
              // 获取日志内容并弹窗
              setLogContent('');
              setLogModalVisible(true);
              try {
                if (record.log_path) {
                  const resp = await fetch(`${API_BASE_URL}/api/v1/fit/model/reasoning/log`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ log_path: record.log_path })
                  });
                  const result = await resp.json();
                  if (result.code === 10000 && Array.isArray(result.data)) {
                    setLogContent(result.data.join('\n'));
                  } else {
                    setLogContent('日志获取失败');
                  }
                } else {
                  setLogContent('未找到日志路径');
                }
              } catch (e) {
                setLogContent('日志获取失败');
              }
            }}>
              查看日志
            </Button>
          );
        }
        // 其他状态无操作
        return null;
      },
    },
  ];


  return (
    <ConfigProvider locale={zhCN}>
      <div className="data-fitting-container">
        <Card title="机理模型数据推理配置" className="form-card">
          <Form
            form={form}
            name="dataFittingForm"
            onFinish={handleSubmit}
            layout="vertical"
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="taskName"
                  label="任务名称"
                  rules={[{ required: true, message: '请输入任务名称' }]}
                >
                  <Input placeholder="请输入任务名称" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={18}>
                <Form.Item
                  name="modelName"
                  label="选择模型"
                  rules={[{ required: true, message: '请选择模型' }]}
                >
                  <Select
                    style={{ width: '100%' }}
                    placeholder="请选择模型"
                    value={form.getFieldValue('modelName')}
                    onChange={value => {
                      form.setFieldsValue({ modelName: value, targetSite: undefined, inputSite: undefined });
                      const model = modelOptions.find(opt => opt.model_name === value);
                      setSelectedModel(model);
                      setTargetSites(model?.target_site || []);
                      // 兼容 input_site 里既有 stcd 也有 station_id 的情况，全部转成 station_id 字段，并保留 stcd
                      setInputSites((model?.input_site || []).map(site => ({
                        name: site.name,
                        stcd: site.stcd,
                        station_id: site.station_id || site.stcd // 优先 station_id，没有就用 stcd
                      })));
                      setSelectedInputSites([]);
                    }}
                    options={modelOptions.map(opt => ({ label: opt.model_name, value: opt.model_name }))}
                    allowClear
                    // 添加以下三个属性实现搜索功能
                    showSearch
                    filterOption={(input, option) => {
                      // 检查选项的label是否包含输入值（不区分大小写）
                      return option?.label?.toLowerCase().includes(input.toLowerCase()) || false;
                    }}
                    optionFilterProp="label"
                  />
                </Form.Item>
              </Col>
            </Row>
            {selectedModel && (
              <>
                <Row gutter={16} style={{ marginBottom: 16, alignItems: 'flex-end', display: 'flex' }}>
                  <Col span={7}>
                    <Form.Item
                      name="publishStartTime"
                      label="发布时间段-开始时间"
                      rules={[{ required: true, message: '请选择开始时间' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        showTime={{ format: 'HH:mm:ss', defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
                        format="YYYY-MM-DD HH:mm:ss"
                        placeholder="请选择开始时间"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={7}>
                    <Form.Item
                      name="publishEndTime"
                      label="发布时间段-结束时间"
                      rules={[{ required: true, message: '请选择结束时间' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        showTime={{ format: 'HH:mm:ss', defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
                        format="YYYY-MM-DD HH:mm:ss"
                        placeholder="请选择结束时间"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Button
                      type="primary"
                      style={{ width: '100%' }}
                      loading={loadingGetData}
                      onClick={async () => {
                        setLoadingGetData(true);
                        const stationIds = selectedModel?.station_id || '';
                        const startTime = form.getFieldValue('publishStartTime');
                        const endTime = form.getFieldValue('publishEndTime');
                        if (!stationIds || !startTime || !endTime) {
                          alert('请先选择模型和时间段');
                          setLoadingGetData(false);
                          return;
                        }
                        try {
                          const resp = await fetch(`${API_BASE_URL}/api/v1/fit/station/forecastc/f`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              start_time: dayjs(startTime).format('YYYY-MM-DD HH:mm:ss'),
                              end_time: dayjs(endTime).format('YYYY-MM-DD HH:mm:ss'),
                              station_ids: stationIds,
                            }),
                          });
                          const result = await resp.json();
                          if (result.code === 10000 && result.data && result.data.list) {
                            // 组装各站点的发布时间数组，保证为 [{iymdh, stcd?: string, unitname?: string}]} 格式
                            const options: Record<string, {iymdh: string, stcd?: string, unitname?: string}[]> = {};
                            Object.entries(result.data.list).forEach(([stcd, arr]: [string, any]) => {
                              options[stcd] = Array.isArray(arr)
                                ? arr.map((d: any) => ({
                                    iymdh: d.iymdh,
                                    stcd: d.stcd || stcd,
                                    unitname: d.unitname || d.name || '',
                                    comments: d.comments || '',
                                    fymdh: d.fymdh || '',
                                    plcd: d.plcd || ''
                                  })).filter(d => d.iymdh)
                                : [];
                            });
                            setPublishTimeOptions(options);
                            setShowNCControls(true);
                            setSelectedInputSites([]); // 清空所有选择发布时间
                            alert('获取数据成功');
                          } else {
                            setPublishTimeOptions({});
                            setSelectedInputSites([]); // 清空所有选择发布时间
                            alert(result.msg || '获取数据失败');
                          }
                        } catch (e) {
                          setPublishTimeOptions({});
                          setSelectedInputSites([]); // 清空所有选择发布时间
                          message.error('请求失败');
                        } finally {
                          setLoadingGetData(false);
                        }
                      }}
                    >
                      获取数据
                    </Button>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="targetSite"
                      label="预测站点"
                      rules={[{ required: true, message: '请选择预测站点' }]}
                    >
                      <Select
                        placeholder="请选择预测站点"
                        options={targetSites.map(site => ({
                          label: site.stcd ? `${site.name}-${site.stcd}` : site.name,
                          value: site.name
                        }))}
                        allowClear
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginBottom: 12 }} align="middle">
                  <Col span={24}>
                    {/* 直接展示所有输入站点，每个站点一行，输入站点和选择发布时间同一行 */}
                    {inputSites.map(site => (
                      <Row gutter={16} key={site.name} style={{ marginBottom: 16 }}>
                        <Col span={8}>
                          <Form.Item label="输入站点" style={{ marginBottom: 0 }}>
                            <Input
                              value={site.stcd ? `${site.name}-${site.stcd}` : site.name}
                              disabled
                              style={{ background: '#fafafa', color: '#888' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="选择发布时间(隔一小时的发布数据源)"
                            required
                            rules={[{ required: true, message: '请选择发布时间' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Select
                              placeholder="请选择发布时间"
                              value={
                                selectedInputSites.find(sel => sel.site === site.name)?.publishTime
                              }
                              onChange={val => {
                                // 更新选中发布时间
                                const exists = selectedInputSites.find(sel => sel.site === site.name);
                                if (exists) {
                                  setSelectedInputSites(selectedInputSites.map(sel =>
                                    sel.site === site.name ? { ...sel, publishTime: val } : sel
                                  ));
                                } else {
                                  setSelectedInputSites([...selectedInputSites, { site: site.name, publishTime: val }]);
                                }
                              }}
                              options={(() => {
                                const stationId = site.station_id;
                                if (stationId && publishTimeOptions[stationId]) {
                                  return publishTimeOptions[stationId].map((d: any) => {
                                    if (typeof d === 'string') {
                                      return { label: d, value: d };
                                    }
                                    const commentStr = d.comments ? `-${d.comments}` : '';
                                    const fullLabel = [d.iymdh, d.stcd, d.unitname].filter(Boolean).join('-') + commentStr;
                                    return { label: fullLabel, value: d.iymdh };
                                  });
                                }
                                return [];
                              })()}
                              showSearch
                              filterOption={(input, option) => (option?.label ?? '').toString().includes(input)}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    ))}
                  </Col>
                </Row>
              </>
            )}
            {showNCControls && (
              <>
                <Row>
                  <Col span={24}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                      {/* 新增：预报依据时间、预热期、预见期（样式与 DataInference 保持一致） */}
                      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
                        <span style={{
                          width: '140px',
                          textAlign: 'right',
                          marginRight: '10px',
                          color: '#666'
                        }}>预报依据时间：</span>
                        <ConfigProvider locale={zhCN}>
                          <DatePicker
                            showTime={{ format: 'HH:00:00', defaultValue: dayjs().minute(0).second(0) }}
                            format="YYYY-MM-DD HH:mm:ss"
                            value={basedTime}
                            onChange={(dt: any) => {
                              if (dt) setBasedTime(dt.minute ? dt.minute(0).second(0) : dt);
                            }}
                            style={{ width: 260, marginRight: 24 }}
                          />
                        </ConfigProvider>
                        
                        <span style={{
                          width: '100px',
                          textAlign: 'right',
                          marginRight: '10px',
                          color: '#666'
                        }}>预热期：</span>
                        <InputNumber
                          min={0}
                          value={warmupHours}
                          onChange={(v: number | null) => setWarmupHours(v ?? 0)}
                          style={{ width: 120 }}
                          placeholder="小时"
                        />小时

                        <span style={{
                          width: '100px',
                          textAlign: 'right',
                          marginRight: '10px',
                          color: '#666'
                        }}>预见期：</span>
                        <InputNumber
                          min={0}
                          value={seenHours}
                          onChange={(v: number | null) => setSeenHours(v ?? 0)}
                          style={{ width: 120 }}
                          placeholder="小时"
                        /> 小时
                      </div>

                      <Button
                        type="primary"
                        style={{ width: '100%', margin: '24px 0 24px 0' }}
                        loading={ncPolling}
                        onClick={async () => {
                          const taskName = form.getFieldValue('taskName');
                          if (!taskName) {
                            alert('请填写任务名称');
                            return;
                          }
                          // 检查所有输入站点是否都选择了发布时间
                          const missingPublish = inputSites.some(site => {
                            return !selectedInputSites.find(sel => sel.site === site.name && sel.publishTime);
                          });
                          if (missingPublish) {
                            alert('请为所有输入站点选择发布时间');
                            return;
                          }
                          // 组装 params
                          const params: any[] = [];
                          selectedInputSites.forEach(item => {
                            const siteObj = inputSites.find(s => s.name === item.site);
                            const stationId = siteObj?.station_id;
                            const publishArr = stationId ? publishTimeOptions[stationId] : [];
                            const publishData = publishArr?.find(d => d.iymdh === item.publishTime);
                            if (publishData) {
                              let comments = publishData.comments;
                              let fymdh = publishData.fymdh;
                              let plcd = publishData.plcd;
                              if (!comments || !fymdh || !plcd) {
                                const fallback = publishArr.find(d => d.iymdh === item.publishTime);
                                comments = comments || fallback?.comments || '';
                                fymdh = fymdh || fallback?.fymdh || '';
                                plcd = plcd || fallback?.plcd || '';
                              }
                              params.push({
                                iymdh: publishData.iymdh,
                                comments,
                                stcd: publishData.stcd || '',
                                unitname: publishData.unitname || '',
                                fymdh,
                                plcd
                              });
                            }
                          });
                          try {
                            setNCPolling(true);
                            setNCPreviewVisible(false);
                            setNCBatchId(null);
                            const dataId = selectedModel?.data_id || '';
                            const resp = await fetch(`${API_BASE_URL}/api/v1/fit/model/infer/data`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                data_id: dataId,
                                task_name: taskName,
                                // 新增：将预热期/预见期/预报依据时间一并提交给后端（后端接口需兼容）
                                period: warmupHours,
                                seen: seenHours,
                                based_time: basedTime ? (basedTime.format ? basedTime.format('YYYY-MM-DD HH:mm:ss') : basedTime) : undefined,
                                params
                              })
                            });
                            const result = await resp.json();
                            if (result.code === 10000 && result.data && result.data.batch_id) {
                              message.success('NC数据集构建任务已提交，正在轮询...');
                              setNCBatchId(result.data.batch_id);
                              // 轮询接口
                              let pollingCount = 0;
                              const maxPolling = 60; // 最多轮询60次（约5分钟）
                              const poll = async () => {
                                if (!result.data.batch_id) return;
                                try {
                                  const infoResp = await fetch(`${API_BASE_URL}/api/v1/fit/model/infer/info?data_id=${result.data.batch_id}`);
                                  const infoResult = await infoResp.json();
                                  if (infoResult.code === 10000 && infoResult.data) {
                                    const status = infoResult.data.status;
                                    const failedReason = infoResult.data.failed_reason || '未知原因';
                                    // 成功：结束轮询，标记可预览
                                    if (status === 'success') {
                                      setNCPolling(false);
                                      setNCPreviewVisible(true);
                                      setNCBatchId(infoResult.data.data_id);
                                      setNCFailed(false);
                                      setNCFailedReason(null);
                                      message.success('NC数据集构建成功，可预览数据集');
                                      return;
                                    }
                                    // 失败：结束轮询，标记失败并显示原因
                                    if (status === 'failed') {
                                      setNCPolling(false);
                                      setNCPreviewVisible(false);
                                      setNCFailed(true);
                                      setNCFailedReason(failedReason);
                                      message.error('NC数据集构建失败，请查看错误原因');
                                      return;
                                    }
                                    // running：继续轮询（下方会继续调度）
                                  }
                                } catch (e) {
                                  // 忽略异常，继续轮询
                                }
                                pollingCount++;
                                if (pollingCount < maxPolling) {
                                  setTimeout(poll, 5000);
                                } else {
                                  setNCPolling(false);
                                  message.error('NC数据集构建超时或失败');
                                }
                              };
                              poll();
                            } else {
                              setNCPolling(false);
                              alert(result.msg || 'NC数据集构建失败');
                            }
                          } catch (e) {
                            setNCPolling(false);
                            alert('请求失败');
                          }
                        }}
                      >
                        {ncPolling ? '正在构建NC数据集...' : '开始构建NC数据集'}
                      </Button>
                      {ncPreviewVisible && ncBatchId && (
                        <>
                          <Button style={{ margin: '0 0 16px 0' }} onClick={handlePreviewDataset}>
                            预览数据集
                          </Button>
                          <Form.Item style={{ marginTop: 0, marginBottom: 0 }}>
                            <Button type="primary" htmlType="submit">
                              开始推理
                            </Button>
                          </Form.Item>
                        </>
                      )}
                      {/* 若构建失败，显示带 tooltip 的小问号，hover 可查看失败原因 */}
                      {ncFailed && ncFailedReason && (
                        <div style={{ marginTop: 12 }}>
                          <Tooltip title={ncFailedReason}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: '#f5f5f5',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              justifyContent: 'center',
                              border: '1px solid #d9d9d9',
                              color: '#ff4d4f',
                              fontWeight: 700,
                              fontSize: 14,
                              cursor: 'pointer'
                            }}>
                              ?
                            </span>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>
              </>
            )}
            {/* 原来的开始推理按钮区域，需隐藏 */}
            {!showNCControls || !(ncPreviewVisible && ncBatchId) ? (
              <Form.Item style={{ marginTop: showNCControls ? 0 : 32 }}>
                {/* 隐藏按钮 */}
                <div style={{ display: 'none' }}>
                  <Button type="primary" htmlType="submit">
                    开始推理
                  </Button>
                </div>
              </Form.Item>
            ) : null}
          </Form>
        </Card>

        <Card title="机理模型数据推理列表" className="list-card">
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <Table
              columns={columns}
              dataSource={taskList}
              rowKey="id"
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                pageSizeOptions: [10, 20, 50, 100],
                showSizeChanger: true,
                showQuickJumper: false,
                onChange: (page, size) => {
                  setPage(page);
                  setPageSize(size);
                },
                showTotal: (total) => `共 ${total} 条`
              }}
              loading={loading}
              scroll={{ x: 3000 }}
            />
          </div>
        </Card>

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
        
        {/* Chart modal - 修改为根据文件名显示相应图表 */}
        <Modal
          title={`数据可视化图表 - ${currentFileName || ''}`}
          open={chartModalVisible}
          onCancel={() => {
            setChartModalVisible(false);
            setChartData(null);
            setCurrentFileName(null);
          }}
          footer={null}
          width={1600}
          bodyStyle={{
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '10px'
          }}
        >
          {chartLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>数据加载中...</div>
          ) : chartData && currentFileName ? (
            <div style={{
              backgroundColor: '#fff',
              padding: '16px',
              border: '1px solid #e8e8e8',
              borderRadius: '4px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
            }}>
              <div
                ref={chartDomRef}
                style={{ height: '600px', width: '100%' }}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>无法加载图表数据</div>
          )}
        </Modal>
        
        {/* 日志弹窗 */}
        <Modal
          title="任务日志"
          open={logModalVisible}
          onCancel={() => setLogModalVisible(false)}
          footer={null}
          width={1100}
        >
          <pre style={{ maxHeight: 500, overflow: 'auto', background: '#f5f5f5', color: '#333', padding: 16 }}>{logContent || '日志加载中...'}</pre>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default FitModelTrainDataInference;