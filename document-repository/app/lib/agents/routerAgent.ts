import { ChatPromptTemplate } from '@langchain/core/prompts';
import { chatModel } from './baseAgent';
import { RunnableSequence } from '@langchain/core/runnables';

const routerPrompt = ChatPromptTemplate.fromTemplate(`
  You are a router agent that determines how to handle a user request about documents.
  
  Based on the user query, determine the appropriate action:
  - SEARCH: If the user is asking about content in documents
  - SUMMARIZE: If the user wants a summary of a document
  - ANALYZE: If the user wants analytical insights about a document
  
  User Query: {query}
  
  Respond with just one word: SEARCH, SUMMARIZE, or ANALYZE.
`);

export interface RouterInput {
  query: string;
}

export interface RouterOutput {
  action: string;
}

export const createRouterAgent = () => {
  // Create a simple runnable sequence instead of a complex graph
  const routerChain = RunnableSequence.from([
    {
      query: (input: RouterInput) => input.query,
    },
    routerPrompt,
    chatModel,
    (response) => {
      const action = response.content.trim().toUpperCase();
      // Validate the action is one of the expected values
      if (!["SEARCH", "SUMMARIZE", "ANALYZE"].includes(action)) {
        return { action: "SEARCH" }; // Default to search for unexpected responses
      }
      return { action };
    },
  ]);

  return routerChain;
}; 