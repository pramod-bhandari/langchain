import { NextResponse } from 'next/server';

// This endpoint safely initializes document processing with secure credentials
export async function POST() {
  try {
    // Only return non-sensitive initialization data
    // The actual API keys remain on the server
    const initData = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasOpenAiKey: !!process.env.OPENAI_API_KEY,
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    };
    
    return NextResponse.json({ 
      success: true,
      message: "Document processing initialized successfully",
      ...initData
    });
  } catch (error) {
    console.error('Error initializing document processing:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to initialize document processing" 
      },
      { status: 500 }
    );
  }
} 