import { NextRequest, NextResponse } from 'next/server';
import { ConversationMemory } from '@/app/lib/memory/conversationMemory';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Get conversation by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const memory = new ConversationMemory();
    
    const conversation = await memory.getConversation(id);
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error getting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve conversation' },
      { status: 500 }
    );
  }
}

/**
 * Update conversation title
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const { title } = await request.json();
    
    const memory = new ConversationMemory();
    await memory.updateConversationTitle(id, title);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

/**
 * Delete conversation
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const memory = new ConversationMemory();
    
    await memory.deleteConversation(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
} 