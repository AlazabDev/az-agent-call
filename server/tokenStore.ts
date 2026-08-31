import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { AGENT_IDS, type AgentId } from "../shared/agents.js";
import { config } from "./config.js";
import { supabaseAdmin } from "./supabase.js";

type TokenMap = Record<AgentId, string>;
let tokens: Partial<TokenMap> = {};

export function hashAgentToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function hint(token: string): string {
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

function secureToken(): string {
  return randomBytes(32).toString("base64url");
}

async function persist(next: Partial<TokenMap>): Promise<void> {
  await mkdir(path.dirname(config.agentTokensPath), { recursive: true });
  const tmp = `${config.agentTokensPath}.tmp-${process.pid}`;
  await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  await rename(tmp, config.agentTokensPath);
  await chmod(config.agentTokensPath, 0o600).catch(() => undefined);
}

async function syncHashes(generated: ReadonlySet<AgentId>): Promise<void> {
  for (const id of AGENT_IDS) {
    const token = tokens[id];
    if (!token) continue;
    const update: { token_hash: string; token_hint: string; token_rotated_at?: string } = {
      token_hash: hashAgentToken(token),
      token_hint: hint(token),
    };
    // A normal gateway restart must not look like a credential rotation in the audit trail.
    if (generated.has(id)) update.token_rotated_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("mail_agents").update(update).eq("id", id);
    if (error) throw new Error(`Failed to sync token hash for ${id}: ${error.message}`);
  }
}

export async function initializeAgentTokens(): Promise<{ generated: AgentId[]; path: string }> {
  try {
    const parsed = JSON.parse(await readFile(config.agentTokensPath, "utf8")) as Record<string, unknown>;
    for (const id of AGENT_IDS) {
      const value = parsed[id];
      if (typeof value === "string" && value.length >= 40) tokens[id] = value;
    }
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") throw error;
  }

  const generated: AgentId[] = [];
  for (const id of AGENT_IDS) {
    if (!tokens[id]) {
      tokens[id] = secureToken();
      generated.push(id);
    }
  }
  await persist(tokens);
  await syncHashes(new Set(generated));
  return { generated, path: config.agentTokensPath };
}

export function agentIdForClearToken(candidate: string): AgentId | null {
  if (!candidate || candidate.length < 40) return null;
  const candidateHash = Buffer.from(hashAgentToken(candidate), "hex");
  for (const id of AGENT_IDS) {
    const stored = tokens[id];
    if (!stored) continue;
    const storedHash = Buffer.from(hashAgentToken(stored), "hex");
    if (storedHash.length === candidateHash.length && timingSafeEqual(storedHash, candidateHash)) return id;
  }
  return null;
}

export async function rotateStoredAgentToken(id: AgentId): Promise<{ token: string; hint: string }> {
  const token = secureToken();
  tokens = { ...tokens, [id]: token };
  await persist(tokens);
  const tokenHint = hint(token);
  const { error } = await supabaseAdmin.from("mail_agents").update({
    token_hash: hashAgentToken(token),
    token_hint: tokenHint,
    token_rotated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(`Token rotation failed: ${error.message}`);
  return { token, hint: tokenHint };
}

export function tokenStoreStatus() {
  return {
    path: config.agentTokensPath,
    loaded: AGENT_IDS.filter((id) => Boolean(tokens[id])).length,
    expected: AGENT_IDS.length,
  };
}
