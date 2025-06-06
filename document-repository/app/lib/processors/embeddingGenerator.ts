import { OpenAIEmbeddings } from '@langchain/openai';
import { supabase } from '../supabase/client';
import { config } from '../config';

// Initialize OpenAI embeddings with config
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: config.openai.apiKey,
  modelName: config.openai.embeddingModel,
  dimensions: config.openai.embeddingDimensions,
});

// Define the chunk metadata type
interface ChunkMetadata {
  position?: number;
  page?: number;
  section?: string;
  [key: string]: unknown;
}

/**
 * Generate embeddings for text chunks and save them to the database
 */
export async function generateAndStoreEmbeddings(
  documentId: string,
  chunks: string[],
  chunkMetadata: Record<number, ChunkMetadata> = {}
): Promise<void> {
  try {
    // Skip if no chunks
    if (!chunks.length) return;
    
    console.log(`Generating embeddings for ${chunks.length} chunks from document ${documentId}`);
    
    // Generate embeddings in batches to avoid rate limits
    const batchSize = 5; // Adjust based on your API rate limits
    const batches = Math.ceil(chunks.length / batchSize);
    
    for (let i = 0; i < batches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, chunks.length);
      const batchChunks = chunks.slice(batchStart, batchEnd);
      
      console.log(`Processing batch ${i + 1}/${batches} (${batchChunks.length} chunks)`);
      
      // Generate embeddings for the batch
      const embeddingsArray = await embeddings.embedDocuments(batchChunks);
      
      // Prepare data for insertion
      const chunksData = batchChunks.map((content, idx) => ({
        document_id: documentId,
        content,
        embedding: embeddingsArray[idx],
        metadata: chunkMetadata[batchStart + idx] || {}
      }));
      
      // Insert into database
      const { error } = await supabase.from('chunks').insert(chunksData);
      
      if (error) {
        console.error('Error inserting chunks:', error);
        throw error;
      }
      
      // Wait a bit between batches to avoid rate limits
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`Successfully stored ${chunks.length} chunks with embeddings for document ${documentId}`);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
} 