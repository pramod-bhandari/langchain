import { getSupabaseClient } from '../supabase/client';
import { extractTextFromImage } from '../ocr/imageProcessor';
import { extractPdfText } from './pdfExtractor';
import { extractDocxText } from './docxExtractor';
import { extractXlsxText } from './xlsxExtractor';
import { extractPdfTextServer } from './server/pdfExtractorServer';

// Check if we're running on the server or client
const isServer = typeof window === 'undefined';

/**
 * Extract text from uploaded documents
 * This is a simplified implementation for common file types
 * 
 * Overloaded function that can accept either:
 * 1. A document ID, file path, and file type (server-side)
 * 2. A File object directly (client-side)
 */
export async function extractTextFromDocument(documentId: string, filePath: string, fileType: string): Promise<string>;
export async function extractTextFromDocument(file: File): Promise<string>;
export async function extractTextFromDocument(
  documentIdOrFile: string | File, 
  filePath?: string, 
  fileType?: string
): Promise<string> {
  try {
    let data: Blob;
    let actualFileType: string;
    
    // Handle overloaded cases
    if (typeof documentIdOrFile === 'string' && filePath && fileType) {
      // Case 1: Extract from storage using document ID, path, and type
      // The documentId is passed through but not used directly after this point
      const supabase = getSupabaseClient();
      
      // 1. Download the file from Supabase Storage
      const { data: fileData, error } = await supabase.storage
        .from('documentscollection')
        .download(filePath);
      
      if (error) throw error;
      if (!fileData) throw new Error('No data found for document');
      
      data = fileData;
      actualFileType = fileType;
    } else if (documentIdOrFile instanceof File) {
      // Case 2: Use the provided File object directly
      data = documentIdOrFile;
      actualFileType = documentIdOrFile.type || 
        inferTypeFromName(documentIdOrFile.name) || 
        'application/octet-stream';
    } else {
      throw new Error('Invalid arguments: provide either (documentId, filePath, fileType) or (File)');
    }
    
    // 2. Extract text based on file type
    let text = '';
    
    switch (actualFileType) {
      case 'application/pdf':
        try {
          console.log('PDF extraction starting. Environment:', isServer ? 'server' : 'client');
          
          // Use the appropriate PDF extractor based on environment
          if (isServer) {
            // Server-side PDF extraction
            console.log('Using server-side PDF extraction');
            text = await extractPdfTextServer(data);
            console.log('Server-side PDF extraction completed. Text length:', text.length);
            console.log('Sample of extracted text (first 200 chars):', text.substring(0, 200));
          } else {
            // Client-side PDF extraction using PDF.js
            console.log('Using client-side PDF extraction');
            text = await extractPdfText(data);
            console.log('Client-side PDF extraction completed. Text length:', text.length);
            console.log('Sample of extracted text (first 200 chars):', text.substring(0, 200));
          }
        } catch (pdfError) {
          console.error('Error with PDF extraction:', pdfError);
          text = `Failed to extract PDF text: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`;
        }
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        text = await extractDocxText(data);
        break;
      case 'text/plain':
        text = await data.text();
        break;
      case 'text/csv':
        text = await data.text();
        break;
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        text = await extractXlsxText(data);
        break;
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
      case 'image/webp':
      case 'image/tiff':
        // Use OCR for image files
        const buffer = await data.arrayBuffer();
        text = await extractTextFromImage(Buffer.from(buffer));
        break;
      default:
        // Attempt to extract as plain text for unknown types
        try {
          // Check if it's an image type even if not explicitly matched above
          if (actualFileType.startsWith('image/')) {
            const buffer = await data.arrayBuffer();
            text = await extractTextFromImage(Buffer.from(buffer));
          } else {
            text = await data.text();
          }
        } catch (error) {
          console.error(`Failed to extract text from unknown file type: ${actualFileType}`, error);
          throw new Error(`Unsupported file type: ${actualFileType}`);
        }
    }
    
    return text;
  } catch (error) {
    console.error('Error extracting text:', error);
    throw error;
  }
}

/**
 * Infer file type from filename when MIME type is not available
 */
function inferTypeFromName(filename: string): string | null {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return null;
  
  const extensionMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'tiff': 'image/tiff',
    'md': 'text/markdown',
  };
  
  return extensionMap[extension] || null;
}

/**
 * Import the specialized PDF extractor which uses pdf.js
 * This implementation is in a separate file because it needs the client directive
 * for proper initialization of the pdf.js worker
 * 
 * @see pdfExtractor.ts for implementation details
 */

// The actual implementations are now imported from dedicated files:
// - extractDocxText from './docxExtractor'
// - extractXlsxText from './xlsxExtractor' 