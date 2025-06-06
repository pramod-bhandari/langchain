import { ChatPromptTemplate } from '@langchain/core/prompts';
import { chatModel } from './baseAgent';
import { RunnableSequence } from '@langchain/core/runnables';
import { supabase } from '../supabase/client';

export interface AnalyticsAgentInput {
  query: string;
  documentIds: string[];
}

export interface AnalyticsAgentOutput {
  analysis: string;
  documentIds: string[];
}

/**
 * Create an analytics agent that performs in-depth analysis on document content
 */
export function createAnalyticsAgent() {
  // Create the analytics prompt
  const analyticsPrompt = ChatPromptTemplate.fromTemplate(`
    You are a specialized document analytics assistant with expertise in finding patterns, 
    trends, and insights in text.
    
    Your task is to analyze the following document content and provide insights
    based on the user's specific analytics request.
    
    Document Content:
    {content}
    
    User's analytics request: {query}
    
    Perform a thorough analysis that might include:
    - Key themes and topics
    - Sentiment analysis
    - Frequency of important terms
    - Patterns or trends
    - Comparative analysis (if multiple documents)
    - Statistical observations
    - Notable outliers or exceptions
    
    Focus your analysis on the specific aspects requested by the user.
    Provide structured insights with clear sections and bullet points when appropriate.
    Support your analysis with specific examples from the text.
  `);

  // Create a runnable sequence
  const analyticsChain = RunnableSequence.from([
    async (input: AnalyticsAgentInput) => {
      try {
        // Get document content for the specified documents
        const documents = [];
        
        for (const docId of input.documentIds) {
          // First get document metadata
          const { data: docData, error: docError } = await supabase
            .from('documents')
            .select('title, description, file_type')
            .eq('id', docId)
            .single();
            
          if (docError) {
            console.error(`Error fetching document ${docId}:`, docError);
            continue;
          }
          
          // Then get all chunks for this document
          const { data: chunks, error: chunksError } = await supabase
            .from('chunks')
            .select('content, metadata')
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
            fileType: docData?.file_type,
            content
          });
        }
        
        // If no documents were found
        if (documents.length === 0) {
          return {
            query: input.query,
            content: 'No document content available for analysis.',
            documentIds: input.documentIds
          };
        }
        
        // For multiple documents, combine with headers
        let combinedContent = '';
        if (documents.length === 1) {
          combinedContent = `# ${documents[0].title}\n\n${documents[0].content}`;
        } else {
          // Multiple documents, add titles as section headers
          combinedContent = `# Analysis of ${documents.length} documents\n\n`;
          for (const doc of documents) {
            combinedContent += `## ${doc.title} (${doc.fileType})\n\n${doc.content}\n\n`;
          }
        }
        
        return {
          query: input.query,
          content: combinedContent,
          documentIds: input.documentIds
        };
      } catch (error) {
        console.error('Error in analytics agent:', error);
        return {
          query: input.query,
          content: 'Error retrieving document content for analysis.',
          documentIds: input.documentIds
        };
      }
    },
    // Run the prompt through the model to generate analysis
    async (formattedInput) => {
      const result = await analyticsPrompt.pipe(chatModel).invoke({
        query: formattedInput.query,
        content: formattedInput.content
      });
      
      return {
        analysis: result.content.toString(),
        documentIds: formattedInput.documentIds
      };
    }
  ]);

  return analyticsChain;
} 