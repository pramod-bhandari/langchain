import { NextRequest, NextResponse } from 'next/server';
import { CoordinatorAgent } from '@/lib/agents/coordinator-agent';

// Initialize the agent
const agent = new CoordinatorAgent();

export async function POST(request: NextRequest) {
  try {
    const { query, context = { history: [] } } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Use the agent to coordinate search
    const results = await agent.coordinateSearch(query, context);

    // Return the results
    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error('Agent API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Error processing request', details: errorMessage },
      { status: 500 }
    );
  }
} 