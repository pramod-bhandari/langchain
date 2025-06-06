import { createClient } from '@/utils/supabase/server';
import { OpenAI } from 'openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { getOpenAIKey } from '../openai/config';

// Batch size for processing embeddings
const BATCH_SIZE = 20;

/**
 * Process embeddings for a document's chunks
 */
export async function processDocumentEmbeddings(
  documentId: string,
  chunks: string[]
): Promise<void> {
  if (!chunks || chunks.length === 0) {
    throw new Error('No chunks provided for embedding generation');
  }

  try {
    // Get OpenAI API key
    const openAIKey = getOpenAIKey();
    if (!openAIKey) {
      throw new Error('OpenAI API key not found');
    }

    // Create a Supabase client
    const supabase = createClient();

    // Update document status to processing
    await supabase
      .from('documents')
      .update({
        processing_status: 'embedding',
      })
      .eq('id', documentId);

    // Create OpenAI embeddings instance
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: openAIKey,
      batchSize: BATCH_SIZE, // Process in batches
      modelName: 'text-embedding-ada-002',
    });

    // Process chunks in batches
    const embeddingVectors = await processChunksInBatches(chunks, embeddings);

    // Update document with embeddings
    await supabase
      .from('documents')
      .update({
        embedding_vectors: embeddingVectors,
        processing_status: 'completed',
      })
      .eq('id', documentId);

    return;
  } catch (error) {
    console.error('Error processing embeddings:', error);
    
    // Create a Supabase client
    const supabase = createClient();
    
    // Update document status to error
    await supabase
      .from('documents')
      .update({
        processing_status: 'error',
        processing_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', documentId);
    
    throw error;
  }
}

/**
 * Process chunks in batches to generate embeddings
 */
async function processChunksInBatches(
  chunks: string[],
  embeddings: OpenAIEmbeddings
): Promise<number[][]> {
  try {
    // Process all chunks with the embeddings model
    // LangChain's OpenAIEmbeddings handles batching internally
    const embeddingVectors = await embeddings.embedDocuments(chunks);
    return embeddingVectors;
  } catch (error) {
    console.error('Error in batch embedding processing:', error);
    throw error;
  }
}

/**
 * Direct OpenAI API implementation for embeddings 
 * (alternative to LangChain approach)
 */
export async function generateEmbeddingsWithOpenAI(
  chunks: string[],
  apiKey: string
): Promise<number[][]> {
  try {
    const openai = new OpenAI({
      apiKey,
    });

    const results: number[][] = [];
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: batch,
      });
      
      // Extract embedding vectors
      const batchEmbeddings = response.data.map(item => item.embedding);
      results.push(...batchEmbeddings);
    }
    
    return results;
  } catch (error) {
    console.error('Error generating embeddings with OpenAI:', error);
    throw error;
  }
} 