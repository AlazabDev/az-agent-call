import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../server/config.js";
import { initializeAgentTokens } from "../server/tokenStore.js";
import { AGENT_IDS } from "../shared/agents.js";

const source = path.resolve(process.argv[2] ?? "data/agent-tokens.json");
const parsed = JSON.parse(await readFile(source, "utf8")) as Record<
	string,
	unknown
>;
for (const id of AGENT_IDS) {
	if (typeof parsed[id] !== "string" || String(parsed[id]).length < 40) {
		throw new Error(`Legacy token file is missing a valid token for ${id}`);
	}
}
await mkdir(path.dirname(config.agentTokensPath), { recursive: true });
if (source !== config.agentTokensPath)
	await copyFile(source, config.agentTokensPath);
const result = await initializeAgentTokens();
console.log(
	`Imported ${AGENT_IDS.length} agent tokens into ${result.path}; generated=${result.generated.length}`,
);
