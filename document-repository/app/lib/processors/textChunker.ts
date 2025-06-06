/**
 * Split text into chunks of roughly equal size
 * This is a simple implementation that tries to split on paragraph breaks first,
 * then sentences, and finally on words if necessary.
 */
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  if (!text || text.length <= chunkSize) {
    return [text];
  }

  // Clean the text - remove extra whitespace
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  // First try to split by paragraphs
  const paragraphs = cleanedText.split(/\n\s*\n|\r\n\s*\r\n/);
  
  // If we have very large paragraphs, we need to split further
  const chunks: string[] = [];
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
    const chunksWithOverlap: string[] = [chunks[0]];
    
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