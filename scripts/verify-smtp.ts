import { getAgent, smtpPasswordSource } from "../server/agents.js";
import { verifyAgent } from "../server/mailer.js";
import { AGENT_IDS } from "../shared/agents.js";

const results: Array<{
	agentId: string;
	ok: boolean;
	source: string;
	error?: string;
}> = [];

for (const id of AGENT_IDS) {
	const agent = await getAgent(id);
	if (!agent) {
		results.push({
			agentId: id,
			ok: false,
			source: "missing",
			error: "Agent not found in Supabase",
		});
		continue;
	}
	const result = await verifyAgent(agent);
	results.push({
		agentId: id,
		ok: result.ok,
		source: smtpPasswordSource(agent),
		...(result.ok ? {} : { error: result.error }),
	});
	await new Promise((resolve) => setTimeout(resolve, 250));
}

const failed = results.filter((result) => !result.ok);
console.log(
	JSON.stringify(
		{
			ok: failed.length === 0,
			checked: results.length,
			failed: failed.length,
			results,
		},
		null,
		2,
	),
);
if (failed.length) process.exit(1);
