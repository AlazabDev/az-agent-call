// server/index.ts

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createChatRoutes } from './routes/chat.js';
import { CodexAgent } from '../src/agents/codex/index.js';
import { Logger } from '../src/core/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تحميل متغيرات البيئة
dotenv.config();

const logger = new Logger('Server');
const app = express();
const PORT = process.env.PORT || 3300;

// ✅ Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3300', 'https://daftra.alazab.com'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ تقديم الملفات الثابتة (واجهة React)
app.use(express.static(path.join(__dirname, '../dist')));

// ✅ مسار الصحة
app.get('/healthz', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.1.0'
  });
});

app.get('/readyz', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// ✅ تهيئة وكيل Codex
let agent: CodexAgent | undefined;

async function initializeAgent() {
  try {
    logger.info('🤖 Initializing Codex Agent...');
    
    agent = new CodexAgent({
      agentName: process.env.AGENT_NAME || 'az-agent-codex',
      agentVersion: process.env.AGENT_VERSION || '1',
      endpoint: process.env.AZURE_AI_ENDPOINT,
      enableLogging: process.env.NODE_ENV !== 'production'
    });

    const status = await agent.getStatus();
    logger.info(`✅ Agent initialized with ${status.tools.length} tools`);
    
    return true;
  } catch (error) {
    logger.error('❌ Failed to initialize agent:', error);
    return false;
  }
}

// ✅ إضافة مسارات الدردشة
const chatRoutes = createChatRoutes(agent);
app.use('/chat', chatRoutes);
app.use('/api/chat', chatRoutes);

// ✅ مسار الـ API الرئيسي
app.use('/api', chatRoutes);

// ✅ مسار الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ✅ مسار احتياطي لـ React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ✅ بدء الخادم
async function startServer() {
  // تهيئة الوكيل (لا تنتظر حتى يكتمل)
  initializeAgent();

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📱 Admin UI: http://localhost:${PORT}/admin/`);
    logger.info(`💬 Chat API: http://localhost:${PORT}/api/chat`);
    logger.info(`❤️  Health: http://localhost:${PORT}/healthz`);
  });
}

startServer();

export { app, agent };