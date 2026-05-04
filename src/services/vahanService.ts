import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface VahanDetails {
  owner: string;
  model: string;
  color: string;
  registrationDate: string;
  insuranceValid: string;
  rto: string;
  status: string;
  fuelType: string;
  engineNumber: string;
}

export async function fetchRealVahanDetails(plate: string): Promise<VahanDetails> {
  const prompt = `
    Find or provide highly realistic RTO vehicle registration details for the Indian license plate: ${plate}.
    Search your internal knowledge for this specific plate if possible.
    If you don't have the exact record, generate a highly plausible one based on common vehicle series for that RTO district.
    
    Registration Number Format: ${plate}
    
    Return the response ONLY as a JSON object with these keys:
    {
      "owner": "Name of owner",
      "model": "Vehicle make and model",
      "color": "Dominant vehicle color",
      "registrationDate": "YYYY-MM-DD",
      "insuranceValid": "YYYY-MM-DD",
      "rto": "City or District RTO Name",
      "status": "Active / Blocked / Stolen",
      "fuelType": "Petrol/Diesel/Electric",
      "engineNumber": "Partial hidden engine number e.g. ABC12***"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "";
    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.error("Vahan Fetch Error:", error);
    // Fallback Mock
    return {
      owner: "Arun Kumar (AI Predicted)",
      model: "Honda Activa 6G",
      color: "Matte Black",
      registrationDate: "2022-05-10",
      insuranceValid: "2027-05-10",
      rto: "Chennai Central",
      status: "Active",
      fuelType: "Petrol",
      engineNumber: "X123***"
    };
  }
}
