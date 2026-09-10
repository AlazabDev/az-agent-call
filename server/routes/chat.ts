// server/routes/chat.ts

import { Router, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { CodexAgent } from '../../src/agents/codex/index.js';
import { Logger } from '../../src/core/logger.js';
import type { AgentRequest, AgentResponse } from '../../shared/types/agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = new Logger('ChatRoutes');

/**
 * إنشاء مسارات الدردشة
 */
export function createChatRoutes(agent?: CodexAgent): Router {
  const router = Router();

  // ✅ صفحة الدردشة
  router.get('/', (req: Request, res: Response) => {
    try {
      // نخدم واجهة React من مجلد dist
      const indexPath = path.join(__dirname, '../../dist/index.html');
      res.sendFile(indexPath);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to load chat interface',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ✅ إرسال رسالة
  router.post('/api/message', async (req: Request, res: Response) => {
    try {
      const { message, conversationId } = req.body as AgentRequest;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      if (!agent) {
        return res.status(503).json({ error: 'Agent is not initialized' });
      }

      logger.info(`📩 [Chat] Message: "${message.substring(0, 50)}..."`);

      const response = await agent.processRequest({ message, conversationId });

      const result: AgentResponse = {
        id: response.id,
        conversationId: response.conversationId,
        output: response.output,
        outputText: response.outputText,
        timestamp: response.timestamp,
        toolCalls: response.metadata?.toolCalls as any
      };

      return res.json(result);

    } catch (error) {
      logger.error('❌ [Chat] Error:', error);
      return res.status(500).json({
        error: 'Failed to process message',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ✅ بدء محادثة جديدة
  router.post('/api/conversation', async (req: Request, res: Response) => {
    try {
      if (!agent) {
        return res.status(503).json({ error: 'Agent is not initialized' });
      }

      const { initialMessage = 'مرحباً' } = req.body;
      logger.info('📝 [Chat] Starting new conversation...');

      const response = await agent.processRequest(initialMessage);

      return res.json({
        success: true,
        conversationId: response.conversationId,
        response
      });

    } catch (error) {
      logger.error('❌ [Chat] Failed to start conversation:', error);
      return res.status(500).json({
        error: 'Failed to start conversation',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ✅ حالة الوكيل
  router.get('/api/status', async (req: Request, res: Response) => {
    try {
      if (!agent) {
        return res.status(503).json({
          status: 'offline',
          error: 'Agent not initialized'
        });
      }

      const status = await agent.getStatus();
      return res.json({
        success: true,
        status
      });

    } catch (error) {
      return res.status(500).json({
        error: 'Failed to get agent status',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ✅ تنفيذ أداة
  router.post('/api/tool/:name', async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const params = req.body || {};

      if (!agent) {
        return res.status(503).json({ error: 'Agent is not initialized' });
      }

      logger.info(`🔧 [Chat] Executing tool: ${name}`);
      const result = await agent.useTool(name as string, params);

      return res.json({
        success: true,
        tool: name,
        result
      });

    } catch (error) {
      logger.error(`❌ [Chat] Tool "${req.params.name}" failed:`, error);
      return res.status(500).json({
        error: 'Tool execution failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return router;
}