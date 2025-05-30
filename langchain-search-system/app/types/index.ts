export interface SearchResult {
  id: string;
  content: string;
  metadata: {
    title?: string;
    source?: string;
    timestamp?: string;
    [key: string]: string | undefined;
  };
  score: number;
}

export interface Source {
  id: string;
  title: string;
  url?: string;
  type: 'document' | 'web';
}

export interface ConversationContext {
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  preferences: {
    theme?: 'light' | 'dark';
    language?: string;
    [key: string]: string | undefined;
  };
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  suggestions: string[];
  context: ConversationContext;
}

export interface SearchInterfaceProps {
  onSearch: (query: string) => Promise<void>;
  context: ConversationContext;
  className?: string;
} 