# Gemini API 后端服务集成指南

本指南介绍如何将应用程序中的 Gemini API 调用从前端移至后端服务，以提高安全性并更好地控制 API 请求。

## 后端服务结构

```
/backend
  /routes
    gemini.ts       # Gemini API 路由处理
  server.ts         # Express 服务器主文件
  tsconfig.json     # TypeScript 配置
```

## 配置步骤

1. **设置 API 密钥**
   在项目根目录创建 `.env` 文件，添加你的 Gemini API 密钥：
   ```
   GEMINI_API_KEY=你的_API密钥
   PORT=3001
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动服务**
   - 同时启动前端和后端服务：
     ```bash
     npm run dev:all
     ```
   - 仅启动后端服务：
     ```bash
     npm run server
     ```

## API 端点

后端服务提供了以下 API 端点：

### 1. 图像编辑
- **URL**: `/api/gemini/edit-image`
- **方法**: POST
- **请求体**: 
  ```json
  {
    "images": [
      {
        "href": "data:image/png;base64,图像数据",
        "mimeType": "image/png"
      }
    ],
    "prompt": "编辑提示",
    "mask": {
      "href": "data:image/png;base64,蒙版数据",
      "mimeType": "image/png"
    } (可选)
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "newImageBase64": "生成的图像数据",
    "newImageMimeType": "image/png",
    "textResponse": "AI 生成的文本描述 (如果有)"
  }
  ```

### 2. 文本生成图像
- **URL**: `/api/gemini/generate-image`
- **方法**: POST
- **请求体**: 
  ```json
  {
    "prompt": "图像生成提示"
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "newImageBase64": "生成的图像数据",
    "newImageMimeType": "image/png",
    "textResponse": null
  }
  ```

## 安全性说明

1. 后端服务将 API 密钥存储在 `.env` 文件中，而不是暴露在前端代码中
2. 所有 API 请求都通过后端服务进行转发，前端只与本地后端服务通信
3. 请确保 `.env` 文件已添加到 `.gitignore` 中，不要将其提交到版本控制系统

## 健康检查

可以通过访问以下 URL 检查后端服务是否正常运行：
```
http://localhost:3001/api/health
```

## 代理配置

如果需要通过代理访问外部 API，可以在服务器环境中设置 `HTTP_PROXY` 和 `HTTPS_PROXY` 环境变量，Node.js 会自动使用这些配置。