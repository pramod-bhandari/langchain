import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config';
 
export const chatModel = new ChatOpenAI({
  openAIApiKey: config.openai.apiKey,
  modelName: config.openai.modelName,
  temperature: 0,
}); 