// src/agents/codex/config.ts

import { z } from 'zod';
import { CodexTool } from './types.js';

/**
 * ✅ مخطط التحقق من متغيرات البيئة باستخدام Zod
 */
export const EnvironmentSchema = z.object({
  // Azure AI Configuration
  AZURE_AI_ENDPOINT: z.string().url().default(
    'https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway'
  ),
  AZURE_SUBSCRIPTION_ID: z.string().optional(),
  AZURE_RESOURCE_GROUP: z.string().default('az-agent-rg'),
  AZURE_PROJECT_NAME: z.string().default('az-ai-gateway'),

  // Agent Configuration
  AGENT_NAME: z.string().default('az-agent-codex'),
  AGENT_VERSION: z.string().default('1'),
  
  // Application Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.string().default('3000'),

  // API Keys (اختيارية)
  DAFTRA_SUBDOMAIN: z.string().optional(),
  DAFTRA_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
});

/**
 * ✅ نوع متغيرات البيئة بعد التحقق
 */
export type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * ✅ تكوين الوكيل
 */
export interface CodexAgentConfig {
  /** اسم الوكيل */
  agentName: string;
  /** إصدار الوكيل */
  agentVersion: string;
  /** نقطة نهاية Azure AI */
  endpoint: string;
  /** معرف الاشتراك في Azure */
  subscriptionId?: string;
  /** مجموعة الموارد في Azure */
  resourceGroup?: string;
  /** اسم المشروع في Azure */
  projectName?: string;
  /** الأدوات المتاحة للوكيل */
  tools?: CodexTool[];
  /** عدد محاولات إعادة المحاولة */
  maxRetries?: number;
  /** مهلة الطلب (بالمللي ثانية) */
  timeout?: number;
  /** تفعيل التسجيل */
  enableLogging?: boolean;
  /** مستوى التسجيل */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** متغيرات مخصصة إضافية */
  extra?: Record<string, unknown>;
}

/**
 * ✅ تكوين الوكيل الافتراضي
 */
export const DEFAULT_AGENT_CONFIG: CodexAgentConfig = {
  agentName: 'az-agent-codex',
  agentVersion: '1',
  endpoint: 'https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway',
  maxRetries: 3,
  timeout: 30000,
  enableLogging: true,
  logLevel: 'info',
};

/**
 * ✅ دالة لتحميل التكوين من متغيرات البيئة
 */
