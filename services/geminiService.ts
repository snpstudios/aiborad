// 后端API基础URL
export const API_BASE_URL = 'http://localhost:3001/api';

interface ImageInput {
  href: string;
  mimeType: string;
}

/**
 * 编辑图像（通过后端API）
 */
export async function editImage(
  images: ImageInput[],
  prompt: string,
  mask?: ImageInput
): Promise<{
  newImageBase64: string | null;
  newImageMimeType: string | null;
  textResponse: string | null;
}> {
  try {
    // 检查是否有用户自定义的Gemini API密钥
    const customGeminiKey = localStorage.getItem('geminiApiKey');
    
    // 发送请求到后端API
    const response = await fetch(`${API_BASE_URL}/gemini/edit-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(customGeminiKey && { 'X-Gemini-API-Key': customGeminiKey }),
      },
      body: JSON.stringify({ images, prompt, mask }),
    });

    // 解析响应数据，添加错误处理以防止非JSON响应
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // 处理非JSON响应（如HTML错误页面）
      const errorMessage = '服务器返回了无效的响应格式，请检查后端服务是否正常运行';
      alert(errorMessage);
      throw new Error(errorMessage);
    }

    if (!response.ok || !data.success) {
      // 显示更友好的错误信息给用户
      const errorMessage = data.error || '图像编辑失败';
      alert(errorMessage);
      throw new Error(errorMessage);
    }

    return {
      newImageBase64: data.newImageBase64,
      newImageMimeType: data.newImageMimeType,
      textResponse: data.textResponse
    };
  } catch (error) {
    console.error('Error editing image via backend API:', error);
    throw error;
  }
}

/**
 * 从文本生成图像（通过后端API）
 */
export async function generateImageFromText(
  prompt: string
): Promise<{
  newImageBase64: string | null;
  newImageMimeType: string | null;
  textResponse: string | null;
}> {
  try {
    // 检查是否有用户自定义的Gemini API密钥
    const customGeminiKey = localStorage.getItem('geminiApiKey');
    
    // 发送请求到后端API
    const response = await fetch(`${API_BASE_URL}/gemini/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(customGeminiKey && { 'X-Gemini-API-Key': customGeminiKey }),
      },
      body: JSON.stringify({ prompt }),
    });

    // 解析响应数据，添加错误处理以防止非JSON响应
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // 处理非JSON响应（如HTML错误页面）
      const errorMessage = '服务器返回了无效的响应格式，请检查后端服务是否正常运行';
      alert(errorMessage);
      throw new Error(errorMessage);
    }

    if (!response.ok || !data.success) {
      // 显示更友好的错误信息给用户
      const errorMessage = data.error || '图像生成失败';
      alert(errorMessage);
      throw new Error(errorMessage);
    }

    return {
      newImageBase64: data.newImageBase64,
      newImageMimeType: data.newImageMimeType,
      textResponse: data.textResponse
    };
  } catch (error) {
    console.error('Error generating image via backend API:', error);
    throw error;
  }
}