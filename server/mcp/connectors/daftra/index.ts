import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RuntimeAgent } from "../../../agents.js";
import type { McpConnectorRegister } from "../../types.js";
import { registerDaftraClientTools } from "./clients.js";
import { registerDaftraExpenseTools } from "./expenses.js";
import { registerDaftraInvoiceTools } from "./invoices.js";
import { registerDaftraPaymentTools } from "./payments.js";
import { registerDaftraProductTools } from "./products.js";
import { registerDaftraPurchaseTools } from "./purchases.js";
import { registerDaftraResolverTools } from "./resolver.js";
import { registerDaftraRawConnector } from "./raw.js";

export const registerDaftraConnector: McpConnectorRegister = (server: McpServer, agent: RuntimeAgent) => {
  registerDaftraClientTools(server, agent);
  registerDaftraProductTools(server, agent);
  registerDaftraInvoiceTools(server, agent);
  registerDaftraPaymentTools(server, agent);
  registerDaftraPurchaseTools(server, agent);
  registerDaftraExpenseTools(server, agent);
  registerDaftraResolverTools(server, agent);
  registerDaftraRawConnector(server, agent);
};
