// src/agents/codex/config.ts
export interface CodexAgentConfig {
  agentName: string;
  agentVersion: string;
  endpoint: string;
  maxRetries?: number;
  timeout?: number;
  enableLogging?: boolean;
}

export const DEFAULT_CONFIG: CodexAgentConfig = {
  agentName: 'az-agent-codex',
  agentVersion: '1',
  endpoint: 'https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway',
  maxRetries: 3,
  timeout: 30000,
  enableLogging: true,
};
