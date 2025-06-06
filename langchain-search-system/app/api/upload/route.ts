import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { config } from './config';

// Export config for API route to increase limits
export { config };

// Configure the runtime and route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute timeout (Vercel limitation)

// Ensure this is a POST endpoint
export async function POST(request: Request) {
  console.log('Upload API route hit');
  
  // Check if the request has headers
  const contentType = request.headers.get('content-type') || '';
  console.log('Content-Type header:', contentType);
  
  try {
    // Check if this is a multipart/form-data request
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Expected multipart/form-data request' },
        { status: 400 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Upload file to Supabase Storage
    console.log('Uploading to Supabase...');
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${Date.now()}.${fileExt}`;

    // Convert File to ArrayBuffer then to Uint8Array for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, fileBuffer, {
        contentType: file.type
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Return success with file info for the client to trigger processing
    return NextResponse.json({ 
      success: true,
      message: 'File uploaded successfully',
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      publicUrl: publicUrl,
      storageKey: fileName
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
} 