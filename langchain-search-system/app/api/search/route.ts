import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { serverConfig } from '@/lib/config';

export async function POST(request: Request) {
  try {
    console.log('Search API route hit');
    
    const { query } = await request.json();
    console.log('Search query:', query);

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log('OpenAI API Key available:', !!serverConfig.openai.apiKey);
    console.log('Using embedding model:', serverConfig.openai.embeddingModel);
    
    // Log Supabase connection info
    console.log('Supabase URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Anon Key available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Generate embeddings for the query
    const embeddings = new OpenAIEmbeddings({
      modelName: serverConfig.openai.embeddingModel,
      dimensions: serverConfig.openai.embeddingDimensions,
      openAIApiKey: serverConfig.openai.apiKey
    });
    
    console.log('Generating embedding for query...');
    const embedding = await embeddings.embedQuery(query);
    console.log('Embedding generated, dimensions:', embedding.length);

    // Test Supabase connection
    try {
      const { data: testData, error: testError } = await supabase
        .from('documents')
        .select('id')
        .limit(1);
        
      if (testError) {
        console.error('Supabase connection test error:', testError);
      } else {
        console.log('Supabase connection successful. Documents found:', testData ? testData.length : 0);
      }
    } catch (testErr) {
      console.error('Error testing Supabase connection:', testErr);
    }

    // Perform vector similarity search
    console.log('Calling Supabase match_documents function with parameters:',
      JSON.stringify({
        match_threshold: 0.7,
        match_count: 5
      })
    );
    
    try {
      const { data: results, error } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        // match_threshold: 0.7,
        // match_count: 5
        match_threshold: 0.5,
        match_count: 3,
        match_min_length: 10
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      console.log('Search results count:', results?.length || 0);
      
      if (results && results.length > 0) {
        console.log('First result preview:', {
          id: results[0].id,
          content_length: results[0].content?.length || 0,
          score: results[0].score
        });
      } else {
        // If no results, check if documents table exists and has data
        const { count, error: countError } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true });
          
        if (countError) {
          console.error('Error checking documents count:', countError);
        } else {
          console.log('Total documents in database:', count);
        }
      }

      return NextResponse.json({ results: results || [] });
    } catch (rpcError) {
      console.error('Error during RPC call:', rpcError);
      return NextResponse.json(
        { error: 'Error during vector search', details: String(rpcError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
} 