import { createWorker, Worker, WorkerParams } from 'tesseract.js';

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
   * Get the singleton instance of OcrProcessor
   * @returns The OcrProcessor instance
   */
  public static getInstance(): OcrProcessor {
    if (!OcrProcessor.instance) {
      OcrProcessor.instance = new OcrProcessor();
    }
    return OcrProcessor.instance;
  }

  /**
   * Initialize the OCR worker
   */
  public async initialize(): Promise<void> {
    // If already initialized or initializing, return the promise
    if (this.worker) {
      return Promise.resolve();
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        console.log('Initializing Tesseract OCR worker...');
        
        // Ensure we're in a browser environment
        if (typeof window === 'undefined') {
          throw new Error('OcrProcessor is only supported in browser environments');
        }
        
        // Create a simple worker with standard configuration
        this.worker = await createWorker();
        
        console.log('Tesseract OCR worker created, loading language...');
        
        // Load language explicitly
        console.log('Tesseract OCR worker initialized successfully');
        resolve();
      } catch (error) {
        console.error('Failed to initialize OCR worker:', error);
        this.isInitializing = false;
        this.initPromise = null;
        reject(error);
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
   * Terminate the OCR worker
   */
  public async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.isInitializing = false;
    this.initPromise = null;
  }
} 