import type { AgentId } from "./agents.js";

export type MailAdminRole = "owner" | "admin" | "operator" | "viewer";
export type MailRoleSource = "adp_user_roles" | "mail_admins";

export type AuthMe = {
  user: { id: string; email?: string; role: MailAdminRole; roleSource: MailRoleSource };
  role: MailAdminRole;
};

export type DashboardData = {
  agents: number;
  enabledAgents: number;
  templates: number;
  sent24h: number;
  failed24h: number;
  onlineAgents: number;
  activeGateways: number;
  missingSmtpPasswords: AgentId[];
  mcpEndpoint: string;
  adminEndpoint: string;
};

export type AgentConnection = {
  agentId: AgentId;
  status: "offline" | "online" | "degraded";
  gatewayInstanceId: string | null;
  lastSeenAt: string | null;
  lastWhoamiAt: string | null;
  lastTool: string | null;
  requestCount: number;
};

export type AgentListItem = {
  id: AgentId;
  foundryId: string;
  mailbox: string;
  enabled: boolean;
  tokenHint: string | null;
  tokenRotatedAt: string | null;
  recommendedTemplateCount: number;
  availableTemplateCount: number;
  sentCount: number;
  lastSentAt: string | null;
  smtpConfigured: boolean;
  smtpPasswordSource: "override" | "pattern" | "missing";
  connection: AgentConnection | null;
};

export type TemplateListItem = {
  id: string;
  system: string;
  agentId: AgentId;
  name: string;
  subject: string;
  preheader: string;
  locale: string;
  version: number;
  required: string[];
  optional: string[];
  enabled: boolean;
};

export type SendLogItem = {
  id: string;
  agentId: AgentId;
  senderMailbox: string;
  recipient: string;
  subject: string;
  status: "success" | "failed";
  source: "raw" | "template" | "admin-test";
  templateId: string | null;
  messageId: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type GatewayInstance = {
  instanceId: string;
  hostname: string;
  version: string;
  status: "starting" | "ready" | "degraded" | "offline";
  startedAt: string;
  lastSeenAt: string;
  smtpHost: string;
  smtpPort: number;
  templateCount: number;
};

export type SettingsData = {
  supabaseUrl: string;
  supabaseProjectRef: string;
  edgeStatusFunction: string;
  smtpHost: string;
  smtpPort: number;
  mailboxDomain: string;
  smtpPasswordPatternConfigured: boolean;
  publicAppUrl: string;
  adminEndpoint: string;
  mcpEndpoint: string;
  templates: number;
  agentTokensPath: string;
  tokenStoreLoaded: number;
  tokenStoreExpected: number;
  templateAccess: "global";
  agents: Array<{ id: AgentId; mailbox: string; smtpConfigured: boolean; smtpPasswordSource: "override" | "pattern" | "missing" }>;
};
