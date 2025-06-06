import { createWorker, Worker } from 'tesseract.js';

/**
 * OCR processor using Tesseract.js for client-side image text extraction
 */
export class OcrProcessor {
  private static instance: OcrProcessor;
  private worker: Worker | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): OcrProcessor {
    if (!OcrProcessor.instance) {
      OcrProcessor.instance = new OcrProcessor();
    }
    return OcrProcessor.instance;
  }

  /**
   * Initialize the Tesseract worker
   * @param language The language to use for OCR (default: 'eng')
   */
  public async initialize(language = 'eng'): Promise<void> {
    if (this.worker) {
      return; // Already initialized
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    
    this.initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        console.log('Initializing Tesseract worker...');
        this.worker = await createWorker(language);
        console.log('Tesseract worker initialized.');
        resolve();
      } catch (error) {
        console.error('Failed to initialize Tesseract worker:', error);
        reject(error);
      } finally {
        this.isInitializing = false;
      }
    });

    return this.initPromise;
  }

  /**
   * Extract text from an image
   * @param imageData Image source (URL, Blob, or File)
   * @returns Extracted text
   */
  public async extractText(imageData: string | Blob | File): Promise<string> {
    if (!this.worker) {
      await this.initialize();
    }

    try {
      if (!this.worker) {
        throw new Error('Worker initialization failed');
      }
      const result = await this.worker.recognize(imageData);
      return result.data.text;
    } catch (error) {
      console.error('OCR text extraction failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Extract text with detailed information
   * @param imageData Image source (URL, Blob, or File)
   * @returns Detailed OCR result with text and confidence
   */
  public async extractDetailed(imageData: string | Blob | File): Promise<{
    text: string;
    confidence: number;
    blocks: unknown[];
  }> {
    if (!this.worker) {
      await this.initialize();
    }

    try {
      if (!this.worker) {
        throw new Error('Worker initialization failed');
      }
      const result = await this.worker.recognize(imageData);
      return {
        text: result.data.text,
        confidence: result.data.confidence,
        blocks: result.data.blocks || []
      };
    } catch (error) {
      console.error('OCR detailed extraction failed:', error);
      throw new Error('Failed to extract detailed text from image');
    }
  }

  /**
   * Terminate the Tesseract worker
   */
  public async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
} 