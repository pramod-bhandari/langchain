/**
 * Interface representing the memory state for agent interactions
 * This contains the context that agents can use to make decisions
 */
export interface MemoryState {
  // Recent queries from the user
  recentQueries?: string[];
  
  // Recent documents interacted with
  recentDocuments?: string[];
  
  // Custom context data that might be relevant
  customContext?: Record<string, unknown>;
  
  // User preferences if available
  userPreferences?: Record<string, unknown>;
} 