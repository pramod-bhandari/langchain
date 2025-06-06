import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { supabase } from "@/lib/supabase";

export async function embedText(text: string) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  if (!process.env.OPENAI_EMBEDDING_MODEL) {
    console.error('OPENAI_EMBEDDING_MODEL is not set');
    throw new Error('OPENAI_EMBEDDING_MODEL is not set in environment variables');
  }

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.OPENAI_EMBEDDING_MODEL,
  });
  return await embeddings.embedQuery(text);
}

export async function retrieveRelevantEmbeddings(queryEmbedding: number[]) {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5,
  });

  console.log('Reterival data', data);

  if (error) {
    console.error('Error retrieving embeddings:', error);
    throw error;
  }

  return data;
}

export async function generateAnswer(question: string, context: any[]) {
  // Debug logging
  console.log('Environment variables check:');
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  console.log('OPENAI_MODEL_NAME:', process.env.OPENAI_MODEL_NAME);
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  if (!process.env.OPENAI_MODEL_NAME) {
    console.error('OPENAI_MODEL_NAME is not set');
    throw new Error('OPENAI_MODEL_NAME is not set in environment variables');
  }

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.OPENAI_MODEL_NAME,
    temperature: 0.7,
    maxTokens: 500,
  });

  const prompt = `Based on the following context, please answer the question. If the context doesn't contain relevant information, say so.

Context:
${context.map((doc: any) => doc.content).join("\n\n")}

Question: ${question}

Answer:`;

  try {
    const response = await model.invoke(prompt);
    return response.content;
  } catch (error) {
    console.error('Error generating answer:', error);
    throw error;
  }
} 