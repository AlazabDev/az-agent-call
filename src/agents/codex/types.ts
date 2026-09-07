// src/agents/codex/types.ts

import { OpenAIClient } from '@azure/openai';

/**
 * أنواع الاستجابات من وكيل Codex
 */
export interface CodexResponse {
  id: string;
  conversationId: string;
  output: string;
  outputText: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * أنواع الطلبات إلى وكيل Codex
 */
export interface CodexRequest {
  message: string;
  conversationId?: string;
  context?: Record<string, unknown>;
  tools?: CodexTool[];
  metadata?: Record<string, unknown>;
}

/**
 * أنواع أدوات الوكيل
 */
export interface CodexTool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
}

/**
 * أنواع المحادثة
 */
export interface Conversation {
  id: string;
  items: ConversationItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationItem {
  type: 'message' | 'tool_call' | 'tool_response';
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * أنواع الأخطاء المخصصة
 */
export interface CodexError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * أنواع تكوين الوكيل
 */
export interface CodexConfig {
  endpoint: string;
  agentName: string;
  agentVersion: string;
  maxRetries?: number;
  timeout?: number;
  enableLogging?: boolean;
  tools?: CodexTool[];
}

/**
 * أنواع عميل Azure AI
 */
export interface AIProjectClientConfig {
  endpoint: string;
  credential: DefaultAzureCredential;
  options?: {
    retryPolicy?: {
      maxRetries: number;
      delayMs: number;
    };
    timeout?: number;
  };
}

// استيراد الأنواع المطلوبة
import { DefaultAzureCredential } from '@azure/identity';