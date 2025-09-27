// 简单的后端启动脚本
// 这个脚本使用CommonJS模块系统，避免ES模块的加载问题

// 动态加载dotenv来读取环境变量
require('dotenv').config();

// 导入必要的模块
const express = require('express');
const cors = require('cors');
const { GoogleGenAI, Modality } = require('@google/genai');
const { ProxyAgent, setGlobalDispatcher } = require('undici');

// --- 核心代理设置 (参考 testproxy) ---
const PROXY_URL = process.env.HTTPS_PROXY
  || process.env.HTTP_PROXY
  || process.env.ALL_PROXY
  || process.env.https_proxy
  || process.env.http_proxy
  || process.env.all_proxy;

if (PROXY_URL) {
  console.log(`[代理配置] 检测到代理URL: ${PROXY_URL}`);
  const proxyAgent = new ProxyAgent(PROXY_URL);
  setGlobalDispatcher(proxyAgent);
  console.log('[代理配置] undici 全局代理已成功设置。');
} else {
  console.log('[代理配置] 未检测到代理环境变量，将直接连接。');
}
// ---

// 创建Express应用
const app = express();
const port = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 服务器的默认Gemini API密钥
const SERVER_API_KEY = process.env.GEMINI_API_KEY;

if (!SERVER_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is not set');
  console.error('Please create a .env file with your Gemini API key');
  process.exit(1);
}

// 检查是否有代理设置
let defaultClientOptions = {
  apiKey: SERVER_API_KEY,
};

// 为用户自定义API密钥创建基本客户端选项
let userClientBaseOptions = {
  apiKey: '', // 将在请求时动态设置
};

// 如果设置了代理环境变量，配置代理
if (process.env.http_proxy || process.env.https_proxy) {
  const proxyUrl = process.env.https_proxy || process.env.http_proxy;
  console.log(`Using proxy: ${proxyUrl}`);
  
  // 设置全局代理环境变量，确保所有HTTP请求都使用代理
  process.env.http_proxy = proxyUrl;
  process.env.https_proxy = proxyUrl;
  
  // 为GoogleGenAI客户端配置代理
  // 使用http-proxy-agent包，这是一个更简单的替代方案
  const { Agent } = require('https');
  const url = require('url');
  
  // 解析代理URL
  const proxyUrlObj = url.parse(proxyUrl);
  
  // 创建自定义代理Agent
  const proxyAgent = new Agent({
    host: proxyUrlObj.hostname,
    port: proxyUrlObj.port
  });
  
  defaultClientOptions = {
    ...defaultClientOptions,
    fetchOptions: {
      agent: proxyAgent
    }
  };
  
  userClientBaseOptions = {
    ...userClientBaseOptions,
    fetchOptions: {
      agent: proxyAgent
    }
  };
}

// 默认客户端 - 使用服务器API密钥
const defaultAI = new GoogleGenAI(defaultClientOptions);

// 创建一个函数来根据请求头获取合适的AI客户端
function getAIClientFromRequest(req) {
  // 检查请求头中是否有用户自定义的API密钥
  const userApiKey = req.headers['x-gemini-api-key'];
  
  if (userApiKey && typeof userApiKey === 'string') {
    // 如果有用户自定义密钥，创建一个新的客户端实例
    const userClientOptions = {
      ...userClientBaseOptions,
      apiKey: userApiKey
    };
    return new GoogleGenAI(userClientOptions);
  } else {
    // 否则使用默认客户端
    return defaultAI;
  }
}

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
})

/**
 * 验证Gemini API密钥是否有效
 */
