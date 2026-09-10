// src/core/environment-setup.ts

import { AzureClient, createAzureClientFromEnv } from './azure-client.js';
import { Logger } from './logger.js';
import { CodexError } from './errors.js';

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

        try {
            this.azureClient = createAzureClientFromEnv();
            this.logger.info('✅ Azure client initialized');
        } catch (error) {
            this.logger.error('❌ Failed to initialize Azure client:', error);
            throw error;
        }
    }

    async setup(): Promise<EnvironmentStatus> {
        try {
            this.logger.info('🚀 Starting environment setup...');

            await this.verifyPermissions();
            await this.initializeResources();

            this.status.initialized = true;
            this.logger.info('✅ Environment setup completed successfully');

            return this.status;
        } catch (error) {
            this.logger.error('❌ Environment setup failed:', error);
            this.status.errors.push(error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    private async verifyPermissions(): Promise<void> {
        try {
            this.logger.info('🔍 Verifying Owner permissions...');
            await this.azureClient.verifyOwnerPermissions();
            this.status.components.azure = true;
            
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

    private async initializeResources(): Promise<void> {
        try {
            this.logger.info('📦 Initializing Azure resources...');

            const rg = await this.azureClient.ensureResourceGroup();
            this.status.details.resourceGroup = rg.name;
            this.status.components.resources = true;

            this.logger.info(`✅ Resource group "${rg.name}" ready`);

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

    getStatus(): EnvironmentStatus {
        return this.status;
    }
}

export async function setupEnvironment(): Promise<{
    success: boolean;
    status: EnvironmentStatus;
}> {
    const setup = new EnvironmentSetup();
    try {
        const status = await setup.setup();
        return {
            success: true,
            status
        };
    } catch (error) {
        const status = setup.getStatus();
        return {
            success: false,
            status
        };
    }
}