export function loadConfigFromEnv(): CodexAgentConfig {
  const env = process.env as Record<string, string | undefined>;

  // محاولة تحليل متغيرات البيئة
  const parsed = EnvironmentSchema.safeParse({
    AZURE_AI_ENDPOINT: env.AZURE_AI_ENDPOINT,
    AZURE_SUBSCRIPTION_ID: env.AZURE_SUBSCRIPTION_ID,
    AZURE_RESOURCE_GROUP: env.AZURE_RESOURCE_GROUP,
    AZURE_PROJECT_NAME: env.AZURE_PROJECT_NAME,
    AGENT_NAME: env.AGENT_NAME,
    AGENT_VERSION: env.AGENT_VERSION,
    NODE_ENV: env.NODE_ENV,
    LOG_LEVEL: env.LOG_LEVEL,
    PORT: env.PORT,
    DAFTRA_SUBDOMAIN: env.DAFTRA_SUBDOMAIN,
    DAFTRA_API_KEY: env.DAFTRA_API_KEY,
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    console.warn('⚠️  تحذير: بعض متغيرات البيئة غير صحيحة:', parsed.error.errors);
  }

  const data = parsed.success ? parsed.data : {} as Environment;

  return {
    agentName: data.AGENT_NAME || DEFAULT_AGENT_CONFIG.agentName,
    agentVersion: data.AGENT_VERSION || DEFAULT_AGENT_CONFIG.agentVersion,
    endpoint: data.AZURE_AI_ENDPOINT || DEFAULT_AGENT_CONFIG.endpoint,
    subscriptionId: data.AZURE_SUBSCRIPTION_ID,
    resourceGroup: data.AZURE_RESOURCE_GROUP,
    projectName: data.AZURE_PROJECT_NAME,
    maxRetries: DEFAULT_AGENT_CONFIG.maxRetries,
    timeout: DEFAULT_AGENT_CONFIG.timeout,
    enableLogging: data.NODE_ENV !== 'production' || DEFAULT_AGENT_CONFIG.enableLogging,
    logLevel: data.LOG_LEVEL || DEFAULT_AGENT_CONFIG.logLevel,
    extra: {
      daftraSubdomain: data.DAFTRA_SUBDOMAIN,
      daftraApiKey: data.DAFTRA_API_KEY,
      supabaseUrl: data.SUPABASE_URL,
      supabaseAnonKey: data.SUPABASE_ANON_KEY,
    },
  };
}

/**
 * ✅ دالة لدمج التكوينات
 */
export function mergeConfigs(
  ...configs: Partial<CodexAgentConfig>[]
): CodexAgentConfig {
  const result: CodexAgentConfig = { ...DEFAULT_AGENT_CONFIG };

  for (const config of configs) {
    Object.assign(result, config);
  }

  return result;
}

/**
 * ✅ دالة للتحقق من صحة التكوين
 */
export function validateConfig(config: CodexAgentConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.agentName || config.agentName.trim().length === 0) {
    errors.push('agentName مطلوب');
  }

  if (!config.agentVersion || config.agentVersion.trim().length === 0) {
    errors.push('agentVersion مطلوب');
  }

  if (!config.endpoint || !config.endpoint.startsWith('https://')) {
    errors.push('endpoint يجب أن يكون عنوان URL صحيح يبدأ بـ https://');
  }

  if (config.maxRetries !== undefined && config.maxRetries < 0) {
    errors.push('maxRetries يجب أن يكون عدداً موجباً');
  }

  if (config.timeout !== undefined && config.timeout < 0) {
    errors.push('timeout يجب أن يكون عدداً موجباً');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ✅ دالة لإنشاء تكوين مع أدوات مخصصة
 */
export function createAgentConfig(
  overrides?: Partial<CodexAgentConfig>,
  tools?: CodexTool[]
): CodexAgentConfig {
  const envConfig = loadConfigFromEnv();
  const baseConfig = mergeConfigs(DEFAULT_AGENT_CONFIG, envConfig, overrides || {});
  
  return {
    ...baseConfig,
    tools: tools || baseConfig.tools || [],
  };
}

/**
 * ✅ دالة لتسجيل التكوين (للتطوير)
 */
export function logConfig(config: CodexAgentConfig): void {
  const { endpoint, agentName, agentVersion, maxRetries, timeout, enableLogging, logLevel, tools } = config;

  console.log('📋 ====================================');
  console.log('📋  تكوين وكيل Codex');
  console.log('📋 ====================================');
  console.log(`  🤖 الوكيل: ${agentName} (v${agentVersion})`);
  console.log(`  🔗 النهاية: ${endpoint}`);
  console.log(`  🔄 إعادة المحاولة: ${maxRetries}`);
  console.log(`  ⏱️  المهلة: ${timeout}ms`);
  console.log(`  📝 التسجيل: ${enableLogging ? 'مفعل' : 'معطل'}`);
  console.log(`  📊 المستوى: ${logLevel}`);
  console.log(`  🔧 الأدوات: ${tools?.length || 0}`);
  
  if (tools && tools.length > 0) {
    console.log('  📌 الأدوات المتاحة:');
    for (const tool of tools) {
      console.log(`     - ${tool.name}: ${tool.description}`);
    }
  }
  console.log('📋 ====================================');
}

/**
 * ✅ تصدير التكوين الافتراضي
 */
export default {
  DEFAULT_AGENT_CONFIG,
  loadConfigFromEnv,
  mergeConfigs,
  validateConfig,
  createAgentConfig,
  logConfig,
  EnvironmentSchema,
};