export interface ModelParams {
  id: string;
  name: string;
  model_id: string; // 添加这行
  type: 'topology' | 'timeSeries';  // 添加模型类型
  params: {
    learningRate: number;
    epochs: number;
    batchSize: number;
    [key: string]: any;
  };
}

export interface TaskDetail {
  id: number;
  task_id: string;
  data_id: string;
  data_name: string;
  model_id: string;
  model_name: string;
  model_params: string;
  status: string;
  data_type: number;
  train_path: string;
  failed_reason: string;
  created_at: string;
}

export interface TrainingTask {
  id: string;
  batchNo: string;
  dataset: string;
  modelName: string;
  parameters: Record<string, any>;
  status: 'running' | 'completed' | 'failed';
  createTime: string;
  rawData?: TaskDetail; // 添加这个可选属性
}
