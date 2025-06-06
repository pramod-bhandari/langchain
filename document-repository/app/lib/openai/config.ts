/**
 * OpenAI configuration for the document repository
 */

// Get OpenAI API key from environment variables
export function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OpenAI API key not found in environment variables');
    throw new Error('OpenAI API key not configured');
  }
  
  return apiKey;
}

// OpenAI model configuration
export const config = {
  openai: {
    embeddingModel: 'text-embedding-ada-002',
    chatModel: 'gpt-3.5-turbo',
    temperature: 0.2,
    maxTokens: 2000
  }
}; 