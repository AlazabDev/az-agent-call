// src/core/environment-setup.ts

import { AzureClient, createAzureClientFromEnv } from './azure-client';
import { CodexAgent } from '../agents/codex';
import { Logger } from './logger';
import { CodexError } from './errors';
import fs from 'fs/promises';
import path from 'path';

export interface EnvironmentStatus {
    initialized: boolean;
    components: {
        azure: boolean;
        agent: boolean;
        resources: boolean;
        tools: boolean;
    };
    details: {
        subscriptionId?: string;
        resourceGroup?: string;
        agentVersion?: string;
        toolsCount?: number;
    };
    errors: string[];
}

export class EnvironmentSetup {
    private logger: Logger;
    private azureClient: AzureClient;
    private agent?: CodexAgent;
    private status: EnvironmentStatus;

    constructor() {
        this.logger = new Logger('EnvironmentSetup');
        this.status = {
            initialized: false,
            components: {
                azure: false,
                agent: false,
                resources: false,
                tools: false
            },
            details: {},
            errors: []
        };

        // تهيئة عميل Azure
        try {
            this.azureClient = createAzureClientFromEnv();
            this.logger.info('✅ Azure client initialized');
        } catch (error) {
            this.logger.error('❌ Failed to initialize Azure client:', error);
            throw error;
        }
    }

    /**
     * تهيئة البيئة بالكامل
     */
    async setup(): Promise<EnvironmentStatus> {
        try {
            this.logger.info('🚀 Starting environment setup...');

            // 1. التحقق من صلاحيات Owner
            await this.verifyPermissions();

            // 2. تهيئة الموارد
            await this.initializeResources();

            // 3. تهيئة الوكيل
            await this.initializeAgent();

            // 4. اختبار الأدوات
            await this.testTools();

            // 5. إنشاء ملف البيئة
            await this.saveEnvironmentFile();

            this.status.initialized = true;
            this.logger.info('✅ Environment setup completed successfully');

            return this.status;

        } catch (error) {
            this.logger.error('❌ Environment setup failed:', error);
            this.status.errors.push(error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    /**
     * التحقق من الصلاحيات
     */
    private async verifyPermissions(): Promise<void> {
        try {
            this.logger.info('🔍 Verifying Owner permissions...');
            await this.azureClient.verifyOwnerPermissions();
            this.status.components.azure = true;
            
            // جلب معلومات الاشتراك
            const subInfo = await this.azureClient.getSubscriptionInfo();
            this.status.details.subscriptionId = subInfo.id;
            
            this.logger.info(`✅ Verified Owner access on subscription: ${subInfo.name}`);
        } catch (error) {
            this.status.errors.push(`Permission verification failed: ${error instanceof Error ? error.message : String(error)}`);
            throw new CodexError(
                'SETUP_PERMISSION_FAILED',
                `Failed to verify permissions: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * تهيئة الموارد
     */
    private async initializeResources(): Promise<void> {
        try {
            this.logger.info('📦 Initializing Azure resources...');

            // إنشاء Resource Group
            const rg = await this.azureClient.ensureResourceGroup();
            this.status.details.resourceGroup = rg.name;
            this.status.components.resources = true;

            this.logger.info(`✅ Resource group "${rg.name}" ready`);

            // إنشاء AI Project (إذا كان مفعلاً)
            const project = await this.azureClient.ensureAIProject();
            this.logger.info(`✅ AI Project "${project.name}" ready`);

        } catch (error) {
            this.status.errors.push(`Resource initialization failed: ${error instanceof Error ? error.message : String(error)}`);
            throw new CodexError(
                'SETUP_RESOURCES_FAILED',
                `Failed to initialize resources: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * تهيئة الوكيل
     */
    private async initializeAgent(): Promise<void> {
        try {
            this.logger.info('🤖 Initializing Codex Agent...');

            this.agent = new CodexAgent({
                agentName: process.env.AGENT_NAME || 'az-agent-codex',
                agentVersion: process.env.AGENT_VERSION || '1',
                endpoint: process.env.AZURE_AI_ENDPOINT,
                enableLogging: true
            });

            const status = await this.agent.getStatus();
            this.status.details.agentVersion = status.version;
            this.status.details.toolsCount = status.tools.length;
            this.status.components.agent = true;
            this.status.components.tools = true;

            this.logger.info(`✅ Agent ready with ${status.tools.length} tools`);
        } catch (error) {
            this.status.errors.push(`Agent initialization failed: ${error instanceof Error ? error.message : String(error)}`);
            throw new CodexError(
                'SETUP_AGENT_FAILED',
                `Failed to initialize agent: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * اختبار الأدوات
     */
    private async testTools(): Promise<void> {
        try {
            this.logger.info('🔧 Testing agent tools...');

            if (!this.agent) {
                throw new Error('Agent not initialized');
            }

            // اختبار أداة القائمة
            const testResult = await this.agent.useTool('listCalls', { limit: 1 });
            if (testResult) {
                this.logger.info('✅ Tools test successful');
            }

        } catch (error) {
            this.logger.warn('⚠️ Tools test failed (non-critical):', error);
            // لا نوقف العملية هنا، فقط نسجل
        }
    }

    /**
     * حفظ ملف البيئة
     */
    private async saveEnvironmentFile(): Promise<void> {
        try {
            const envContent = `
# بيئة Codex Agent - تم إنشاؤها تلقائياً
# التاريخ: ${new Date().toISOString()}

AZURE_SUBSCRIPTION_ID=${this.status.details.subscriptionId || 'your-subscription-id'}
AZURE_RESOURCE_GROUP=${this.status.details.resourceGroup || 'az-agent-rg'}
AZURE_PROJECT_NAME=az-ai-gateway
AZURE_AI_ENDPOINT=${process.env.AZURE_AI_ENDPOINT || 'https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway'}

AGENT_NAME=az-agent-codex
AGENT_VERSION=${this.status.details.agentVersion || '1'}

NODE_ENV=${process.env.NODE_ENV || 'development'}
LOG_LEVEL=${process.env.LOG_LEVEL || 'info'}
`;

            await fs.writeFile('.env.generated', envContent);
            this.logger.info('✅ Environment file saved: .env.generated');

            // إذا كان .env غير موجود، ننسخ الملف
            try {
                await fs.access('.env');
            } catch {
                await fs.copyFile('.env.generated', '.env');
                this.logger.info('✅ .env file created from template');
            }

        } catch (error) {
            this.logger.warn('⚠️ Failed to save environment file:', error);
        }
    }

    /**
     * الحصول على حالة البيئة
     */
    getStatus(): EnvironmentStatus {
        return this.status;
    }

    /**
     * الحصول على الوكيل المفعل
     */
    getAgent(): CodexAgent | undefined {
        return this.agent;
    }
}

/**
 * تشغيل التهيئة التلقائية
 */
export async function setupEnvironment(): Promise<{
    success: boolean;
    status: EnvironmentStatus;
    agent?: CodexAgent;
}> {
    const setup = new EnvironmentSetup();
    try {
        const status = await setup.setup();
        return {
            success: true,
            status,
            agent: setup.getAgent()
        };
    } catch (error) {
        const status = setup.getStatus();
        return {
            success: false,
            status
        };
    }
}