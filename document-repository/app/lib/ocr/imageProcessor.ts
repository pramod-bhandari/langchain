import { createWorker } from 'tesseract.js';

/**
 * Extract text from an image using OCR
 * @param imageBuffer The image buffer to process
 * @param language The language to use for OCR (default: 'eng')
 * @returns Extracted text from the image
 */
export async function extractTextFromImage(
  imageBuffer: Buffer, 
  language = 'eng'
): Promise<string> {
  try {
    // Create a worker with the specified language
    const worker = await createWorker(language);

    // Recognize text from the image buffer
    const { data } = await worker.recognize(imageBuffer);
    
    // Terminate the worker
    await worker.terminate();
    
    return data.text;
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process an image file and extract its text content
 * @param file The image file to process
 * @returns Extracted text content
 */
export async function processImageFile(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);
    
    return await extractTextFromImage(imageBuffer);
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error(`Failed to process image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Detect if a file is an image based on its MIME type
 * @param file The file to check
 * @returns Boolean indicating if the file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
} 