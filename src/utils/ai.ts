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
      
      try {
        const response = await ai.models.generateContent(params);
        currentKeyIndex = keyIndex;
        return response;
      } catch (modelError: any) {
        // If the primary model is overloaded (503), try the fallback model
        const errorMessage = modelError?.message?.toLowerCase() || '';
        if (errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('high demand')) {
          console.warn('Primary model overloaded, trying fallback model gemini-2.5-flash...');
          const fallbackParams = { ...params, model: 'gemini-2.5-flash' };
          const fallbackResponse = await ai.models.generateContent(fallbackParams);
          currentKeyIndex = keyIndex;
          return fallbackResponse;
        }
        throw modelError; // Re-throw to be caught by the outer catch block
      }
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
        errorMessage.includes('403') ||
        errorMessage.includes('503') ||
        errorMessage.includes('unavailable')
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
      
      try {
        const stream = await ai.models.generateContentStream(params);
        currentKeyIndex = keyIndex;
        for await (const chunk of stream) {
          yield chunk;
        }
        return;
      } catch (modelError: any) {
        const errorMessage = modelError?.message?.toLowerCase() || '';
        if (errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('high demand')) {
          console.warn('Primary model overloaded for stream, trying fallback model gemini-2.5-flash...');
          const fallbackParams = { ...params, model: 'gemini-2.5-flash' };
          const fallbackStream = await ai.models.generateContentStream(fallbackParams);
          currentKeyIndex = keyIndex;
          for await (const chunk of fallbackStream) {
            yield chunk;
          }
          return;
        }
        throw modelError;
      }
    } catch (error: any) {
      console.warn(`API Key ${keyIndex + 1} failed for stream:`, error.message || error);
      lastError = error;
      
      const errorMessage = error?.message?.toLowerCase() || '';
      if (
        errorMessage.includes('429') || 
        errorMessage.includes('too many requests') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('exhausted') ||
        errorMessage.includes('403') ||
        errorMessage.includes('503') ||
        errorMessage.includes('unavailable')
      ) {
        continue; // Try next key
      }
      
      throw error;
    }
  }

  throw new Error(`All available API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
};
