import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ⚠️ 请在实际使用时将这些配置移至环境变量或配置文件中
// 注意：在前端直接暴露 Access Key 和 Secret Key 存在安全风险
// 生产环境建议通过后端获取预签名 URL (Presigned URL) 进行上传，或通过后端代理上传
const MINIO_CONFIG = {
  endpoint: "http://localhost:9000", // 请替换为您的 MinIO 服务地址
  region: "us-east-1", // MinIO 默认 region
  credentials: {
    accessKeyId: "minioadmin", // 请替换为您的 Access Key
    secretAccessKey: "minioadmin", // 请替换为您的 Secret Key
  },
  bucketName: "crm-images", // 请替换为您的存储桶名称
};

export const uploadImageToMinio = async (blob: Blob, filename: string): Promise<string> => {
  const client = new S3Client({
    endpoint: MINIO_CONFIG.endpoint,
    region: MINIO_CONFIG.region,
    credentials: MINIO_CONFIG.credentials,
    forcePathStyle: true, // MinIO 需要此配置
  });

  const command = new PutObjectCommand({
    Bucket: MINIO_CONFIG.bucketName,
    Key: filename,
    Body: blob,
    ContentType: blob.type || 'image/jpeg',
    ACL: 'public-read', // 如果桶策略允许公开访问，可以设置 ACL，MinIO 可能需要配置
  });

  try {
    await client.send(command);
    // 返回文件的访问 URL
    // 注意：如果 MinIO 配置了自定义域名或 CDN，这里需要相应调整
    return `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${filename}`;
  } catch (error) {
    console.error("MinIO Upload failed:", error);
    throw error;
  }
};
