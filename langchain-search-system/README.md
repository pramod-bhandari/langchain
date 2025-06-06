# LangChain Document Search System with AI Agents

A powerful document search system built with Next.js 14, Tailwind CSS, shadcn/ui, and LangChain. This application allows users to upload documents, search them using vector embeddings, and now includes an AI agent capability for more intelligent search.

## Features

- **Document Upload**: Upload and process various document formats
- **Vector Search**: Search documents using semantic similarity
- **AI Agent**: Intelligent search assistant powered by LangChain's agent framework
- **Multi-source Search**: Search both local documents and web sources
- **Chat Interface**: Conversational interface for interacting with the agent

## Agentic Search Implementation

The project now includes a true LangChain agent implementation that leverages an LLM to:

1. **Decide which tools to use** for a given query (local DB search vs web search)
2. **Reason about what information is needed** to answer the query
3. **Chain together multiple tool calls** dynamically
4. **Provide explanations** about its reasoning process

The agent architecture consists of:

- **CoordinatorAgent**: Orchestrates the search process using LangChain's AgentExecutor
- **Custom Tools**: Specialized tools for DB search and web search
- **Chat History**: Maintains context between interactions
- **Prompt Templates**: Structured prompts for the LLM agent

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL_NAME=gpt-4o # Or another compatible model
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Using the Agent Search

1. Navigate to the "AI Agent" page from the navigation menu
2. Enter your query in the search box
3. The agent will:
   - First search your local document database
   - If needed, search external sources
   - Combine information to provide a comprehensive answer
4. Continue the conversation to refine your search

## Architecture

The agent implementation uses the following LangChain components:

- **ChatOpenAI**: Connects to OpenAI's API for LLM capabilities
- **createOpenAIFunctionsAgent**: Creates an agent using OpenAI's function calling
- **AgentExecutor**: Manages the execution flow of the agent
- **Custom Tools**: Extends LangChain's Tool class for specific search functionality
- **ChatPromptTemplate**: Structures the prompts sent to the LLM

## Future Improvements

- Add more specialized tools (file analysis, calculation, etc.)
- Implement true web search functionality
- Add authentication and user-specific document collections
- Improve the conversation memory with more sophisticated techniques
- Add reasoning traces and tool use visibility in the UI

## License

MIT
