import path from 'node:path';
import {fileURLToPath} from 'node:url';

import express from 'express';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import {agentForToken} from './agents.js';
import {adminRouter} from './admin.js';
import {buildServerForAgent} from './server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT ?? 3300);

// Dashboard: https://agent-call.alazab.com/admin (HTTP Basic Auth, password = ADMIN_PASSWORD env var)
app.use('/admin', adminRouter);
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Single shared path — Azure AI Foundry hits https://mcp.alazab.com/mail with
// a per-agent Authorization header. Nothing about which agent it is comes
// from the URL or the request body, only from the bearer token.
app.post('/mail', async (req, res) => {
  const authHeader = req.header('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const agent = token ? agentForToken(token) : undefined;

  if (!agent) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: {code: -32001, message: 'Missing or unrecognized Authorization: Bearer token.'},
      id: null,
    });
    return;
  }

  try {
    const server = buildServerForAgent(agent);
    const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined});
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('[az-agent-call] request error:', error);
    if (!res.headersSent) {
      res.status(500).json({jsonrpc: '2.0', error: {code: -32603, message: 'Internal server error'}, id: null});
    }
  }
});

app.get('/mail', (_req, res) => {
  res.status(405).json({jsonrpc: '2.0', error: {code: -32000, message: 'Method not allowed.'}, id: null});
});

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.listen(PORT, () => {
  console.error(`[az-agent-call] listening on :${PORT} — mount behind mcp.alazab.com/mail`);
});
