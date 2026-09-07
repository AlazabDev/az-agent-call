import { AGENT_LABELS } from "@shared/agents";
import type { AgentListItem, TemplateListItem } from "@shared/api";
import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeftRight,
	Bot,
	Braces,
	CheckCircle2,
	FileJson2,
	FileText,
	IdCard,
	LockKeyhole,
	Mail,
	MailPlus,
	Search,
	Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";

const tools = [
	{
		name: "whoami",
		icon: IdCard,
		type: "read",
		args: "none",
		output:
			"agentId, foundryId, email, connected, smtpConfigured, templateCount",
		description:
			"اختبار الهوية والاتصال. يربط Bearer Token بالوكيل والـFoundry ID والبريد الثابت ويسجل heartbeat.",
	},
	{
		name: "list_templates",
		icon: FileText,
		type: "read",
		args: "recommended_only?",
		output: "count, access=global, templates[]",
		description:
			"يعرض الكتالوج العالمي. التوصية معلومة تنظيمية فقط وليست قيد صلاحية.",
	},
	{
		name: "get_template_schema",
		icon: FileJson2,
		type: "read",
		args: "template_id",
		output: "required, optional, metadata",
		description: "يعرض Contract أي قالب قبل توليد البيانات أو الإرسال.",
	},
	{
		name: "render_template",
		icon: Workflow,
		type: "read",
		args: "template_id, data",
		output: "subject, text, html",
		description: "يرندر أي قالب من الـ144 للوكيل المصادق عليه دون إرساله.",
	},
	{
		name: "send_template_email",
		icon: MailPlus,
		type: "write",
		args: "template_id, to, cc?, bcc?, data",
		output: "messageId, accepted, rejected",
		description:
			"إرسال مبني على قالب عالمي مع From وReply-To ثابتين على mailbox الوكيل.",
	},
	{
		name: "send_email",
		icon: Mail,
		type: "write",
		args: "to, cc?, bcc?, subject, text?, html?",
		output: "messageId, accepted, rejected",
		description: "إرسال حر. لا توجد حقول from أو replyTo في schema أصلًا.",
	},
] as const;

