'use client';

import * as pdfjsLib from 'pdfjs-dist';

// Define TextItem interface to match pdf.js structure
interface TextItem {
  str: string;
  dir?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
}

// Initialize the PDF.js worker
// Use a local worker file instead of CDN to avoid network issues
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.js';
  console.log('PDF.js worker initialized with local worker file');
} catch (error) {
  console.error('Error initializing PDF.js worker:', error);
}

/**
 * Extract text from a PDF file
 * @param file The PDF file or blob to extract text from
 * @returns Promise resolving to the extracted text
 */
export async function extractPdfText(file: Blob): Promise<string> {
  try {
    console.log('PDF Extractor: Starting extraction with PDF.js');
    console.log(`PDF Extractor: File size: ${file.size} bytes, type: ${file.type}`);
    console.log('PDF Extractor: Worker location:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    console.log('PDF Extractor: Loading document with PDF.js');
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    
    // Add a progress callback
    loadingTask.onProgress = (progress) => {
      const percent = progress.loaded / progress.total * 100;
      console.log(`PDF Extractor: Loading progress ${Math.round(percent)}%`);
    };
    
    // Handle password-protected documents
    loadingTask.onPassword = (updatePassword, reason) => {
      console.error('PDF Extractor: Document is password protected');
      updatePassword(''); // Provide empty password to trigger failure properly
    };
    
    const pdfDocument = await loadingTask.promise;
    
    // Get the total number of pages
    const numPages = pdfDocument.numPages;
    console.log(`PDF Extractor: PDF document loaded with ${numPages} pages`);
    
    // Extract text from each page
    let fullText = '';
    
    for (let i = 1; i <= numPages; i++) {
      console.log(`PDF Extractor: Processing page ${i} of ${numPages}`);
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract the text items and join them
      const pageText = textContent.items
        .map((item) => {
          // Check if item has str property (is TextItem)
          if ('str' in item) {
            return (item as TextItem).str;
          }
          return '';
        })
        .join(' ');
      
      fullText += pageText + '\n\n';
      console.log(`PDF Extractor: Extracted ${pageText.length} characters from page ${i}`);
    }
    
    const result = fullText.trim();
    console.log(`PDF Extractor: Completed extraction, total ${result.length} characters`);
    return result;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    // Return a helpful error message that includes more details
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from a PDF with metadata
 * @param file The PDF file to process
 * @returns Promise resolving to extracted text and metadata
 */
export async function extractPdfWithMetadata(file: Blob): Promise<{ text: string; metadata: Record<string, unknown> }> {
  try {
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    // Extract metadata
    const metadata = await pdfDocument.getMetadata();
    
    // Extract text
    const text = await extractPdfText(file);
    
    return {
      text,
      metadata: metadata.info as Record<string, unknown> || {}
    };
  } catch (error) {
    console.error('Error extracting PDF with metadata:', error);
    throw new Error(`Failed to extract PDF with metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 