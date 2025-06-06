import { OcrProcessor } from './ocrProcessor';
import { supabase } from '../supabase/client';
import { OpenAIEmbeddings } from '@langchain/openai';
import { config } from '../config';

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: config.openai.apiKey,
  modelName: config.openai.embeddingModel,
  dimensions: config.openai.embeddingDimensions,
});

/**
 * Process an image file to extract text content using OCR,
 * then save the results to the document repository
 */
export async function processImageFile(
  file: File,
  documentId: string,
  chunkSize: number = 1000
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get instance of OCR processor
    const ocrProcessor = OcrProcessor.getInstance();
    
    // Extract text from the image
    const text = await ocrProcessor.extractText(file);
    
    if (!text || text.trim().length === 0) {
      return { 
        success: false, 
        error: 'No text was extracted from the image. The image may not contain text or the text is not clearly visible.' 
      };
    }
    
    // Save full text content to document metadata
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        metadata: { 
          textContent: text,
          ocrProcessed: true,
          processingDate: new Date().toISOString()
        } 
      })
      .eq('id', documentId);
      
    if (updateError) {
      console.error('Error updating document metadata:', updateError);
      return { success: false, error: 'Failed to update document metadata' };
    }
    
    // Create chunks from the extracted text
    const textChunks = createChunks(text, chunkSize);
    
    // Process each chunk (generate embeddings and save to database)
    for (let i = 0; i < textChunks.length; i++) {
      const chunkText = textChunks[i];
      
      // Generate embedding for the chunk
      const embedding = await embeddings.embedQuery(chunkText);
      
      // Save chunk to database
      const { error: chunkError } = await supabase
        .from('chunks')
        .insert({
          document_id: documentId,
          content: chunkText,
          metadata: {
            index: i,
            source: 'ocr',
            chunkSize
          },
          embedding
        });
        
      if (chunkError) {
        console.error(`Error saving chunk ${i}:`, chunkError);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error processing image file:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error processing image' 
    };
  }
}

/**
 * Split text into chunks of approximately equal size
 */
function createChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/); // Split by paragraph
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size, save current chunk and start new one
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    
    currentChunk += paragraph + '\n\n';
    
    // If current chunk is already bigger than chunk size, split it
    if (currentChunk.length > chunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
  }
  
  // Add the last chunk if there's anything left
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
} 