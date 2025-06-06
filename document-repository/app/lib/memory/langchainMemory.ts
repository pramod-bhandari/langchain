import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseMemory, InputValues, MemoryVariables, OutputValues } from '@langchain/core/memory';
import { ConversationMemory, Message } from './conversationMemory';

/**
 * LangChain-compatible memory adapter for our conversation memory system.
 * This allows our custom memory system to be used with LangChain chains and agents.
 */
export class SupabaseConversationMemory extends BaseMemory {
  public memoryKeys: string[] = ['chat_history'];
  public inputKey?: string;
  public outputKey?: string;
  private returnMessages = false;
  private conversationId: string;
  private memory: ConversationMemory;
  private aiPrefix = 'AI';
  private humanPrefix = 'Human';
  private systemPrefix = 'System';
  
  constructor(
    options: {
      conversationId: string;
      memoryKeys?: string[];
      inputKey?: string;
      outputKey?: string;
      returnMessages?: boolean;
      aiPrefix?: string;
      humanPrefix?: string;
      systemPrefix?: string;
      memory?: ConversationMemory;
    }
  ) {
    super();
    this.conversationId = options.conversationId;
    this.memoryKeys = options.memoryKeys || this.memoryKeys;
    this.inputKey = options.inputKey;
    this.outputKey = options.outputKey;
    this.returnMessages = options.returnMessages || false;
    this.aiPrefix = options.aiPrefix || this.aiPrefix;
    this.humanPrefix = options.humanPrefix || this.humanPrefix;
    this.systemPrefix = options.systemPrefix || this.systemPrefix;
    this.memory = options.memory || new ConversationMemory();
  }
  
  /**
   * Convert from our Message format to LangChain BaseMessage
   */
  private convertToLangChainMessage(message: Message): BaseMessage {
    switch (message.role) {
      case 'assistant':
        return new AIMessage(message.content);
      case 'user':
        return new HumanMessage(message.content);
      case 'system':
        return new SystemMessage(message.content);
      default:
        return new HumanMessage(message.content);
    }
  }
  
  /**
   * Convert from LangChain BaseMessage to our Message format
   */
  private convertFromLangChainMessage(message: BaseMessage): Omit<Message, 'id' | 'timestamp'> {
    if (message._getType() === 'ai') {
      return {
        role: 'assistant',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
      };
    } else if (message._getType() === 'human') {
      return {
        role: 'user',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
      };
    } else if (message._getType() === 'system') {
      return {
        role: 'system',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
      };
    } else {
      return {
        role: 'user',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
      };
    }
  }
  
  /**
   * Get input/output variables for the memory
   */
  get memoryVariables(): string[] {
    return this.memoryKeys;
  }
  
  /**
   * Load memory variables
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async loadMemoryVariables(values: InputValues): Promise<MemoryVariables> {
    const messages = await this.memory.getMessages(this.conversationId);
    
    if (this.returnMessages) {
      const result: MemoryVariables = {
        [this.memoryKeys[0]]: messages.map(m => this.convertToLangChainMessage(m))
      };
      return result;
    }
    
    // Format as string if not returning messages
    const result: MemoryVariables = {
      [this.memoryKeys[0]]: messages
        .map(m => {
          if (m.role === 'user') {
            return `${this.humanPrefix}: ${m.content}`;
          } else if (m.role === 'assistant') {
            return `${this.aiPrefix}: ${m.content}`;
          } else if (m.role === 'system') {
            return `${this.systemPrefix}: ${m.content}`;
          } else {
            return m.content;
          }
        })
        .join('\n')
    };
    
    return result;
  }
  
  /**
   * Save context from input/output pairs
   */
  async saveContext(
    inputValues: InputValues,
    outputValues: OutputValues
  ): Promise<void> {
    // Get input value
    const inputValue = this.inputKey 
      ? inputValues[this.inputKey]
      : Object.values(inputValues)[0];
    
    // Get output value
    const outputValue = this.outputKey
      ? outputValues[this.outputKey]
      : Object.values(outputValues)[0];
    
    // Handle different input formats (string or BaseMessage)
    let inputContent: string;
    let outputContent: string;
    
    // Convert input to string
    if (typeof inputValue === 'string') {
      inputContent = inputValue;
    } else if (Array.isArray(inputValue)) {
      // If array of messages, get the last one
      const lastMessage = inputValue[inputValue.length - 1];
      if (typeof lastMessage === 'string') {
        inputContent = lastMessage;
      } else if (typeof lastMessage?.content === 'string') {
        inputContent = lastMessage.content;
      } else {
        inputContent = JSON.stringify(lastMessage);
      }
    } else if (inputValue && typeof inputValue === 'object' && 'content' in inputValue) {
      // If BaseMessage
      inputContent = typeof inputValue.content === 'string' 
        ? inputValue.content 
        : JSON.stringify(inputValue.content);
    } else {
      inputContent = String(inputValue);
    }
    
    // Convert output to string
    if (typeof outputValue === 'string') {
      outputContent = outputValue;
    } else if (Array.isArray(outputValue)) {
      const lastMessage = outputValue[outputValue.length - 1];
      if (typeof lastMessage === 'string') {
        outputContent = lastMessage;
      } else if (typeof lastMessage?.content === 'string') {
        outputContent = lastMessage.content;
      } else {
        outputContent = JSON.stringify(lastMessage);
      }
    } else if (outputValue && typeof outputValue === 'object' && 'content' in outputValue) {
      outputContent = typeof outputValue.content === 'string'
        ? outputValue.content
        : JSON.stringify(outputValue.content);
    } else {
      outputContent = String(outputValue);
    }
    
    // Save to our memory system
    await this.memory.addMessage(this.conversationId, 'user', inputContent);
    await this.memory.addMessage(this.conversationId, 'assistant', outputContent);
  }
  
  /**
   * Clear memory contents
   */
  async clear(): Promise<void> {
    // We'll keep the conversation but delete all messages
    // This would require implementing a method to clear messages by conversation ID
    // For now, we'll just create a new conversation with the same ID
    try {
      await this.memory.deleteConversation(this.conversationId);
      await this.memory.createConversation('New Conversation');
    } catch (error) {
      console.error('Error clearing memory:', error);
    }
  }
} 