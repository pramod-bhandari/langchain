import { NextRequest, NextResponse } from 'next/server';
import { createAdvancedRouterAgent } from '@/app/lib/agents/advancedRouterAgent';
import { createSearchAgent } from '@/app/lib/agents/searchAgent';
import { createSummaryAgent } from '@/app/lib/agents/summaryAgent';
import { createAnalyticsAgent } from '@/app/lib/agents/analyticsAgent';
import { ConversationMemory } from '@/app/lib/memory/conversationMemory';
import { MemoryState } from '@/app/lib/memory/memoryState';

// Get router agent and specialized agents
const routerAgent = createAdvancedRouterAgent();
const searchAgent = createSearchAgent();
const summaryAgent = createSummaryAgent();
const analyticsAgent = createAnalyticsAgent();

export async function POST(request: NextRequest) {
  try {
    const { query, conversationId } = await request.json();
    
    // Initialize conversation memory system
    const memory = new ConversationMemory();
    
    // Create a conversation if one doesn't exist
    let convoId = conversationId;
    if (!convoId) {
      // Create a new conversation with a title based on the query
      const title = query.slice(0, 50) + (query.length > 50 ? '...' : '');
      convoId = await memory.createConversation(title);
    }
    
    // Get existing conversation context if available
    let memoryState: MemoryState = {};
    try {
      const context = await memory.getContext(convoId);
      memoryState = {
        recentQueries: context?.recentQueries || [],
        recentDocuments: context?.recentDocuments || []
      };
    } catch (error) {
      console.error('Error retrieving conversation context:', error);
    }
    
    // Add current query to recent queries
    if (Array.isArray(memoryState.recentQueries)) {
      memoryState.recentQueries = [query, ...memoryState.recentQueries.slice(0, 4)];
    } else {
      memoryState.recentQueries = [query];
    }
    
    // Route the query using our advanced router agent
    const routerResult = await routerAgent.invoke({
      query,
      memory: memoryState
    });
    
    console.log(`Router determined action: ${routerResult.action}`);
    
    // Execute the appropriate agent based on router decision
    let result;
    let sources: Array<{ document_id: string; chunk_id: string; similarity: number }> = [];
    
    switch (routerResult.action) {
      case 'SUMMARIZE':
        // For summarization, we need document IDs
        if (!memoryState.recentDocuments || memoryState.recentDocuments.length === 0) {
          // No documents in context, fall back to search
          console.log('No documents in context for summarization, falling back to search');
          result = await searchAgent.invoke({ query });
          sources = result.sources || [];
        } else {
          result = await summaryAgent.invoke({ 
            query,
            documentIds: memoryState.recentDocuments 
          });
          // Update response for chat
          result = { answer: result.summary, sources: [] };
        }
        break;
        
      case 'ANALYZE':
        // For analysis, we need document IDs
        if (!memoryState.recentDocuments || memoryState.recentDocuments.length === 0) {
          // No documents in context, fall back to search
          console.log('No documents in context for analysis, falling back to search');
          result = await searchAgent.invoke({ query });
          sources = result.sources || [];
        } else {
          result = await analyticsAgent.invoke({ 
            query,
            documentIds: memoryState.recentDocuments 
          });
          // Update response for chat
          result = { answer: result.analysis, sources: [] };
        }
        break;
        
      case 'SEARCH':
      default:
        // Default to search
        result = await searchAgent.invoke({ 
          query,
          documentIds: memoryState.recentDocuments, // Pass recent docs as filter (optional)
          threshold: 0.75,
          maxResults: 5
        });
        sources = result.sources || [];
    }
    
    // Update recent documents in memory based on search results
    if (sources && sources.length > 0) {
      const docIds = [...new Set(sources.map(s => s.document_id))];
      if (docIds.length > 0) {
        memoryState.recentDocuments = docIds;
      }
    }
    
    // Update the conversation context
    await memory.updateContext(convoId, memoryState);
    
    // Save the user message and AI response
    await memory.addMessage(convoId, 'user', query);
    await memory.addMessage(convoId, 'assistant', 
      typeof result.answer === 'string' ? result.answer : JSON.stringify(result.answer));
    
    return NextResponse.json({ 
      answer: result.answer,
      conversationId: convoId,
      action: routerResult.action,
      sources: sources
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 