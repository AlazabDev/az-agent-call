// src/agents/codex/tools/index.ts

import { CodexTool } from '../types';

/**
 * أدوات إدارة المكالمات
 */
export function createCallTools(): CodexTool[] {
  return [
    {
      name: 'getCallDetails',
      description: 'الحصول على تفاصيل مكالمة محددة',
      parameters: {
        callId: {
          type: 'string',
          description: 'معرف المكالمة',
          required: true
        }
      },
      async execute(params: Record<string, unknown>): Promise<unknown> {
        // تنفيذ منطق جلب تفاصيل المكالمة
        return {
          callId: params.callId,
          status: 'completed',
          duration: 120,
          recorded: true,
          transcript: 'نص المكالمة...'
        };
      }
    },
    {
      name: 'listCalls',
      description: 'عرض قائمة المكالمات',
      parameters: {
        limit: {
          type: 'number',
          description: 'عدد المكالمات للعرض',
          required: false
        },
        status: {
          type: 'string',
          description: 'حالة المكالمات',
          required: false,
          enum: ['pending', 'active', 'completed', 'failed']
        }
      },
      async execute(params: Record<string, unknown>): Promise<unknown> {
        // تنفيذ منطق جلب قائمة المكالمات
        return {
          calls: [
            { id: '1', status: 'completed', duration: 120 },
            { id: '2', status: 'active', duration: 45 }
          ],
          total: 2,
          limit: params.limit || 10
        };
      }
    }
  ];
}

/**
 * أدوات إدارة العملاء
 */
export function createCustomerTools(): CodexTool[] {
  return [
    {
      name: 'getCustomer',
      description: 'الحصول على معلومات عميل',
      parameters: {
        customerId: {
          type: 'string',
          description: 'معرف العميل',
          required: true
        }
      },
      async execute(params: Record<string, unknown>): Promise<unknown> {
        return {
          id: params.customerId,
          name: 'محمد أحمد',
          phone: '0501234567',
          email: 'mohamed@example.com',
          balance: 1500
        };
      }
    },
    {
      name: 'searchCustomers',
      description: 'البحث عن عملاء',
      parameters: {
        query: {
          type: 'string',
          description: 'نص البحث',
          required: true
        },
        limit: {
          type: 'number',
          description: 'عدد النتائج',
          required: false
        }
      },
      async execute(params: Record<string, unknown>): Promise<unknown> {
        return {
          customers: [
            { id: '1', name: 'محمد أحمد', phone: '0501234567' },
            { id: '2', name: 'سارة علي', phone: '0507654321' }
          ],
          total: 2,
          query: params.query
        };
      }
    }
  ];
}

/**
 * أدوات إدارة المهام
 */
export function createTaskTools(): CodexTool[] {
  return [
    {
      name: 'createTask',
      description: 'إنشاء مهمة جديدة',
      parameters: {
        title: {
          type: 'string',
          description: 'عنوان المهمة',
          required: true
        },
        description: {
          type: 'string',
          description: 'وصف المهمة',
          required: false
        },
        priority: {
          type: 'string',
          description: 'أولوية المهمة',
          required: false,
          enum: ['low', 'medium', 'high']
        },
        assignedTo: {
          type: 'string',
          description: 'معرف المستخدم المعين',
          required: false
        }
      },
      async execute(params: Record<string, unknown>): Promise<unknown> {
        return {
          id: Date.now().toString(),
          title: params.title,
          description: params.description || '',
          priority: params.priority || 'medium',
          assignedTo: params.assignedTo || 'system',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
      }
    }
  ];
}