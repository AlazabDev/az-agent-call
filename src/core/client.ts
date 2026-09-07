// src/core/client.ts

import { DefaultAzureCredential } from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';
import { OpenAIClient } from '@azure/openai';
import { CodexConfig, CodexRequest, CodexResponse, Conversation } from '../agents/codex/types';
import { Logger } from './logger';
import { CodexError, handleError } from './errors';

/**
 * عميل وكيل Codex - إدارة التفاعل مع Azure AI
 */
export class CodexClient {
  private projectClient: AIProjectClient;
  private openAIClient: OpenAIClient;
  private logger: Logger;
  private config: CodexConfig;

  constructor(config: CodexConfig) {
    this.config = config;
    this.logger = new Logger('CodexClient');
    
    try {
      const credential = new DefaultAzureCredential();
      this.projectClient = new AIProjectClient(config.endpoint, credential);
      this.openAIClient = this.projectClient.getOpenAIClient();
      this.logger.info('✅ Codex client initialized successfully');
    } catch (error) {
      const handledError = handleError(error);
      this.logger.error('❌ Failed to initialize Codex client:', handledError);
      throw handledError;
    }
  }

  /**
   * إنشاء محادثة جديدة مع وكيل Codex
   */
  async createConversation(initialMessage: string): Promise<Conversation> {
    try {
      this.logger.info('📝 Creating new conversation...');
      
      const result = await this.openAIClient.conversations.create({
        items: [
          {
            type: 'message',
            role: 'user',
            content: initialMessage
          }
        ]
      });

      const conversation: Conversation = {
        id: result.id ?? '',
        items: result.items?.map(item => ({
          type: item.type as 'message' | 'tool_call' | 'tool_response',
          role: item.role as 'user' | 'assistant' | 'system',
          content: item.content ?? '',
          timestamp: new Date(),
          metadata: item.metadata
        })) ?? [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.logger.info(`✅ Conversation created: ${conversation.id}`);
      return conversation;
    } catch (error) {
      const handledError = handleError(error);
      this.logger.error('❌ Failed to create conversation:', handledError);
      throw handledError;
    }
  }

  /**
   * إرسال رسالة إلى وكيل Codex والحصول على رد
   */
  async sendMessage(request: CodexRequest): Promise<CodexResponse> {
    try {
      this.logger.info('💬 Sending message to Codex agent...');
      
      // إما استخدام محادثة موجودة أو إنشاء جديدة
      let conversationId = request.conversationId;
      
      if (!conversationId) {
        const conversation = await this.createConversation(request.message);
        conversationId = conversation.id;
      }

      // إعداد الطلب مع أدوات الوكيل
      const response = await this.openAIClient.responses.create(
        {
          conversation: conversationId,
        },
        {
          body: {
            agent: {
              name: this.config.agentName,
              version: this.config.agentVersion,
              type: 'agent_reference'
            },
            tools: request.tools?.map(tool => ({
              type: 'function',
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
              }
            }))
          }
        }
      );

      const result: CodexResponse = {
        id: response.id ?? '',
        conversationId: conversationId,
        output: response.output ?? '',
        outputText: response.output_text ?? '',
        metadata: response.metadata,
        timestamp: new Date()
      };

      this.logger.info(`✅ Response received: ${result.id}`);
      return result;
    } catch (error) {
      const handledError = handleError(error);
      this.logger.error('❌ Failed to send message:', handledError);
      throw handledError;
    }
  }

  /**
   * تنفيذ أداة مخصصة عبر الوكيل
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    try {
      this.logger.info(`🔧 Executing tool: ${toolName}`);
      
      const tool = this.config.tools?.find(t => t.name === toolName);
      if (!tool) {
        throw new CodexError('TOOL_NOT_FOUND', `Tool "${toolName}" not found`);
      }

      const result = await tool.execute(parameters);
      this.logger.info(`✅ Tool executed: ${toolName}`);
      return result;
    } catch (error) {
      const handledError = handleError(error);
      this.logger.error(`❌ Failed to execute tool "${toolName}":`, handledError);
      throw handledError;
    }
  }
}