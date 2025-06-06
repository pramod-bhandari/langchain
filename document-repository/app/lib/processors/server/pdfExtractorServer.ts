/**
 * Server-side PDF text extraction that doesn't rely on client components
 * This is a simple implementation that uses regex patterns to extract text
 */

/**
 * Extract text from a PDF file on the server side
 * This is a simple implementation that doesn't use PDF.js
 * It's less accurate but works on the server
 * 
 * @param file The PDF file as a Blob
 * @returns Promise resolving to the extracted text
 */
export async function extractPdfTextServer(file: Blob): Promise<string> {
  try {
    console.log('Server PDF extractor started, file size:', file.size, 'bytes');
    
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log('Converted PDF to Uint8Array, length:', uint8Array.length);
    
    // Convert to a string (may lose binary data, but we only need text)
    let fileContent = '';
    for (let i = 0; i < uint8Array.length; i++) {
      fileContent += String.fromCharCode(uint8Array[i]);
    }
    console.log('Converted PDF binary to string, length:', fileContent.length);
    
    // Use regex to extract text blocks from the PDF
    // This is not perfect but can extract some text from PDFs
    let extractedText = '';
    console.log('Starting text extraction using regex patterns...');
    
    // Extract text using various regex patterns commonly found in PDFs
    
    // Pattern 1: Find text between BT and ET tags (Basic text objects)
    const textObjects = fileContent.match(/BT([\s\S]*?)ET/g) || [];
    console.log(`Found ${textObjects.length} text objects between BT/ET tags`);
    
    for (const textObj of textObjects) {
      // Extract text strings using the Tj operator
      const tjMatches = textObj.match(/\((.*?)\)[ ]?Tj/g) || [];
      console.log(`Found ${tjMatches.length} Tj text operators in this text object`);
      
      for (const match of tjMatches) {
        const text = match.match(/\((.*?)\)/) || [];
        if (text[1]) {
          extractedText += text[1] + ' ';
        }
      }
      
      // Extract text using TJ operator (array of strings)
      const tjArrayMatches = textObj.match(/\[(.*?)\][ ]?TJ/g) || [];
      console.log(`Found ${tjArrayMatches.length} TJ array text operators in this text object`);
      
      for (const match of tjArrayMatches) {
        const textParts = match.match(/\((.*?)\)/g) || [];
        for (const part of textParts) {
          const text = part.match(/\((.*?)\)/) || [];
          if (text[1]) {
            extractedText += text[1] + ' ';
          }
        }
      }
    }
    
    console.log('Raw extracted text length before cleanup:', extractedText.length);
    
    // Try additional extraction patterns if we didn't get much text
    if (extractedText.length < 100) {
      console.log('Text extraction yielded minimal results, trying alternative patterns...');
      
      // Look for text in stream objects (more generic approach)
      const streamObjects = fileContent.match(/stream([\s\S]*?)endstream/g) || [];
      console.log(`Found ${streamObjects.length} stream objects to try`);
      
      for (const stream of streamObjects) {
        // Look for any text-like content in the stream
        const textMatches = stream.match(/[a-zA-Z0-9\s.,;:'"!?()-]{4,}/g) || [];
        for (const match of textMatches) {
          if (match.length > 10 && /[a-zA-Z]/.test(match)) { // Only add if it looks like real text
            extractedText += match + ' ';
          }
        }
      }
      
      console.log('After alternative extraction, text length:', extractedText.length);
    }
    
    // Clean up the extracted text
    console.log('Cleaning up extracted text...');
    extractedText = extractedText
      .replace(/\\(\d{3})/g, (match, octal) => {
        return String.fromCharCode(parseInt(octal, 8));
      })
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Final extracted text length after cleanup:', extractedText.length);
    
    // If we couldn't extract text, return a placeholder
    if (!extractedText || extractedText.trim().length === 0) {
      console.log('No text extracted, returning placeholder message');
      return "This PDF document may contain scanned text or it's protected. Please use OCR or upload a text-based PDF.";
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return "Failed to extract text from the PDF document.";
  }
} 