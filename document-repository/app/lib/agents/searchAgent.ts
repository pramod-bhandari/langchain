import { ChatPromptTemplate } from '@langchain/core/prompts';
import { chatModel } from './baseAgent';
import { RunnableSequence } from '@langchain/core/runnables';
import { supabase } from '../supabase/client';
import { OpenAIEmbeddings } from '@langchain/openai';
import { config } from '../config';

// Initialize embeddings for vector search
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: config.openai.apiKey,
  modelName: config.openai.embeddingModel,
  dimensions: config.openai.embeddingDimensions,
});

interface ChunkResult {
  id: string;
  document_id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface SearchAgentInput {
  query: string;
  documentIds?: string[];
  threshold?: number;
  maxResults?: number;
}

export interface SearchAgentOutput {
  context: string;
  chunks: ChunkResult[];
  answer: string;
  sources: Array<{
    document_id: string;
    chunk_id: string;
    similarity: number;
  }>;
}

/**
 * Create a search agent that retrieves relevant document chunks
 * and answers questions based on those chunks
 */
export function createSearchAgent() {
  // Create the search prompt
  const searchPrompt = ChatPromptTemplate.fromTemplate(`
    You are a helpful assistant that answers questions based on the provided document context.
    Answer the following question based ONLY on the information provided in the context.
    If the answer is not in the context, say "I don't have enough information to answer that question."
    
    Context from documents:
    {context}
    
    Question: {query}
    
    Answer the question concisely and accurately, citing specific information from the context.
  `);

  // Create a runnable sequence
  const searchChain = RunnableSequence.from([
    async (input: SearchAgentInput) => {
      try {
        // Generate query embedding for vector search
        const queryEmbedding = await embeddings.embedQuery(input.query);
        
        // Set up search parameters
        const threshold = input.threshold || 0.75;
        const maxResults = input.maxResults || 5;
        
        // Construct the search query
        const searchQuery = {
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: maxResults
        };
        
        // Add document filter if documentIds are provided
        let chunks: ChunkResult[] = [];
        const { data, error } = await supabase
          .rpc('match_chunks', searchQuery);
          
        if (error) {
          console.error('Error searching for chunks:', error);
          throw error;
        }
        
        chunks = data || [];
        
        // If documentIds are provided, filter the results
        if (input.documentIds && input.documentIds.length > 0) {
          chunks = chunks.filter(chunk => 
            input.documentIds?.includes(chunk.document_id)
          );
        }
        
        // Prepare context from chunks
        const context = chunks.length > 0
          ? chunks.map(chunk => chunk.content).join('\n\n')
          : 'No relevant information found in the documents.';
        
        return {
          query: input.query,
          context,
          chunks
        };
      } catch (error) {
        console.error('Error in search agent:', error);
        return {
          query: input.query,
          context: 'Error retrieving document information.',
          chunks: []
        };
      }
    },
    // Run the prompt through the model
    async (formattedInput) => {
      const result = await searchPrompt.pipe(chatModel).invoke({
        query: formattedInput.query,
        context: formattedInput.context
      });
      
      // Prepare sources
      const sources = formattedInput.chunks.map((chunk: ChunkResult) => ({
        document_id: chunk.document_id,
        chunk_id: chunk.id,
        similarity: chunk.similarity
      }));
      
      return {
        context: formattedInput.context,
        chunks: formattedInput.chunks,
        answer: result.content.toString(),
        sources
      };
    }
  ]);

  return searchChain;
} 