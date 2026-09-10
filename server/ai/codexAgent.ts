import { DefaultAzureCredential } from "@azure/identity";
import { AIProjectClient } from "@azure/ai-projects";
import { config } from "../config.js";

export interface CodexAskResult {
  conversationId: string;
  outputText: string;
  responseId: string;
}

/**
 * Azure AI Foundry ("Codex") agent client.
 *
 * Lazily initialized so that a missing/misconfigured Azure AI project does
 * not block server startup (same non-blocking pattern used by the
 * telephony provider). `DefaultAzureCredential` resolves credentials from
 * the standard Azure chain: environment variables (AZURE_TENANT_ID /
 * AZURE_CLIENT_ID / AZURE_CLIENT_SECRET), managed identity, Azure CLI
 * login, etc. — nothing Azure-specific needs to be hardcoded here.
 */
let projectClient: AIProjectClient | null = null;
let openAIClient: ReturnType<AIProjectClient["getOpenAIClient"]> | null = null;

function getOpenAIClient() {
  if (!config.azureAiProjectEndpoint) {
    throw new Error("AZURE_AI_PROJECT_ENDPOINT is not configured.");
  }
  if (!openAIClient) {
    projectClient = new AIProjectClient(config.azureAiProjectEndpoint, new DefaultAzureCredential());
    openAIClient = projectClient.getOpenAIClient();
  }
  return openAIClient;
}

export const codexAgent = {
  get isReady(): boolean {
    return Boolean(config.azureAiProjectEndpoint);
  },

  get agentReference() {
    return {
      name: config.azureAiAgentName,
      version: config.azureAiAgentVersion,
      type: "agent_reference" as const,
    };
  },

  /**
   * Sends a prompt to the Codex agent.
   * - Without `conversationId`: opens a brand-new conversation.
   * - With `conversationId`: appends the prompt as a new turn in an
   *   existing conversation, preserving prior context.
   */
  async ask(prompt: string, conversationId?: string): Promise<CodexAskResult> {
    const client = getOpenAIClient();

    let conversation: { id: string };
    if (conversationId) {
      await client.conversations.items.create(conversationId, {
        items: [{ type: "message", role: "user", content: prompt }],
      });
      conversation = { id: conversationId };
    } else {
      conversation = await client.conversations.create({
        items: [{ type: "message", role: "user", content: prompt }],
      });
    }

    const response = await client.responses.create(
      { conversation: conversation.id },
      { body: { agent: this.agentReference } },
    );

    return {
      conversationId: conversation.id,
      outputText: response.output_text ?? "",
      responseId: response.id,
    };
  },
};
