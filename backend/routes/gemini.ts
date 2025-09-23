import express, { Router, Request, Response } from 'express';
import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';

const router: Router = express.Router();

// 初始化默认的GoogleGenAI客户端
const DEFAULT_API_KEY = process.env.GEMINI_API_KEY;
if (!DEFAULT_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

// 创建函数用于根据API密钥获取GoogleGenAI实例
function getGenAIClient(apiKey?: string) {
  return new GoogleGenAI({
    apiKey: apiKey || DEFAULT_API_KEY,
    // Node.js环境下会自动使用process.env中的代理配置
  });
}

type ImageInput = {
  href: string;
  mimeType: string;
};

/**
 * @route POST /api/gemini/edit-image
 * @description 编辑图像（支持蒙版和图像修改）
 */
router.post('/edit-image', async (req: Request, res: Response) => {
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

    // 从请求头获取用户自定义的API密钥（如果有）
    const customApiKey = req.headers['x-gemini-api-key'] as string;
    const aiClient = getGenAIClient(customApiKey);

    const response: GenerateContentResponse = await aiClient.models.generateContent({
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

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData) {
          newImageBase64 = part.inlineData.data || null;
          newImageMimeType = part.inlineData.mimeType || null;
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
    
    // 尝试解析Google API返回的详细错误信息
    let errorMessage = 'An unknown error occurred';
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
      else if (errorMessage.includes('API key not valid')) {
        errorMessage = 'Gemini API密钥无效，请检查您的密钥是否正确';
        errorCode = 400;
      }
    }
    
    res.status(errorCode).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  }
});

/**
 * @route POST /api/gemini/validate-key
 * @description 验证Gemini API密钥是否有效
 */
router.post('/validate-key', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || apiKey.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'API密钥不能为空'
      });
    }
    
    // 创建临时客户端用于验证密钥
    const tempClient = getGenAIClient(apiKey);
    
    // 使用Google Gemini API的generateContent端点进行密钥验证，这是一个轻量级的验证方法
  const result = await tempClient.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [{
        text: '你好'
      }]
    },
    config: {
      responseMimeType: 'text/plain',
      maxOutputTokens: 1
    }
  });
  
  return res.status(200).json({
    success: true,
    message: 'API密钥验证成功',
    details: result
  });
  } catch (error) {
    
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
 * @route POST /api/gemini/generate-image
 * @description 从文本生成图像
 */
router.post('/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    // 从请求头获取用户自定义的API密钥（如果有）
    const customApiKey = req.headers['x-gemini-api-key'] as string;
    const aiClient = getGenAIClient(customApiKey);

    const response = await aiClient.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const image = response.generatedImages[0];
      if (image.image && image.image.imageBytes) {
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
          textResponse: "The AI generated an image but it could not be processed."
        });
      }
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
    
    // 尝试解析Google API返回的详细错误信息
    let errorMessage = 'An unknown error occurred';
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
      else if (errorMessage.includes('API key not valid')) {
        errorMessage = 'Gemini API密钥无效，请检查您的密钥是否正确';
        errorCode = 400;
      }
    }
    
    res.status(errorCode).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  }
});

export default router;