import type { SearchResult } from '@/app/types';

export class DBSearchAgent {
  async search(query: string): Promise<SearchResult[]> {
    try {
      // Use the API route for search
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Search request failed');
      }

      const { results } = await response.json();
      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
} 