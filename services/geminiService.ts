// 后端API基础URL
const API_BASE_URL = 'http://localhost:3001/api';

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
    // 发送请求到后端API
    const response = await fetch(`${API_BASE_URL}/gemini/edit-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images, prompt, mask }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    // 解析响应数据
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
    // 发送请求到后端API
    const response = await fetch(`${API_BASE_URL}/gemini/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    // 解析响应数据
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
    console.error('Error generating image via backend API:', error);
    throw error;
  }
}