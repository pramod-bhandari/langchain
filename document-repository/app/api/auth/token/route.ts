import { NextResponse } from 'next/server';
import { createToken } from '@/app/lib/auth/tokenUtils';

// This endpoint provides temporary secure access to sensitive API keys
// It should be properly secured in production with authentication
export async function POST() {
  try {
    // In a real app, you would check user authentication here
    // and only provide tokens to authenticated users
    
    // Generate a temporary secure token for the OpenAI API key
    // This avoids exposing the actual API key to client code
    const openAiKey = process.env.OPENAI_API_KEY;
    
    if (!openAiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }
    
    // Create a secure token that expires in 5 minutes
    // In a real app, you would use a proper JWT or similar
    const token = createToken(openAiKey, '5m');
    
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 