import type {
	AgentConnection,
	AgentListItem,
	GatewayInstance,
	SettingsData,
} from "@shared/api";
import { useQuery } from "@tanstack/react-query";
import {
	Activity,
	Bot,
	CheckCircle2,
	ClipboardCheck,
	Copy,
	Link2,
	Network,
	RefreshCw,
	Server,
	ShieldCheck,
	Terminal,
	Unplug,
	Webhook,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { apiFetch } from "@/lib/api";

function ageSeconds(iso: string | null | undefined): number | null {
	if (!iso) return null;
	return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
}

function ageLabel(iso: string | null | undefined): string {
	const seconds = ageSeconds(iso);
	if (seconds === null) return "لم يتصل";
	if (seconds < 60) return `${seconds} ث`;
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes} د`;
	const hours = Math.round(minutes / 60);
	return `${hours} س`;
}

export default function Webhooks() {
	const [agentFilter, setAgentFilter] = useState("all");
	const [expanded, setExpanded] = useState<string | null>(null);

	const agentsQuery = useQuery({
		queryKey: ["agents"],
		queryFn: () => apiFetch<AgentListItem[]>("/api/agents"),
		refetchInterval: 15_000,
	});
	const connectionsQuery = useQuery({
		queryKey: ["connections"],
		queryFn: () => apiFetch<AgentConnection[]>("/api/connections"),
		refetchInterval: 15_000,
	});
	const gatewaysQuery = useQuery({
		queryKey: ["gateways"],
		queryFn: () => apiFetch<GatewayInstance[]>("/api/gateways"),
		refetchInterval: 15_000,
	});
	const settingsQuery = useQuery({
		queryKey: ["settings"],
		queryFn: () => apiFetch<SettingsData>("/api/settings"),
	});

	const agents = agentsQuery.data ?? [];
	const connections = connectionsQuery.data ?? [];
	const gateways = gatewaysQuery.data ?? [];
	const connectionMap = useMemo(
		() =>
			new Map(
				connections.map((connection) => [connection.agentId, connection]),
			),
		[connections],
	);
	const filtered = agents.filter(
		(agent) => agentFilter === "all" || agent.id === agentFilter,
	);

	const online = connections.filter(
		(connection) => connection.status === "online",
	).length;
	const verified = connections.filter((connection) =>
		Boolean(connection.lastWhoamiAt),
	).length;
	const activeGateways = gateways.filter(
		(gateway) => gateway.status === "ready",
	).length;
	const totalRequests = connections.reduce(
		(sum, connection) => sum + connection.requestCount,
		0,
	);
	const coverage = Math.round((online / 12) * 100);

	const copy = async (value: string, label: string) => {
		await navigator.clipboard.writeText(value);
		toast.success(`تم نسخ ${label}`);
	};

	const refreshAll = () => {
		void agentsQuery.refetch();
		void connectionsQuery.refetch();
		void gatewaysQuery.refetch();
	};

	return (
		<AppLayout
			title="اتصالات MCP والوكلاء"
			subtitle="مؤشرات whoami + Bearer activity + Gateway heartbeat"
			actions={
				<Button
					size="sm"
					variant="outline"
					className="gap-2"
					onClick={refreshAll}
				>
					<RefreshCw className="h-4 w-4" /> تحديث
				</Button>
			}
		>
			<div className="space-y-6" dir="rtl">
				<div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
					<Card className="shadow-card">
						<CardContent className="p-4">
							<p className="text-xs text-muted-foreground">Agents Online</p>
							<p className="text-2xl font-bold mt-1">{online}/12</p>
							<Progress value={coverage} className="mt-3" />
						</CardContent>
					</Card>
					<Card className="shadow-card">
						<CardContent className="p-4">
							<p className="text-xs text-muted-foreground">whoami verified</p>
							<p className="text-2xl font-bold mt-1">{verified}/12</p>
							<p className="text-[10px] text-muted-foreground mt-2">
								last_whoami_at
							</p>
						</CardContent>
					</Card>
					<Card className="shadow-card">
						<CardContent className="p-4">
							<p className="text-xs text-muted-foreground">Active Gateways</p>
							<p className="text-2xl font-bold mt-1">{activeGateways}</p>
							<p className="text-[10px] text-muted-foreground mt-2">
								heartbeat ≤ 90s
							</p>
						</CardContent>
					</Card>
					<Card className="shadow-card">
						<CardContent className="p-4">
							<p className="text-xs text-muted-foreground">MCP requests</p>
							<p className="text-2xl font-bold mt-1">{totalRequests}</p>
							<p className="text-[10px] text-muted-foreground mt-2">
								tracked per agent
							</p>
						</CardContent>
					</Card>
					<Card className="shadow-card">
						<CardContent className="p-4">
							<p className="text-xs text-muted-foreground">Endpoint</p>
							<p className="font-mono text-xs mt-2 break-all" dir="ltr">
								/call
							</p>
							<p className="text-[10px] text-muted-foreground mt-2">
								Streamable HTTP MCP
							</p>
						</CardContent>
					</Card>
				</div>

				<div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-5">
					<Card className="shadow-card">
						<CardHeader>
							<div className="flex items-center justify-between gap-3">
								<div>
									<CardTitle className="text-base flex items-center gap-2">
										<Network className="h-4 w-4" /> MCP Endpoint
									</CardTitle>
									<CardDescription>
										نقطة اتصال موحدة؛ Bearer token وحده يحدد الوكيل.
									</CardDescription>
								</div>
								<Badge variant="secondary">Production</Badge>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label>URL</Label>
								<div className="flex gap-2 mt-1">
									<Input
										readOnly
										value={
											settingsQuery.data?.mcpEndpoint ??
											"https://mcp.alazab.com/call"
										}
										dir="ltr"
									/>
									<Button
										variant="outline"
										size="icon"
										onClick={() =>
											void copy(
												settingsQuery.data?.mcpEndpoint ??
													"https://mcp.alazab.com/call",
												"MCP URL",
											)
										}
									>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
							</div>
							<div className="grid sm:grid-cols-3 gap-3">
								{[
									["Transport", "Streamable HTTP"],
									["Auth", "Bearer token"],
									["Sender", "Locked server-side"],
								].map(([label, value]) => (
									<div key={label} className="rounded-lg border p-3">
										<p className="text-xs text-muted-foreground">{label}</p>
										<p className="text-sm font-medium mt-1" dir="ltr">
											{value}
										</p>
									</div>
								))}
							</div>
							<Alert>
								<ShieldCheck className="h-4 w-4" />
								<AlertTitle>Global template access</AlertTitle>
								<AlertDescription>
									`list_templates` يرجع 144 قالبًا لكل Agent. الـrecommended flag
									تنظيمي فقط ولا يدخل في Authorization.
								</AlertDescription>
							</Alert>
						</CardContent>
					</Card>

					<Card className="shadow-card">
						<CardHeader>
							<CardTitle className="text-base flex items-center gap-2">
								<ClipboardCheck className="h-4 w-4" /> whoami contract
							</CardTitle>
							<CardDescription>
								الأداة المقترحة لأول اختبار بعد إضافة Secret في Foundry.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<pre
								className="rounded-xl bg-slate-950 text-slate-100 p-4 text-xs overflow-auto"
								dir="ltr"
							>
								{JSON.stringify(
									{
										ok: true,
										connected: true,
										agentId: "finance",
										foundryId: "az-agent-finance",
										email: "agent-finance@alazab.com",
										fromLocked: true,
										smtpConfigured: true,
										templateAccess: "global",
										templateCount: 144,
										checkedAt: "...",
									},
									null,
									2,
								)}
							</pre>
							<p className="text-xs text-muted-foreground leading-5">
								تشغيل `whoami` يحدث `last_seen_at` و`last_whoami_at` في Supabase
								ويظهر مباشرة في الجدول أدناه.
							</p>
						</CardContent>
					</Card>
				</div>

				<Card className="shadow-card">
					<CardHeader>
						<div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
							<div>
								<CardTitle className="text-base">
									Agent Connection Matrix
								</CardTitle>
								<CardDescription>
									الحالة هنا مشتقة من freshness وليست مجرد قيمة قديمة مخزنة في
									الجدول.
								</CardDescription>
							</div>
							<Select value={agentFilter} onValueChange={setAgentFilter}>
								<SelectTrigger className="w-[220px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">كل الوكلاء</SelectItem>
									{agents.map((agent) => (
										<SelectItem key={agent.id} value={agent.id}>
											{agent.id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Agent</TableHead>
									<TableHead>Foundry / Mailbox</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Last Seen</TableHead>
									<TableHead>whoami</TableHead>
									<TableHead>Last Tool</TableHead>
									<TableHead>Requests</TableHead>
									<TableHead>Gateway</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map((agent) => {
									const connection =
										connectionMap.get(agent.id) ?? agent.connection;
									return (
										<TableRow key={agent.id}>
											<TableCell>
												<div className="flex items-center gap-2">
													<div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
														<Bot className="h-4 w-4 text-primary" />
													</div>
													<span className="font-medium">{agent.id}</span>
												</div>
											</TableCell>
											<TableCell>
												<p className="font-mono text-[11px]" dir="ltr">
													{agent.foundryId}
												</p>
												<p
													className="font-mono text-[11px] text-muted-foreground"
													dir="ltr"
												>
													{agent.mailbox}
												</p>
											</TableCell>
											<TableCell>
												{connection?.status === "online" ? (
													<Badge className="gap-1">
														<CheckCircle2 className="h-3 w-3" /> Online
													</Badge>
												) : connection?.status === "degraded" ? (
													<Badge variant="secondary">Degraded</Badge>
												) : (
													<Badge variant="outline" className="gap-1">
														<Unplug className="h-3 w-3" /> Offline
													</Badge>
												)}
											</TableCell>
											<TableCell>
												<p className="text-xs">
													{ageLabel(connection?.lastSeenAt)}
												</p>
												<p
													className="text-[10px] text-muted-foreground"
													dir="ltr"
												>
													{connection?.lastSeenAt
														? new Date(connection.lastSeenAt).toLocaleString()
														: "—"}
												</p>
											</TableCell>
											<TableCell>
												{connection?.lastWhoamiAt ? (
													<div>
														<Badge variant="secondary" className="gap-1">
															<ClipboardCheck className="h-3 w-3" /> verified
														</Badge>
														<p className="text-[10px] text-muted-foreground mt-1">
															{ageLabel(connection.lastWhoamiAt)}
														</p>
													</div>
												) : (
													<Badge variant="outline">never</Badge>
												)}
											</TableCell>
											<TableCell className="font-mono text-xs" dir="ltr">
												{connection?.lastTool ?? "—"}
											</TableCell>
											<TableCell>{connection?.requestCount ?? 0}</TableCell>
											<TableCell className="font-mono text-[10px]" dir="ltr">
												{connection?.gatewayInstanceId ?? "—"}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<div className="grid lg:grid-cols-2 gap-5">
					<Card className="shadow-card overflow-hidden">
						<CardHeader>
							<CardTitle className="text-base flex items-center gap-2">
								<Server className="h-4 w-4" /> Gateway Instances
							</CardTitle>
							<CardDescription>
								كل Container يسجل heartbeat كل 30 ثانية.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Instance</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Host</TableHead>
										<TableHead>Templates</TableHead>
										<TableHead>Age</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{gateways.length === 0 && (
										<TableRow>
											<TableCell
												colSpan={5}
												className="h-24 text-center text-muted-foreground"
											>
												لم يبدأ Gateway production بعد.
											</TableCell>
										</TableRow>
									)}
									{gateways.map((gateway) => (
										<TableRow key={gateway.instanceId}>
											<TableCell className="font-mono text-xs" dir="ltr">
												{gateway.instanceId}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														gateway.status === "ready"
															? "default"
															: gateway.status === "offline"
																? "destructive"
																: "outline"
													}
												>
													{gateway.status}
												</Badge>
											</TableCell>
											<TableCell dir="ltr">{gateway.hostname}</TableCell>
											<TableCell>{gateway.templateCount}</TableCell>
											<TableCell>{ageLabel(gateway.lastSeenAt)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					<Card className="shadow-card">
						<CardHeader>
							<CardTitle className="text-base flex items-center gap-2">
								<Terminal className="h-4 w-4" /> Foundry Connection Snippet
							</CardTitle>
							<CardDescription>
								القيم الثابتة لكل Agent؛ يتغير Bearer token فقط.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<pre
								className="rounded-xl bg-slate-950 text-slate-100 p-4 text-xs overflow-auto"
								dir="ltr"
							>{`URL: https://mcp.alazab.com/call\nAuthorization: Bearer <AGENT_TOKEN>\n\n1) whoami\n2) list_templates\n3) get_template_schema\n4) render_template\n5) send_template_email / send_email`}</pre>
							<Button
								variant="outline"
								className="gap-2"
								onClick={() =>
									void copy("https://mcp.alazab.com/call", "MCP URL")
								}
							>
								<Link2 className="h-4 w-4" /> نسخ الرابط
							</Button>
						</CardContent>
					</Card>
				</div>

				<Card className="shadow-card">
					<Collapsible
						open={expanded === "semantics"}
						onOpenChange={(open) => setExpanded(open ? "semantics" : null)}
					>
						<CardHeader>
							<CollapsibleTrigger asChild>
								<button className="w-full text-right">
									<CardTitle className="text-base flex items-center gap-2">
										<Webhook className="h-4 w-4" /> كيف تُحسب حالة الاتصال؟
									</CardTitle>
									<CardDescription>
										اضغط لعرض semantics الدقيقة المستخدمة في الـAPI والواجهة.
									</CardDescription>
								</button>
							</CollapsibleTrigger>
						</CardHeader>
						<CollapsibleContent>
							<CardContent className="pt-0">
								<Separator className="mb-4" />
								<div className="grid md:grid-cols-3 gap-3">
									{[
										[
											"Agent online",
											"آخر MCP activity خلال 10 دقائق. أي Tool مصادق يحدث last_seen_at.",
										],
										[
											"whoami verified",
											"وجود last_whoami_at يثبت أن الوكيل استدعى أداة الهوية بنجاح في وقت سابق.",
										],
										[
											"Gateway ready",
											"heartbeat أحدث من 90 ثانية + حالة runtime ready. الصف القديم يتحول Offline في API.",
										],
									].map(([title, text]) => (
										<div key={title} className="rounded-lg border p-4">
											<Activity className="h-4 w-4 text-primary mb-2" />
											<p className="text-sm font-medium">{title}</p>
											<p className="text-xs text-muted-foreground leading-6 mt-2">
												{text}
											</p>
										</div>
									))}
								</div>
							</CardContent>
						</CollapsibleContent>
					</Collapsible>
				</Card>
			</div>
		</AppLayout>
	);
}
