import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-build';

// Skip actual Supabase initialization during build time
const supabase = process.env.NODE_ENV === 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? null // This will be replaced with actual client in production with real keys
  : createClient(supabaseUrl, supabaseKey);

const openaiApiKey = process.env.OPENAI_API_KEY!;

const embeddings = new OpenAIEmbeddings({ openAIApiKey: openaiApiKey });

export async function POST(req: Request) {
  try {
    const { query, documentIds = [], limit = 5, similarityThreshold = 0.7 } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // Generate embedding for the query
    const queryEmbedding = await embeddings.embedQuery(query);

    // Build Supabase query
    let matchQuery = supabase
      .from('document_chunks')
      .select('*, documents!inner(*)')
      .is('embedding', 'not.null');

    // If documentIds array is provided and not empty, filter by those documents
    if (documentIds && documentIds.length > 0) {
      matchQuery = matchQuery.in('document_id', documentIds);
    }

    // Perform vector search with similarity threshold
    const { data: chunks, error } = await matchQuery.rpc(
      'match_document_chunks', 
      {
        query_embedding: queryEmbedding,
        similarity_threshold: similarityThreshold,
        match_count: limit
      }
    );

    if (error) {
      console.error('Vector search error:', error);
      return NextResponse.json(
        { error: "Failed to perform vector search" },
        { status: 500 }
      );
    }

    // Process results to include document metadata
    const results = chunks.map((chunk: any) => ({
      documentId: chunk.document_id,
      documentTitle: chunk.documents.title,
      documentType: chunk.documents.file_type,
      chunkId: chunk.id,
      content: chunk.content,
      similarity: chunk.similarity,
      metadata: {
        ...chunk.metadata,
      }
    }));

    return NextResponse.json({ 
      results,
      query,
      totalResults: results.length
    });
  } catch (error) {
    console.error('Error in vector search API:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 