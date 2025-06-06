// Web Worker for document processing
// This file runs in a separate thread and handles CPU-intensive tasks

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

// Define message types
interface WorkerMessage {
  type: string;
  data: unknown;
}

// Worker context
let supabase: SupabaseClient | null = null;
let embeddings: OpenAIEmbeddings | null = null;

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'init':
        // Initialize the worker with credentials
        const { supabaseUrl, supabaseKey, openaiKey } = data as { 
          supabaseUrl: string;
          supabaseKey: string;
          openaiKey: string;
        };
        initializeWorker(supabaseUrl, supabaseKey, openaiKey);
        self.postMessage({ type: 'initialized' });
        break;

      case 'process':
        // Process a document
        await processDocument(data);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// Initialize worker with needed clients
function initializeWorker(supabaseUrl: string, supabaseKey: string, openaiKey: string) {
  // Create Supabase client
  supabase = createClient(supabaseUrl, supabaseKey);
  
  // Create embeddings client
  embeddings = new OpenAIEmbeddings({ 
    openAIApiKey: openaiKey,
    modelName: 'text-embedding-3-small', // Use smaller model for cost efficiency
  });

  console.log('[Worker] Initialized successfully');
}

// Process a document
async function processDocument(data: unknown) {
  if (!supabase || !embeddings) {
    throw new Error('Worker not initialized');
  }

  const { documentId, extractedText } = data as {
    documentId: string;
    extractedText: string;
  };
  
  try {
    self.postMessage({ type: 'status', status: 'chunking', documentId });

    // 1. Chunk the text
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const docs = await textSplitter.createDocuments([extractedText]);
    const chunks = docs.map(doc => doc.pageContent);
    
    self.postMessage({ 
      type: 'status', 
      status: 'embedding', 
      documentId, 
      progress: 0.3,
      chunksCount: chunks.length 
    });

    // 2. Process chunks in batches to avoid rate limits
    const BATCH_SIZE = 5;
    let processedCount = 0;

    // Process in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      
      // Update progress
      self.postMessage({ 
        type: 'status', 
        status: 'embedding', 
        documentId, 
        progress: 0.3 + 0.6 * (i / chunks.length),
        processedChunks: i 
      });
      
      // Generate embeddings for the batch
      const embeddingResults = await embeddings.embedDocuments(batch);
      
      // Prepare records for insertion
      const records = batch.map((content, index) => ({
        document_id: documentId,
        content,
        embedding: embeddingResults[index],
        metadata: {
          chunk_index: i + index,
          total_chunks: chunks.length
        }
      }));
      
      // Insert chunks with embeddings
      const { error: insertError } = await supabase
        .from('document_chunks')
        .insert(records);
      
      if (insertError) {
        throw insertError;
      }
      
      processedCount += batch.length;
    }

    // 3. Update document status
    const { data: documentData } = await supabase
      .from('documents')
      .select('metadata')
      .eq('id', documentId)
      .single();
    
    if (!documentData) {
      throw new Error('Document not found');
    }
    
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        metadata: {
          ...documentData.metadata,
          processing_status: 'completed',
          chunks_count: chunks.length,
          processed_at: new Date().toISOString()
        }
      })
      .eq('id', documentId);

    if (updateError) {
      throw updateError;
    }

    // 4. Report completion
    self.postMessage({ 
      type: 'complete', 
      documentId, 
      processedCount,
      chunksCount: chunks.length 
    });
    
  } catch (error) {
    console.error('[Worker] Processing error:', error);
    
    // Update document with error status
    await supabase
      .from('documents')
      .update({ 
        metadata: { 
          processing_status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processed_at: new Date().toISOString()
        } 
      })
      .eq('id', documentId);
      
    // Report error
    self.postMessage({ 
      type: 'error', 
      documentId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 