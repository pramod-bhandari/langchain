import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    
    // Get document and chunks count
    const [documentResult, chunksResult] = await Promise.all([
      supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single(),
      
      supabase
        .from('chunks')
        .select('id', { count: 'exact' })
        .eq('document_id', documentId)
    ]);
    
    if (documentResult.error) {
      throw documentResult.error;
    }
    
    if (!documentResult.data) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Calculate processing status
    const document = documentResult.data;
    const chunksCount = chunksResult.count || 0;
    
    // Get processing status from metadata
    const processingStatus = 
      document.metadata?.processing_status || 
      (chunksCount > 0 ? 'completed' : 'processing');
    
    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        description: document.description,
        file_type: document.file_type,
        file_size: document.file_size,
        created_at: document.created_at,
        updated_at: document.updated_at,
      },
      processing: {
        status: processingStatus,
        chunks_count: chunksCount,
        error: document.metadata?.error_message,
        processed_at: document.metadata?.processed_at,
      }
    });
  } catch (error) {
    console.error('Error getting document status:', error);
    return NextResponse.json(
      { error: 'Failed to get document status' },
      { status: 500 }
    );
  }
} 