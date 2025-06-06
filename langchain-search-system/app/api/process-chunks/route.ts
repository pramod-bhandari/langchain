import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { serverConfig } from '@/lib/config';

// Configure the runtime and route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

// Config for API
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase the size limit for uploads
    },
    responseLimit: '10mb',
  },
};

// Process chunks endpoint
export async function POST(request: Request) {
  console.log('Process chunks API route hit');
  
  // Check content type
  const contentType = request.headers.get('content-type');
  console.log('Content-Type header:', contentType);
  
  try {
    // Parse the request body as JSON
    const body = await request.json();
    console.log('Received data:', {
      fileName: body.fileName,
      publicUrl: body.publicUrl,
      chunksCount: body.chunks?.length || 0,
    });

    const { fileName, publicUrl, chunks, metadata } = body;

    if (!chunks || !Array.isArray(chunks)) {
      console.log('No chunks provided');
      return NextResponse.json(
        { error: 'No chunks provided' },
        { status: 400 }
      );
    }

    console.log('Processing chunks:', {
      count: chunks.length,
      fileName,
      publicUrl,
    });

    // 1. Generate embeddings for each chunk
    console.log('Generating embeddings');
    const embeddings = new OpenAIEmbeddings({
      modelName: serverConfig.openai.embeddingModel,
      dimensions: serverConfig.openai.embeddingDimensions,
      openAIApiKey: serverConfig.openai.apiKey
    });

    // Generate embeddings for each chunk
    const chunkEmbeddings = await Promise.all(
      chunks.map(async (chunk) => {
        const embedding = await embeddings.embedQuery(chunk.content);
        return {
          content: chunk.content,
          embedding,
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex
        };
      })
    );
    console.log('Embeddings generated successfully');

    // 2. Store document metadata in database
    console.log('Storing document metadata');
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        title: fileName,
        metadata: metadata,
        public_url: publicUrl
      })
      .select()
      .single();

    if (docError) {
      console.error('Database error:', docError);
      throw new Error(`Failed to store document: ${docError.message}`);
    }

    // 3. Store chunks and embeddings in document_chunks table
    console.log('Storing chunks and embeddings');
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(
        chunkEmbeddings.map(({ content, embedding, pageNumber, chunkIndex }) => ({
          document_id: document.id,
          content: content,
          embedding: embedding,
          page_number: pageNumber,
          chunk_index: chunkIndex
        }))
      );

    if (chunksError) {
      console.error('Chunks storage error:', chunksError);
      throw new Error(`Failed to store chunks: ${chunksError.message}`);
    }

    console.log('Document and chunks stored successfully');

    return NextResponse.json({ 
      success: true,
      message: 'File processed successfully',
      chunks: chunks.length,
      publicUrl: publicUrl
    });
  } catch (error) {
    console.error('Process chunks API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process chunks' },
      { status: 500 }
    );
  }
} 