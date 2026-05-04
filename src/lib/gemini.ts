import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface DetectionResult {
  vehicleType: string;
  plateNumber: string;
  color: string;
  confidence: number;
  description: string;
}

export async function analyzeVehicleFrame(base64Image: string): Promise<DetectionResult | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [
        {
          parts: [
            { text: "Analyze this surveillance frame. Identify the prominent vehicle. Return a JSON object with: { 'vehicleType': 'car|bike|truck', 'plateNumber': 'string or UNKNOWN', 'color': 'string', 'confidence': 0-1, 'description': 'short visual summary for Re-ID' }" },
            { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] || base64Image } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}") as DetectionResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
}
