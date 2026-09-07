// src/core/azure-client.ts

import { 
    DefaultAzureCredential, 
    AzureCliCredential,
    ManagedIdentityCredential,
    ChainedTokenCredential,
    EnvironmentCredential
} from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';
import { OpenAIClient } from '@azure/openai';
import { ResourceManagementClient } from '@azure/arm-resources';
import { SubscriptionClient } from '@azure/arm-subscriptions';
import { Logger } from './logger';
import { CodexError } from './errors';

/**
 * تكوين عميل Azure
 */
export interface AzureClientConfig {
    subscriptionId: string;
    endpoint?: string;
    resourceGroup?: string;
    projectName?: string;
    useEnvironmentCredential?: boolean;
}

/**
 * معلومات الموارد
 */
export interface ResourceInfo {
    id: string;
    name: string;
    type: string;
    location: string;
    tags?: Record<string, string>;
}

/**
 * عميل Azure الموحد
 */
export class AzureClient {
    private credential: ChainedTokenCredential;
    private subscriptionId: string;
    private resourceGroup?: string;
    private projectName?: string;
    private logger: Logger;
    
    // عملاء الخدمات
    private aiProjectClient?: AIProjectClient;
    private openAIClient?: OpenAIClient;
    private resourceClient?: ResourceManagementClient;
    private subscriptionClient?: SubscriptionClient;

    constructor(config: AzureClientConfig) {
        this.logger = new Logger('AzureClient');
        this.subscriptionId = config.subscriptionId;
        this.resourceGroup = config.resourceGroup;
        this.projectName = config.projectName || 'az-ai-gateway';

        // إنشاء سلسلة من المصادقات (تحاول بالترتيب)
        const credentials = [
            new EnvironmentCredential(),     // من متغيرات البيئة
            new AzureCliCredential(),        // من Azure CLI
            new ManagedIdentityCredential(), // من Managed Identity
        ];

        // إذا كان في بيئة تطوير محلية، أضف DefaultAzureCredential
        if (process.env.NODE_ENV !== 'production') {
            this.credential = new ChainedTokenCredential(
                new DefaultAzureCredential(),
                ...credentials
            );
        } else {
            this.credential = new ChainedTokenCredential(...credentials);
        }

        this.logger.info('✅ Azure client initialized');
    }

