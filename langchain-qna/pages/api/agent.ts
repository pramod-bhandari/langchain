import { NextApiRequest, NextApiResponse } from 'next';
import { useAgent } from '@/services/agent';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    const result = await useAgent(input);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Agent API error:', error);
    return res.status(500).json({ 
      error: 'Error processing request',
      details: error.message 
    });
  }
} 