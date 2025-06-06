/**
 * Document Processing Worker Service
 * 
 * This service manages background document processing using Web Workers
 * for improved performance with large documents.
 */

import { supabase } from '../supabase/client';

// Track processing status for documents
interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  worker?: Worker;
  error?: string;
}

class DocumentProcessorWorkerService {
  private static instance: DocumentProcessorWorkerService;
  private processingStatus: Map<string, ProcessingStatus> = new Map();
  private workerSupported: boolean;

  private constructor() {
    // Check if Web Workers are supported
    this.workerSupported = typeof Worker !== 'undefined';
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DocumentProcessorWorkerService {
    if (!DocumentProcessorWorkerService.instance) {
      DocumentProcessorWorkerService.instance = new DocumentProcessorWorkerService();
    }
    return DocumentProcessorWorkerService.instance;
  }

  /**
   * Check if background processing is supported
   */
  public isSupported(): boolean {
    return this.workerSupported;
  }

  /**
   * Process a document in the background using a Web Worker
   */
  public async processDocument(documentId: string, extractedText: string): Promise<void> {
    if (!this.workerSupported) {
      console.warn('Web Workers not supported. Falling back to synchronous processing.');
      await this.fallbackProcessDocument(documentId, extractedText);
      return;
    }

    // Update document status to processing
    await this.updateDocumentStatus(documentId, 'processing', 0);

    try {
      // First try the server-side processing which is more secure
      try {
        const serverResponse = await fetch('/api/documents/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId, extractedText }),
        });

        if (serverResponse.ok) {
          // Server handled it successfully, we're done
          await serverResponse.json(); // Just consume the response
          await this.updateDocumentStatus(documentId, 'completed', 1);
          return;
        } else {
          // Server failed, try worker as fallback
          console.warn('Server processing failed, falling back to worker');
        }
      } catch (serverError) {
        console.warn('Server processing error, falling back to worker:', serverError);
      }

      // Create a new worker - use dynamic import for Turbopack compatibility
      let worker: Worker;
      
      try {
        // Try the URL constructor method first (works better with Webpack)
        worker = new Worker(new URL('../workers/documentProcessingWorker.ts', import.meta.url));
      } catch (err) {
        console.warn('Worker URL constructor failed, trying direct import', err);
        // Fallback to same method but with try-catch for better error logging
        try {
          worker = new Worker(new URL('../workers/documentProcessingWorker.ts', import.meta.url));
        } catch (innerErr) {
          console.error('Worker creation failed completely:', innerErr);
          throw innerErr;
        }
      }
      
      // Store the worker and status
      this.processingStatus.set(documentId, {
        status: 'processing',
        progress: 0,
        worker
      });

      // Listen for messages from the worker
      worker.onmessage = async (event) => {
        const { type, documentId, error, progress } = event.data;

        switch (type) {
          case 'initialized':
            // Worker is ready, send the document for processing
            worker.postMessage({
              type: 'process',
              data: { documentId, extractedText }
            });
            break;

          case 'status':
            // Update status
            if (progress) {
              await this.updateDocumentStatus(documentId, 'processing', progress);
            }
            break;

          case 'complete':
            // Processing completed successfully
            await this.updateDocumentStatus(documentId, 'completed', 1);
            this.cleanupWorker(documentId);
            break;

          case 'error':
            // Error occurred
            console.error('Worker error:', error);
            await this.updateDocumentStatus(documentId, 'error', 0, error);
            this.cleanupWorker(documentId);
            break;
        }
      };

      // Get secure configuration from the server
      const configResponse = await fetch('/api/documents/process/initialize', {
        method: 'POST',
      });
      
      if (!configResponse.ok) {
        throw new Error('Failed to initialize worker with secure configuration');
      }
      
      const config = await configResponse.json();

      // Initialize the worker with credentials from secure API
      worker.postMessage({
        type: 'init',
        data: {
          supabaseUrl: config.supabaseUrl,
          supabaseKey: config.supabaseKey,
          openaiKey: await this.getSecureOpenAiKey()
        }
      });

    } catch (error) {
      console.error('Error initializing worker:', error);
      // Fall back to synchronous processing
      await this.fallbackProcessDocument(documentId, extractedText);
    }
  }

  /**
   * Get the current processing status for a document
   */
  public getProcessingStatus(documentId: string): ProcessingStatus | undefined {
    return this.processingStatus.get(documentId);
  }

  /**
   * Cancel processing for a document
   */
  public cancelProcessing(documentId: string): void {
    const status = this.processingStatus.get(documentId);
    if (status?.worker) {
      status.worker.terminate();
      this.cleanupWorker(documentId);
      this.updateDocumentStatus(documentId, 'error', 0, 'Processing cancelled');
    }
  }

  /**
   * Get OpenAI API key securely from the server
   * This is a workaround for Next.js environment variable limitations
   */
  private async getSecureOpenAiKey(): Promise<string> {
    // We shouldn't expose API keys to client-side code, so we need to use a server endpoint
    // This is a temporary solution that gets the key from session storage if available
    // In a production environment, use a proper server-side solution
    
    try {
      // Try to get a temporary token from server
      const response = await fetch('/api/auth/token', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
    } catch (error) {
      console.error('Error getting secure token:', error);
    }
    
    // If server token fails, use a dummy value as fallback
    // The server will handle actual API calls
    return 'WORKER_NEEDS_SERVER_TOKEN';
  }

  /**
   * Fallback to synchronous processing if workers are not supported
   */
  private async fallbackProcessDocument(documentId: string, extractedText: string): Promise<void> {
    try {
      // Try to use the server endpoint first
      const serverResponse = await fetch('/api/documents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId, extractedText }),
      });

      if (serverResponse.ok) {
        await this.updateDocumentStatus(documentId, 'completed', 1);
        return;
      }
      
      // If server endpoint fails, try traditional document processor
      const { processDocumentFromText } = await import('./documentProcessor');
      await processDocumentFromText(documentId, extractedText);
      await this.updateDocumentStatus(documentId, 'completed', 1);
    } catch (error) {
      console.error('Error in fallback processing:', error);
      await this.updateDocumentStatus(
        documentId, 
        'error', 
        0, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Update the processing status in the database
   */
  private async updateDocumentStatus(
    documentId: string, 
    status: 'pending' | 'processing' | 'completed' | 'error',
    progress: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Update in-memory status
      const currentStatus = this.processingStatus.get(documentId) || { status: 'pending', progress: 0 };
      this.processingStatus.set(documentId, {
        ...currentStatus,
        status,
        progress,
        error: errorMessage
      });

      // Get existing metadata
      const { data } = await supabase
        .from('documents')
        .select('metadata')
        .eq('id', documentId)
        .single();

      // Update document metadata
      await supabase
        .from('documents')
        .update({
          metadata: {
            ...data?.metadata,
            processing_status: status,
            processing_progress: progress,
            ...(errorMessage && { error_message: errorMessage }),
            ...(status === 'completed' && { processed_at: new Date().toISOString() })
          }
        })
        .eq('id', documentId);
    } catch (error) {
      console.error('Error updating document status:', error);
    }
  }

  /**
   * Clean up worker resources
   */
  private cleanupWorker(documentId: string): void {
    const status = this.processingStatus.get(documentId);
    if (status?.worker) {
      status.worker.terminate();
    }
    // Keep the status but remove the worker reference
    this.processingStatus.set(documentId, {
      ...status!,
      worker: undefined
    });
  }
}

export default DocumentProcessorWorkerService; 