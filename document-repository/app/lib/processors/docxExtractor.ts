'use client';

import mammoth from 'mammoth';

/**
 * Extract text from a DOCX file
 * @param file The DOCX file or blob to extract text from
 * @returns Promise resolving to the extracted text
 */
export async function extractDocxText(file: Blob): Promise<string> {
  try {
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Use mammoth to extract the text
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    // Return the extracted text
    return result.value.trim();
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from a DOCX with metadata
 * @param file The DOCX file to process
 * @returns Promise resolving to extracted text and metadata
 */
export async function extractDocxWithMetadata(file: Blob): Promise<{ text: string; metadata: Record<string, unknown> }> {
  try {
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Use mammoth to extract the text
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    
    // Try to extract some basic metadata
    // Note: mammoth doesn't provide comprehensive metadata extraction
    // For more detailed metadata, you might need another library
    const metadata: Record<string, unknown> = {
      contentLength: textResult.value.length,
      extractionMethod: 'mammoth.js',
    };
    
    return {
      text: textResult.value.trim(),
      metadata
    };
  } catch (error) {
    console.error('Error extracting DOCX with metadata:', error);
    throw new Error(`Failed to extract DOCX with metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 