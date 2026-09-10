// src/core/azure-client.ts

import { 
    DefaultAzureCredential, 
    AzureCliCredential,
    ManagedIdentityCredential,
    ChainedTokenCredential,
    EnvironmentCredential
} from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';
import { ResourceManagementClient } from '@azure/arm-resources';
import { SubscriptionClient } from '@azure/arm-subscriptions';
import { Logger } from './logger.js';
import { CodexError } from './errors.js';

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
    
    private aiProjectClient?: AIProjectClient;
    private resourceClient?: ResourceManagementClient;
    private subscriptionClient?: SubscriptionClient;

    constructor(config: AzureClientConfig) {
        this.logger = new Logger('AzureClient');
        this.subscriptionId = config.subscriptionId;
        this.resourceGroup = config.resourceGroup;
        this.projectName = config.projectName || 'az-ai-gateway';

        const credentials = [
            new EnvironmentCredential(),
            new AzureCliCredential(),
            new ManagedIdentityCredential(),
        ];

        this.credential = new ChainedTokenCredential(...credentials);
        this.logger.info('✅ Azure client initialized');
    }

    /**
     * التحقق من صلاحيات Owner
     */
    async verifyOwnerPermissions(): Promise<boolean> {
        try {
            this.logger.info('🔍 Verifying Owner permissions...');
            const subClient = this.getSubscriptionClient();
            const subscriptions = await subClient.subscription.list();
            
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
                    `Subscription ${this.subscriptionId} not found`
                );
            }

            this.logger.info('✅ Owner permissions verified');
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
            const sub = await subClient.subscription.get(this.subscriptionId);
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
            const subInfo = await this.getSubscriptionInfo();
            
            this.logger.info('✅ Connection test successful');
            return {
                success: true,
                message: 'Connection successful',
                subscriptionInfo: subInfo
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
