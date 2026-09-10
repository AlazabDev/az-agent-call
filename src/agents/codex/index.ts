// src/agents/codex/index.ts

import { CodexClient } from '../../core/client.js';
import { Logger } from '../../core/logger.js';
import { CodexConfig, CodexRequest, CodexResponse } from './types.js';
import { createCallTools, createCustomerTools, createTaskTools } from './tools.js';

/**
 * وكيل Codex الرئيسي لمركز الاتصال
 */
export class CodexAgent {
  private client: CodexClient;
  private logger: Logger;
  private config: CodexConfig;

  constructor(config: Partial<CodexConfig> = {}) {
    this.logger = new Logger('CodexAgent');
    
    // التكوين الافتراضي
    const defaultConfig: CodexConfig = {
      endpoint: process.env.AZURE_AI_ENDPOINT ?? 
                'https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway',
      agentName: process.env.AGENT_NAME ?? 'az-agent-codex',
      agentVersion: process.env.AGENT_VERSION ?? '1',
      maxRetries: 3,
      timeout: 30000,
      enableLogging: true,
      tools: [
        ...createCallTools(),
        ...createCustomerTools(),
        ...createTaskTools()
      ]
    };

    this.config = { ...defaultConfig, ...config };
    this.client = new CodexClient(this.config);
    this.logger.info('🤖 Codex Agent initialized successfully');
  }

  /**
   * معالجة طلب من المستخدم
   */
  async processRequest(input: string | CodexRequest): Promise<CodexResponse> {
    try {
      const request: CodexRequest = typeof input === 'string' 
        ? { message: input }
        : input;

      this.logger.info(`📩 Processing request: ${request.message.substring(0, 50)}...`);

      const response = await this.client.sendMessage(request);
      
      this.logger.info(`✅ Request processed: ${response.id}`);
      return response;
    } catch (error) {
      this.logger.error('❌ Failed to process request:', error);
      throw error;
    }
  }

  /**
   * تنفيذ أداة محددة
   */
  async useTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
    try {
      this.logger.info(`🔧 Using tool: ${toolName}`);
      return await this.client.executeTool(toolName, params);
    } catch (error) {
      this.logger.error(`❌ Failed to use tool "${toolName}":`, error);
      throw error;
    }
  }

  /**
   * الحصول على حالة الوكيل
   */
  async getStatus(): Promise<{
    status: 'ready' | 'error';
    version: string;
    tools: string[];
    timestamp: Date;
  }> {
    try {
      return {
        status: 'ready',
        version: this.config.agentVersion,
        tools: this.config.tools?.map((t: any) => t.name) ?? [],
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('❌ Failed to get status:', error);
      return {
        status: 'error',
        version: this.config.agentVersion,
        tools: [],
        timestamp: new Date()
      };
    }
  }
}

// تصدير الأدوات والأنواع
export * from './types.js';
export * from './tools.js';