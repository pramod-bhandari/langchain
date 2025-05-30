import { DBSearchAgent } from './db-search-agent';
import { WebSearchAgent } from './web-search-agent';
import type { SearchResult, ConversationContext } from '@/app/types';

export class CoordinatorAgent {
  private dbAgent: DBSearchAgent;
  private webAgent: WebSearchAgent;

  constructor() {
    this.dbAgent = new DBSearchAgent();
    this.webAgent = new WebSearchAgent();
  }

  async coordinateSearch(query: string, context: ConversationContext): Promise<SearchResult[]> {
    try {
      // First, search the local database
      const dbResults = await this.dbAgent.search(query);

      // If we have enough results from the database, return them
      if (dbResults.length >= 5) {
        return dbResults;
      }

      // If we don't have enough results, search the web
      const webResults = await this.webAgent.search(query);

      // Combine and deduplicate results
      const combinedResults = this.combineResults(dbResults, webResults);

      return combinedResults;
    } catch (error) {
      console.error('Error in CoordinatorAgent:', error);
      return [];
    }
  }

  private combineResults(dbResults: SearchResult[], webResults: SearchResult[]): SearchResult[] {
    // Create a map to track unique results by content
    const uniqueResults = new Map<string, SearchResult>();

    // Add database results first
    dbResults.forEach(result => {
      uniqueResults.set(result.content, result);
    });

    // Add web results, only if they don't duplicate existing content
    webResults.forEach(result => {
      if (!uniqueResults.has(result.content)) {
        uniqueResults.set(result.content, result);
      }
    });

    // Convert map back to array and sort by score
    return Array.from(uniqueResults.values())
      .sort((a, b) => b.score - a.score);
  }
} 