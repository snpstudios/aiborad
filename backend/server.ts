import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { Router } from 'express';

// 加载环境变量
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增加请求体大小限制，以处理图像数据
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 健康检查路由
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// 直接在server.ts中实现Gemini API路由
const geminiRouter: Router = Router();

// 初始化GoogleGenAI客户端
const { GoogleGenAI, Modality } = require('@google/genai');
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const ai = new GoogleGenAI({
  apiKey: API_KEY,
});

type ImageInput = {
  href: string;
  mimeType: string;
};

/**
 * @route POST /api/gemini/edit-image
 * @description 编辑图像（支持蒙版和图像修改）
 */
geminiRouter.post('/edit-image', async (req: Request, res: Response) => {
  try {
    const { images, prompt, mask } = req.body;

    if (!images || !images.length || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: images and prompt are required'
      });
    }

    const imageParts = images.map((image: ImageInput) => {
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

    let newImageBase64: string | null = null;
    let newImageMimeType: string | null = null;
    let textResponse: string | null = null;

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
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

/**
 * @route POST /api/gemini/generate-image
 * @description 从文本生成图像
 */
geminiRouter.post('/generate-image', async (req: Request, res: Response) => {
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

// 应用Gemini API路由
app.use('/api/gemini', geminiRouter);

// 错误处理中间件
app.use((err: any, req: Request, res: Response, next: any) => {
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
});