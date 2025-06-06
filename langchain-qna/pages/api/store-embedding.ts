import type { NextApiRequest, NextApiResponse } from 'next';
import { storeTextWithEmbedding } from '@/lib/embeddings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Debug logging
    console.log('API route environment check:');
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    const result = await storeTextWithEmbedding(text);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in store-embedding API:', error);
    res.status(500).json({ 
      error: 'Failed to store embedding',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 