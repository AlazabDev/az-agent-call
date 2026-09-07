// src/index.ts

import 'dotenv/config';
import { CodexAgent } from './agents/codex';
import { Logger } from './core/logger';

const logger = new Logger('Main');

async function main() {
  try {
    logger.info('🚀 Starting Codex Agent...');

    // تهيئة الوكيل
    const agent = new CodexAgent({
      agentName: process.env.AGENT_NAME || 'az-agent-codex',
      agentVersion: process.env.AGENT_VERSION || '1',
      endpoint: process.env.AZURE_AI_ENDPOINT,
      enableLogging: process.env.NODE_ENV !== 'production'
    });

    // عرض الحالة
    const status = await agent.getStatus();
    logger.info('📊 Agent Status:', status);

    // مثال: معالجة طلب
    const response = await agent.processRequest(
      'ابحث عن عميل باسم محمد وأظهر لي مكالماته الأخيرة'
    );

    logger.info('📩 Response:', response.outputText);

    // مثال: استخدام أداة مباشرة
    const callDetails = await agent.useTool('listCalls', { limit: 5 });
    logger.info('📞 Call List:', callDetails);

  } catch (error) {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();