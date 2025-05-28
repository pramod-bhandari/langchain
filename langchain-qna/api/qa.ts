import type { NextApiRequest, NextApiResponse } from 'next';
import { generateAnswer, retrieveRelevantEmbeddings, embedText } from '../lib/langchain';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  // TODO: Embed the question
  const queryEmbedding = await embedText(question);

  // TODO: Retrieve relevant context from Supabase
  const context = await retrieveRelevantEmbeddings(queryEmbedding);

  // TODO: Generate answer using OpenAI and context
  const answer = await generateAnswer(question, context);

  res.status(200).json({ answer });
} 