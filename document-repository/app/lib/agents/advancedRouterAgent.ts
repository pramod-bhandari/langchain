import { ChatPromptTemplate } from '@langchain/core/prompts';
import { chatModel } from './baseAgent';
import { RunnableSequence } from '@langchain/core/runnables';
import { MemoryState } from '../memory/memoryState';

// Define input/output interfaces
export interface AdvancedRouterInput {
  query: string;
  memory?: MemoryState;
}

export interface AdvancedRouterOutput {
  action: string;
  reasoning?: string;
}

/**
 * Create an advanced router agent that intelligently routes user queries
 * to the appropriate specialized agent
 */
export function createAdvancedRouterAgent() {
  // Create an enhanced router prompt
  const routerPrompt = ChatPromptTemplate.fromTemplate(`
    You are an intelligent router agent that determines how to handle user requests about documents.
    
    Based on the user query, determine the most appropriate action:
    - SEARCH: If the user is asking about specific content or information in documents
    - SUMMARIZE: If the user wants a summary of a document or collection of documents
    - ANALYZE: If the user wants analytical insights about documents (patterns, comparisons, statistics)
    
    Consider these examples:
    - "What does the document say about climate change?" → SEARCH
    - "Give me a summary of this document" → SUMMARIZE
    - "What are the main topics covered in these documents?" → ANALYZE
    - "Compare the financial data in these reports" → ANALYZE
    - "What's the conclusion of the research paper?" → SEARCH
    
    User Query: {query}
    
    Previous conversation context (if available):
    {memory}
    
    First, explain your reasoning step by step.
    Then, respond with your final decision as exactly one word from these options: SEARCH, SUMMARIZE, or ANALYZE.
  `);

  // Create a runnable sequence
  const routerChain = RunnableSequence.from([
    {
      // Format the input for the prompt
      query: (input: AdvancedRouterInput) => input.query,
      memory: (input: AdvancedRouterInput) => {
        if (!input.memory) return "No previous conversation context available.";
        return JSON.stringify(input.memory, null, 2);
      },
    },
    // Run the prompt through the model
    routerPrompt,
    chatModel,
    // Process the response
    (response) => {
      const content = response.content.toString();
      // Extract the action (the last word in the response)
      const lines = content.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const action = lastLine.trim().toUpperCase();
      
      // Validate the action
      const validAction = ["SEARCH", "SUMMARIZE", "ANALYZE"].includes(action) 
        ? action 
        : "SEARCH"; // Default to search
      
      // Extract reasoning (everything before the action)
      const reasoning = lines.slice(0, -1).join('\n').trim();
      
      return {
        action: validAction,
        reasoning: reasoning
      };
    },
  ]);

  return routerChain;
} 