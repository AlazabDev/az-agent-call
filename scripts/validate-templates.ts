import { AGENT_IDS } from "../shared/agents.js";
import {
  TEMPLATE_COUNT,
  renderTemplateForAgent,
  templateCountsByAgent,
  templateRowsForSync,
  type EmailTemplateData,
} from "../server/templates.js";
import type { RuntimeAgent } from "../server/agents.js";

const expected = Number(process.env.EXPECTED_TEMPLATE_COUNT ?? 144);
if (TEMPLATE_COUNT !== expected) {
  throw new Error(`Template count mismatch: expected ${expected}, got ${TEMPLATE_COUNT}`);
}

const rows = templateRowsForSync();
if (new Set(rows.map((row) => row.id)).size !== rows.length) {
  throw new Error("Duplicate template IDs detected");
}

const counts = templateCountsByAgent();
for (const id of AGENT_IDS) {
  const foundry = `az-agent-${id}`;
  if (!(foundry in counts)) throw new Error(`Missing agent identity in catalog: ${foundry}`);
}

function sampleValue(field: string): unknown {
  if (field === "details") return [{ label: "اختبار", value: "1" }];
  if (field.endsWith("_url")) return "https://alazab.com/test";
  if (field === "support_email") return "support@alazab.com";
  if (field === "status_tone" || field === "alert_tone") return "info";
  return "اختبار";
}

let rendered = 0;
for (const row of rows) {
  const agent = {
    id: row.system,
    foundry_id: `az-agent-${row.system}`,
    mailbox: `agent-${row.system}@alazab.com`,
    enabled: true,
    token_hint: null,
    token_rotated_at: null,
    smtp_password_env: `MAILBOX_PASSWORD_${row.system.toUpperCase()}`,
  } as RuntimeAgent;

  const data: EmailTemplateData = { recipient_name: "محمد" };
  for (const field of row.required) data[field] = sampleValue(field);
  const result = renderTemplateForAgent(agent, row.id, data);
  if (!result.subject || !result.html || !result.text) throw new Error(`Empty rendered content: ${row.id}`);
  if (/{{[\s\S]*?}}/.test(result.subject + result.html + result.text)) {
    throw new Error(`Unresolved template variable: ${row.id}`);
  }
  rendered += 1;
}

console.log(JSON.stringify({ ok: true, templates: TEMPLATE_COUNT, rendered, byAgent: counts }, null, 2));
