import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase/client';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Clear all messages from a conversation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    // Delete all messages for this conversation
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing conversation messages:', error);
    return NextResponse.json(
      { error: 'Failed to clear conversation' },
      { status: 500 }
    );
  }
} 