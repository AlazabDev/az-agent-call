// src/scripts/setup-environment.ts

import 'dotenv/config';
import { setupEnvironment } from '../core/environment-setup.js';
import { Logger } from '../core/logger.js';

const logger = new Logger('SetupScript');

async function main() {
    try {
        console.log('🚀 ====================================');
        console.log('🔧 Codex Agent - Environment Setup');
        console.log('🚀 ====================================\n');

        // التحقق من متغيرات البيئة الأساسية
        if (!process.env.AZURE_SUBSCRIPTION_ID) {
            console.warn('⚠️  AZURE_SUBSCRIPTION_ID not set in environment');
            console.warn('📝 You need to provide your Azure subscription ID');
            console.warn('💡 Set it in .env file or as environment variable\n');
        }

        // تشغيل التهيئة
        logger.info('🔄 Starting environment setup...\n');
        
        const result = await setupEnvironment();

        console.log('\n📊 ====================================');
        console.log('📊 Setup Results');
        console.log('📊 ====================================');
        console.log(`✅ Success: ${result.success}`);
        console.log(`📦 Components:`);
        console.log(`   - Azure: ${result.status.components.azure ? '✅' : '❌'}`);
        console.log(`   - Resources: ${result.status.components.resources ? '✅' : '❌'}`);
        console.log(`   - Agent: ${result.status.components.agent ? '✅' : '❌'}`);
        console.log(`   - Tools: ${result.status.components.tools ? '✅' : '❌'}`);
        console.log(`\n📋 Details:`);
        console.log(`   - Subscription: ${result.status.details.subscriptionId || 'N/A'}`);
        console.log(`   - Resource Group: ${result.status.details.resourceGroup || 'N/A'}`);
        console.log(`   - Agent Version: ${result.status.details.agentVersion || 'N/A'}`);
        console.log(`   - Tools Count: ${result.status.details.toolsCount || '0'}`);
        
        if (result.status.errors.length > 0) {
            console.log('\n⚠️  Errors:');
            result.status.errors.forEach((err, i) => {
                console.log(`   ${i + 1}. ${err}`);
            });
        }

        console.log('\n✅ Setup complete!');
        console.log('📝 You can now run: pnpm dev');

        process.exit(result.success ? 0 : 1);

    } catch (error) {
        logger.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

main();