import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/app/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { OpenAIEmbeddings } from '@langchain/openai';
import { getOpenAIApiKey } from '@/app/lib/openai/config';

/**
 * API route for document uploads
 * Handles file upload to Supabase storage and creates a database record
 */
export async function POST(req: Request) {
  try {
    // Check if the request is a multipart form
    if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Request must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string || file.name;
    const description = formData.get('description') as string || '';
    
    // Get client-extracted content if available
    const extractedText = formData.get('extractedText') as string;
    const extractedChunks = formData.get('extractedChunks') as string;
    const extractionMetadata = formData.get('extractionMetadata') as string;

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generate a unique ID for the document
    const documentId = uuidv4();
    
    // Create a unique file path
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${documentId}.${fileExtension}`;
    const filePath = `documents/${fileName}`;

    // Determine file type
    let fileType = file.type;
    if (!fileType) {
      // Try to infer file type from extension
      const extensionMap: Record<string, string> = {
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png'
      };
      fileType = extensionMap[fileExtension.toLowerCase()] || 'application/octet-stream';
    }

    // Convert File to ArrayBuffer to upload to Supabase
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Get Supabase client
    const supabase = getSupabaseClient();

    // Check if the bucket exists
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      console.log('Buckets:', buckets);
      
      if (bucketsError) {
        console.error('Error checking buckets:', bucketsError);
        // This might happen if the user doesn't have permission to list buckets
        // Let's try to create or use the bucket anyway
        console.log('Attempting to create bucket or use it directly...');
        
        // Try to create the bucket (this might fail if it already exists)
        try {
          await supabase.storage.createBucket('documentscollection', {
            public: false
          });
          console.log('Successfully created documents bucket');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          // Ignore errors here - the bucket might already exist
          console.log('Note: Could not create bucket, might already exist');
        }
      } else if (!buckets || buckets.length === 0) {
        // If buckets is empty, the user might not have permission to list
        console.log('No buckets found. Attempting to create or use bucket directly...');
        
        // Try to create the bucket
        try {
          await supabase.storage.createBucket('documentscollection', {
            public: false
          });
          console.log('Successfully created documents bucket');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (createError) {
          // Ignore errors - we'll try to use the bucket directly
          console.log('Note: Could not create bucket, might already exist');
        }
      } else {
        // We have a list of buckets, check if our bucket exists
        const documentsBucketExists = buckets.some(bucket => bucket.name === 'documentscollection');
        if (!documentsBucketExists) {
          console.error('Documents bucket does not exist, attempting to create it...');
          
          // Try to create the bucket
          try {
            const { error: createError } = await supabase.storage.createBucket('documentscollection', {
              public: false
            });
            
            if (createError) {
              console.error('Failed to create bucket:', createError);
              return NextResponse.json(
                { 
                  error: 'Storage bucket "documentscollection" does not exist and could not be created', 
                  details: 'Please create a storage bucket named "documentscollection" in your Supabase dashboard.'
                },
                { status: 500 }
              );
            } else {
              console.log('Successfully created documents bucket');
            }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (createError) {
            console.error('Error creating bucket:', createError);
            return NextResponse.json(
              { 
                error: 'Storage bucket "documentscollection" does not exist and could not be created', 
                details: 'Please create a storage bucket named "documentscollection" in your Supabase dashboard.'
              },
              { status: 500 }
            );
          }
        } else {
          console.log('documents bucket found and ready to use');
        }
      }
    } catch (bucketCheckError) {
      console.error('Error checking storage buckets:', bucketCheckError);
      // Continue anyway - we'll try to use the bucket directly
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documentscollection')
      .upload(filePath, fileBuffer, {
        contentType: fileType,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('documentscollection')
      .getPublicUrl(filePath);
    
    const fileUrl = publicUrlData?.publicUrl || null;
    console.log('Generated public URL:', fileUrl);

    // Check if we have client-extracted content
    let processingStatus = 'pending';
    let documentMetadata: Record<string, unknown> = {
      original_name: file.name,
      content_type: fileType,
      processing_status: 'pending'
    };

    // FIRST: Create a record in the documents table BEFORE processing chunks
    const { error: dbError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        title,
        description,
        file_path: filePath,
        file_type: fileType,
        file_size: file.size,
        file_url: fileUrl,
        metadata: {
          ...documentMetadata,
          status: processingStatus  // Store status in metadata
        }
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to clean up the uploaded file
      await supabase.storage.from('documentscollection').remove([filePath]);
      
      return NextResponse.json(
        { error: `Failed to create document record: ${dbError.message}` },
        { status: 500 }
      );
    }

    // NOW process client-extracted content AFTER document creation
    if (extractedText && extractedChunks) {
      try {
        console.log('Using client-extracted content for document processing');
        console.log(`Client extractedText length: ${extractedText.length} chars`);
        
        // Parse the extraction metadata and chunks
        const metadata = extractionMetadata ? JSON.parse(extractionMetadata) : {};
        const chunks = JSON.parse(extractedChunks);
        console.log(`Client provided ${chunks.length} extracted chunks`);
        console.log('Client extraction metadata:', metadata);
        
        // Set up OpenAI embeddings
        const openaiApiKey = getOpenAIApiKey();
        if (!openaiApiKey) {
          console.error('Missing OpenAI API key for embedding generation');
          throw new Error('OpenAI API key is required for embedding generation');
        }
        console.log('Got OpenAI API key for embedding generation');
        
        const embeddings = new OpenAIEmbeddings({ 
          openAIApiKey: openaiApiKey,
          modelName: "text-embedding-3-small" // Explicitly set model name
        });
        
        console.log(`Processing ${chunks.length} client-extracted chunks`);
        
        // Generate embeddings for the chunks
        try {
          console.log(`Generating embeddings with model ${embeddings.modelName}`);
          const embeddingResults = await embeddings.embedDocuments(chunks);
          console.log(`Successfully generated ${embeddingResults.length} embeddings`);
          
          // Prepare records for insertion
          const records = chunks.map((content: string, index: number) => ({
            document_id: documentId,
            content,
            embedding: embeddingResults[index],
            metadata: {
              chunk_index: index,
              total_chunks: chunks.length,
              client_extracted: true,
              extraction_method: metadata.extractionMethod || 'client'
            }
          }));
          
          // Insert chunks with embeddings
          console.log(`Inserting ${records.length} chunks into document_chunks table`);
          console.log('First chunk content sample:', records[0].content.substring(0, 50));
          console.log('First chunk embedding sample (first 5 values):', records[0].embedding.slice(0, 5));
          
          // Try both table names (document_chunks and chunks)
          let insertError;
          try {
            const { error } = await supabase
              .from('document_chunks')
              .insert(records);
            
            insertError = error;
            if (error) {
              console.error('Error inserting into document_chunks:', error);
              console.log('Trying alternative table name "chunks"...');
              
              // Try the alternative table name
              const { error: error2 } = await supabase
                .from('chunks')
                .insert(records);
              
              if (error2) {
                console.error('Error inserting into chunks table:', error2);
                insertError = error2;
              } else {
                console.log('Successfully inserted into chunks table');
                insertError = null;
              }
            }
          } catch (err) {
            console.error('Exception during chunk insertion:', err);
            insertError = err;
          }
          
          if (insertError) {
            console.error('Error inserting chunks:', insertError);
            console.log('Insert Error details:', JSON.stringify(insertError, null, 2));
            throw insertError;
          }
          
          console.log('Successfully inserted chunks with embeddings');
          
          // Update metadata and status
          processingStatus = 'completed';
          documentMetadata = {
            ...documentMetadata,
            status: 'completed',
            processing_status: 'completed',
            progress: 1.0,
            processed_at: new Date().toISOString(),
            extracted_text_length: extractedText.length,
            has_extracted_text: true,
            chunks_count: chunks.length,
            extraction_source: 'client',
            extraction_method: metadata.extractionMethod || 'client',
            word_count: metadata.wordCount || 0,
            skip_server_processing: true, // Explicit flag to skip server processing
            client_processed: true        // Additional flag for clarity
          };
          
          // Update the document with the new status
          const { error: updateError } = await supabase
            .from('documents')
            .update({
              metadata: {
                ...documentMetadata,
                status: processingStatus  // Store status in metadata
              }
            })
            .eq('id', documentId);
            
          if (updateError) {
            console.error('Error updating document status:', updateError);
          }
          
          console.log('Successfully processed client-extracted content');
        } catch (embeddingError) {
          console.error('Error generating embeddings:', embeddingError);
          throw embeddingError;
        }
      } catch (processingError) {
        console.error('Error processing client-extracted content:', processingError);
        // Fall back to server-side processing if client extraction processing fails
        processingStatus = 'pending';
      }
    }

    // Start background processing only if we haven't already processed client-extracted content
    if (processingStatus === 'pending') {
      console.log('Scheduling server-side document processing');
      setTimeout(async () => {
        try {
          await fetch(`${req.headers.get('origin')}/api/documents/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              documentId,
            }),
          });
        } catch (error) {
          console.error('Error triggering document processing:', error);
        }
      }, 100);
    } else {
      console.log('Skipping server-side processing, document already processed');
    }

    // Return success with document info
    return NextResponse.json({
      id: documentId,
      title,
      file_path: filePath,
      file_url: fileUrl,
      file_type: fileType,
      file_size: file.size,
      status: processingStatus
    });
    
  } catch (error) {
    console.error('Upload handler error:', error);
    // Ensure we always return a proper JSON response
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : 'No stack trace available'
      },
      { status: 500 }
    );
  }
} 