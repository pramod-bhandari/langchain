'use client';

import * as XLSX from 'xlsx';

/**
 * Extract text from an XLSX file
 * @param file The XLSX file or blob to extract text from
 * @returns Promise resolving to the extracted text
 */
export async function extractXlsxText(file: Blob): Promise<string> {
  try {
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Read the workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Initialize text content
    let textContent = '';
    
    // Extract text from each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      
      // Add sheet name as a header
      textContent += `Sheet: ${sheetName}\n\n`;
      
      // Convert sheet to JSON for easier text extraction
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Convert each row to text
      for (const row of jsonData) {
        if (Array.isArray(row) && row.length > 0) {
          textContent += row.join('\t') + '\n';
        }
      }
      
      textContent += '\n\n';
    }
    
    return textContent.trim();
  } catch (error) {
    console.error('Error extracting text from XLSX:', error);
    throw new Error(`Failed to extract text from XLSX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from an XLSX with metadata
 * @param file The XLSX file to process
 * @returns Promise resolving to extracted text and metadata
 */
export async function extractXlsxWithMetadata(file: Blob): Promise<{ text: string; metadata: Record<string, unknown> }> {
  try {
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Read the workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Extract text
    const text = await extractXlsxText(file);
    
    // Extract metadata
    const metadata: Record<string, unknown> = {
      sheetNames: workbook.SheetNames,
      sheetCount: workbook.SheetNames.length,
      extractionMethod: 'xlsx',
      props: workbook.Props || {}
    };
    
    return {
      text,
      metadata
    };
  } catch (error) {
    console.error('Error extracting XLSX with metadata:', error);
    throw new Error(`Failed to extract XLSX with metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 