export default function Flows() {
	const [toolSearch, setToolSearch] = useState("");
	const [agentFilter, setAgentFilter] = useState("all");
	const agents = useQuery({
		queryKey: ["agents"],
		queryFn: () => apiFetch<AgentListItem[]>("/api/agents"),
		refetchInterval: 30_000,
	});
	const templates = useQuery({
		queryKey: ["templates"],
		queryFn: () => apiFetch<TemplateListItem[]>("/api/templates"),
	});
	const visibleTools = tools.filter((t) =>
		`${t.name} ${t.description} ${t.args}`
			.toLowerCase()
			.includes(toolSearch.toLowerCase()),
	);
	const selectedAgent =
		agentFilter === "all"
			? null
			: agents.data?.find((a) => a.id === agentFilter);
	const readiness = useMemo(
		() =>
			(agents.data ?? []).map((a) => ({
				...a,
				score:
					[
						a.enabled,
						Boolean(a.tokenHint),
						a.smtpConfigured,
						a.connection?.status === "online",
					].filter(Boolean).length * 25,
			})),
		[agents.data],
	);
	const systems = useMemo(
		() => new Set((templates.data ?? []).map((t) => t.system)).size,
		[templates.data],
	);

	return (
		<AppLayout
			title="مسارات وأدوات MCP"
			subtitle="عقد الأدوات، تدفق الهوية، سياسة القوالب، وجاهزية الـ12 Agent"
		>
			<div className="space-y-5">
				<div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
					{[
						{ label: "MCP Tools", value: tools.length, icon: Workflow },
						{
							label: "Global Templates",
							value: templates.data?.length ?? "—",
							icon: FileText,
						},
						{ label: "Template Systems", value: systems || "—", icon: Braces },
						{ label: "Agents", value: agents.data?.length ?? "—", icon: Bot },
					].map((x) => (
						<Card key={x.label}>
							<CardContent className="p-5 flex items-start justify-between">
								<div>
									<p className="text-xs text-muted-foreground">{x.label}</p>
									<p className="text-3xl font-bold mt-2 text-[#030957]">
										{x.value}
									</p>
								</div>
								<x.icon className="h-5 w-5 text-[#030957]" />
							</CardContent>
						</Card>
					))}
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base flex items-center gap-2">
							<ArrowLeftRight className="h-4 w-4" /> Identity & Delivery Flow
						</CardTitle>
						<CardDescription>
							هوية المرسل لا تأتي من الـLLM ولا من arguments.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] gap-2 items-center text-center text-xs">
							{[
								["Foundry Agent", "az-agent-*"],
								["Bearer Token", "AGENT_TOKENS_PATH"],
								["Identity Resolution", "SHA-256 → mail_agents"],
								["Fixed Mailbox", "agent-*@alazab.com"],
								["Migadu", "SMTP 587"],
							].map((x, i) => (
								<div key={x[0]} className="contents">
									<div
										className={`rounded-lg border p-3 ${i === 3 ? "bg-[#030957] text-white" : "bg-muted/30"}`}
									>
										<p className="font-semibold">{x[0]}</p>
										<p className="font-mono mt-1 opacity-70" dir="ltr">
											{x[1]}
										</p>
									</div>
									{i < 4 && <div>→</div>}
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Tabs defaultValue="tools">
					<TabsList>
						<TabsTrigger value="tools">Tool Registry</TabsTrigger>
						<TabsTrigger value="policy">Policies</TabsTrigger>
						<TabsTrigger value="readiness">Agent Readiness</TabsTrigger>
						<TabsTrigger value="examples">Contracts</TabsTrigger>
					</TabsList>
					<TabsContent value="tools" className="space-y-4">
						<div className="relative max-w-md">
							<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								value={toolSearch}
								onChange={(e) => setToolSearch(e.target.value)}
								placeholder="بحث في الأدوات أو الحقول..."
								className="pr-9"
							/>
						</div>
						<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
							{visibleTools.map((tool) => (
								<Card
									key={tool.name}
									className="shadow-card hover:shadow-card-hover transition-shadow"
								>
									<CardHeader>
										<div className="flex items-start justify-between">
											<div className="h-10 w-10 rounded-xl bg-muted grid place-items-center">
												<tool.icon className="h-5 w-5" />
											</div>
											<Badge
												variant={tool.type === "write" ? "default" : "outline"}
											>
												{tool.type}
											</Badge>
										</div>
										<CardTitle className="text-base font-mono" dir="ltr">
											{tool.name}
										</CardTitle>
										<CardDescription>{tool.description}</CardDescription>
									</CardHeader>
									<CardContent className="space-y-3 text-xs">
										<div>
											<p className="text-muted-foreground">Inputs</p>
											<code dir="ltr">{tool.args}</code>
										</div>
										<Separator />
										<div>
											<p className="text-muted-foreground">Output</p>
											<code dir="ltr">{tool.output}</code>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</TabsContent>
					<TabsContent value="policy">
						<div className="grid md:grid-cols-2 gap-4">
							<Card>
								<CardHeader>
									<LockKeyhole className="h-5 w-5 text-[#030957]" />
									<CardTitle className="text-base">
										Sender Identity Policy
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 text-sm">
									<p>كل Token يحدد Agent واحد فقط.</p>
									<Separator />
									<p>
										`From` و`Reply-To` يبنيهما السيرفر من `mail_agents.mailbox`.
									</p>
									<Separator />
									<p>
										`send_email` و`send_template_email` لا يقبلان تغيير المرسل.
									</p>
									<Separator />
									<p>التلاعب باسم الوكيل داخل prompt لا يغير الهوية.</p>
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<FileText className="h-5 w-5 text-[#030957]" />
									<CardTitle className="text-base">
										Template Access Policy
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 text-sm">
									<p>
										الكتالوج: <strong>144 قالبًا</strong>.
									</p>
									<Separator />
									<p>
										الوصول: <strong>Global</strong> لكل Agent مصادق عليه.
									</p>
									<Separator />
									<p>`agent_id` على القالب = Recommended Agent فقط.</p>
									<Separator />
									<p>
										Git/template files هي source of truth، وSupabase operational
										mirror.
									</p>
								</CardContent>
							</Card>
						</div>
					</TabsContent>
					<TabsContent value="readiness" className="space-y-4">
						<div className="max-w-xs">
							<Select value={agentFilter} onValueChange={setAgentFilter}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">كل الوكلاء</SelectItem>
									{agents.data?.map((a) => (
										<SelectItem key={a.id} value={a.id}>
											{AGENT_LABELS[a.id]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{selectedAgent && (
							<Card>
								<CardContent className="p-4 text-sm">
									المحدد: <strong>{selectedAgent.mailbox}</strong> · Foundry:{" "}
									<code dir="ltr">{selectedAgent.foundryId}</code>
								</CardContent>
							</Card>
						)}
						<Card>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Agent</TableHead>
											<TableHead>Foundry</TableHead>
											<TableHead>Token</TableHead>
											<TableHead>SMTP</TableHead>
											<TableHead>Connection</TableHead>
											<TableHead>Templates</TableHead>
											<TableHead>Score</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{readiness
											.filter(
												(a) => agentFilter === "all" || a.id === agentFilter,
											)
											.map((a) => (
												<TableRow key={a.id}>
													<TableCell>{AGENT_LABELS[a.id]}</TableCell>
													<TableCell className="font-mono text-xs" dir="ltr">
														{a.foundryId}
													</TableCell>
													<TableCell>
														<Badge
															variant={a.tokenHint ? "outline" : "destructive"}
														>
															{a.tokenHint ? "ready" : "missing"}
														</Badge>
													</TableCell>
													<TableCell>
														<Badge
															variant={
																a.smtpConfigured ? "outline" : "destructive"
															}
														>
															{a.smtpConfigured ? "ready" : "missing"}
														</Badge>
													</TableCell>
													<TableCell>
														<Badge
															variant={
																a.connection?.status === "online"
																	? "default"
																	: "outline"
															}
														>
															{a.connection?.status ?? "offline"}
														</Badge>
													</TableCell>
													<TableCell>{a.availableTemplateCount}</TableCell>
													<TableCell className="w-36">
														<div className="flex items-center gap-2">
															<Progress value={a.score} />
															<span className="text-xs">{a.score}%</span>
														</div>
													</TableCell>
												</TableRow>
											))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="examples">
						<div className="grid xl:grid-cols-2 gap-4">
							<Card>
								<CardHeader>
									<CardTitle className="text-base font-mono" dir="ltr">
										send_email
									</CardTitle>
								</CardHeader>
								<CardContent>
									<pre
										className="rounded-lg bg-slate-950 text-slate-100 p-4 text-xs overflow-auto"
										dir="ltr"
									>{`{\n  "to": ["one@example.com", "two@example.com"],\n  "cc": ["copy@example.com"],\n  "subject": "Subject",\n  "text": "Plain body",\n  "html": "<p>HTML body</p>"\n}\n\n// from/replyTo intentionally unavailable`}</pre>
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle className="text-base font-mono" dir="ltr">
										whoami
									</CardTitle>
								</CardHeader>
								<CardContent>
									<pre
										className="rounded-lg bg-slate-950 text-slate-100 p-4 text-xs overflow-auto"
										dir="ltr"
									>{`{\n  "ok": true,\n  "connected": true,\n  "agentId": "finance",\n  "foundryId": "az-agent-finance",\n  "email": "agent-finance@alazab.com",\n  "fromLocked": true,\n  "templateAccess": "global",\n  "templateCount": 144\n}`}</pre>
								</CardContent>
							</Card>
						</div>
						<div className="mt-4 rounded-lg border bg-emerald-50 border-emerald-200 p-4 flex gap-3 text-sm">
							<CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
							<p>
								الاختبار الصحيح بعد ربط Foundry هو: <code>whoami</code> →{" "}
								<code>list_templates</code> → <code>render_template</code> →
								إرسال تجريبي.
							</p>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</AppLayout>
	);
}
