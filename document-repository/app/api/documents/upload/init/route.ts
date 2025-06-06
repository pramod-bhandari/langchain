import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the initialization data
    const data = await req.json();
    const { 
      documentId, 
      fileName, 
      fileType, 
      fileSize, 
      totalChunks,
      extractedText,
      extractedChunks,
      embeddings,
      metadata 
    } = data;

    // Validate required fields
    if (!documentId || !fileName || !fileType || !fileSize || !totalChunks) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get authenticated user ID
    const userId = session.user.id;

    // Create a Supabase client
    const supabase = createClient();

    // Create document record in the database
    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        user_id: userId,
        name: fileName,
        type: fileType,
        size: fileSize,
        status: 'uploading',
        upload_metadata: {
          totalChunks,
          uploadedChunks: 0,
          chunkStatus: Array(totalChunks).fill(false),
          uploadStartTime: new Date().toISOString(),
        },
        extraction_metadata: metadata,
        extracted_text: extractedText || null,
        extracted_chunks: extractedChunks || null,
        embedding_vectors: embeddings || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document record:', error);
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    // Create a folder in storage for the chunks
    const folderPath = `chunks/${documentId}`;
    const { error: storageError } = await supabase.storage
      .from('documentscollection')
      .upload(`${folderPath}/.placeholder`, new Blob([''], { type: 'text/plain' }));

    if (storageError) {
      console.error('Error creating folder in storage:', storageError);
    }

    return NextResponse.json({
      documentId,
      message: 'Upload initialized successfully',
      status: 'uploading',
    });
  } catch (error: any) {
    console.error('Error initializing upload:', error);
    return NextResponse.json({ error: error.message || 'Failed to initialize upload' }, { status: 500 });
  }
} 