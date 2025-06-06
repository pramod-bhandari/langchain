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

    // Get form data with the chunk
    const formData = await req.formData();
    const chunk = formData.get('chunk') as File;
    const documentId = formData.get('documentId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
    const totalChunks = parseInt(formData.get('totalChunks') as string, 10);

    // Validate required fields
    if (!chunk || !documentId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create a Supabase client
    const supabase = createClient();

    // Check if the document exists and belongs to the user
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('user_id, upload_metadata')
      .eq('id', documentId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify ownership
    if (document.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Upload the chunk to storage
    const folderPath = `chunks/${documentId}`;
    const { error: storageError } = await supabase.storage
      .from('documentscollection')
      .upload(`${folderPath}/chunk_${chunkIndex}`, chunk, {
        cacheControl: '3600',
        upsert: true,
      });

    if (storageError) {
      console.error('Error uploading chunk to storage:', storageError);
      return NextResponse.json({ error: 'Failed to upload chunk' }, { status: 500 });
    }

    // Update the document status
    const uploadMetadata = document.upload_metadata || {
      totalChunks,
      uploadedChunks: 0,
      chunkStatus: Array(totalChunks).fill(false),
    };

    // Mark the chunk as uploaded
    uploadMetadata.chunkStatus[chunkIndex] = true;
    uploadMetadata.uploadedChunks = uploadMetadata.chunkStatus.filter(Boolean).length;

    // Update the document record
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        upload_metadata: uploadMetadata,
        status: uploadMetadata.uploadedChunks === totalChunks ? 'processing' : 'uploading',
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document status:', updateError);
      return NextResponse.json({ error: 'Failed to update document status' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
      progress: {
        uploaded: uploadMetadata.uploadedChunks,
        total: totalChunks,
        percentage: Math.round((uploadMetadata.uploadedChunks / totalChunks) * 100),
      },
    });
  } catch (error: any) {
    console.error('Error uploading chunk:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload chunk' }, { status: 500 });
  }
} 