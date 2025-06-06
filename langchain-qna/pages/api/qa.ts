import type { NextApiRequest, NextApiResponse } from 'next';
import { embedText, retrieveRelevantEmbeddings, generateAnswer } from '@/services/qa';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Generate embedding for the question
    const queryEmbedding = await embedText(question);

    // Retrieve relevant context from Supabase
    const context = await retrieveRelevantEmbeddings(queryEmbedding);

    // Generate answer using OpenAI and context
    const answer = await generateAnswer(question, context);

    // Store in qa_history
    const { error: historyError } = await supabase
      .from('qa_history')
      .insert([
        {
          question,
          answer,
        },
      ]);

    if (historyError) {
      console.error('Error storing in qa_history:', historyError);
      // Don't throw error here, as the answer was already generated
    }

    res.status(200).json({ answer });
  } catch (error) {
    console.error('Error in Q&A API:', error);
    res.status(500).json({ 
      error: 'Failed to process question',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 