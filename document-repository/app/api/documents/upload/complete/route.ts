import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { auth } from '@/auth';
import { processDocumentEmbeddings } from '@/lib/server/embeddingProcessor';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the document ID
    const data = await req.json();
    const { documentId } = data;

    if (!documentId) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
    }

    // Create a Supabase client
    const supabase = createClient();

    // Get the document record
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify ownership
    if (document.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if all chunks are uploaded
    const uploadMetadata = document.upload_metadata || {};
    const totalChunks = uploadMetadata.totalChunks || 0;
    const uploadedChunks = uploadMetadata.uploadedChunks || 0;

    if (uploadedChunks < totalChunks) {
      return NextResponse.json({
        error: `Not all chunks are uploaded: ${uploadedChunks}/${totalChunks}`,
        status: 'incomplete'
      }, { status: 400 });
    }

    // Combine all chunks into a single file
    const chunks = [];
    const folderPath = `chunks/${documentId}`;
    
    // Create a metadata object for the combined file
    const combinedMetadata = {
      ...document.extraction_metadata,
      uploadMethod: 'chunked',
      originalSize: document.size,
      combineTime: new Date().toISOString(),
    };

    // If we have pre-extracted text, we can skip the file combination step
    // and just upload the metadata and mark as completed
    if (document.extracted_text) {
      // We don't need to recombine the file or reprocess it since we have
      // the extracted text already
      
      // Update the document status
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          status: 'completed',
          processing_status: 'completed',
          upload_metadata: {
            ...uploadMetadata,
            completeTime: new Date().toISOString(),
          },
          extraction_metadata: combinedMetadata,
        })
        .eq('id', documentId);

      if (updateError) {
        console.error('Error updating document status:', updateError);
        return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
      }

      // Process embeddings if needed and not already done
      if (!document.embedding_vectors && document.extracted_chunks) {
        try {
          await processDocumentEmbeddings(documentId, document.extracted_chunks);
        } catch (error) {
          console.error('Error processing embeddings:', error);
          // We won't fail the request if embeddings fail
        }
      }

      return NextResponse.json({
        documentId,
        message: 'Upload completed successfully with pre-extracted content',
        status: 'completed',
        metadata: combinedMetadata,
      });
    }

    // If no pre-extracted text, we'd need to combine all chunks and process the file
    // But since we're focused on optimizing with client-side extraction, we'll 
    // return an error in this case for now
    return NextResponse.json({
      error: 'Document missing extracted text. Client-side extraction required.',
      status: 'failed'
    }, { status: 400 });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error completing upload:', error);
    return NextResponse.json({ error: errorMessage || 'Failed to complete upload' }, { status: 500 });
  }
} 