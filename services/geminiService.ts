import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

type ImageInput = {
    href: string;
    mimeType: string;
};

export async function editImage(images: ImageInput[], prompt: string): Promise<{ newImageBase64: string | null; newImageMimeType: string | null; textResponse: string | null; }> {
  
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

  const textPart = { text: prompt };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [...imageParts, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let newImageBase64: string | null = null;
    let newImageMimeType: string | null = null;
    let textResponse: string | null = null;

    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData) {
          newImageBase64 = part.inlineData.data;
          newImageMimeType = part.inlineData.mimeType;
        } else if (part.text) {
          textResponse = part.text;
        }
      }
    }
    
    if (!newImageBase64) {
        // Fallback or error if no image is generated
        console.warn("API response did not contain an image part.", response);
        textResponse = textResponse || "The AI did not generate a new image. Please try a different prompt.";
    }

    return { newImageBase64, newImageMimeType, textResponse };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while contacting the Gemini API.");
  }
}