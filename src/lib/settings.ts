import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

interface Settings {
  smtpHost: string;
  smtpPort: number;
  /** agentId -> password. Only present once overridden via the dashboard or an env var. */
  passwords: Record<string, string>;
}

const SETTINGS_PATH = process.env.SETTINGS_PATH ?? path.join(process.cwd(), 'data', 'settings.json');

function defaults(): Settings {
  return {
    smtpHost: process.env.MIGADU_SMTP_HOST ?? 'smtp.migadu.com',
    smtpPort: Number(process.env.MIGADU_SMTP_PORT ?? 587),
    passwords: {},
  };
}

function load(): Settings {
  if (existsSync(SETTINGS_PATH)) {
    try {
      return {...defaults(), ...JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'))} as Settings;
    } catch (error) {
      console.error(`[az-agent-call] failed to parse ${SETTINGS_PATH}, falling back to defaults:`, error);
    }
  }
  return defaults();
}

let settings = load();

function persist(): void {
  mkdirSync(path.dirname(SETTINGS_PATH), {recursive: true});
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', {mode: 0o600});
}

export function getSmtp(): {host: string; port: number} {
  return {host: settings.smtpHost, port: settings.smtpPort};
}

export function setSmtp(host: string, port: number): void {
  settings.smtpHost = host;
  settings.smtpPort = port;
  persist();
}

const DEFAULT_PASSWORD_SUFFIX = process.env.MAILBOX_PASSWORD_DEFAULT_SUFFIX ?? '202555';

/** Resolution order: dashboard override (settings.json) > env var > `{mailboxLocalPart}@202555` pattern. */
export function getPassword(agentId: string, mailboxLocalPart: string): string {
  if (settings.passwords[agentId]) return settings.passwords[agentId];

  const envOverride = process.env[`MAILBOX_PASSWORD_${agentId.toUpperCase()}`];
  if (envOverride) return envOverride;

  return `${mailboxLocalPart}@${DEFAULT_PASSWORD_SUFFIX}`;
}

export function setPassword(agentId: string, password: string): void {
  settings.passwords[agentId] = password;
  persist();
}

/** Whether this agent's password has ever been overridden away from the shared default pattern. */
export function isPasswordOverridden(agentId: string): boolean {
  return Boolean(settings.passwords[agentId] || process.env[`MAILBOX_PASSWORD_${agentId.toUpperCase()}`]);
}
