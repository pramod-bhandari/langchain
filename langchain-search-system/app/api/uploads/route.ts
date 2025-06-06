import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { serverConfig } from '@/lib/config';
import pdfParse from 'pdf-parse';

// Configure the runtime and route
// export const runtime = 'nodejs';
// export const dynamic = 'force-dynamic';
// export const maxDuration = 300; // 5 minutes timeout

// Ensure this is a POST endpoint
export async function POST(request: Request) {
  console.log('API route hit - POST method');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('Processing file:', file.name);

    // Convert File to Buffer for processing
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    console.log('Uploading to Supabase storage:', fileName);

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    console.log('File uploaded to storage successfully');

    // 2. Process file content based on type
    let content: string;
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    try {
      console.log('Processing file content, type:', fileType);
      switch (fileType) {
        case 'pdf':
          const pdfData = await pdfParse(buffer);
          content = pdfData.text;
          break;
        case 'txt':
          content = buffer.toString('utf-8');
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}. Currently only PDF and TXT files are supported.`);
      }
      console.log('File content processed successfully');
    } catch (error) {
      console.error('File processing error:', error);
      throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // 3. Generate embeddings
    try {
      console.log('Generating embeddings');
      const embeddings = new OpenAIEmbeddings({
        modelName: serverConfig.openai.embeddingModel,
        dimensions: serverConfig.openai.embeddingDimensions,
        openAIApiKey: serverConfig.openai.apiKey
      });
      const embedding = await embeddings.embedQuery(content);
      console.log('Embeddings generated successfully');

      // 4. Store document in database
      console.log('Storing document in database');
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          title: file.name,
          content: content,
          metadata: {
            fileType: fileType,
            fileSize: file.size,
            source: fileName,
            uploadedAt: new Date().toISOString()
          },
          embedding: embedding
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Failed to store document: ${dbError.message}`);
      }

      console.log('Document stored successfully');

      return NextResponse.json({ 
        success: true,
        message: 'File uploaded and processed successfully'
      });
    } catch (error) {
      console.error('Embedding or database error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
} 