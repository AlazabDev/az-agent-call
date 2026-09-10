import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { RuntimeAgent } from "../../agents.js";
import { touchAgentConnection } from "../../runtimeStatus.js";
import { hasCapability } from "../capabilities.js";
import type { McpConnectorRegister } from "../types.js";

export const registerMagicPlanConnector: McpConnectorRegister = (server: McpServer, agent: RuntimeAgent) => {
  if (!hasCapability(agent, "magicplan.read")) {
    return;
  }

  const magicplanBaseUrl = process.env.MAGICPLAN_BASE_URL || "https://cloud.magicplan.app/api/v2";
  const magicplanApiKey = process.env.MAGICPLAN_API_KEY || "";
  const magicplanCustomerKey = process.env.MAGICPLAN_CUSTOMER_KEY || "";

  const getHeaders = () => ({
    "Accept": "application/json",
    "Content-Type": "application/json",
    "key": magicplanApiKey,
    "customer": magicplanCustomerKey,
  });

  server.registerTool("magicplan_list_projects", {
    title: "MagicPlan Architectural: List architectural floorplan projects",
    description: "Queries MagicPlan Cloud API v2 for projects, architectural floorplans, and survey measurements.",
    inputSchema: {
      search_term: z.string().optional().describe("Filter by project title or client name"),
      limit: z.number().min(1).max(50).default(20).describe("Number of projects to return"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ search_term, limit }) => {
    try {
      await touchAgentConnection(agent.id, "magicplan_list_projects").catch(() => undefined);

      if (!magicplanApiKey || !magicplanCustomerKey) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: true,
              domain: "magicplan",
              action: "magicplan_list_projects",
              configured: false,
              note: "MagicPlan API keys not set in environment (MAGICPLAN_API_KEY, MAGICPLAN_CUSTOMER_KEY). Returning schema specification mode.",
              data: {
                endpoint: `${magicplanBaseUrl}/projects`,
                availableCapabilities: ["Projects", "Project Files", "Floorplans", "Survey Specs"],
              },
            }),
          }],
        };
      }

      const url = new URL(`${magicplanBaseUrl}/projects`);
      if (limit) url.searchParams.set("limit", String(limit));
      if (search_term) url.searchParams.set("q", search_term);

      const res = await fetch(url.toString(), { headers: getHeaders() });
      if (!res.ok) {
        throw new Error(`MagicPlan API returned HTTP ${res.status}: ${res.statusText}`);
      }

      const body = await res.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            domain: "magicplan",
            action: "magicplan_list_projects",
            data: body,
          }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "magicplan", action: "magicplan_list_projects", error: message }) }] };
    }
  });

  server.registerTool("magicplan_get_project", {
    title: "MagicPlan Architectural: Get project floorplan details",
    description: "Retrieves complete metadata, room dimensions, and survey details for a specific MagicPlan project.",
    inputSchema: {
      project_id: z.string().min(1).describe("MagicPlan project unique ID"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ project_id }) => {
    try {
      await touchAgentConnection(agent.id, "magicplan_get_project").catch(() => undefined);

      if (!magicplanApiKey || !magicplanCustomerKey) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: true,
              domain: "magicplan",
              action: "magicplan_get_project",
              configured: false,
              data: { projectId: project_id, status: "MAGICPLAN_UNCONFIGURED" },
            }),
          }],
        };
      }

      const res = await fetch(`${magicplanBaseUrl}/projects/${project_id}`, { headers: getHeaders() });
      if (!res.ok) {
        throw new Error(`MagicPlan API returned HTTP ${res.status}: ${res.statusText}`);
      }

      const body = await res.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            domain: "magicplan",
            action: "magicplan_get_project",
            data: body,
          }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "magicplan", action: "magicplan_get_project", error: message }) }] };
    }
  });

  server.registerTool("magicplan_list_files", {
    title: "MagicPlan Architectural: List project export files (PDF/2D/3D)",
    description: "Lists all exported 2D/3D floorplans, PDFs, and CAD files associated with a MagicPlan project.",
    inputSchema: {
      project_id: z.string().min(1).describe("MagicPlan project ID"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ project_id }) => {
    try {
      await touchAgentConnection(agent.id, "magicplan_list_files").catch(() => undefined);

      if (!magicplanApiKey || !magicplanCustomerKey) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: true,
              domain: "magicplan",
              action: "magicplan_list_files",
              configured: false,
              data: { projectId: project_id, files: [] },
            }),
          }],
        };
      }

      const res = await fetch(`${magicplanBaseUrl}/projects/${project_id}/files`, { headers: getHeaders() });
      if (!res.ok) {
        throw new Error(`MagicPlan API returned HTTP ${res.status}: ${res.statusText}`);
      }

      const body = await res.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            domain: "magicplan",
            action: "magicplan_list_files",
            data: body,
          }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "magicplan", action: "magicplan_list_files", error: message }) }] };
    }
  });
};
