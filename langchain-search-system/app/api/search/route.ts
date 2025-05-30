import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { serverConfig } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Generate embeddings for the query
    const embeddings = new OpenAIEmbeddings({
      modelName: serverConfig.openai.embeddingModel,
      dimensions: serverConfig.openai.embeddingDimensions,
      openAIApiKey: serverConfig.openai.apiKey
    });
    const embedding = await embeddings.embedQuery(query);

    // Perform vector similarity search
    const { data: results, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5
    });

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
} 