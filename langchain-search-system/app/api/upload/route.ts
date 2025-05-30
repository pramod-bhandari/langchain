import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { serverConfig } from '@/lib/config';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Configure the runtime and route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

// Initialize PDF.js worker
GlobalWorkerOptions.workerSrc = join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.js');

// Helper function to extract text from PDF
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const tempFile = join(tmpdir(), `temp-${Date.now()}.pdf`);
  try {
    console.log('Saving PDF to temporary file...');
    await writeFile(tempFile, buffer);
    
    console.log('Extracting text from PDF...');
    const pdf = await getDocument(tempFile).promise;
    const numPages = pdf.numPages;
    const textContent = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map(item => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ');
      textContent.push(pageText);
    }

    const text = textContent.join('\n');
    console.log('PDF text extraction completed');
    return text.trim();
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up temporary file
    try {
      await unlink(tempFile);
      console.log('Temporary file cleaned up');
    } catch (error) {
      console.error('Error cleaning up temporary file:', error);
    }
  }
}

// Helper function to split text into chunks
async function splitTextIntoChunks(text: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  
  const chunks = await splitter.splitText(text);
  return chunks;
}

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

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    console.log('File uploaded to storage successfully');

    // 2. Process file content based on type
    let content: string;
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    try {
      console.log('Processing file content, type:', fileType);
      switch (fileType) {
        case 'pdf':
          content = await extractTextFromPDF(buffer);
          if (!content || content.trim().length === 0) {
            throw new Error('No text content could be extracted from the PDF');
          }
          break;
        case 'txt':
          content = buffer.toString('utf-8');
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}. Currently only PDF and TXT files are supported.`);
      }
      console.log('File content processed successfully');

      // Split content into chunks
      const chunks = await splitTextIntoChunks(content);
      console.log(`Content split into ${chunks.length} chunks`);

      // 3. Generate embeddings for each chunk
      console.log('Generating embeddings');
      const embeddings = new OpenAIEmbeddings({
        modelName: serverConfig.openai.embeddingModel,
        dimensions: serverConfig.openai.embeddingDimensions,
        openAIApiKey: serverConfig.openai.apiKey
      });

      // Generate embeddings for each chunk
      const chunkEmbeddings = await Promise.all(
        chunks.map(async (chunk, index) => {
          const embedding = await embeddings.embedQuery(chunk);
          return {
            chunk,
            embedding,
            chunkIndex: index
          };
        })
      );
      console.log('Embeddings generated successfully');

      // 4. Store document metadata in database
      console.log('Storing document metadata');
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          title: file.name,
          metadata: {
            fileType: fileType,
            fileSize: file.size,
            source: fileName,
            totalChunks: chunks.length
          },
          public_url: publicUrl
        })
        .select()
        .single();

      if (docError) {
        console.error('Database error:', docError);
        throw new Error(`Failed to store document: ${docError.message}`);
      }

      // 5. Store chunks and embeddings in document_chunks table
      console.log('Storing chunks and embeddings');
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .insert(
          chunkEmbeddings.map(({ chunk, embedding, chunkIndex }) => ({
            document_id: document.id,
            content: chunk,
            embedding: embedding,
            chunk_index: chunkIndex
          }))
        );

      if (chunksError) {
        console.error('Chunks storage error:', chunksError);
        throw new Error(`Failed to store chunks: ${chunksError.message}`);
      }

      console.log('Document and chunks stored successfully');

      return NextResponse.json({ 
        success: true,
        message: 'File uploaded and processed successfully',
        chunks: chunks.length,
        publicUrl: publicUrl
      });
    } catch (error) {
      console.error('File processing error:', error);
      throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
} 