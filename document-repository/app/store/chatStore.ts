import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  documentIds?: string[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createConversation: (title?: string, documentIds?: string[]) => void;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearCurrentConversation: () => void;
  updateConversationTitle: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
  loadConversations: () => void;
  getCurrentConversation: () => Conversation | null;
}

// Helper to persist conversations to localStorage
const saveConversationsToStorage = (conversations: Conversation[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('chatConversations', JSON.stringify(conversations));
  }
};

// Helper to load conversations from localStorage
const loadConversationsFromStorage = (): Conversation[] => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('chatConversations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved conversations', e);
      }
    }
  }
  return [];
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  error: null,
  
  loadConversations: () => {
    const conversations = loadConversationsFromStorage();
    set({ conversations });
    
    // Set current conversation to the most recent one if none is selected
    if (conversations.length > 0 && !get().currentConversationId) {
      set({ currentConversationId: conversations[0].id });
    }
  },
  
  createConversation: (title = 'New Conversation', documentIds = []) => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title,
      messages: [],
      documentIds,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    set(state => {
      const updatedConversations = [newConversation, ...state.conversations];
      saveConversationsToStorage(updatedConversations);
      return {
        conversations: updatedConversations,
        currentConversationId: newConversation.id
      };
    });
  },
  
  setCurrentConversation: (id: string | null) => {
    set({ currentConversationId: id });
  },
  
  addMessage: (role: 'user' | 'assistant', content: string) => {
    const currentId = get().currentConversationId;
    
    if (!currentId) return;
    
    const newMessage: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now()
    };
    
    set(state => {
      const updatedConversations = state.conversations.map(conv => 
        conv.id === currentId
          ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              updatedAt: Date.now()
            }
          : conv
      );
      
      saveConversationsToStorage(updatedConversations);
      
      return {
        conversations: updatedConversations
      };
    });
  },
  
  clearCurrentConversation: () => {
    const currentId = get().currentConversationId;
    
    if (!currentId) return;
    
    set(state => {
      const updatedConversations = state.conversations.map(conv => 
        conv.id === currentId
          ? {
              ...conv,
              messages: [],
              updatedAt: Date.now()
            }
          : conv
      );
      
      saveConversationsToStorage(updatedConversations);
      
      return {
        conversations: updatedConversations
      };
    });
  },
  
  updateConversationTitle: (id: string, title: string) => {
    set(state => {
      const updatedConversations = state.conversations.map(conv => 
        conv.id === id
          ? {
              ...conv,
              title,
              updatedAt: Date.now()
            }
          : conv
      );
      
      saveConversationsToStorage(updatedConversations);
      
      return {
        conversations: updatedConversations
      };
    });
  },
  
  deleteConversation: (id: string) => {
    set(state => {
      const updatedConversations = state.conversations.filter(conv => conv.id !== id);
      saveConversationsToStorage(updatedConversations);
      
      // If deleting current conversation, set the first available as current
      let updatedCurrentId = state.currentConversationId;
      if (state.currentConversationId === id) {
        updatedCurrentId = updatedConversations.length > 0 ? updatedConversations[0].id : null;
      }
      
      return {
        conversations: updatedConversations,
        currentConversationId: updatedCurrentId
      };
    });
  },
  
  getCurrentConversation: () => {
    const { conversations, currentConversationId } = get();
    if (!currentConversationId) return null;
    return conversations.find(c => c.id === currentConversationId) || null;
  }
})); 