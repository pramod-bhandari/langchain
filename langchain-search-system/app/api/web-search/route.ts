import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { serverConfig } from '@/lib/config';

export async function POST(request: Request) {
  try {
    console.log('Web Search API route hit');
    
    const { query } = await request.json();
    console.log('Web search query:', query);

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!serverConfig.openai.apiKey) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: serverConfig.openai.apiKey,
    });

    console.log('Calling OpenAI for web search information...');
    
    // Use OpenAI's API to get information
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use GPT-4o or another model that's good at general knowledge
      messages: [
        { 
          role: "system", 
          content: "You are a helpful web search assistant. Provide accurate, up-to-date information and comprehensive answers with relevant facts. Cite your sources when possible." 
        },
        { 
          role: "user", 
          content: `Please provide information about: ${query}`
        }
      ],
      temperature: 0.7,
    });
    
    // Extract the answer
    const answer = response.choices[0]?.message?.content || "No information found.";
    console.log('OpenAI response received, length:', answer.length);
    
    return NextResponse.json({ 
      result: answer,
      metadata: {
        source: 'web-search',
        model: 'gpt-4o'
      }
    });
  } catch (error) {
    console.error('Web Search API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Web search failed' },
      { status: 500 }
    );
  }
} 