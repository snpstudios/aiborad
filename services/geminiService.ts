import { GoogleGenAI, Modality, GenerateContentResponse, GenerateVideosOperation } from "@google/genai";

type ImageInput = {
    href: string;
    mimeType: string;
};

// 从localStorage获取用户自定义的Gemini API密钥
function getUserApiKey(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('geminiApiKey') || null;
  }
  return null;
}

// 构建请求头，包含API密钥（如果有）
function buildRequestHeaders(): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json'
  });
  
  const userApiKey = getUserApiKey();
  if (userApiKey) {
    headers.append('x-gemini-api-key', userApiKey);
  }
  
  return headers;
}

/**
 * 验证Gemini API密钥是否有效
 */
export async function validateApiKey(apiKey: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const response = await fetch('/api/gemini/validate-key', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({ apiKey })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error validating API key:", error);
    return {
      success: false,
      message: "验证失败，请检查网络连接或稍后再试"
    };
  }
}

export async function editImage(
  images: ImageInput[], 
  prompt: string,
  mask?: ImageInput
): Promise<{ newImageBase64: string | null; newImageMimeType: string | null; textResponse: string | null; }> {
  try {
    // 准备请求数据
    const requestBody = {
      images: images,
      prompt: prompt,
      mask: mask
    };
    
    // 调用后端API
    const response = await fetch('/api/gemini/edit-image', {
      method: 'POST',
      headers: buildRequestHeaders(),
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // 解析响应
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Image editing failed');
    }
    
    return {
      newImageBase64: data.newImageBase64,
      newImageMimeType: data.newImageMimeType,
      textResponse: data.textResponse
    };
  } catch (error) {
    console.error("Error calling backend API for image editing:", error);
    if (error instanceof Error) {
      throw new Error(`Backend API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while contacting the backend API.");
  }
}

export async function generateImageFromText(prompt: string): Promise<{ newImageBase64: string | null; newImageMimeType: string | null; textResponse: string | null; }> {
  try {
    // 准备请求数据
    const requestBody = {
      prompt: prompt
    };
    
    // 调用后端API
    const response = await fetch('/api/gemini/generate-image', {
      method: 'POST',
      headers: buildRequestHeaders(),
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // 解析响应
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Image generation failed');
    }
    
    return {
      newImageBase64: data.newImageBase64,
      newImageMimeType: data.newImageMimeType,
      textResponse: data.textResponse
    };
  } catch (error) {
    console.error("Error calling backend API for text-to-image generation:", error);
    if (error instanceof Error) {
      throw new Error(`Backend API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while contacting the backend API.");
  }
}

export async function generateVideo(
  prompt: string,
  aspectRatio: '16:9' | '9:16',
  onProgress: (message: string) => void,
  image?: ImageInput
): Promise<{ videoBlob: Blob; mimeType: string }> {
  try {
    onProgress('Initializing video generation...');
    
    // 准备请求数据
    const requestBody = {
      prompt: prompt,
      aspectRatio: aspectRatio,
      image: image
    };
    
    // 调用后端API
    const response = await fetch('/api/gemini/generate-video', {
      method: 'POST',
      headers: buildRequestHeaders(),
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
    }
    
    // 解析响应
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Video generation failed');
    }
    
    // 将base64视频数据转换为Blob
    const videoData = data.videoBytes;
    const byteCharacters = atob(videoData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const videoBlob = new Blob([byteArray], { type: data.mimeType || 'video/mp4' });
    
    return { videoBlob, mimeType: data.mimeType || 'video/mp4' };
  } catch (error) {
    console.error("Error calling backend API for video generation:", error);
    if (error instanceof Error) {
      throw new Error(`Backend API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while contacting the backend API.");
  }
}
