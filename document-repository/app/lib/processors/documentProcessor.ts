import { supabase } from '../supabase/client';
import { extractTextFromDocument } from './textExtractor';
import { chunkText } from './textChunker';
import { generateAndStoreEmbeddings } from './embeddingGenerator';
// We'll use this in a future implementation for embeddings
// import { OpenAIEmbeddings } from '@langchain/openai';
// import { config } from '../config';

// Initialize embeddings - will be used in future for document processing
// const embeddings = new OpenAIEmbeddings({
//   openAIApiKey: config.openai.apiKey,
//   modelName: config.openai.embeddingModel,
//   dimensions: config.openai.embeddingDimensions,
// });

interface DocumentMetadata {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export async function processDocument(file: File, metadata: DocumentMetadata) {
  try {
    // 1. Upload to Supabase storage
    const fileName = `${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    // Get file name without extension for default title
    const defaultTitle = file.name.split('.').slice(0, -1).join('.') || file.name;
    
    // 2. Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        title: metadata.title || defaultTitle,
        description: metadata.description || '',
        file_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        metadata
      })
      .select()
      .single();
    
    if (docError) throw docError;
    
    // 3. Process the document in a background-like manner
    // Note: In a real production app, this would be a background job
    processDocumentInBackground(document.id, uploadData.path, file.type)
      .catch(error => console.error('Background processing error:', error));
    
    return document;
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

/**
 * Process the document in the background
 * This handles text extraction, chunking, and embedding generation
 */
export async function processDocumentInBackground(
  documentId: string, 
  filePath: string, 
  fileType: string
): Promise<void> {
  try {
    console.log(`Starting background processing for document ${documentId}`);
    
    // 1. Extract text from the document
    const extractedText = await extractTextFromDocument(documentId, filePath, fileType);
    console.log(`Extracted ${extractedText.length} characters from document ${documentId}`);
    
    // 2. Chunk the text into manageable pieces
    const chunks = chunkText(extractedText);
    console.log(`Created ${chunks.length} chunks from document ${documentId}`);
    
    // 3. Generate and store embeddings
    await generateAndStoreEmbeddings(documentId, chunks);
    
    // 4. Update document status
    await supabase
      .from('documents')
      .update({ 
        metadata: { 
          ...await getDocumentMetadata(documentId),
          processing_status: 'completed',
          chunks_count: chunks.length,
          processed_at: new Date().toISOString()
        } 
      })
      .eq('id', documentId);
    
    console.log(`Completed background processing for document ${documentId}`);
  } catch (error) {
    console.error(`Error in background processing for document ${documentId}:`, error);
    
    // Update document with error status
    await supabase
      .from('documents')
      .update({ 
        metadata: { 
          ...await getDocumentMetadata(documentId),
          processing_status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processed_at: new Date().toISOString()
        } 
      })
      .eq('id', documentId);
  }
}

/**
 * Process document directly from extracted text
 * This is useful when text has already been extracted
 */
export async function processDocumentFromText(
  documentId: string,
  extractedText: string
): Promise<void> {
  try {
    console.log(`Processing document ${documentId} from extracted text`);
    
    // 1. Chunk the text into manageable pieces
    const chunks = chunkText(extractedText);
    console.log(`Created ${chunks.length} chunks from document ${documentId}`);
    
    // 2. Generate and store embeddings
    await generateAndStoreEmbeddings(documentId, chunks);
    
    // 3. Update document status
    await supabase
      .from('documents')
      .update({ 
        metadata: { 
          ...await getDocumentMetadata(documentId),
          processing_status: 'completed',
          chunks_count: chunks.length,
          processed_at: new Date().toISOString()
        } 
      })
      .eq('id', documentId);
    
    console.log(`Completed processing for document ${documentId}`);
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);
    
    // Update document with error status
    await supabase
      .from('documents')
      .update({ 
        metadata: { 
          ...await getDocumentMetadata(documentId),
          processing_status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processed_at: new Date().toISOString()
        } 
      })
      .eq('id', documentId);
  }
}

/**
 * Helper to get existing document metadata
 */
async function getDocumentMetadata(documentId: string): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from('documents')
    .select('metadata')
    .eq('id', documentId)
    .single();
  
  return data?.metadata || {};
} 