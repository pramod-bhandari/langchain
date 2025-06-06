import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

// Configure PDF.js worker for browser environment
if (typeof window !== 'undefined') {
  // In browser, use CDN for worker
  GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
}

export interface ProcessedChunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
}

export async function processPDF(file: File): Promise<{
  chunks: ProcessedChunk[];
  totalPages: number;
}> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document with worker disabled for compatibility
    const loadingTask = getDocument({
      data: arrayBuffer,
      // @ts-expect-error - disableWorker is a valid option but TypeScript doesn't recognize it
      disableWorker: typeof window === 'undefined', // Only disable in server environment
    });
    
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    
    // Process each page
    const allChunks: ProcessedChunk[] = [];
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      
      // Extract text from page
      const pageText = content.items
        .map(item => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ')
        .trim();

      // Split page text into chunks
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      
      const pageChunks = await splitter.splitText(pageText);
      
      // Add chunks with metadata - ensure sanitized content
      pageChunks.forEach((chunk, chunkIndex) => {
        // Make sure chunk content is JSON-safe
        const sanitizedContent = chunk.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
        
        allChunks.push({
          content: sanitizedContent,
          pageNumber: pageNum,
          chunkIndex,
        });
      });
    }

    return {
      chunks: allChunks,
      totalPages,
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 