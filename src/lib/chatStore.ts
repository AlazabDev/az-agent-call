import type { AgentId } from "@shared/agents";

export type FileFeedAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  previewUrl?: string;
  textSnippet?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agentId: AgentId;
  createdAt: string;
  attachments?: FileFeedAttachment[];
  mcpToolCall?: {
    tool: string;
    params?: Record<string, unknown>;
    status?: "executing" | "success" | "error";
  };
};

export type ChatSession = {
  id: string;
  title: string;
  agentId: AgentId;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const STORAGE_KEY = "az_agent_chat_sessions_v3";
const FOUNDRY_CONFIG_KEY = "az_foundry_connection_config_v1";

export type FoundryConnectionConfig = {
  foundryPlatformUrl: string;
  mcpEndpoint: string;
  supabaseUrl: string;
  supabaseProjectRef: string;
  environmentMode: "production" | "staging" | "local";
  autoSync: boolean;
  agentTokens: Record<string, string>;
};

export const DEFAULT_FOUNDRY_CONFIG: FoundryConnectionConfig = {
  foundryPlatformUrl: "https://foundry.alazab.com",
  mcpEndpoint: "https://mcp.alazab.com/mail",
  supabaseUrl: "https://bxuhcbfdoaflsgbxiqei.supabase.co",
  supabaseProjectRef: "bxuhcbfdoaflsgbxiqei",
  environmentMode: "production",
  autoSync: true,
  agentTokens: {
    backend: "az_tok_backend_sec_993182",
    azabot: "az_tok_azabot_sec_441209",
    auth: "az_tok_auth_sec_110298",
    prod: "az_tok_prod_sec_884920",
    maint: "az_tok_maint_sec_773019",
    core: "az_tok_core_sec_554821",
    bim: "az_tok_bim_sec_339102",
    finance: "az_tok_finance_sec_661039",
    payments: "az_tok_payments_sec_228401",
    copilot: "az_tok_copilot_sec_103928",
    project: "az_tok_project_sec_772819",
    vision: "az_tok_vision_sec_881920",
  },
};

export function loadFoundryConfig(): FoundryConnectionConfig {
  try {
    const raw = localStorage.getItem(FOUNDRY_CONFIG_KEY);
    if (!raw) return DEFAULT_FOUNDRY_CONFIG;
    return { ...DEFAULT_FOUNDRY_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FOUNDRY_CONFIG;
  }
}

export function saveFoundryConfig(config: FoundryConnectionConfig): void {
  try {
    localStorage.setItem(FOUNDRY_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error("Failed to save Foundry config", err);
  }
}

export function loadChatSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveChatSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error("Failed to save chat sessions", err);
  }
}

export function createNewSession(agentId: AgentId, title?: string): ChatSession {
  const newSession: ChatSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    title: title || `محادثة جديدة مع ${agentId.toUpperCase()}`,
    agentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `msg_welcome_${Date.now()}`,
        role: "assistant",
        agentId,
        content: getAgentWelcomeMessage(agentId),
        createdAt: new Date().toISOString(),
      },
    ],
  };
  const sessions = loadChatSessions();
  saveChatSessions([newSession, ...sessions]);
  return newSession;
}

export function getAgentWelcomeMessage(agentId: AgentId): string {
  const welcomes: Record<AgentId, string> = {
    backend: "مرحباً بك! أنا وكيل البنية التحتية والخوادم (az-agent-backend). كيف يمكنني مساعدتك في صيانة الخدمات وبوابات API اليوم؟",
    azabot: "أهلاً بك! أنا عزبوت (az-agent-azabot) المساعد الذكي العام لنظام العزب. أنا جاهز لإجابة استفساراتك وتنفيذ مهام البريد وإرسال التنبيهات.",
    auth: "أهلاً بك! أنا وكيل الهوية والمصادقة (az-agent-auth). أستطيع مساعدتك في إدارة الجلسات وصلاحيات الأمان ورموز الوصول.",
    prod: "مرحباً! أنا وكيل إدارة الإنتاج (az-agent-prod). جاهز لمتابعة خطوط الإنتاج والتقارير وإشعار الفرق المعنية.",
    maint: "مرحباً! أنا وكيل الصيانة والتشغيل (az-agent-maint). يمكنك تزويدي بطلبات الصيانة والمخططات للبدء فوراً.",
    core: "مرحباً! أنا الوكيل المركزي للنظام (az-agent-core). أتحكم في تنسيق القوالب وإدارة البوابة المركزية لمجموعات الوكلاء.",
    bim: "أهلاً بك! أنا وكيل النمذجة الهندسية BIM (az-agent-bim). أستطيع قراءة وتحليل ملفات المخططات وتغذية البيانات للمشاريع.",
    finance: "مرحباً! أنا وكيل المالية والمحاسبة (az-agent-finance). أتابع الفواتير وإشعارات المدفوعات والتقارير المالية.",
    payments: "أهلاً بك! أنا وكيل معالجة الدفع والتحصيلات (az-agent-payments). أساعدك في توثيق العمليات وإرسال إيصالات الاستلام.",
    copilot: "مرحباً بك! أنا الكوبايلوت المساعد البرمجي (az-agent-copilot). أستطيع مساعدتك في صياغة الأكواد البرمجية وتحليل الأخطاء.",
    project: "أهلاً بك! أنا وكيل إدارة المشاريع (az-agent-project). أتابع الجداول الزمنية والمهام وتحديثات سير العمل.",
    vision: "مرحباً! أنا وكيل الرؤية الحاسوبية والذكاء الاصطناعي (az-agent-vision). أحلل الصور والوثائق والمخططات الفنية المرفقة.",
  };
  return welcomes[agentId] || "مرحباً! أنا جاهز لمساعدتك عبر منصة وكلاء العزب.";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
