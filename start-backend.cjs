// 简单的后端启动脚本
// 这个脚本使用CommonJS模块系统，避免ES模块的加载问题

// 动态加载dotenv来读取环境变量
require('dotenv').config();

// 导入必要的模块
const express = require('express');
const cors = require('cors');
const { GoogleGenAI, Modality } = require('@google/genai');

// 创建Express应用
const app = express();
const port = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 初始化GoogleGenAI客户端
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is not set');
  console.error('Please create a .env file with your Gemini API key');
  process.exit(1);
}

// 检查是否有代理设置
let clientOptions = {
  apiKey: API_KEY,
};

// 如果设置了代理环境变量，配置代理
if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  console.log(`Using proxy: ${proxyUrl}`);
  
  // 设置全局代理环境变量，确保所有HTTP请求都使用代理
  process.env.HTTP_PROXY = proxyUrl;
  process.env.HTTPS_PROXY = proxyUrl;
  
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
  
  clientOptions = {
    ...clientOptions,
    apiKey: API_KEY,
    fetchOptions: {
      agent: proxyAgent
    }
  };
}

const ai = new GoogleGenAI(clientOptions);

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

/**
 * 编辑图像（支持蒙版和图像修改）
 */
app.post('/api/gemini/edit-image', async (req, res) => {
  try {
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
    const { prompt } = req.body;

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

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