import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client. We expect VITE_GEMINI_API_KEY to be set in .env
// Note: Client-side usage of API keys is generally not recommended for production
// unless restricted by domain or using temporary access tokens.
const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
  if (!apiKey) {
    console.warn("No Gemini API key found. Please set VITE_GEMINI_API_KEY or save it in localStorage.");
  }
  return new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
};

export const syncPlayerWithGemini = async (playerData: { name: string; transfermarktUrl?: string; besoccerUrl?: string }) => {
  try {
    const ai = getClient();
    const prompt = `Actúa como un experto scouter de fútbol. Analiza al jugador ${playerData.name}. 
URL Transfermarkt: ${playerData.transfermarktUrl || 'N/A'}. 
Devuelve ÚNICAMENTE un JSON con la siguiente estructura: 
{ "age": 25, "weight": 75, "height": 180, "position": "Delantero", "currentClub": "Club", "nationality": "España", "marketValue": "1M €", "status": "Apto", "injury": "Ninguna", "rating": 7.5, "history": "Breve resumen", "careerClubs": [{"club": "Club", "seasons": "2023-2024", "matches": 10, "goals": 2, "assists": 1}] }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    if (response.text) {
      return JSON.parse(response.text);
    }
    return {};
  } catch (error) {
    console.error("Gemini Sync Error:", error);
    throw error;
  }
};

export const analyzePlayerWithGemini = async (contextData: any) => {
  try {
    const ai = getClient();
    const prompt = `Analiza los siguientes datos de rendimiento físico y táctico y devuelve un JSON con: 
{ "report": "Texto del informe", "metrics": [{"name": "Métrica", "score": 85}] }
Datos: ${JSON.stringify(contextData)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    if (response.text) {
      return JSON.parse(response.text);
    }
    return {};
  } catch (error) {
    console.error("Gemini Analyze Error:", error);
    throw error;
  }
};
