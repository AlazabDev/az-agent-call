import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint =
	process.env.MCP_VERIFY_URL?.trim() || "http://127.0.0.1:3300/call";
const tokenPath =
	process.env.AGENT_TOKENS_PATH?.trim() || "/app/data/agent-tokens.json";
const agentId = process.env.MCP_VERIFY_AGENT?.trim() || "backend";

const tokens = JSON.parse(await readFile(tokenPath, "utf8")) as Record<
	string,
	string
>;
const token = tokens[agentId];
if (!token)
	throw new Error(
		`MCP verify token missing for agent '${agentId}' in ${tokenPath}`,
	);

const client = new Client({
	name: "az-agent-call-production-verifier",
	version: "1.0.0",
});
const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
	requestInit: {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	},
});

try {
	await client.connect(transport);
	const result = await client.listTools();
	const names = result.tools.map((tool) => tool.name).sort();
	const required = [
		"whoami",
		"daftra_search_entities",
		"daftra_create_smart_purchase_invoice",
	];
	const missing = required.filter((name) => !names.includes(name));
	if (missing.length) {
		throw new Error(
			`MCP initialized but required tools are missing for '${agentId}': ${missing.join(", ")}`,
		);
	}
	console.log(
		JSON.stringify(
			{
				ok: true,
				endpoint,
				agentId,
				toolCount: names.length,
				requiredTools: required,
				tools: names,
			},
			null,
			2,
		),
	);
} finally {
	await client.close().catch(() => undefined);
}
