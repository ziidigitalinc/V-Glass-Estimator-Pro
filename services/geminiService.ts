
import { GoogleGenAI, Type } from "@google/genai";

const extractGlassSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      quantity: { type: Type.NUMBER },
      width: { type: Type.STRING, description: "Width string, potentially fractional" },
      height: { type: Type.STRING, description: "Height string, potentially fractional" },
      notes: { type: Type.STRING }
    },
    required: ["quantity", "width", "height"]
  }
};

export async function processImageToEstimate(base64Image) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          {
            text: "Extract glass dimensions and quantities from this image or sketch. Look for measurements like 27 5/8 x 79 5/8. If it's a hand-written note, be careful with numbers."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: extractGlassSchema,
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
}
