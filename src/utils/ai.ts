import { GoogleGenAI, GenerateContentParameters } from '@google/genai';

// Get all available API keys from environment variables
const getApiKeys = (): string[] => {
  const keys: string[] = [];
  
  // Check for comma-separated keys
  const keysString = (import.meta as any).env.VITE_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS;
  if (keysString) {
    keys.push(...keysString.split(',').map((k: string) => k.trim()).filter(Boolean));
  }

  // Check for single key
  const singleKey = (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (singleKey && !keys.includes(singleKey)) {
    keys.push(singleKey);
  }

  // Check for numbered keys (e.g., VITE_GEMINI_API_KEY_1, VITE_GEMINI_API_KEY_2)
  for (let i = 1; i <= 10; i++) {
    const key = (import.meta as any).env[`VITE_GEMINI_API_KEY_${i}`] || process.env[`GEMINI_API_KEY_${i}`];
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  }

  return keys;
};

let currentKeyIndex = 0;

export const generateContentWithFallback = async (params: GenerateContentParameters) => {
  const keys = getApiKeys();
  
  if (keys.length === 0) {
    throw new Error("No Gemini API keys found. Please set VITE_GEMINI_API_KEY in your .env file.");
  }

  let lastError: any;
  const startIndex = currentKeyIndex;

  for (let i = 0; i < keys.length; i++) {
    const keyIndex = (startIndex + i) % keys.length;
    const apiKey = keys[keyIndex];
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent(params);
      
      // If successful, update the current key index so we keep using the working key
      currentKeyIndex = keyIndex;
      return response;
    } catch (error: any) {
      console.warn(`API Key ${keyIndex + 1} failed:`, error.message || error);
      lastError = error;
      
      // If it's a 429 (Too Many Requests) or 403 (Quota Exceeded), try the next key
      const errorMessage = error?.message?.toLowerCase() || '';
      if (
        errorMessage.includes('429') || 
        errorMessage.includes('too many requests') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('exhausted') ||
        errorMessage.includes('403')
      ) {
        continue; // Try next key
      }
      
      // For other errors (like invalid prompt), throw immediately
      throw error;
    }
  }

  throw new Error(`All available API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
};

export const generateContentStreamWithFallback = async function* (params: GenerateContentParameters) {
  const keys = getApiKeys();
  
  if (keys.length === 0) {
    throw new Error("No Gemini API keys found. Please set VITE_GEMINI_API_KEY in your .env file.");
  }

  let lastError: any;
  const startIndex = currentKeyIndex;

  for (let i = 0; i < keys.length; i++) {
    const keyIndex = (startIndex + i) % keys.length;
    const apiKey = keys[keyIndex];
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const stream = await ai.models.generateContentStream(params);
      
      // If we successfully get the stream, update current key index
      currentKeyIndex = keyIndex;
      
      for await (const chunk of stream) {
        yield chunk;
      }
      return; // Successfully completed the stream
    } catch (error: any) {
      console.warn(`API Key ${keyIndex + 1} failed for stream:`, error.message || error);
      lastError = error;
      
      const errorMessage = error?.message?.toLowerCase() || '';
      if (
        errorMessage.includes('429') || 
        errorMessage.includes('too many requests') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('exhausted') ||
        errorMessage.includes('403')
      ) {
        continue; // Try next key
      }
      
      throw error;
    }
  }

  throw new Error(`All available API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
};
