import nodemailer, {type Transporter} from 'nodemailer';

import type {AgentConfig} from './agents.js';
import {addLogEntry} from './logstore.js';
import {getPassword, getSmtp} from './settings.js';

const transporters = new Map<string, Transporter>();

function cacheKey(agent: AgentConfig, password: string, host: string, port: number): string {
  return `${agent.email}:${password}:${host}:${port}`;
}

function transporterFor(agent: AgentConfig): {transporter: Transporter; password: string} {
  const password = getPassword(agent.id, agent.mailboxLocalPart);
  const {host, port} = getSmtp();
  const key = cacheKey(agent, password, host, port);

  const existing = transporters.get(key);
  if (existing) return {transporter: existing, password};

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false, // STARTTLS, not implicit TLS
    requireTLS: true,
    auth: {user: agent.email, pass: password},
    // Migadu rate-limits per mailbox; keep one connection warm rather than
    // reconnecting per send.
    pool: true,
    maxConnections: 1,
  });

  transporters.set(key, transporter);
  return {transporter, password};
}

/** Drops any cached SMTP connection(s) for this agent so the next send/verify reconnects from scratch. */
export function resetTransporter(agent: AgentConfig): void {
  for (const key of transporters.keys()) {
    if (key.startsWith(`${agent.email}:`)) {
      transporters.get(key)?.close();
      transporters.delete(key);
    }
  }
}

export interface SendEmailInput {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  messageId: string;
  from: string;
  to: string | string[];
  accepted: string[];
  rejected: string[];
}

function toDisplay(to: string | string[]): string {
  return Array.isArray(to) ? to.join(', ') : to;
}

/** Sends as `agent.email` — the From address is never taken from the caller. Every attempt is logged. */
export async function sendAsAgent(agent: AgentConfig, input: SendEmailInput): Promise<SendEmailResult> {
  const {transporter} = transporterFor(agent);

  try {
    const info = await transporter.sendMail({
      from: agent.email,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    });

    addLogEntry({
      agentId: agent.id,
      from: agent.email,
      to: toDisplay(input.to),
      subject: input.subject,
      status: 'sent',
      messageId: info.messageId,
    });

    return {
      messageId: info.messageId,
      from: agent.email,
      to: input.to,
      accepted: info.accepted.map(String),
      rejected: info.rejected.map(String),
    };
  } catch (error) {
    addLogEntry({
      agentId: agent.id,
      from: agent.email,
      to: toDisplay(input.to),
      subject: input.subject,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Checks SMTP auth for this agent's mailbox without sending anything. */
export async function verifyAgent(agent: AgentConfig): Promise<{ok: true} | {ok: false; error: string}> {
  const {transporter} = transporterFor(agent);
  try {
    await transporter.verify();
    return {ok: true};
  } catch (error) {
    return {ok: false, error: error instanceof Error ? error.message : String(error)};
  }
}
