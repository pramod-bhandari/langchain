import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/app/lib/supabase/client';

/**
 * API endpoint to check the status of a document
 * This allows the client to poll for updates during processing
 */
export async function GET(request: Request) {
  try {
    // Get the document ID from the query parameters
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // Get Supabase client
    const supabase = getSupabaseClient();
    
    // Fetch the document
    const { data: document, error } = await supabase
      .from('documents')
      .select('metadata')
      .eq('id', documentId)
      .single();
    
    if (error) {
      console.error('Error fetching document status:', error);
      return NextResponse.json(
        { error: `Failed to fetch document status: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Extract status from the metadata
    const metadata = document.metadata || {};
    
    // Check for status in either location (direct status or processing_status)
    const status = metadata.status || metadata.processing_status || 'pending';
    const progress = metadata.progress || 0;
    const error_message = metadata.error_message;
    
    console.log(`Document ${documentId} status:`, {
      status,
      progress,
      error_message: error_message || 'none'
    });
    
    return NextResponse.json({
      id: documentId,
      status,
      progress,
      error: error_message,
      metadata
    });
    
  } catch (error) {
    console.error('Error checking document status:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to check document status' 
      },
      { status: 500 }
    );
  }
} 