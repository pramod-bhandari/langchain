import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { Tool } from "@langchain/core/tools";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import type { SearchResult, ConversationContext } from '@/app/types';
import { env, validateEnv } from '@/lib/env';

// DB Search Tool for searching the local vector database
class DBSearchTool extends Tool {
  name = "db_search";
  description = "Search for relevant documents in the local database. Input should be a search query.";

  async _call(input: string): Promise<string> {
    try {
      console.log('DB search for:', input);
      
      // Log the search request
      console.log('Sending DB search request with query:', input);
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
      });

      // Log the response status
      console.log('DB search response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('DB search error response:', error);
        throw new Error(error.message || 'Search request failed');
      }

      const responseData = await response.json();
      console.log('DB search response data:', JSON.stringify(responseData, null, 2));
      
      const { results } = responseData;
      
      if (!results || results.length === 0) {
        console.log('No results found in database search');
        return "No relevant documents found in the local database.";
      }
      
      console.log(`Found ${results.length} results in database search`);
      
      // Format results for the agent
      return results.map((result: SearchResult, index: number) => 
        `Result ${index + 1}: ${result.content.substring(0, 200)}... (Score: ${result.score.toFixed(2)})`
      ).join('\n\n');
    } catch (error) {
      console.error('DB search error:', error);
      return "Error searching the local database.";
    }
  }
}

// Web Search Tool for searching external sources using server-side API
class WebSearchTool extends Tool {
  name = "web_search";
  description = "Search the web for information not available in the local database. Use this for current events or general knowledge queries.";
  
  async _call(input: string): Promise<string> {
    try {
      console.log('Web search for:', input);
      
      // Get the base URL from the window location when in the browser
      let baseUrl = '';
      if (typeof window !== 'undefined') {
        baseUrl = window.location.origin;
      } else {
        // Use environment variable or default when running on server
        baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      }
      
      // Use absolute URL to avoid parsing issues
      const webSearchUrl = `${baseUrl}/api/web-search`;
      console.log('Using web search URL:', webSearchUrl);
      
      // Call our server-side API route using absolute URL
      const response = await fetch(webSearchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
      });
      
      console.log('Web search response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Web search error response:', error);
        throw new Error(error.message || 'Web search request failed');
      }
      
      const data = await response.json();
      console.log('Web search result received, length:', data.result?.length || 0);
      
      // Format the response
      return `Web search results for "${input}":\n\n${data.result}`;
    } catch (error) {
      console.error('Web search error:', error);
      return `Error searching the web: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

export class CoordinatorAgent {
  private tools: Tool[];
  private agentExecutor: AgentExecutor | null = null;

  constructor() {
    this.tools = [
      new DBSearchTool(),
      new WebSearchTool()
    ];
  }

  private async initializeAgent() {
    if (this.agentExecutor) {
      return this.agentExecutor;
    }

    // Validate environment variables
    if (!validateEnv()) {
      throw new Error('Missing required environment variables');
    }

    // Create the model using environment variables
    const model = new ChatOpenAI({ 
      temperature: 0.7,
      modelName: env.OPENAI_MODEL_NAME,
      openAIApiKey: env.OPENAI_API_KEY,
    });

    // Create the prompt template with stronger guidance to try database first
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are an intelligent search assistant that can find information from both uploaded documents and the web.

ALWAYS use the db_search tool FIRST for ANY query to check if there is relevant information in the user's uploaded documents. This is extremely important.

Only use web_search if:
1. The db_search tool explicitly returns "No relevant documents found in the local database" AND
2. The query requires general knowledge or current information

After each tool call, ALWAYS provide a response based on the information you found. Never return an empty response.

The user has uploaded PDF documents that contain important information, and they prefer to get answers from their own documents rather than the web when possible.`],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    // Create the agent
    const agent = await createOpenAIFunctionsAgent({
      llm: model,
      tools: this.tools,
      prompt
    });

    // Create the executor
    this.agentExecutor = new AgentExecutor({
      agent,
      tools: this.tools,
      verbose: true,
      returnIntermediateSteps: true
    });

    return this.agentExecutor;
  }

  async coordinateSearch(query: string, context: ConversationContext): Promise<SearchResult[]> {
    try {
      console.log('Starting agent search with query:', query);
      
      const executor = await this.initializeAgent();
      
      // Convert chat history from context if available
      const chatHistory = context.history ? 
        context.history.map(msg => msg.role === 'user' ? 
          ["human", msg.content] : ["ai", msg.content]) : 
        [];
      
      console.log('Executing agent with chat history:', JSON.stringify(chatHistory));
      
      // Run the agent
      const result = await executor.invoke({ 
        input: query,
        chat_history: chatHistory
      });
      
      console.log('Agent execution completed with result:', JSON.stringify(result, null, 2));
      
      // Handle empty output
      if (!result.output) {
        console.log('Agent returned empty output, checking for intermediate steps');
        
        // Check if there were any tool outputs
        if (result.intermediateSteps && result.intermediateSteps.length > 0) {
          const lastStep = result.intermediateSteps[result.intermediateSteps.length - 1];
          if (lastStep.observation) {
            console.log('Using last tool observation as output');
            
            // Use the last tool output as the response
            return [{
              id: Date.now().toString(),
              content: `Here's what I found about "${query}":\n\n${lastStep.observation}`,
              score: 1.0,
              metadata: { 
                source: lastStep.action.tool === 'db_search' ? 'document' : 'web',
                toolName: lastStep.action.tool
              }
            }];
          }
        }
        
        // If no tool outputs or observation, use web search as fallback
        console.log('No tool outputs found, using web search as fallback');
        
        try {
          // Get the base URL
          let baseUrl = '';
          if (typeof window !== 'undefined') {
            baseUrl = window.location.origin;
          } else {
            // Use environment variable or default when running on server
            baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
          }
          
          // Make a direct fetch to the web search API with absolute URL
          const webSearchUrl = `${baseUrl}/api/web-search`;
          console.log('Fallback using web search URL:', webSearchUrl);
          
          const webResponse = await fetch(webSearchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          });
          
          if (!webResponse.ok) {
            throw new Error(`Web search API returned ${webResponse.status}`);
          }
          
          const webData = await webResponse.json();
          return [{
            id: Date.now().toString(),
            content: `I couldn't find information in your documents, so I searched the web.\n\n${webData.result}`,
            score: 1.0,
            metadata: { source: 'web-fallback' }
          }];
        } catch (webError) {
          console.error('Fallback web search error:', webError);
          return [{
            id: Date.now().toString(),
            content: `I couldn't find information in your documents, and the web search is currently unavailable. Please try again later or rephrase your query.`,
            score: 1.0,
            metadata: { source: 'error' }
          }];
        }
      }
      
      // Convert the agent's response to SearchResult format
      return [{
        id: Date.now().toString(),
        content: result.output,
        score: 1.0,
        metadata: { source: 'agent' }
      }];
    } catch (error) {
      console.error('Error in CoordinatorAgent:', error);
      return [{
        id: 'error',
        content: 'An error occurred while processing your query. Please try again.',
        score: 0,
        metadata: { error: String(error) }
      }];
    }
  }
} 