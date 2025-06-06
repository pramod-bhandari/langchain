import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { serverConfig } from '@/lib/config';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker for server environment
if (typeof window === 'undefined') {
  // For server-side, use node-canvas if available or disable worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';  // Disable worker for server
}

// Define the type for chunks
interface TextChunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
}

// API Config using the correct App Router format for Next.js 14
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute timeout (Vercel limitation)

// Helper function to process PDF without relying on worker
async function processPdfDocument(arrayBuffer: ArrayBuffer, startPage: number, endPage: number): Promise<{
  text: string[];
  totalPages: number;
}> {
  try {
    // Load PDF with worker disabled
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      // @ts-expect-error - disableWorker is a valid option but TypeScript doesn't recognize it
      disableWorker: true
    });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    
    // Process pages in range
    const pageTexts: string[] = [];
    const actualEndPage = Math.min(endPage || totalPages, totalPages);
    
    for (let pageNum = startPage; pageNum <= actualEndPage; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      
      // Extract text
      const pageText = content.items
        .map(item => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ')
        .trim();
      
      pageTexts.push(pageText);
    }
    
    return {
      text: pageTexts,
      totalPages
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Process file API endpoint
export async function POST(request: Request) {
  console.log('Process file API route hit');
  
  try {
    // Parse the request JSON
    const body = await request.json();
    const { fileName, fileType, publicUrl, storageKey, startPage, endPage } = body;
    
    if (!storageKey || !publicUrl) {
      return NextResponse.json(
        { error: 'Missing required file information' },
        { status: 400 }
      );
    }

    console.log('Processing file:', {
      fileName,
      fileType,
      publicUrl,
      startPage,
      endPage
    });

    // 1. Get file from Supabase Storage
    console.log('Fetching file from storage...');
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .download(storageKey);

    if (fileError || !fileData) {
      console.error('Storage fetch error:', fileError);
      throw new Error(`Failed to get file from storage: ${fileError?.message || 'No file data'}`);
    }

    // 2. Process the file based on its type
    let chunks: TextChunk[] = [];
    let totalPages = 0;
    let processedPages = 0;
    
    // For initialization when processing the first chunk
    const isFirstChunk = startPage === 1;
    const startPageNum = startPage || 1;
    
    if (fileType === 'application/pdf') {
      // Process PDF pages in the specified range
      const arrayBuffer = await fileData.arrayBuffer();
      
      // Use our helper function to process PDF without worker dependency
      const { text: pageTexts, totalPages: pdfTotalPages } = await processPdfDocument(
        arrayBuffer, 
        startPageNum, 
        endPage || 999999 // Use a large number as default
      );
      
      totalPages = pdfTotalPages;
      
      // Process each page text
      for (let i = 0; i < pageTexts.length; i++) {
        const currentPage = startPageNum + i;
        const pageText = pageTexts[i];
        
        // Split page text into chunks
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });
        
        const pageChunks = await splitter.splitText(pageText);
        
        // Add chunks with metadata
        pageChunks.forEach((chunk, chunkIndex) => {
          // Make sure chunk content is JSON-safe
          const sanitizedContent = chunk.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
          
          chunks.push({
            content: sanitizedContent,
            pageNumber: currentPage,
            chunkIndex,
          });
        });
        
        processedPages++;
      }
    } else if (fileType === 'text/plain') {
      // For text files, just create a single chunk
      const text = await fileData.text();
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      
      const textChunks = await splitter.splitText(text);
      
      chunks = textChunks.map((chunk, index) => ({
        content: chunk,
        pageNumber: 1,
        chunkIndex: index,
      }));
      
      totalPages = 1;
      processedPages = 1;
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    console.log('Processing complete:', { 
      processedPages,
      totalPages, 
      chunksCount: chunks.length 
    });

    // 3. Generate embeddings for this batch of chunks
    console.log('Generating embeddings for chunks');
    const embeddings = new OpenAIEmbeddings({
      modelName: serverConfig.openai.embeddingModel,
      dimensions: serverConfig.openai.embeddingDimensions,
      openAIApiKey: serverConfig.openai.apiKey
    });

    // Generate embeddings for each chunk
    const chunkEmbeddings = await Promise.all(
      chunks.map(async (chunk) => {
        const embedding = await embeddings.embedQuery(chunk.content);
        return {
          content: chunk.content,
          embedding,
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex
        };
      })
    );
    console.log('Embeddings generated successfully');

    // 4. If this is the first chunk, create the document record
    let documentId;
    if (isFirstChunk) {
      console.log('Creating document record...');
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          title: fileName,
          metadata: {
            fileType: fileType,
            totalPages,
            processingStatus: 'in_progress',
            processedPages
          },
          public_url: publicUrl
        })
        .select()
        .single();

      if (docError) {
        console.error('Database error:', docError);
        throw new Error(`Failed to store document: ${docError.message}`);
      }
      
      documentId = document.id;
    } else {
      // Get the document ID for an existing document
      const { data: existingDoc, error: docError } = await supabase
        .from('documents')
        .select('id')
        .eq('public_url', publicUrl)
        .single();
        
      if (docError) {
        console.error('Error fetching document:', docError);
        throw new Error(`Failed to fetch document: ${docError.message}`);
      }
      
      documentId = existingDoc.id;
      
      // Update the document's processing status
      await supabase
        .from('documents')
        .update({
          metadata: {
            fileType: fileType,
            totalPages,
            processingStatus: processedPages >= totalPages ? 'complete' : 'in_progress',
            processedPages
          }
        })
        .eq('id', documentId);
    }

    // 5. Store chunks and embeddings in document_chunks table
    console.log('Storing chunks and embeddings');
    
    // Log the first chunk structure to debug
    if (chunkEmbeddings.length > 0) {
      console.log('First chunk structure (without content):', {
        ...chunkEmbeddings[0],
        content: '[content truncated]',
      });
    }
    
    // Insert with simplified schema that matches our database
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(
        chunkEmbeddings.map(({ content, embedding }) => ({
          document_id: documentId,
          content: content,
          embedding: embedding
          // Removed page_number and chunk_index which aren't in the schema
        }))
      );

    if (chunksError) {
      console.error('Chunks storage error:', chunksError);
      throw new Error(`Failed to store chunks: ${chunksError.message}`);
    }

    console.log('Chunks stored successfully');

    // Return processing status
    return NextResponse.json({ 
      success: true,
      message: 'File chunk processed successfully',
      documentId,
      processedPages,
      totalPages,
      chunksProcessed: chunks.length,
      isComplete: processedPages >= totalPages
    });
  } catch (error) {
    console.error('Process file API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    );
  }
} 