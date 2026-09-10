import type { AgentId } from "@shared/agents.js";
import type { RuntimeAgent } from "../agents.js";

export type AgentCapability =
  | "daftra.clients.read"
  | "daftra.clients.write"
  | "daftra.products.read"
  | "daftra.products.write"
  | "daftra.invoices.read"
  | "daftra.invoices.create"
  | "daftra.payments.create"
  | "daftra.suppliers.read"
  | "daftra.suppliers.write"
  | "daftra.purchases.read"
  | "daftra.purchases.create"
  | "daftra.expenses.read"
  | "daftra.expenses.create"
  | "daftra.work_orders.read"
  | "daftra.raw"
  | "magicplan.read"
  | "magicplan.write"
  | "uberfix.read"
  | "uberfix.write"
  | "telephony.read"
  | "telephony.call"
  | "templates.read"
  | "codex.ask";

const capabilityMatrix: Record<string, AgentCapability[]> = {
  finance: [
    "daftra.clients.read",
    "daftra.products.read",
    "daftra.invoices.read",
    "daftra.invoices.create",
    "daftra.suppliers.read",
    "daftra.purchases.read",
    "daftra.expenses.read",
    "daftra.expenses.create",
    "daftra.work_orders.read",
    "daftra.raw",
    "telephony.read",
    "telephony.call",
    "templates.read",
    "codex.ask",
  ],
  payments: [
    "daftra.clients.read",
    "daftra.invoices.read",
    "daftra.payments.create",
    "telephony.read",
    "telephony.call",
    "templates.read",
    "codex.ask",
  ],
  project: [
    "daftra.clients.read",
    "daftra.products.read",
    "daftra.suppliers.read",
    "daftra.purchases.read",
    "daftra.work_orders.read",
    "magicplan.read",
    "magicplan.write",
    "uberfix.read",
    "telephony.read",
    "telephony.call",
    "templates.read",
    "codex.ask",
  ],
  bim: [
    "daftra.clients.read",
    "daftra.products.read",
    "daftra.work_orders.read",
    "magicplan.read",
    "magicplan.write",
    "telephony.read",
    "templates.read",
    "codex.ask",
  ],
  maint: [
    "daftra.clients.read",
    "daftra.products.read",
    "daftra.invoices.read",
    "daftra.work_orders.read",
    "uberfix.read",
    "uberfix.write",
    "telephony.read",
    "telephony.call",
    "templates.read",
    "codex.ask",
  ],
  prod: [
    "daftra.products.read",
    "daftra.suppliers.read",
    "daftra.purchases.read",
    "telephony.read",
    "templates.read",
    "codex.ask",
  ],
  copilot: [
    "daftra.clients.read",
    "daftra.products.read",
    "daftra.invoices.read",
    "daftra.suppliers.read",
    "daftra.purchases.read",
    "daftra.expenses.read",
    "daftra.work_orders.read",
    "magicplan.read",
    "uberfix.read",
    "telephony.read",
    "templates.read",
    "codex.ask",
  ],
  vision: [
    "daftra.products.read",
    "magicplan.read",
    "telephony.read",
    "templates.read",
    "codex.ask",
  ],
  auth: [
    "telephony.read",
    "templates.read",
    "codex.ask",
  ],
  core: [
    "daftra.clients.read",
    "daftra.products.read",
    "daftra.invoices.read",
    "daftra.work_orders.read",
    "magicplan.read",
    "uberfix.read",
    "telephony.read",
    "telephony.call",
    "templates.read",
    "codex.ask",
  ],
  backend: [
    "daftra.clients.read",
    "daftra.clients.write",
    "daftra.products.read",
    "daftra.products.write",
    "daftra.invoices.read",
    "daftra.invoices.create",
    "daftra.payments.create",
    "daftra.suppliers.read",
    "daftra.suppliers.write",
    "daftra.purchases.read",
    "daftra.purchases.create",
    "daftra.expenses.read",
    "daftra.expenses.create",
    "daftra.work_orders.read",
    "daftra.raw",
    "magicplan.read",
    "magicplan.write",
    "uberfix.read",
    "uberfix.write",
    "telephony.read",
    "telephony.call",
    "templates.read",
    "codex.ask",
  ],
  azabot: [
    "daftra.clients.read",
    "daftra.products.read",
    "daftra.invoices.read",
    "daftra.suppliers.read",
    "daftra.purchases.read",
    "daftra.expenses.read",
    "daftra.work_orders.read",
    "magicplan.read",
    "uberfix.read",
    "telephony.read",
    "telephony.call",
    "templates.read",
    "codex.ask",
  ],
};

export function hasCapability(agent: RuntimeAgent | AgentId | string, capability: AgentCapability): boolean {
  const id = typeof agent === "string" ? agent : agent.id;
  const caps = capabilityMatrix[id] || [];
  return caps.includes(capability);
}