app.post('/api/gemini/validate-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || apiKey.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'API密钥不能为空'
      });
    }
    
    // 创建临时客户端用于验证密钥
    let tempClientOptions = {
      apiKey: apiKey
    };
    
    // 如果配置了代理，也应用到临时客户端
    if (process.env.http_proxy || process.env.https_proxy) {
      tempClientOptions = {
        ...tempClientOptions,
        fetchOptions: defaultClientOptions.fetchOptions
      };
    }
    
    const tempClient = new GoogleGenAI(tempClientOptions);
    
    // 使用Google Gemini API的countTokens端点进行密钥验证，这是一个轻量级的验证方法
    // 使用与edit-image端点相同的模型以确保兼容性
    const result = await tempClient.models.countTokens({
      model: 'gemini-2.5-flash-image-preview',
      contents: [{
        parts: [{
          text: '你好'
        }]
      }]
    });
    
    
    
    return res.status(200).json({
      success: true,
      message: 'API密钥验证成功',
      details: result
    });
  } catch (error) {
    // 打印完整的错误信息到终端以便调试
    console.error('Error validating API key:', JSON.stringify(error, null, 2));
    
    let errorMessage = 'API密钥验证失败';
    let errorDetails = null;
    let errorCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // 尝试解析JSON格式的错误信息
      if (errorMessage.startsWith('{')) {
        try {
          const parsedError = JSON.parse(errorMessage);
          if (parsedError.error) {
            errorMessage = parsedError.error.message || errorMessage;
            errorDetails = parsedError.error.details;
            errorCode = parsedError.error.code || 500;
          }
        } catch (parseError) {
          // 如果解析失败，使用原始错误消息
        }
      }
      
      // 特别处理API密钥无效的情况
      if (errorMessage.includes('API key not valid') || errorMessage.includes('401')) {
        errorMessage = 'Gemini API密钥无效，请检查您的密钥是否正确';
        errorCode = 400;
      }
      // 处理其他常见错误
      else if (errorMessage.includes('400')) {
        errorCode = 400;
      }
      else if (errorMessage.includes('403')) {
        errorMessage = 'Gemini API访问被拒绝，请检查您的密钥权限';
        errorCode = 403;
      }
      else if (errorMessage.includes('429')) {
        errorMessage = 'API请求过于频繁，请稍后再试';
        errorCode = 429;
      }
    }
    
    return res.status(errorCode).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  }
});

/**
 * 编辑图像（支持蒙版和图像修改）
 */
app.post('/api/gemini/edit-image', async (req, res) => {
  try {
    // 检查当前日期是否在2025年12月20日之后
    const currentDate = new Date();
    const deadlineDate = new Date('2025-12-20T00:00:00.000Z');
    
    if (currentDate >= deadlineDate) {
      // 检查是否有用户自定义的API密钥
      const userApiKey = req.headers['x-gemini-api-key'];
      if (!userApiKey || typeof userApiKey !== 'string' || userApiKey.trim() === '') {
        return res.status(400).json({
          success: false,
          error: '从2025年12月20日开始，使用图片编辑功能需要提供自定义的Gemini API密钥。请在设置中添加您的API密钥。'
        });
      }
    }

    const { images, prompt, mask } = req.body;

    if (!images || !images.length || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: images and prompt are required'
      });
    }

    const imageParts = images.map(image => {
      const dataUrlParts = image.href.split(',');
      const base64Data = dataUrlParts.length > 1 ? dataUrlParts[1] : dataUrlParts[0];
      return {
        inlineData: {
          data: base64Data,
          mimeType: image.mimeType,
        },
      };
    });

    const maskPart = mask ? {
      inlineData: {
        data: mask.href.split(',')[1],
        mimeType: mask.mimeType,
      },
    } : null;

    const textPart = { text: prompt };

    // 组装请求内容
    const parts = maskPart
      ? [textPart, ...imageParts, maskPart]
      : [...imageParts, textPart];

    // 获取适合的AI客户端（根据请求头决定是否使用用户自定义API密钥）
    const ai = getAIClientFromRequest(req);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: parts,
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let newImageBase64 = null;
    let newImageMimeType = null;
    let textResponse = null;

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData) {
          newImageBase64 = part.inlineData.data;
          newImageMimeType = part.inlineData.mimeType;
        } else if (part.text) {
          textResponse = part.text;
        }
      }
    } else {
        textResponse = "The AI response was blocked or did not contain content.";
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].finishReason) {
            textResponse += ` (Reason: ${response.candidates[0].finishReason})`;
        }
    }

    return res.status(200).json({
      success: true,
      newImageBase64,
      newImageMimeType,
      textResponse
    });
  } catch (error) {
    console.error('Error in edit-image endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An unknown error occurred'
    });
  }
});

