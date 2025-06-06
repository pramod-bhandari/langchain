import { getSupabaseClient } from '../supabase/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for a message in the conversation
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for conversation context
 */
export interface ConversationContext {
  recentDocuments?: string[];
  recentQueries?: string[];
  userPreferences?: Record<string, unknown>;
  customContext?: Record<string, unknown>;
}

/**
 * Interface for conversation data
 */
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  context: ConversationContext;
  createdAt: number;
  updatedAt: number;
}

/**
 * Class to manage conversation memory
 */
export class ConversationMemory {
  private sessionId: string;
  private userId?: string;
  
  constructor(sessionId?: string, userId?: string) {
    this.sessionId = sessionId || uuidv4();
    this.userId = userId;
  }
  
  /**
   * Create a new conversation
   */
  async createConversation(title: string = 'New Conversation'): Promise<string> {
    try {
      const conversationId = uuidv4();
      const now = new Date().toISOString();
      
      // Create record in Supabase
      const { error } = await getSupabaseClient()
        .from('conversations')
        .insert({
          id: conversationId,
          title: title,
          created_at: now,
          updated_at: now
        });
      
      if (error) throw error;
      
      return conversationId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }
  
  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      // Insert the message into the database
      const { error } = await getSupabaseClient()
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: role,
          content: content,
          metadata: metadata
        });
      
      if (error) throw error;
      
      // Update the conversation's updated_at timestamp
      await getSupabaseClient()
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }
  
  /**
   * Get all messages from a conversation
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Define the type for message records from the database
      interface DbMessage {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        created_at: string;
        metadata?: Record<string, unknown>;
      }
      
      return (data as DbMessage[]).map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at).getTime(),
        metadata: msg.metadata
      }));
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }
  
  /**
   * Get a specific conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      // Get the conversation
      const { data: conversationData, error: conversationError } = await getSupabaseClient()
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      
      if (conversationError) throw conversationError;
      if (!conversationData) return null;
      
      // Get all messages for this conversation
      const messages = await this.getMessages(conversationId);
      
      // Return the conversation
      return {
        id: conversationData.id,
        title: conversationData.title,
        messages: messages,
        context: {}, // We'll populate this later
        createdAt: new Date(conversationData.created_at).getTime(),
        updatedAt: new Date(conversationData.updated_at).getTime()
      };
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }
  
  /**
   * Get all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      // We're not loading messages for all conversations
      // to avoid excessive database queries
      interface ConversationRecord {
        id: string;
        title: string;
        created_at: string;
        updated_at: string;
        metadata?: Record<string, unknown>;
      }
      
      return data.map((conv: ConversationRecord) => ({
        id: conv.id,
        title: conv.title,
        messages: [],
        context: {},
        createdAt: new Date(conv.created_at).getTime(),
        updatedAt: new Date(conv.updated_at).getTime()
      }));
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }
  
  /**
   * Update conversation title
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    try {
      const { error } = await getSupabaseClient()
        .from('conversations')
        .update({
          title: title,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  }
  
  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Deleting the conversation will cascade delete all messages
      // due to the foreign key constraint
      const { error } = await getSupabaseClient()
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
  
  /**
   * Update conversation context
   */
  async updateContext(
    conversationId: string,
    context: Partial<ConversationContext>
  ): Promise<void> {
    try {
      // Get current metadata
      const { data, error: fetchError } = await getSupabaseClient()
        .from('conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentMetadata = data?.metadata || {};
      
      // Update metadata with new context
      const newMetadata = {
        ...currentMetadata,
        context: {
          ...(currentMetadata.context || {}),
          ...context
        }
      };
      
      // Save to database
      const { error: updateError } = await getSupabaseClient()
        .from('conversations')
        .update({
          metadata: newMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating context:', error);
      throw error;
    }
  }
  
  /**
   * Get conversation context
   */
  async getContext(conversationId: string): Promise<ConversationContext> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();
      
      if (error) throw error;
      
      // Return the context or an empty object
      return (data?.metadata?.context || {}) as ConversationContext;
    } catch (error) {
      console.error('Error getting context:', error);
      return {};
    }
  }
  
  /**
   * Get the session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
  
  /**
   * Get the user ID
   */
  getUserId(): string | undefined {
    return this.userId;
  }
} 