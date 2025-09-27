# 开发计划：AIBoard 新版功能增强

## 项目概述
需要在AIBoard新版(非V2版本)上实现以下功能：
1. 将API调用移至后端服务(start-backend.cjs)
2. 增加自定义Gemini API密钥支持
3. 增加本地代理配置功能

## 开发步骤

### 第一步：准备后端环境和依赖

1. **创建后端文件结构**
   - 创建 `start-backend.cjs` 文件
   - 创建 `.env.example` 文件指导用户配置环境变量

2. **更新 package.json**
   - 添加后端依赖: express, cors, dotenv, @google/genai, undici, https-proxy-agent
   - 添加后端启动脚本

3. **配置 .gitignore**
   - 确保 .env 文件不被提交到版本控制系统

### 第二步：实现后端API服务

1. **创建 Express 服务器**
   - 配置基本中间件：cors, json解析
   - 设置端口和基本路由

2. **实现代理配置**
   - 支持多种代理环境变量检测
   - 配置 undici 全局代理
   - 为 GoogleGenAI 客户端配置代理

3. **实现API端点**
   - `/api/health` - 健康检查
   - `/api/gemini/validate-key` - 验证API密钥有效性
   - `/api/gemini/edit-image` - 图像编辑功能
   - `/api/gemini/generate-image` - 文本生成图像功能
   - `/api/gemini/generate-video` - 视频生成功能(新版特有)

4. **添加自定义API密钥支持**
   - 实现根据请求头获取API密钥的功能
   - 支持服务器默认密钥和用户自定义密钥
   - 添加密钥验证逻辑

### 第三步：更新前端服务调用

1. **修改 services/geminiService.ts**
   - 将直接API调用改为调用本地后端服务
   - 实现从localStorage读取自定义密钥的功能
   - 在请求头中添加X-Gemini-API-Key

2. **更新 App.tsx 中的调用逻辑**
   - 确保所有图像和视频生成功能都使用更新后的服务
   - 添加错误处理和加载状态

3. **配置 Vite 代理**
   - 更新 vite.config.ts 添加代理配置
   - 确保前端请求正确转发到后端

### 第四步：添加配置文件和文档

1. **创建 README_BACKEND.md**
   - 提供后端服务使用指南
   - 解释API端点和参数
   - 说明代理配置方法

2. **创建/更新相关配置文件**
   - 完善 .env.example 文件
   - 确保配置项说明清晰

## 注意事项
1. 确保不修改V2目录下的任何文件
2. 保持API调用的兼容性，确保前端功能正常运行
3. 实现适当的错误处理和用户反馈
4. 确保代码风格与项目现有代码一致

## 预期完成时间
预计需要2-3小时完成所有功能实现和测试。