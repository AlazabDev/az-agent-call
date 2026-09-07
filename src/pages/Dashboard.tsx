import { AGENT_LABELS } from "@shared/agents";
import type {
	AgentListItem,
	DashboardData,
	GatewayInstance,
	SendLogItem,
} from "@shared/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Activity,
	Bot,
	CheckCircle2,
	Clock3,
	FileText,
	MailCheck,
	Network,
	RefreshCw,
	Server,
	ShieldCheck,
	TriangleAlert,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseAuthCard } from "@/components/SupabaseAuthCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

function fmt(value: string | null | undefined) {
	if (!value) return "—";
	return new Date(value).toLocaleString("ar-EG");
}

export default function Dashboard() {
	const qc = useQueryClient();
	const dashboard = useQuery({
		queryKey: ["dashboard"],
		queryFn: () => apiFetch<DashboardData>("/api/dashboard"),
		refetchInterval: 30_000,
	});
	const agents = useQuery({
		queryKey: ["agents"],
		queryFn: () => apiFetch<AgentListItem[]>("/api/agents"),
		refetchInterval: 30_000,
	});
	const gateways = useQuery({
		queryKey: ["gateways"],
		queryFn: () => apiFetch<GatewayInstance[]>("/api/gateways"),
		refetchInterval: 30_000,
	});
	const logs = useQuery({
		queryKey: ["send-log", "dashboard"],
		queryFn: () => apiFetch<SendLogItem[]>("/api/send-log?limit=50"),
		refetchInterval: 30_000,
	});
	const d = dashboard.data;

	const health = useMemo(() => {
		const rows = agents.data ?? [];
		const online = rows.filter((a) => a.connection?.status === "online").length;
		const smtpReady = rows.filter((a) => a.smtpConfigured).length;
		const tokenReady = rows.filter((a) => Boolean(a.tokenHint)).length;
		const enabled = rows.filter((a) => a.enabled).length;
		const scoreParts = [
			online / 12,
			smtpReady / 12,
			tokenReady / 12,
			(d?.templates ?? 0) / 144,
		];
		return {
			online,
			smtpReady,
			tokenReady,
			enabled,
			score: Math.max(
				0,
				Math.min(
					100,
					Math.round(
						(scoreParts.reduce((s, n) => s + Math.min(n, 1), 0) /
							scoreParts.length) *
							100,
					),
				),
			),
		};
	}, [agents.data, d?.templates]);

	const recent = logs.data ?? [];
	const recentSuccess = recent.filter((r) => r.status === "success").length;
	const recentRate = recent.length
		? Math.round((recentSuccess / recent.length) * 100)
		: 0;
	const cards = [
		{
			label: "الوكلاء المفعّلون",
			value: d?.enabledAgents ?? "—",
			note: `${health.online} Online خطوط نشطة`,
			icon: Bot,
		},
		{
			label: "كتالوج سيناريوهات الصوت",
			value: d?.templates ?? "—",
			note: "144 سيناريو وقالب اتصال",
			icon: FileText,
		},
		{
			label: "مكالمات ناجحة / 24س",
			value: d?.sent24h ?? "—",
			note: `معدل إكمال المكالمات ${recentRate}%`,
			icon: CheckCircle2,
		},
		{
			label: "مكالمات مقطوعة / 24س",
			value: d?.failed24h ?? "—",
			note: "مراجعة سجلات الاتصال والتشخيص",
			icon: TriangleAlert,
		},
	];

	const refreshAll = () =>
		void Promise.all([
			qc.invalidateQueries({ queryKey: ["dashboard"] }),
			qc.invalidateQueries({ queryKey: ["agents"] }),
			qc.invalidateQueries({ queryKey: ["gateways"] }),
			qc.invalidateQueries({ queryKey: ["send-log"] }),
		]);

	const anyError =
		dashboard.error ?? agents.error ?? gateways.error ?? logs.error;

	return (
		<AppLayout
			title="لوحة تحكم مركز الاتصال"
			subtitle="مركز حالة Az Agent Call: Supabase + Telephony MCP Gateway + Voice Agents"
			actions={
				<Button variant="outline" size="sm" onClick={refreshAll}>
					<RefreshCw className="h-4 w-4 ml-1" /> تحديث البيانات
				</Button>
			}
		>
			<div className="space-y-6">
				{anyError && (
					<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
						{anyError.message}
					</div>
				)}

				<div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
					{cards.map((card) => (
						<Card
							key={card.label}
							className="shadow-card hover:shadow-card-hover transition-shadow"
						>
							<CardContent className="p-5">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-xs text-muted-foreground">
											{card.label}
										</p>
										<p className="mt-2 text-3xl font-bold text-[#030957]">
											{card.value}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{card.note}
										</p>
									</div>
									<div className="h-11 w-11 rounded-xl bg-muted grid place-items-center">
										<card.icon className="h-5 w-5 text-[#030957]" />
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-5">
					<SupabaseAuthCard />
					<Card className="shadow-card">
						<CardHeader>
							<div className="flex items-start justify-between gap-3">
								<div>
									<CardTitle className="text-base flex items-center gap-2">
										<Activity className="h-4 w-4" /> جاهزية مركز الاتصال
									</CardTitle>
									<CardDescription>
										مؤشر مركّب من اتصال الوكلاء، خطوط الاتصال، التوكنات،
										وسيناريوهات الصوت.
									</CardDescription>
								</div>
								<Badge variant={health.score === 100 ? "default" : "outline"}>
									{health.score}%
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<Progress value={health.score} />
							<div className="grid grid-cols-2 gap-3 text-sm">
								<div className="rounded-lg border p-3">
									<p className="text-xs text-muted-foreground">Agents Online</p>
									<p className="mt-1 text-2xl font-bold">{health.online}/12</p>
								</div>
								<div className="rounded-lg border p-3">
									<p className="text-xs text-muted-foreground">Lines Ready</p>
									<p className="mt-1 text-2xl font-bold">
										{health.smtpReady}/12
									</p>
								</div>
								<div className="rounded-lg border p-3">
									<p className="text-xs text-muted-foreground">Tokens Ready</p>
									<p className="mt-1 text-2xl font-bold">
										{health.tokenReady}/12
									</p>
								</div>
								<div className="rounded-lg border p-3">
									<p className="text-xs text-muted-foreground">
										Gateways Active
									</p>
									<p className="mt-1 text-2xl font-bold">
										{d?.activeGateways ?? 0}
									</p>
								</div>
							</div>
							<div
								className="rounded-lg bg-slate-950 text-slate-100 p-3 font-mono text-xs break-all"
								dir="ltr"
							>
								{d?.mcpEndpoint ?? "https://mcp.alazab.com/call"}
							</div>
						</CardContent>
					</Card>
				</div>

				<Tabs defaultValue="agents" className="space-y-4">
					<TabsList>
						<TabsTrigger value="agents">وكلاء مركز الاتصال</TabsTrigger>
						<TabsTrigger value="gateway">Call Gateway</TabsTrigger>
						<TabsTrigger value="mail">آخر المكالمات</TabsTrigger>
						<TabsTrigger value="security">الأمان والتشفير</TabsTrigger>
					</TabsList>
					<TabsContent value="agents">
						<Card>
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2">
									<Network className="h-4 w-4" /> Agent Runtime Matrix
								</CardTitle>
								<CardDescription>
									الـOnline يعتمد على heartbeat حديث وليس على وجود السجل فقط.
								</CardDescription>
							</CardHeader>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Agent</TableHead>
											<TableHead>Foundry</TableHead>
											<TableHead>Mailbox</TableHead>
											<TableHead>Connection</TableHead>
											<TableHead>SMTP</TableHead>
											<TableHead>Token</TableHead>
											<TableHead>Last Seen</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{agents.data?.map((a) => (
											<TableRow key={a.id}>
												<TableCell className="font-medium">
													{AGENT_LABELS[a.id]}
												</TableCell>
												<TableCell className="font-mono text-xs" dir="ltr">
													{a.foundryId}
												</TableCell>
												<TableCell className="font-mono text-xs" dir="ltr">
													{a.mailbox}
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														{a.connection?.status === "online" ? (
															<Wifi className="h-4 w-4 text-emerald-600" />
														) : (
															<WifiOff className="h-4 w-4 text-slate-400" />
														)}
														<Badge
															variant={
																a.connection?.status === "online"
																	? "default"
																	: "outline"
															}
														>
															{a.connection?.status ?? "offline"}
														</Badge>
													</div>
												</TableCell>
												<TableCell>
													<Badge
														variant={
															a.smtpConfigured ? "outline" : "destructive"
														}
													>
														{a.smtpConfigured
															? a.smtpPasswordSource
															: "missing"}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge
														variant={a.tokenHint ? "outline" : "destructive"}
													>
														{a.tokenHint ?? "missing"}
													</Badge>
												</TableCell>
												<TableCell className="text-xs">
													{fmt(a.connection?.lastSeenAt)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="gateway">
						<Card>
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2">
									<Server className="h-4 w-4" /> Gateway Instances
								</CardTitle>
								<CardDescription>
									الـGateway يسجل heartbeat دوريًا في Supabase.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{!gateways.data?.length ? (
									<div className="py-10 text-center">
										<WifiOff className="mx-auto h-8 w-8 text-muted-foreground" />
										<p className="mt-3 text-sm text-muted-foreground">
											لا يوجد Gateway نشط بعد.
										</p>
									</div>
								) : (
									gateways.data.map((g) => (
										<div key={g.instanceId} className="rounded-lg border p-4">
											<div className="flex flex-wrap items-center justify-between gap-3">
												<div>
													<p className="font-mono text-sm" dir="ltr">
														{g.instanceId}
													</p>
													<p
														className="text-xs text-muted-foreground"
														dir="ltr"
													>
														{g.hostname} · v{g.version}
													</p>
												</div>
												<Badge
													variant={g.status === "ready" ? "default" : "outline"}
												>
													{g.status}
												</Badge>
											</div>
											<Separator className="my-3" />
											<div className="grid sm:grid-cols-4 gap-3 text-xs">
												<div>
													<span className="text-muted-foreground">SMTP</span>
													<p dir="ltr">
														{g.smtpHost}:{g.smtpPort}
													</p>
												</div>
												<div>
													<span className="text-muted-foreground">
														Templates
													</span>
													<p>{g.templateCount}</p>
												</div>
												<div>
													<span className="text-muted-foreground">Started</span>
													<p>{fmt(g.startedAt)}</p>
												</div>
												<div>
													<span className="text-muted-foreground">
														Last Seen
													</span>
													<p>{fmt(g.lastSeenAt)}</p>
												</div>
											</div>
										</div>
									))
								)}
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="mail">
						<Card>
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2">
									<MailCheck className="h-4 w-4" /> Recent Delivery
								</CardTitle>
								<CardDescription>
									آخر 50 محاولة من `mail_send_log`.
								</CardDescription>
							</CardHeader>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Time</TableHead>
											<TableHead>Agent</TableHead>
											<TableHead>Recipient</TableHead>
											<TableHead>Subject</TableHead>
											<TableHead>Source</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{recent.slice(0, 12).map((row) => (
											<TableRow key={row.id}>
												<TableCell className="text-xs">
													{fmt(row.createdAt)}
												</TableCell>
												<TableCell>{AGENT_LABELS[row.agentId]}</TableCell>
												<TableCell className="font-mono text-xs" dir="ltr">
													{row.recipient}
												</TableCell>
												<TableCell className="max-w-[240px] truncate">
													{row.subject}
												</TableCell>
												<TableCell>
													<Badge variant="outline">{row.source}</Badge>
												</TableCell>
												<TableCell>
													<Badge
														variant={
															row.status === "success"
																? "default"
																: "destructive"
														}
													>
														{row.status}
													</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="security">
						<div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
							{[
								{
									icon: ShieldCheck,
									title: "Admin Surface",
									value: "Basic Auth → Supabase Auth → RBAC",
									ok: true,
								},
								{
									icon: CheckCircle2,
									title: "Sender Lock",
									value: "From + Reply-To = authenticated agent",
									ok: true,
								},
								{
									icon: FileText,
									title: "Template Access",
									value: "Global 144 / recommendation only",
									ok: true,
								},
								{
									icon: TriangleAlert,
									title: "Missing SMTP",
									value: `${d?.missingSmtpPasswords.length ?? 0} mailbox(es)`,
									ok: !d?.missingSmtpPasswords.length,
								},
							].map((x) => (
								<Card key={x.title}>
									<CardHeader>
										<x.icon
											className={`h-5 w-5 ${x.ok ? "text-emerald-600" : "text-amber-600"}`}
										/>
										<CardTitle className="text-base">{x.title}</CardTitle>
									</CardHeader>
									<CardContent className="text-sm text-muted-foreground">
										{x.value}
									</CardContent>
								</Card>
							))}
						</div>
						<Card className="mt-4">
							<CardContent className="p-4 flex items-center gap-3 text-sm">
								<Clock3 className="h-4 w-4" />
								<span>
									Agent freshness: 10 دقائق · Gateway freshness: 90 ثانية.
									الحالات القديمة تُعرض Offline تلقائيًا.
								</span>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</AppLayout>
	);
}
