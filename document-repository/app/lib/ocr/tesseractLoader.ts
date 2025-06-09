/**
 * Wrapper for Tesseract.js to ensure it's only loaded in browser environments
 * and properly configured for serverless deployment
 */

// We'll use dynamic imports to load Tesseract only in browser environments
// This avoids issues with server-side rendering
let tesseractModule: typeof import('tesseract.js') | null = null;

/**
 * Safely load Tesseract.js and return the createWorker function
 * This ensures Tesseract is only loaded in browser environments
 */
export async function getTesseractWorker() {
  // Only load in browser environment
  if (typeof window === 'undefined') {
    throw new Error('Tesseract.js is only supported in browser environments');
  }
  
  // Load Tesseract.js if not already loaded
  if (!tesseractModule) {
    try {
      tesseractModule = await import('tesseract.js');
      console.log('Tesseract.js loaded successfully');
    } catch (error) {
      console.error('Failed to load Tesseract.js:', error);
      throw new Error('Failed to load Tesseract.js');
    }
  }
  
  return tesseractModule.createWorker;
}

// Type definition for logger message from Tesseract
interface TesseractLoggerMessage {
  status: string;
  progress?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Process an image with Tesseract OCR
 * @param imageData Image data to process
 * @param language OCR language to use
 * @param progressCallback Optional progress callback
 * @returns Extracted text
 */
export async function processWithTesseract(
  imageData: File | Blob | string,
  language = 'eng',
  progressCallback?: (progress: number, status: string) => void
) {
  try {
    // Initial progress update
    if (progressCallback) {
      progressCallback(5, 'Initializing OCR engine...');
    }
    
    // Get Tesseract worker creator
    const createWorker = await getTesseractWorker();
    
    // Create a worker - pass language directly as that's the expected format
    const worker = await createWorker(language);
    
    // Set up progress tracking using a custom method that handles worker logger
    if (progressCallback) {
      // Use a try/catch here since the API might change between versions
      try {
        // Access the worker object and try to set a logger
        // @ts-expect-error - Logger property might not be in type definitions
        if (typeof worker.setLogger === 'function') {
          // @ts-expect-error - Worker API may vary
          worker.setLogger((m: TesseractLoggerMessage) => {
            // Extract status and progress information
            const status = m.status || '';
            const progress = m.progress || 0;
            
            // Map status to user-friendly messages
            if (status === 'recognizing text') {
              const scaledProgress = 40 + Math.floor(progress * 50);
              progressCallback(scaledProgress, `Processing image: ${Math.floor(progress * 100)}%`);
            } else if (status) {
              progressCallback(30, `OCR initialization: ${status}`);
            }
          });
        }
      } catch (error) {
        console.warn('Failed to set logger on Tesseract worker', error);
      }
      
      progressCallback(30, 'OCR engine initialized, processing image...');
    }
    
    // Process the image
    const result = await worker.recognize(imageData);
    
    // Clean up
    await worker.terminate();
    
    if (progressCallback) {
      progressCallback(100, 'OCR processing complete!');
    }
    
    return result.data.text;
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 