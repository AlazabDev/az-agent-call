import {Router} from 'express';

import {AGENTS, type AgentId} from './agents.js';
import {getLogEntries} from './logstore.js';
import {resetTransporter, sendAsAgent, verifyAgent} from './mailer.js';
import {getSmtp, isPasswordOverridden, setPassword, setSmtp} from './settings.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

if (!ADMIN_PASSWORD) {
  console.error(
    '[az-agent-mail] WARNING: ADMIN_PASSWORD is not set — the /admin dashboard is disabled until you set it.',
  );
}

export const adminRouter = Router();

// HTTP Basic Auth in front of every /admin route. Username is ignored,
// only the password (ADMIN_PASSWORD env var) matters.
adminRouter.use((req, res, next) => {
  if (!ADMIN_PASSWORD) {
    res.status(503).send('ADMIN_PASSWORD is not configured on the server.');
    return;
  }

  const header = req.header('authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  const decoded = scheme === 'Basic' && encoded ? Buffer.from(encoded, 'base64').toString('utf8') : '';
  const password = decoded.split(':').slice(1).join(':');

  if (password !== ADMIN_PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="az-agent-mail admin"');
    res.status(401).send('Authentication required.');
    return;
  }

  next();
});

function agentOr404(res: import('express').Response, id: string) {
  const agent = AGENTS[id as AgentId];
  if (!agent) res.status(404).json({error: `Unknown agent id "${id}"`});
  return agent;
}

// Never returns bearerToken or password — dashboard is for status/testing/management,
// not for reading out credentials.
adminRouter.get('/api/agents', (_req, res) => {
  res.json(
    Object.values(AGENTS).map((a) => ({
      foundryId: a.foundryId,
      id: a.id,
      email: a.email,
      passwordOverridden: isPasswordOverridden(a.id),
    })),
  );
});

adminRouter.get('/api/health', (_req, res) => {
  res.json({status: 'ok', uptimeSeconds: Math.round(process.uptime()), agentCount: Object.keys(AGENTS).length});
});

adminRouter.get('/api/settings', (_req, res) => {
  res.json(getSmtp());
});

adminRouter.post('/api/settings/smtp', (req, res) => {
  const host = typeof req.body?.host === 'string' ? req.body.host.trim() : '';
  const port = Number(req.body?.port);
  if (!host || !Number.isInteger(port) || port <= 0) {
    res.status(400).json({error: 'Body must include a non-empty "host" and a positive integer "port".'});
    return;
  }
  setSmtp(host, port);
  res.json({ok: true, ...getSmtp()});
});

// Write-only: sets a real per-mailbox password so it stops relying on the
// shared "{mailbox}@202555" pattern. Never echoed back.
adminRouter.post('/api/agents/:id/password', (req, res) => {
  const agent = agentOr404(res, req.params.id);
  if (!agent) return;

  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) {
    res.status(400).json({error: 'Body must include a non-empty "password".'});
    return;
  }

  setPassword(agent.id, password);
  resetTransporter(agent); // next send/verify picks up the new password immediately
  res.json({ok: true});
});

adminRouter.post('/api/agents/:id/reload', (req, res) => {
  const agent = agentOr404(res, req.params.id);
  if (!agent) return;
  resetTransporter(agent);
  res.json({ok: true});
});

adminRouter.post('/api/agents/:id/verify', async (req, res) => {
  const agent = agentOr404(res, req.params.id);
  if (!agent) return;
  res.json(await verifyAgent(agent));
});

// Full check: verifies SMTP auth for every agent's mailbox without sending anything.
adminRouter.post('/api/verify-all', async (_req, res) => {
  const results = await Promise.all(
    Object.values(AGENTS).map(async (agent) => ({
      id: agent.id,
      email: agent.email,
      ...(await verifyAgent(agent)),
    })),
  );
  res.json({results, healthyCount: results.filter((r) => r.ok).length, total: results.length});
});

adminRouter.post('/api/agents/:id/test-send', async (req, res) => {
  const agent = agentOr404(res, req.params.id);
  if (!agent) return;

  const to = typeof req.body?.to === 'string' && req.body.to ? req.body.to : agent.email;

  try {
    const result = await sendAsAgent(agent, {
      to,
      subject: `Test send from ${agent.email}`,
      text: `This is a test email sent from the az-agent-mail dashboard at ${new Date().toISOString()}.`,
    });
    res.json({ok: true, result});
  } catch (error) {
    res.status(502).json({ok: false, error: error instanceof Error ? error.message : String(error)});
  }
});

// Message review: latest sends across all agents, or one agent via ?agent=finance
adminRouter.get('/api/logs', (req, res) => {
  const agentId = typeof req.query.agent === 'string' ? req.query.agent : undefined;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json(getLogEntries(agentId, limit));
});
