// src/core/client.ts

import { DefaultAzureCredential } from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';
import { Logger } from './logger.js';
import { CodexError } from './errors.js';

export class CodexClient {
  private projectClient: AIProjectClient;
  private logger: Logger;
  private config: any;

  constructor(config: any) {
    this.config = config;
    this.logger = new Logger('CodexClient');
    
    try {
      const credential = new DefaultAzureCredential();
      this.projectClient = new AIProjectClient(config.endpoint, credential);
      this.logger.info('✅ Codex client initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Codex client:', error);
      throw error;
    }
  }

  async createConversation(initialMessage: string): Promise<any> {
    try {
      this.logger.info('📝 Creating new conversation...');
      
      // محاكاة إنشاء محادثة (لأن AIProjectClient لا يحتوي على getChatCompletions)
      const result = {
        id: `conv-${Date.now()}`,
        items: [
          {
            type: 'message',
            role: 'user',
            content: initialMessage,
            timestamp: new Date()
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.logger.info(`✅ Conversation created: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to create conversation:', error);
      throw error;
    }
  }

  async sendMessage(request: any): Promise<any> {
    try {
      this.logger.info('💬 Sending message...');
      
      // محاكاة الاستجابة
      const response = {
        id: `resp-${Date.now()}`,
        conversationId: request.conversationId || `conv-${Date.now()}`,
        output: `✅ تم استلام رسالتك: "${request.message}"\n\nسأقوم بمعالجتها في أقرب وقت.`,
        outputText: `✅ تم استلام رسالتك: "${request.message}"\n\nسأقوم بمعالجتها في أقرب وقت.`,
        timestamp: new Date()
      };

      this.logger.info(`✅ Response sent: ${response.id}`);
      return response;
    } catch (error) {
      this.logger.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  async executeTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
    try {
      this.logger.info(`🔧 Executing tool: ${toolName}`);
      
      const tool = this.config.tools?.find((t: any) => t.name === toolName);
      if (!tool) {
        throw new CodexError('TOOL_NOT_FOUND', `Tool "${toolName}" not found`);
      }

      const result = await tool.execute(params);
      this.logger.info(`✅ Tool executed: ${toolName}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to execute tool "${toolName}":`, error);
      throw error;
    }
  }
}
