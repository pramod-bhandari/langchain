import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { Tool } from "@langchain/core/tools";
import { supabase } from "@/lib/supabase";
import { embedText } from "./qa";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

// Custom Tool for searching documents in Supabase
class DocumentSearchTool extends Tool {
  name = "document_search";
  description = "Search for relevant documents in the database. Input should be a search query.";

  async _call(input: string): Promise<string> {
    try {
      // Get embedding for the search query
      const queryEmbedding = await embedText(input);

      // Search in Supabase
      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 3,
        match_min_length: 10
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return "No relevant documents found.";
      }

      // Format the results
      return data.map((doc: any) => 
        `Document: ${doc.content.substring(0, 200)}... (Similarity: ${(doc.similarity * 100).toFixed(1)}%)`
      ).join('\n\n');
    } catch (error) {
      console.error('Error in document search:', error);
      return "Error searching documents.";
    }
  }
}

// Custom Tool for getting current date/time
class DateTimeTool extends Tool {
  name = "get_datetime";
  description = "Get the current date and time. No input needed.";

  async _call(): Promise<string> {
    return new Date().toLocaleString();
  }
}

// Custom Tool for simple calculations
class CalculatorTool extends Tool {
  name = "calculator";
  description = "Perform basic arithmetic calculations. Input should be a mathematical expression.";

  async _call(input: string): Promise<string> {
    try {
      // Basic safety check
      if (!/^[0-9+\-*/(). ]+$/.test(input)) {
        return "Invalid calculation expression.";
      }
      return eval(input).toString();
    } catch (error) {
      return "Error performing calculation.";
    }
  }
}

// Initialize the agent
export async function initializeAgent() {
  // Create tools array
  const tools = [
    new DocumentSearchTool(),
    new DateTimeTool(),
    new CalculatorTool()
  ];

  // Create the model
  const model = new ChatOpenAI({ 
    temperature: 0.7,
    modelName: process.env.OPENAI_MODEL_NAME,
    openAIApiKey: process.env.OPENAI_API_KEY
  });

  // Create the prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful AI assistant that can search documents, perform calculations, and provide current time information."],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // Create the agent
  const agent = await createOpenAIFunctionsAgent({
    llm: model,
    tools,
    prompt
  });

  // Create the executor
  const executor = new AgentExecutor({
    agent,
    tools,
    verbose: true
  });

  return executor;
}

// Function to use the agent
export async function useAgent(input: string) {
  try {
    const executor = await initializeAgent();
    const result = await executor.invoke({ input });
    return result;
  } catch (error) {
    console.error('Error using agent:', error);
    throw error;
  }
} 