import { create } from 'zustand';
import { ConversationMemory, Conversation, Message } from '@/app/lib/memory/conversationMemory';

interface ConversationState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchConversations: () => Promise<void>;
  fetchConversation: (id: string) => Promise<void>;
  createConversation: (title?: string) => Promise<string>;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearConversationMessages: (id: string) => Promise<void>;
  getCurrentConversation: () => Conversation | null;
}

// Initialize conversation memory
const memory = new ConversationMemory();

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  error: null,
  
  fetchConversations: async () => {
    try {
      set({ isLoading: true, error: null });
      const conversations = await memory.getConversations();
      
      set({ 
        conversations,
        isLoading: false,
        currentConversationId: conversations.length > 0 && !get().currentConversationId 
          ? conversations[0].id 
          : get().currentConversationId
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      set({ 
        error: 'Failed to load conversations',
        isLoading: false
      });
    }
  },
  
  fetchConversation: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const conversation = await memory.getConversation(id);
      
      if (conversation) {
        set(state => ({
          conversations: state.conversations.map(c => 
            c.id === id ? conversation : c
          ),
          isLoading: false
        }));
      }
    } catch (error) {
      console.error(`Error fetching conversation ${id}:`, error);
      set({ 
        error: 'Failed to load conversation',
        isLoading: false
      });
    }
  },
  
  createConversation: async (title = 'New Conversation') => {
    try {
      set({ isLoading: true, error: null });
      const conversationId = await memory.createConversation(title);
      
      const newConversation: Conversation = {
        id: conversationId,
        title,
        messages: [],
        context: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      set(state => ({
        conversations: [newConversation, ...state.conversations],
        currentConversationId: conversationId,
        isLoading: false
      }));
      
      return conversationId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      set({ 
        error: 'Failed to create conversation',
        isLoading: false
      });
      throw error;
    }
  },
  
  setCurrentConversation: (id: string | null) => {
    set({ currentConversationId: id });
    
    // If setting to a valid conversation ID, fetch the full conversation with messages
    if (id) {
      get().fetchConversation(id);
    }
  },
  
  addMessage: async (role: 'user' | 'assistant', content: string) => {
    const currentId = get().currentConversationId;
    
    if (!currentId) return;
    
    try {
      await memory.addMessage(currentId, role, content);
      
      // Update local state with the new message
      const timestamp = Date.now();
      const newMessage: Message = {
        id: `temp-${timestamp}`, // This will be replaced when we fetch from the API
        role,
        content,
        timestamp
      };
      
      set(state => ({
        conversations: state.conversations.map(conv => 
          conv.id === currentId
            ? {
                ...conv,
                messages: [...conv.messages, newMessage],
                updatedAt: timestamp
              }
            : conv
        )
      }));
      
      // Refresh the conversation to get the real message ID
      await get().fetchConversation(currentId);
    } catch (error) {
      console.error('Error adding message:', error);
      set({ error: 'Failed to add message' });
    }
  },
  
  updateConversationTitle: async (id: string, title: string) => {
    try {
      await memory.updateConversationTitle(id, title);
      
      set(state => ({
        conversations: state.conversations.map(conv => 
          conv.id === id
            ? { ...conv, title, updatedAt: Date.now() }
            : conv
        )
      }));
    } catch (error) {
      console.error('Error updating conversation title:', error);
      set({ error: 'Failed to update conversation title' });
    }
  },
  
  deleteConversation: async (id: string) => {
    try {
      await memory.deleteConversation(id);
      
      set(state => {
        const updatedConversations = state.conversations.filter(conv => conv.id !== id);
        
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
    } catch (error) {
      console.error('Error deleting conversation:', error);
      set({ error: 'Failed to delete conversation' });
    }
  },
  
  clearConversationMessages: async (id: string) => {
    try {
      // Call the API to clear conversation messages
      const response = await fetch(`/api/conversations/${id}/clear`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear conversation messages');
      }
      
      // Update the local state
      set(state => ({
        conversations: state.conversations.map(conv => 
          conv.id === id 
            ? { ...conv, messages: [], updatedAt: Date.now() }
            : conv
        )
      }));
      
      // Refresh the conversation to ensure we have the latest state
      await get().fetchConversation(id);
    } catch (error) {
      console.error('Error clearing conversation messages:', error);
      set({ error: 'Failed to clear conversation messages' });
    }
  },
  
  getCurrentConversation: () => {
    const { conversations, currentConversationId } = get();
    if (!currentConversationId) return null;
    return conversations.find(c => c.id === currentConversationId) || null;
  }
})); 