/**
 * 从文本生成图像
 */
app.post('/api/gemini/generate-image', async (req, res) => {
  try {
    // 检查当前日期是否在2025年12月20日之后
    const currentDate = new Date();
    const deadlineDate = new Date('2025-12-20T00:00:00.000Z');
    
    if (currentDate >= deadlineDate) {
      // 检查是否有用户自定义的API密钥
      const userApiKey = req.headers['x-gemini-api-key'];
      if (!userApiKey || typeof userApiKey !== 'string' || userApiKey.trim() === '') {
        return res.status(400).json({
          success: false,
          error: '从2025年12月20日开始，使用图片生成功能需要提供自定义的Gemini API密钥。请在设置中添加您的API密钥。'
        });
      }
    }

    const { prompt } = req.body;

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    // 获取适合的AI客户端（根据请求头决定是否使用用户自定义API密钥）
    const ai = getAIClientFromRequest(req);

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const image = response.generatedImages[0];
      return res.status(200).json({
        success: true,
        newImageBase64: image.image.imageBytes,
        newImageMimeType: 'image/png',
        textResponse: null
      });
    } else {
      return res.status(200).json({
        success: false,
        newImageBase64: null,
        newImageMimeType: null,
        textResponse: "The AI did not generate an image. Please try a different prompt."
      });
    }
  } catch (error) {
    console.error('Error in generate-image endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An unknown error occurred'
    });
  }
});

/**
 * 从文本或图像生成视频
 */
app.post('/api/gemini/generate-video', async (req, res) => {
  try {
    // 检查当前日期是否在2025年12月20日之后
    const currentDate = new Date();
    const deadlineDate = new Date('2025-12-20T00:00:00.000Z');
    
    if (currentDate >= deadlineDate) {
      // 检查是否有用户自定义的API密钥
      const userApiKey = req.headers['x-gemini-api-key'];
      if (!userApiKey || typeof userApiKey !== 'string' || userApiKey.trim() === '') {
        return res.status(400).json({
          success: false,
          error: '从2025年12月20日开始，使用视频生成功能需要提供自定义的Gemini API密钥。请在设置中添加您的API密钥。'
        });
      }
    }

    const { prompt, aspectRatio, image } = req.body;

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    if (!aspectRatio || !['16:9', '9:16'].includes(aspectRatio)) {
      return res.status(400).json({
        success: false,
        error: 'Valid aspectRatio is required (16:9 or 9:16)'
      });
    }

    // 获取适合的AI客户端（根据请求头决定是否使用用户自定义API密钥）
    const ai = getAIClientFromRequest(req);

    // 准备图像参数（如果提供）
    const imagePart = image ? {
      imageBytes: image.href.split(',')[1],
      mimeType: image.mimeType,
    } : undefined;

    // 生成视频
    let operation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt: prompt,
      image: imagePart,
      config: {
        numberOfVideos: 1,
        aspectRatio: aspectRatio,
      }
    });

    // 轮询操作状态，直到完成
    let completedOperation = await operation.wait();

    if (completedOperation.generatedVideos && completedOperation.generatedVideos.length > 0) {
      const video = completedOperation.generatedVideos[0];
      return res.status(200).json({
        success: true,
        videoBytes: video.video.videoBytes,
        mimeType: 'video/mp4'
      });
    } else {
      return res.status(200).json({
        success: false,
        videoBytes: null,
        mimeType: null,
        textResponse: "The AI did not generate a video. Please try a different prompt."
      });
    }
  } catch (error) {
    console.error('Error in generate-video endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An unknown error occurred'
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  console.log(`API endpoints available at http://localhost:${port}/api`);
  console.log('Make sure you have set your GEMINI_API_KEY in the .env file');
});