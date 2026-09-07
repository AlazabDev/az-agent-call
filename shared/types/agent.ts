// shared/types/agent.ts

/**
 * أنواع مشتركة بين العميل والخادم لوكيل Codex
 */

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  conversationId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'success' | 'error';
}

export interface AgentConversation {
  id: string;
  messages: AgentMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface AgentRequest {
  message: string;
  conversationId?: string;
  context?: Record<string, unknown>;
}

export interface AgentResponse {
  id: string;
  conversationId: string;
  output: string;
  outputText: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
}

export interface AgentStatus {
  status: 'ready' | 'error' | 'initializing';
  version: string;
  tools: string[];
  timestamp: Date;
}