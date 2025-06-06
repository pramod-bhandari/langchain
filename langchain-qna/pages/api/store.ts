import type { NextApiRequest, NextApiResponse } from 'next';
import { storeTextWithEmbedding } from '@/lib/embeddings';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'Text must be a string' });
    }

    const result = await storeTextWithEmbedding(text);
    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('Error in store API:', error instanceof Error ? error.message : error);
    return res.status(500).json({ 
      error: 'Failed to store text',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 