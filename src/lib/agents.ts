import {randomBytes} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

/**
 * One entry per Azure AI Foundry agent. `foundryId` is the agent id as it
 * appears in az-ai-gateway (e.g. `az-agent-finance`). `mailboxLocalPart` is
 * derived by dropping the `az-` prefix, which happens to match the Migadu
 * mailboxes already created (`agent-project@alazab.com`, etc.). Edit this
 * list — and only this list — to add, rename, or remove an agent.
 */
export const AGENT_IDS = [
  'backend',
  'azabot',
  'auth',
  'prod',
  'maint',
  'core',
  'bim',
  'finance',
  'payments',
  'copilot',
  'project',
  'vision',
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export interface AgentConfig {
  id: AgentId;
  foundryId: string; // e.g. "az-agent-finance" — the id used in Azure AI Foundry
  mailboxLocalPart: string; // e.g. "agent-finance"
  email: string; // e.g. "agent-finance@alazab.com" — fixed `From`, never overridable by the agent
  bearerToken: string; // token this agent's Foundry MCP tool config must send
}

const MAILBOX_DOMAIN = process.env.MAILBOX_DOMAIN ?? 'alazab.com';

const TOKENS_PATH = process.env.AGENT_TOKENS_PATH ?? path.join(process.cwd(), 'data', 'agent-tokens.json');

function loadOrCreateTokens(): Record<string, string> {
  if (existsSync(TOKENS_PATH)) {
    return JSON.parse(readFileSync(TOKENS_PATH, 'utf8')) as Record<string, string>;
  }

  const tokens: Record<string, string> = {};
  for (const id of AGENT_IDS) {
    tokens[id] = randomBytes(24).toString('base64url');
  }

  mkdirSync(path.dirname(TOKENS_PATH), {recursive: true});
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2) + '\n', {mode: 0o600});
  console.error(
    `[az-agent-mail] generated ${AGENT_IDS.length} bearer tokens at ${TOKENS_PATH} — ` +
      'copy each into that agent\'s Foundry MCP tool config as the Authorization: Bearer value. ' +
      'This file is not committed; back it up.',
  );
  return tokens;
}

const tokens = loadOrCreateTokens();

export const AGENTS: Record<AgentId, AgentConfig> = Object.fromEntries(
  AGENT_IDS.map((id) => {
    const mailboxLocalPart = `agent-${id}`;
    return [
      id,
      {
        id,
        foundryId: `az-agent-${id}`,
        mailboxLocalPart,
        email: `${mailboxLocalPart}@${MAILBOX_DOMAIN}`,
        bearerToken: tokens[id],
      } satisfies AgentConfig,
    ];
  }),
) as Record<AgentId, AgentConfig>;

const tokenIndex = new Map<string, AgentConfig>(Object.values(AGENTS).map((a) => [a.bearerToken, a]));

/** Resolves the caller's agent identity from its bearer token. Returns undefined if unrecognized. */
export function agentForToken(token: string): AgentConfig | undefined {
  return tokenIndex.get(token);
}
