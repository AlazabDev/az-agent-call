import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface LogEntry {
	id: string;
	timestamp: string; // ISO
	agentId: string;
	from: string;
	to: string;
	subject: string;
	status: "sent" | "error";
	messageId?: string;
	error?: string;
}

const LOG_PATH =
	process.env.SEND_LOG_PATH ??
	path.join(process.cwd(), "data", "send-log.json");
const MAX_ENTRIES = 1000; // oldest entries drop off past this

function load(): LogEntry[] {
	if (!existsSync(LOG_PATH)) return [];
	try {
		return JSON.parse(readFileSync(LOG_PATH, "utf8")) as LogEntry[];
	} catch (error) {
		console.error(
			`[az-agent-call] failed to parse ${LOG_PATH}, starting a fresh log:`,
			error,
		);
		return [];
	}
}

let entries = load();

function persist(): void {
	mkdirSync(path.dirname(LOG_PATH), { recursive: true });
	writeFileSync(LOG_PATH, `${JSON.stringify(entries, null, 2)}\n`, {
		mode: 0o600,
	});
}

export function addLogEntry(entry: Omit<LogEntry, "id" | "timestamp">): void {
	entries.push({
		...entry,
		id: crypto.randomUUID(),
		timestamp: new Date().toISOString(),
	});
	if (entries.length > MAX_ENTRIES)
		entries = entries.slice(entries.length - MAX_ENTRIES);
	persist();
}

export function getLogEntries(agentId?: string, limit = 100): LogEntry[] {
	const filtered = agentId
		? entries.filter((e) => e.agentId === agentId)
		: entries;
	return filtered.slice(-limit).reverse();
}
