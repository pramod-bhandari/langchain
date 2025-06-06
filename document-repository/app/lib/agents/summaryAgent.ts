import { ChatPromptTemplate } from '@langchain/core/prompts';
import { chatModel } from './baseAgent';
import { RunnableSequence } from '@langchain/core/runnables';
import { supabase } from '../supabase/client';

export interface SummaryAgentInput {
  query: string;
  documentIds: string[];
}

export interface SummaryAgentOutput {
  summary: string;
  documentIds: string[];
}

/**
 * Create a summary agent that summarizes one or more documents
 */
export function createSummaryAgent() {
  // Create the summary prompt
  const summaryPrompt = ChatPromptTemplate.fromTemplate(`
    You are a specialized document summarization assistant.
    
    Your task is to create a comprehensive summary of the document content provided below.
    Focus on the main points, key findings, and important details.
    Organize the summary in a clear, coherent manner.
    
    Document Content:
    {content}
    
    Specific user request: {query}
    
    Your summary should be thorough yet concise, capturing the essence of the document.
    If the user has asked for specific aspects to focus on in their query, prioritize those in your summary.
  `);

  // Create a runnable sequence
  const summaryChain = RunnableSequence.from([
    async (input: SummaryAgentInput) => {
      try {
        // Get document content for the specified documents
        const documents = [];
        
        for (const docId of input.documentIds) {
          // First get document metadata
          const { data: docData, error: docError } = await supabase
            .from('documents')
            .select('title, description')
            .eq('id', docId)
            .single();
            
          if (docError) {
            console.error(`Error fetching document ${docId}:`, docError);
            continue;
          }
          
          // Then get all chunks for this document
          const { data: chunks, error: chunksError } = await supabase
            .from('chunks')
            .select('content')
            .eq('document_id', docId)
            .order('id');
            
          if (chunksError) {
            console.error(`Error fetching chunks for document ${docId}:`, chunksError);
            continue;
          }
          
          // Combine chunks into full document content
          const content = chunks.map((chunk: { content: string }) => chunk.content).join('\n\n');
          
          documents.push({
            id: docId,
            title: docData?.title || 'Untitled Document',
            description: docData?.description || '',
            content
          });
        }
        
        // If no documents were found
        if (documents.length === 0) {
          return {
            query: input.query,
            content: 'No document content available for summarization.',
            documentIds: input.documentIds
          };
        }
        
        // For multiple documents, combine with headers
        let combinedContent = '';
        if (documents.length === 1) {
          combinedContent = documents[0].content;
        } else {
          // Multiple documents, add titles as section headers
          for (const doc of documents) {
            combinedContent += `## ${doc.title}\n\n${doc.content}\n\n`;
          }
        }
        
        return {
          query: input.query,
          content: combinedContent,
          documentIds: input.documentIds
        };
      } catch (error) {
        console.error('Error in summary agent:', error);
        return {
          query: input.query,
          content: 'Error retrieving document content for summarization.',
          documentIds: input.documentIds
        };
      }
    },
    // Run the prompt through the model to generate summary
    async (formattedInput) => {
      const result = await summaryPrompt.pipe(chatModel).invoke({
        query: formattedInput.query,
        content: formattedInput.content
      });
      
      return {
        summary: result.content.toString(),
        documentIds: formattedInput.documentIds
      };
    }
  ]);

  return summaryChain;
} 