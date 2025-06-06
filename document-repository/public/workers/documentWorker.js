// Document processing web worker
// Handles document extraction and chunking without blocking the UI

self.importScripts('/pdf-worker/pdf.js');
self.importScripts('https://cdn.jsdelivr.net/npm/mammoth@1.5.1/mammoth.browser.min.js');
self.importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.js';

// Handle incoming messages
self.onmessage = async function(e) {
  const { action, file, options, id } = e.data;
  
  try {
    switch (action) {
      case 'extract':
        await extractDocument(file, options, id);
        break;
      case 'chunk':
        await chunkText(e.data.text, options, id);
        break;
      case 'process':
        await processDocument(file, options, id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    self.postMessage({
      error: error.message,
      id
    });
  }
};

// Extract text from a document based on its type
async function extractDocument(file, options = {}, id) {
  try {
    postProgress(id, 10, 'Starting extraction...');
    
    // Get file type
    const fileType = file.type || inferTypeFromName(file.name);
    let text = '';
    
    postProgress(id, 20, `Extracting text from ${fileType}...`);
    
    // Extract based on file type
    if (fileType.includes('pdf')) {
      text = await extractPdfText(file);
    } else if (fileType.includes('wordprocessingml.document')) {
      text = await extractDocxText(file);
    } else if (fileType.includes('spreadsheetml.sheet')) {
      text = await extractExcelText(file);
    } else if (fileType.includes('text/')) {
      text = await file.text();
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    postProgress(id, 90, 'Extraction complete');
    
    // Return the extracted text
    self.postMessage({
      text,
      fileType,
      id,
      status: 'extracted'
    });
  } catch (error) {
    self.postMessage({
      error: `Extraction error: ${error.message}`,
      id
    });
  }
}

// Extract text from PDF
async function extractPdfText(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    const numPages = pdf.numPages;
    let text = '';
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += pageText + '\n\n';
      
      if (i % 5 === 0 || i === numPages) {
        postProgress(null, Math.round((i / numPages) * 70) + 20, `Extracted page ${i} of ${numPages}`);
      }
    }
    
    return text;
  } catch (error) {
    throw new Error(`PDF extraction error: ${error.message}`);
  }
}

// Extract text from DOCX
async function extractDocxText(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({arrayBuffer});
    return result.value;
  } catch (error) {
    throw new Error(`DOCX extraction error: ${error.message}`);
  }
}

// Extract text from Excel
async function extractExcelText(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {type: 'array'});
    let text = '';
    
    for (const sheetName of workbook.SheetNames) {
      text += `Sheet: ${sheetName}\n\n`;
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
      
      for (const row of jsonData) {
        if (Array.isArray(row) && row.length > 0) {
          text += row.join('\t') + '\n';
        }
      }
      text += '\n\n';
    }
    
    return text;
  } catch (error) {
    throw new Error(`Excel extraction error: ${error.message}`);
  }
}

// Process a document (extract + chunk)
async function processDocument(file, options = {}, id) {
  try {
    // Extract text
    postProgress(id, 0, 'Starting document processing...');
    
    const fileType = file.type || inferTypeFromName(file.name);
    let text = '';
    
    postProgress(id, 10, `Extracting text from ${fileType}...`);
    
    // Extract based on file type
    if (fileType.includes('pdf')) {
      text = await extractPdfText(file);
    } else if (fileType.includes('wordprocessingml.document')) {
      text = await extractDocxText(file);
    } else if (fileType.includes('spreadsheetml.sheet')) {
      text = await extractExcelText(file);
    } else if (fileType.includes('text/')) {
      text = await file.text();
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    postProgress(id, 70, 'Chunking text...');
    
    // Chunk the text
    const chunkSize = options.chunkSize || 1000;
    const overlap = options.overlap || 200;
    const chunks = chunkTextContent(text, chunkSize, overlap);
    
    postProgress(id, 90, `Created ${chunks.length} chunks`);
    
    // Calculate some metadata
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    // Generate embeddings if API key is available
    let embeddings = null;
    if (options.generateEmbeddings && options.openAiKey) {
      postProgress(id, 95, 'Generating embeddings...');
      embeddings = await generateEmbeddings(chunks, options.openAiKey);
    }
    
    // Return the processed document
    self.postMessage({
      text,
      chunks,
      embeddings,
      metadata: {
        fileType,
        fileName: file.name,
        wordCount,
        chunkCount: chunks.length,
        extractedSize: text.length,
        hasEmbeddings: !!embeddings
      },
      id,
      status: 'processed'
    });
  } catch (error) {
    self.postMessage({
      error: `Processing error: ${error.message}`,
      id
    });
  }
}

// Chunk text into smaller pieces
function chunkTextContent(text, chunkSize = 1000, overlap = 200) {
  if (!text || text.length <= chunkSize) {
    return [text];
  }

  // Clean the text - remove extra whitespace
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  // First try to split by paragraphs
  const paragraphs = cleanedText.split(/\n\s*\n|\r\n\s*\r\n/);
  
  // If we have very large paragraphs, we need to split further
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed our chunk size
    if (currentChunk.length + paragraph.length + 1 > chunkSize) {
      // If the current chunk is not empty, add it to chunks
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      
      // If the paragraph itself is larger than the chunk size, we need to split it
      if (paragraph.length > chunkSize) {
        // Split by sentences
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        
        currentChunk = '';
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 > chunkSize) {
            if (currentChunk.length > 0) {
              chunks.push(currentChunk.trim());
            }
            
            // If the sentence itself is too long, split by words
            if (sentence.length > chunkSize) {
              const words = sentence.split(/\s+/);
              currentChunk = '';
              
              for (const word of words) {
                if (currentChunk.length + word.length + 1 > chunkSize) {
                  chunks.push(currentChunk.trim());
                  currentChunk = word;
                } else {
                  currentChunk += (currentChunk ? ' ' : '') + word;
                }
              }
            } else {
              currentChunk = sentence;
            }
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  // Add overlapping content between chunks for better context
  if (overlap > 0 && chunks.length > 1) {
    const chunksWithOverlap = [chunks[0]];
    
    for (let i = 1; i < chunks.length; i++) {
      const prevChunk = chunks[i - 1];
      const currentChunk = chunks[i];
      
      // Get the overlapping content from the previous chunk
      const overlapContent = prevChunk.substring(Math.max(0, prevChunk.length - overlap));
      
      // Add overlap to the current chunk
      chunksWithOverlap.push(overlapContent + currentChunk);
    }
    
    return chunksWithOverlap;
  }
  
  return chunks;
}

// Generate embeddings for chunks using OpenAI API
async function generateEmbeddings(chunks, apiKey) {
  try {
    // Process in batches to avoid rate limiting
    const BATCH_SIZE = 20;
    const embeddings = [];
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          input: batch,
          model: 'text-embedding-ada-002'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      const result = await response.json();
      const batchEmbeddings = result.data.map(item => item.embedding);
      embeddings.push(...batchEmbeddings);
      
      // Post progress for embedding generation
      postProgress(null, 95 + (i / chunks.length) * 5, `Generated embeddings for batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)}`);
    }
    
    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return null;
  }
}

// Infer file type from name
function inferTypeFromName(filename) {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return 'application/octet-stream';
  
  const extensionMap = {
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
    'gif': 'image/gif'
  };
  
  return extensionMap[extension] || 'application/octet-stream';
}

// Post progress updates
function postProgress(id, progress, message) {
  self.postMessage({
    progress,
    message,
    id,
    status: 'progress'
  });
} 