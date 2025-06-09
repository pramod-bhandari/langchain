import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/app/lib/supabase/client';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { extractTextFromDocument } from '@/app/lib/processors/textExtractor';
import { config } from '@/app/lib/config';

// Get environment variables for OpenAI
const openaiApiKey = config.openai.apiKey;

export async function POST(req: Request) {
  let documentId: string | undefined;

  try {
    // Parse the request body - only do this once
    const body = await req.json();
    documentId = body.documentId;
    const providedText = body.extractedText;
    
    if (!documentId) {
      return NextResponse.json(
        { error: "documentId parameter is required" },
        { status: 400 }
      );
    }

    // Get the Supabase client
    const supabase = getSupabaseClient();

    // Update document status to processing
    await updateDocumentStatus(supabase, documentId, 'processing', 0);
    
    // If no extracted text is provided, we need to fetch the document and extract text
    let extractedText = providedText;
    if (!extractedText) {
      try {
        // Get document details
        const { data: document, error: fetchError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single();
        
        if (fetchError) throw fetchError;
        if (!document) throw new Error('Document not found');
        
        // Check if document was already processed by the client
        if (document.metadata && 
            (document.metadata.skip_server_processing === true || 
             document.metadata.client_processed === true)) {
          console.log(`Document ${documentId} was already processed by the client. Skipping server-side processing.`);
          
          // Update document status to reflect client processing is complete
          await updateDocumentStatus(
            supabase, 
            documentId, 
            'completed', 
            1, 
            {
              client_processed: true,
              server_processing_skipped: true,
              processed_at: new Date().toISOString()
            }
          );
          
          return NextResponse.json({ 
            success: true,
            documentId,
            status: 'completed',
            message: 'Document was already processed by the client. Server processing skipped.'
          });
        }
        
        // Check if this is an image file and should be handled client-side
        if (document.file_type && document.file_type.startsWith('image/')) {
          console.log(`Document ${documentId} is an image (${document.file_type}). This should be processed client-side.`);
          console.log(`Checking metadata for evidence of client-side processing...`);
          
          // If image doesn't have client-processing flags but was uploaded through the UI
          // we should mark it for client-side only processing
          if (document.metadata && !document.metadata.skip_server_processing) {
            console.log(`Image ${documentId} lacks client-processing flags. Marking for client-side processing.`);
            
            await supabase
              .from('documents')
              .update({
                metadata: {
                  ...document.metadata,
                  requires_client_processing: true,
                  processing_note: 'Image files should be processed on the client side with OCR'
                }
              })
              .eq('id', documentId);
              
            // Update status to error with informative message
            await updateDocumentStatus(
              supabase, 
              documentId, 
              'error', 
              0, 
              {
                error_message: 'This image requires client-side OCR processing',
                server_processing_skipped: true,
                image_needs_client_ocr: true,
                processed_at: new Date().toISOString()
              }
            );
            
            return NextResponse.json({ 
              success: false,
              documentId,
              status: 'error',
              message: 'Image files should be processed with client-side OCR'
            }, { status: 400 });
          }
        }
        
        // Get file from storage
        console.log(`Downloading file from storage: ${document.file_path} (type: ${document.file_type})`);
        const { data: fileData, error: fileError } = await supabase.storage
          .from('documentscollection')
          .download(document.file_path);
        
        if (fileError) {
          console.error('Error downloading file from storage:', fileError);
          throw fileError;
        }
        
        console.log(`Successfully downloaded file from storage, size: ${fileData.size} bytes`);
        
        // Extract text from the file
        console.log(`Extracting text from document ${documentId}, MIME type: ${document.file_type}`);
        const file = new File([fileData], document.file_path.split('/').pop() || 'file', {
          type: document.file_type
        });
        
        console.log('Created File object, starting text extraction...');
        extractedText = await extractTextFromDocument(file);
        
        console.log('==== EXTRACTION RESULTS ====');
        console.log(`Extracted ${extractedText.length} characters from document ${documentId}`);
        console.log('First 500 characters of extracted text:');
        console.log(extractedText.substring(0, 500));
        console.log('Last 500 characters of extracted text:');
        console.log(extractedText.substring(Math.max(0, extractedText.length - 500)));
        console.log('==== END EXTRACTION RESULTS ====');
        
        // Update document with extracted text (store in metadata)
        await supabase
          .from('documents')
          .update({
            metadata: {
              ...document.metadata,
              extracted_text_length: extractedText.length,
              has_extracted_text: true
            }
          })
          .eq('id', documentId);
      } catch (extractError) {
        console.error(`Error extracting text from document ${documentId}:`, extractError);
        await updateDocumentStatus(
          supabase, 
          documentId, 
          'error', 
          0, 
          {
            error_message: `Text extraction failed: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`,
            processed_at: new Date().toISOString()
          }
        );
        
        return NextResponse.json(
          { 
            success: false,
            error: "Failed to extract text from document",
            details: extractError instanceof Error ? extractError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }
    
    // Check if we have text to process
    if (!extractedText || extractedText.trim().length === 0) {
      await updateDocumentStatus(
        supabase, 
        documentId, 
        'error', 
        0, 
        {
          error_message: 'No text could be extracted from the document',
          processed_at: new Date().toISOString()
        }
      );
      
      return NextResponse.json(
        { 
          success: false,
          error: "No text could be extracted from document"
        },
        { status: 400 }
      );
    }
    
    // Create OpenAI embeddings client
    const embeddings = new OpenAIEmbeddings({ 
      openAIApiKey: openaiApiKey,
      modelName: config.openai.embeddingModel
    });
    
    // 1. Chunk the text
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const docs = await textSplitter.createDocuments([extractedText]);
    const chunks = docs.map(doc => doc.pageContent);
    console.log(`Created ${chunks.length} chunks from document ${documentId}`);
    
    // Update progress
    await updateDocumentStatus(supabase, documentId, 'processing', 0.3, { chunksCount: chunks.length });
    
    // 2. Process chunks in batches to avoid rate limits
    const BATCH_SIZE = 5;
    let processedCount = 0;
    
    console.log(`Generating embeddings for ${chunks.length} chunks from document ${documentId}`);
    
    // Process in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)} (${batch.length} chunks)`);
      
      // Update progress
      await updateDocumentStatus(
        supabase,
        documentId, 
        'processing', 
        0.3 + 0.6 * (i / chunks.length), 
        { processedChunks: i }
      );
      
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
    
    console.log(`Successfully stored ${processedCount} chunks with embeddings for document ${documentId}`);
    
    // 3. Update document status to complete
    await updateDocumentStatus(supabase, documentId, 'completed', 1, {
      chunks_count: chunks.length,
      processed_at: new Date().toISOString()
    });
    
    console.log(`Completed background processing for document ${documentId}`);
    
    return NextResponse.json({ 
      success: true,
      documentId,
      processedCount,
      chunksCount: chunks.length
    });
    
  } catch (error) {
    console.error('Error processing document:', error);
    
    // Try to update document with error status if we have the document ID
    if (documentId) {
      try {
        const supabase = getSupabaseClient();
        await updateDocumentStatus(
          supabase,
          documentId, 
          'error', 
          0, 
          {
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processed_at: new Date().toISOString()
          }
        );
      } catch (e) {
        console.error('Error updating document status:', e);
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to process document",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to update document status
async function updateDocumentStatus(
  supabase: ReturnType<typeof getSupabaseClient>,
  documentId: string,
  status: 'pending' | 'processing' | 'completed' | 'error',
  progress: number,
  additionalMetadata: Record<string, unknown> = {}
) {
  // Get current metadata
  const { data: document } = await supabase
    .from('documents')
    .select('metadata')
    .eq('id', documentId)
    .single();

  // Update the document
  await supabase
    .from('documents')
    .update({
      metadata: {
        ...(document?.metadata || {}),
        status,
        progress,
        last_updated: new Date().toISOString(),
        ...additionalMetadata
      }
    })
    .eq('id', documentId);
} 