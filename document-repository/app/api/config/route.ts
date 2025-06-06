import { NextResponse } from 'next/server';

// This endpoint provides necessary configuration to client-side code
// It's safer than exposing sensitive environment variables directly
export async function GET() {
  // Only expose what's absolutely necessary
  const config = {
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    embeddingDimensions: 1536, // Default for text-embedding-3-small
  };
  
  return NextResponse.json(config);
} 