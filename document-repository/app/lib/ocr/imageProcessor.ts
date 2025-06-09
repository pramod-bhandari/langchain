import { createWorker } from 'tesseract.js';

// Define the type for image data that Tesseract.js can accept
type ImageLike = string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | 
                 CanvasRenderingContext2D | File | Blob | ImageData | Buffer;

/**
 * Extract text from an image using OCR
 * @param imageData The image data to process
 * @param language The language to use for OCR (default: 'eng')
 * @returns Extracted text from the image
 */
export async function extractTextFromImage(
  imageData: ImageLike,
  language = 'eng'
): Promise<string> {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('This function is meant to be used in a browser environment');
    }
    
    // Create a worker with the specified language
    const worker = await createWorker();
    await worker.loadLanguage(language);
    await worker.initialize(language);

    // Recognize text from the image data
    const { data } = await worker.recognize(imageData);
    
    // Terminate the worker
    await worker.terminate();
    
    return data.text;
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process an image file and extract its text content using Tesseract.js OCR
 * @param file The image file to process
 * @param language The language to use for OCR (default: 'eng')
 * @param progressCallback Optional callback for progress updates
 * @returns Extracted text content
 */
export async function processImageFile(
  file: File, 
  language = 'eng',
  progressCallback?: (progress: number, status: string) => void
): Promise<string> {
  try {
    console.log(`Starting OCR processing for ${file.name} (${file.type}, ${file.size} bytes)`);
    
    // Initial progress update
    if (progressCallback) {
      progressCallback(5, 'Initializing OCR engine...');
    }
    
    console.log('OCR: Creating worker...');
    
    // Create the worker
    const worker = await createWorker();
    
    console.log('OCR: Worker created, setting up logger...');
    
    // Set up the logger to track progress
    worker.setLogger(m => {
      console.log('OCR Progress:', JSON.stringify(m));
      
      if (!progressCallback) return;
      
      // Extract status and progress information
      const status = m.status || '';
      const progress = m.progress || 0;
      
      console.log(`OCR Status: ${status}, Progress: ${progress}`);
      
      // Map status to user-friendly messages and progress percentages
      if (status === 'loading tesseract core') {
        progressCallback(10, 'Loading OCR engine...');
      } 
      else if (status === 'initializing tesseract') {
        progressCallback(15, 'Setting up OCR engine...');
      }
      else if (status === 'loading language traineddata') {
        progressCallback(25, `Loading language data (${language})...`);
      }
      else if (status === 'initializing api') {
        progressCallback(35, 'Preparing OCR processor...');
      }
      else if (status === 'recognizing text') {
        // Map the internal progress (0-1) to our scale (40-90)
        const scaledProgress = 40 + Math.floor(progress * 50);
        progressCallback(scaledProgress, `Processing image: ${Math.floor(progress * 100)}%`);
      }
      else if (status === 'done') {
        progressCallback(95, 'Completing OCR processing...');
      }
      else {
        // For any other status, provide a default message
        progressCallback(45, `OCR in progress: ${status}`);
      }
    });

    console.log('OCR: Worker setup complete, loading language...');

    // Explicitly load the language and initialize the worker
    await worker.loadLanguage(language);
    console.log('OCR: Language loaded, initializing worker...');
    
    await worker.initialize(language);
    console.log('OCR: Worker initialized successfully');
    
    if (progressCallback) {
      progressCallback(40, 'Starting text recognition...');
    }
    
    console.log('OCR: Worker initialized, processing image...');
    
    // Process the image
    const { data } = await worker.recognize(file);
    const textLength = data.text.length;
    
    console.log(`OCR: Processing complete, extracted ${textLength} characters`);
    
    if (progressCallback) {
      progressCallback(95, `Finalizing (${textLength} characters extracted)...`);
    }
    
    // Clean up
    console.log('OCR: Terminating worker...');
    await worker.terminate();
    console.log('OCR: Worker terminated successfully');
    
    if (progressCallback) {
      progressCallback(100, 'OCR processing complete!');
    }
    
    return data.text;
  } catch (error) {
    console.error('Image processing error:', error);
    if (progressCallback) {
      progressCallback(0, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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