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
  history?: { role: string; content: string }[];
  preferences?: {
    [key: string]: string | number | boolean;
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