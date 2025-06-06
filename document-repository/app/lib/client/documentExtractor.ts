'use client';

import { extractPdfText } from "../processors/pdfExtractor";
import { extractDocxText } from "../processors/docxExtractor";
import { extractXlsxText } from "../processors/xlsxExtractor";
import { processImageFile } from "../ocr/imageProcessor";
import { chunkText } from "../processors/textChunker";

export interface ExtractionResult {
  text: string;
  chunks: string[];
  metadata: {
    fileType: string;
    fileName: string;
    extractionMethod: string;
    pageCount?: number;
    wordCount?: number;
    chunkCount: number;
    extractedSize: number;
  }
}

/**
 * Extract text from a file on the client side
 * @param file The file to extract text from
 * @returns Promise resolving to extraction result or null if extraction not possible
 */
export async function extractTextFromFile(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractionResult | null> {
  try {
    // Check file size - don't process files that are too large on client
    const MAX_CLIENT_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_CLIENT_SIZE) {
      console.log(`File too large for client extraction: ${file.size} bytes`);
      return null;
    }
    
    onProgress?.(10, "Starting text extraction...");
    
    // Initialize result
    let text = "";
    let extractionMethod = "unknown";
    
    // Process based on file type
    const fileType = file.type || inferTypeFromName(file.name) || "";
    
    console.log(`Starting client-side extraction for ${file.name} (${fileType})`);
    
    if (fileType === "application/pdf") {
      onProgress?.(20, "Extracting text from PDF...");
      text = await extractPdfText(file);
      extractionMethod = "pdf.js";
    } 
    else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      onProgress?.(20, "Extracting text from DOCX...");
      text = await extractDocxText(file);
      extractionMethod = "mammoth.js";
    }
    else if (fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      onProgress?.(20, "Extracting text from Excel file...");
      text = await extractXlsxText(file);
      extractionMethod = "xlsx";
    }
    else if (fileType.startsWith("image/") && file.size < 5 * 1024 * 1024) { // 5MB limit for images
      onProgress?.(20, "Performing OCR on image...");
      text = await processImageFile(file);
      extractionMethod = "tesseract.js";
    }
    else if (fileType === "text/plain" || fileType === "text/csv" || fileType === "text/markdown") {
      onProgress?.(20, "Reading text file...");
      text = await file.text();
      extractionMethod = "text";
    }
    else {
      console.log(`Unsupported file type for client extraction: ${fileType}`);
      return null;
    }

    // If extraction failed or returned minimal text
    if (!text || text.trim().length < 50) {
      console.log(`Extraction returned insufficient text (${text.length} chars)`);
      return null;
    }
    
    onProgress?.(50, "Chunking extracted text...");
    
    // Generate chunks
    const chunks = chunkText(text, 1000, 200);
    
    onProgress?.(70, "Finalizing extraction...");
    
    // Calculate simple stats
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    const result = {
      text,
      chunks,
      metadata: {
        fileType,
        fileName: file.name,
        extractionMethod,
        wordCount,
        chunkCount: chunks.length,
        extractedSize: text.length
      }
    };
    
    onProgress?.(90, `Extracted ${wordCount} words in ${chunks.length} chunks`);
    
    return result;
  } catch (error) {
    console.error("Client-side extraction error:", error);
    return null;
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