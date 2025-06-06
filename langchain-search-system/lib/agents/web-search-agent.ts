import type { SearchResult } from '@/app/types';

export class WebSearchAgent {
  async search(query: string): Promise<SearchResult[]> {
    try {
      // TODO: Implement web search functionality
      // This is a placeholder that will be replaced with actual web search implementation
      console.log('Web search for:', query);
      
      // Return empty results for now
      return [];
    } catch (error) {
      console.error('Error in WebSearchAgent:', error);
      return [];
    }
  }
} 