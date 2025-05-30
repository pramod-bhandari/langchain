import { supabase } from '../supabase';
import type { SearchResult } from '@/app/types';

interface DBDocument {
  id: string;
  content: string;
  title: string;
  source: string;
  created_at: string;
  similarity: number;
}

export class DBSearchAgent {
  private vectorStore: typeof supabase;

  constructor() {
    this.vectorStore = supabase;
  }

  async search(query: string): Promise<SearchResult[]> {
    try {
      // Perform vector similarity search
      const { data: results, error } = await this.vectorStore
        .rpc('match_documents', {
          query_embedding: query, // This will be replaced with actual embedding
          match_threshold: 0.7,
          match_count: 10
        });

      if (error) {
        console.error('Error searching documents:', error);
        return [];
      }

      // Transform results to match SearchResult interface
      return (results as DBDocument[]).map((result) => ({
        id: result.id,
        content: result.content,
        metadata: {
          title: result.title,
          source: result.source,
          timestamp: result.created_at
        },
        score: result.similarity
      }));
    } catch (error) {
      console.error('Error in DBSearchAgent:', error);
      return [];
    }
  }
} 