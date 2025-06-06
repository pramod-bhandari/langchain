// This file helps safely access environment variables
// and provides type safety and default values

interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL_NAME: string;
}

export const env: Env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL_NAME: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
};

// Function to check if the required environment variables are set
export function validateEnv(): boolean {
  if (!env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY environment variable');
    return false;
  }
  
  return true;
} 