import { NextRequest, NextResponse } from 'next/server';
import { ConversationMemory } from '@/app/lib/memory/conversationMemory';

/**
 * Endpoint to get all conversations
 */
export async function GET() {
  try {
    const memory = new ConversationMemory();
    const conversations = await memory.getConversations();
    
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error getting conversations:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve conversations' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint to create a new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();
    
    const memory = new ConversationMemory();
    const conversationId = await memory.createConversation(title);
    
    return NextResponse.json({ conversationId });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
} 