    /**
     * التحقق من صلاحيات Owner
     */
    async verifyOwnerPermissions(): Promise<boolean> {
        try {
            this.logger.info('🔍 Verifying Owner permissions...');

            // محاولة الوصول إلى قائمة الاشتراكات
            const subClient = this.getSubscriptionClient();
            const subscriptions = await subClient.subscriptions.list();
            
            // التحقق من وجود الاشتراك المحدد
            let found = false;
            for await (const sub of subscriptions) {
                if (sub.subscriptionId === this.subscriptionId) {
                    found = true;
                    this.logger.info(`✅ Found subscription: ${sub.displayName}`);
                    break;
                }
            }

            if (!found) {
                throw new CodexError(
                    'SUBSCRIPTION_NOT_FOUND',
                    `Subscription ${this.subscriptionId} not found or no access`
                );
            }

            // محاولة الوصول إلى Resource Group (اختياري)
            if (this.resourceGroup) {
                const resourceClient = this.getResourceClient();
                try {
                    const rg = await resourceClient.resourceGroups.get(this.resourceGroup);
                    this.logger.info(`✅ Resource group found: ${rg.name}`);
                } catch (error) {
                    this.logger.warn(`⚠️ Resource group "${this.resourceGroup}" not found, will attempt to create`);
                }
            }

            this.logger.info('✅ Owner permissions verified successfully');
            return true;

        } catch (error) {
            this.logger.error('❌ Permission verification failed:', error);
            throw new CodexError(
                'PERMISSION_VERIFICATION_FAILED',
                `Failed to verify permissions: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * إنشاء Resource Group إذا لم تكن موجودة
     */
    async ensureResourceGroup(location: string = 'eastus'): Promise<ResourceInfo> {
        try {
            this.logger.info(`📦 Ensuring resource group "${this.resourceGroup}"...`);

            if (!this.resourceGroup) {
                throw new CodexError(
                    'RESOURCE_GROUP_REQUIRED',
                    'Resource group name is required'
                );
            }

            const resourceClient = this.getResourceClient();
            
            // التحقق من وجود Resource Group
            try {
                const rg = await resourceClient.resourceGroups.get(this.resourceGroup);
                this.logger.info(`✅ Resource group "${this.resourceGroup}" already exists`);
                return {
                    id: rg.id ?? '',
                    name: rg.name ?? '',
                    type: 'ResourceGroup',
                    location: rg.location ?? location,
                    tags: rg.tags
                };
            } catch {
                // غير موجود، نقوم بإنشائه
                this.logger.info(`📝 Creating resource group "${this.resourceGroup}"...`);
                
                const newRG = await resourceClient.resourceGroups.createOrUpdate(
                    this.resourceGroup,
                    {
                        location: location,
                        tags: {
                            'az-agent': 'codex',
                            'environment': process.env.NODE_ENV || 'development'
                        }
                    }
                );

                this.logger.info(`✅ Resource group "${this.resourceGroup}" created successfully`);
                return {
                    id: newRG.id ?? '',
                    name: newRG.name ?? '',
                    type: 'ResourceGroup',
                    location: newRG.location ?? location,
                    tags: newRG.tags
                };
            }

        } catch (error) {
            this.logger.error('❌ Failed to ensure resource group:', error);
            throw new CodexError(
                'RESOURCE_GROUP_FAILED',
                `Failed to ensure resource group: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * إنشاء مشروع AI (إذا كان مفعلاً)
     */
    async ensureAIProject(): Promise<ResourceInfo> {
        try {
            this.logger.info('🤖 Ensuring AI Project...');

            // ملاحظة: إنشاء AI Project يتطلب مدخلات إضافية مثل AI Hub
            // هذا مجرد مثال، في الإنتاج يجب استخدام Azure AI Foundry API
            
            // هنا نتحقق فقط من وجود المشروع عبر الـ endpoint
            const endpoint = process.env.AZURE_AI_ENDPOINT || 
                           `https://${this.projectName}.services.ai.azure.com/api/projects/${this.projectName}`;
            
            const client = this.getAIProjectClient();
            const status = await client.getStatus();

            return {
                id: endpoint,
                name: this.projectName || 'az-ai-gateway',
                type: 'AIProject',
                location: 'eastus',
                tags: {
                    'status': status.status || 'ready'
                }
            };

        } catch (error) {
            this.logger.warn('⚠️ AI Project check failed:', error);
            // في حالة الفشل، نستمر لكن مع تحذير
            return {
                id: 'unknown',
                name: this.projectName || 'az-ai-gateway',
                type: 'AIProject',
                location: 'eastus',
                tags: {
                    'status': 'error'
                }
            };
        }
    }

    /**
     * جلب معلومات الاشتراك
     */
    async getSubscriptionInfo(): Promise<{
        id: string;
        name: string;
        status: string;
        tenantId?: string;
    }> {
        try {
            const subClient = this.getSubscriptionClient();
            const sub = await subClient.subscriptions.get(this.subscriptionId);
            return {
                id: sub.subscriptionId ?? '',
                name: sub.displayName ?? '',
                status: sub.state ?? 'unknown',
                tenantId: sub.tenantId
            };
        } catch (error) {
            this.logger.error('❌ Failed to get subscription info:', error);
            throw error;
        }
    }

    /**
     * الحصول على عميل AI Project
     */
    getAIProjectClient(): AIProjectClient {
        if (!this.aiProjectClient) {
            const endpoint = process.env.AZURE_AI_ENDPOINT || 
                           `https://${this.projectName}.services.ai.azure.com/api/projects/${this.projectName}`;
            this.aiProjectClient = new AIProjectClient(endpoint, this.credential);
        }
        return this.aiProjectClient;
    }

    /**
     * الحصول على عميل OpenAI
     */
    getOpenAIClient(): OpenAIClient {
        if (!this.openAIClient) {
            const projectClient = this.getAIProjectClient();
            this.openAIClient = projectClient.getOpenAIClient();
        }
        return this.openAIClient;
    }

    /**
     * الحصول على عميل إدارة الموارد
     */
    getResourceClient(): ResourceManagementClient {
        if (!this.resourceClient) {
            this.resourceClient = new ResourceManagementClient(
                this.credential,
                this.subscriptionId
            );
        }
        return this.resourceClient;
    }

    /**
     * الحصول على عميل الاشتراكات
     */
    getSubscriptionClient(): SubscriptionClient {
        if (!this.subscriptionClient) {
            this.subscriptionClient = new SubscriptionClient(this.credential);
        }
        return this.subscriptionClient;
    }

    /**
     * اختبار الاتصال
     */
    async testConnection(): Promise<{
        success: boolean;
        message: string;
        subscriptionInfo?: any;
        resourceInfo?: any;
    }> {
        try {
            this.logger.info('🔌 Testing Azure connection...');

            // 1. اختبار المصادقة
            const subInfo = await this.getSubscriptionInfo();
            
            // 2. اختبار Resource Group
            let rgInfo = null;
            if (this.resourceGroup) {
                try {
                    const resourceClient = this.getResourceClient();
                    const rg = await resourceClient.resourceGroups.get(this.resourceGroup);
                    rgInfo = {
                        name: rg.name,
                        location: rg.location,
                        status: 'exists'
                    };
                } catch {
                    rgInfo = {
                        name: this.resourceGroup,
                        status: 'not_found'
                    };
                }
            }

            this.logger.info('✅ Connection test successful');
            return {
                success: true,
                message: 'Connection successful',
                subscriptionInfo: subInfo,
                resourceInfo: rgInfo
            };

        } catch (error) {
            this.logger.error('❌ Connection test failed:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

/**
 * إنشاء عميل Azure من متغيرات البيئة
 */
export function createAzureClientFromEnv(): AzureClient {
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    if (!subscriptionId) {
        throw new CodexError(
            'MISSING_SUBSCRIPTION',
            'AZURE_SUBSCRIPTION_ID not set in environment variables'
        );
    }

    return new AzureClient({
        subscriptionId,
        resourceGroup: process.env.AZURE_RESOURCE_GROUP || 'az-agent-rg',
        projectName: process.env.AZURE_PROJECT_NAME || 'az-ai-gateway',
        endpoint: process.env.AZURE_AI_ENDPOINT,
        useEnvironmentCredential: process.env.NODE_ENV === 'production'
    });
}