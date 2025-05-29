import { OpenAIEmbeddings } from "@langchain/openai";
import { supabase } from "./supabase";

// Add debug logging at module level
console.log('Server-side environment check:');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_EMBEDDING_MODEL:', process.env.OPENAI_EMBEDDING_MODEL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: process.env.OPENAI_EMBEDDING_MODEL,
});

export async function storeTextWithEmbedding(text: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log('Environment variables in storeTextWithEmbedding:', {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'exists' : 'missing',
        OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
        NODE_ENV: process.env.NODE_ENV,
        // Log all env vars (excluding sensitive values)
        envKeys: Object.keys(process.env)
      });
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment variables are not set');
    }

    if (!process.env.OPENAI_EMBEDDING_MODEL) {
      throw new Error('OPENAI_EMBEDDING_MODEL is not set in environment variables');
    }

    // Generate embedding for the text
    const embedding = await embeddings.embedQuery(text);

    if (!embedding || embedding.length === 0) {
      throw new Error('Failed to generate embedding');
    }

    console.log('Generated embedding:', embedding, 'dimensions');
    // Write embedding to a file for debugging/verification
    const fs = require('fs');
    const path = require('path');
    
    // Create a debug folder if it doesn't exist
    const debugDir = path.join(process.cwd(), 'debug');
    if (!fs.existsSync(debugDir)){
      fs.mkdirSync(debugDir);
    }

    // Write embedding with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const embeddingFile = path.join(debugDir, `embedding-${timestamp}.json`);
    fs.writeFileSync(embeddingFile, JSON.stringify({
      text: text,
      embedding: embedding,
      dimensions: embedding.length
    }, null, 2));

    console.log('Wrote embedding to file:', embeddingFile);

    // First, insert the document
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert([
        {
          content: text,
        },
      ])
      .select()
      .single();

    if (documentError) {
      console.error('Error inserting document:', {
        code: documentError.code,
        message: documentError.message,
        details: documentError.details,
        hint: documentError.hint
      });
      throw new Error(`Failed to insert document: ${documentError.message || 'Unknown error'}`);
    }

    if (!documentData) {
      throw new Error('No document data returned after insert');
    }

    // Then, insert the embedding
    const { data: embeddingData, error: embeddingError } = await supabase
      .from('embeddings')
      .insert([
        {
          document_id: documentData.id,
          embedding: embedding,
        },
      ])
      .select()
      .single();

    if (embeddingError) {
      console.error('Error inserting embedding:', {
        code: embeddingError.code,
        message: embeddingError.message,
        details: embeddingError.details,
        hint: embeddingError.hint
      });
      throw new Error(`Failed to insert embedding: ${embeddingError.message || 'Unknown error'}`);
    }

    if (!embeddingData) {
      throw new Error('No embedding data returned after insert');
    }

    console.log('Successfully stored document and embedding:', {
      documentId: documentData.id,
      embeddingId: embeddingData.id
    });

    return {
      document: documentData,
      embedding: embeddingData
    };
  } catch (error) {
    console.error('Error storing text with embedding:', error instanceof Error ? error.message : error);
    throw error;
  }
} 