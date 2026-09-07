import { AGENT_LABELS } from "@shared/agents";
import type { AgentListItem, GatewayInstance, SettingsData } from "@shared/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Activity,
	CheckCircle2,
	Clock3,
	Database,
	FileText,
	KeyRound,
	Play,
	Server,
	ServerCrash,
	TriangleAlert,
	Wifi,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";

type Diagnostics = {
	ok: boolean;
	checks: Array<{ name: string; ok: boolean; detail: string }>;
	smtpChecks: Array<{ id: string; ok: boolean; error?: string }>;
	checkedAt: string;
};
type HistoryRow = {
	at: string;
	ok: boolean;
	checks: number;
	smtpOk: number;
	smtpTotal: number;
};
const fmt = (x: string | null | undefined) =>
	x ? new Date(x).toLocaleString("ar-EG") : "—";

export default function Maintenance() {
	const [history, setHistory] = useState<HistoryRow[]>([]);
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
	const settings = useQuery({
		queryKey: ["settings"],
		queryFn: () => apiFetch<SettingsData>("/api/settings"),
	});
	const diagnostics = useMutation({
		mutationFn: () => apiFetch<Diagnostics>("/api/diagnostics"),
		onSuccess: (data) =>
			setHistory((h) =>
				[
					{
						at: data.checkedAt,
						ok: data.ok,
						checks: data.checks.filter((c) => c.ok).length,
						smtpOk: data.smtpChecks.filter((c) => c.ok).length,
						smtpTotal: data.smtpChecks.length,
					},
					...h,
				].slice(0, 10),
			),
	});
	const summary = useMemo(() => {
		const rows = agents.data ?? [];
		return {
			online: rows.filter((a) => a.connection?.status === "online").length,
			smtp: rows.filter((a) => a.smtpConfigured).length,
			tokens: rows.filter((a) => a.tokenHint).length,
			gateways: (gateways.data ?? []).filter((g) => g.status === "ready")
				.length,
		};
	}, [agents.data, gateways.data]);
	const score = Math.round(
		([
			summary.online / 12,
			summary.smtp / 12,
			summary.tokens / 12,
			settings.data?.templates === 144 ? 1 : 0,
		].reduce((s, n) => s + n, 0) /
			4) *
			100,
	);

	return (
		<AppLayout
			title="التشخيص والصيانة"
			subtitle="فحص Runtime، Supabase، Token Store، Templates، Gateway وMigadu SMTP"
		>
			<div className="space-y-5">
				<div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
					{[
						{
							label: "Agents Online",
							value: `${summary.online}/12`,
							icon: Wifi,
						},
						{
							label: "SMTP Configured",
							value: `${summary.smtp}/12`,
							icon: Server,
						},
						{ label: "Tokens", value: `${summary.tokens}/12`, icon: KeyRound },
						{ label: "Runtime Score", value: `${score}%`, icon: Activity },
					].map((x) => (
						<Card key={x.label}>
							<CardContent className="p-5 flex justify-between">
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
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<CardTitle className="text-base flex items-center gap-2">
									<Activity className="h-4 w-4" /> Runtime Diagnostics
								</CardTitle>
								<CardDescription>
									SMTP Verify يفتح اتصالًا حقيقيًا مع Migadu لكل Mailbox؛ شغّله عند
									الحاجة.
								</CardDescription>
							</div>
							<Button
								onClick={() => diagnostics.mutate()}
								disabled={diagnostics.isPending}
							>
								<Play className="h-4 w-4 ml-1" />{" "}
								{diagnostics.isPending ? "جارٍ الفحص..." : "تشغيل الفحص الكامل"}
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{!diagnostics.data ? (
							<div className="py-10 text-center">
								<ServerCrash className="h-8 w-8 mx-auto text-muted-foreground" />
								<p className="mt-3 text-sm text-muted-foreground">
									لم يتم تشغيل الفحص الكامل في هذه الجلسة.
								</p>
							</div>
						) : (
							<div className="space-y-5">
								<div
									className={`rounded-lg border p-4 flex items-center gap-3 ${diagnostics.data.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
								>
									{diagnostics.data.ok ? (
										<CheckCircle2 className="h-5 w-5 text-emerald-600" />
									) : (
										<ServerCrash className="h-5 w-5 text-red-600" />
									)}
									<div>
										<p className="font-medium">
											{diagnostics.data.ok
												? "All runtime checks passed"
												: "One or more checks failed"}
										</p>
										<p className="text-xs text-muted-foreground">
											{fmt(diagnostics.data.checkedAt)}
										</p>
									</div>
								</div>
								<div className="grid md:grid-cols-3 gap-3">
									{diagnostics.data.checks.map((c) => (
										<div key={c.name} className="rounded-lg border p-4">
											<div className="flex items-center gap-2">
												{c.ok ? (
													<CheckCircle2 className="h-4 w-4 text-emerald-600" />
												) : (
													<XCircle className="h-4 w-4 text-red-600" />
												)}
												<p className="font-medium text-sm">{c.name}</p>
											</div>
											<p
												className="mt-2 text-xs text-muted-foreground break-all"
												dir="ltr"
											>
												{c.detail}
											</p>
										</div>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				<Tabs defaultValue="smtp">
					<TabsList>
						<TabsTrigger value="smtp">SMTP Matrix</TabsTrigger>
						<TabsTrigger value="runtime">Runtime Matrix</TabsTrigger>
						<TabsTrigger value="history">Session History</TabsTrigger>
						<TabsTrigger value="runbook">Recovery Runbook</TabsTrigger>
					</TabsList>
					<TabsContent value="smtp">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									Migadu SMTP Verification
								</CardTitle>
								<CardDescription>
									الإعداد يظهر دائمًا؛ نتيجة Verify تظهر بعد تشغيل الفحص.
								</CardDescription>
							</CardHeader>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Agent</TableHead>
											<TableHead>Mailbox</TableHead>
											<TableHead>Password Source</TableHead>
											<TableHead>Configured</TableHead>
											<TableHead>Live Verify</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{agents.data?.map((a) => {
											const live = diagnostics.data?.smtpChecks.find(
												(x) => x.id === a.id,
											);
											return (
												<TableRow key={a.id}>
													<TableCell>{AGENT_LABELS[a.id]}</TableCell>
													<TableCell className="font-mono text-xs" dir="ltr">
														{a.mailbox}
													</TableCell>
													<TableCell>
														<Badge variant="outline">
															{a.smtpPasswordSource}
														</Badge>
													</TableCell>
													<TableCell>
														<Badge
															variant={
																a.smtpConfigured ? "default" : "destructive"
															}
														>
															{a.smtpConfigured ? "YES" : "NO"}
														</Badge>
													</TableCell>
													<TableCell>
														{!live ? (
															<span className="text-xs text-muted-foreground">
																Not checked
															</span>
														) : (
															<Badge
																variant={live.ok ? "default" : "destructive"}
															>
																{live.ok ? "OK" : (live.error ?? "FAIL")}
															</Badge>
														)}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="runtime">
						<div className="grid xl:grid-cols-2 gap-4">
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Agent Heartbeats</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{agents.data?.map((a) => (
										<div key={a.id} className="rounded-lg border p-3">
											<div className="flex items-center justify-between">
												<span>{AGENT_LABELS[a.id]}</span>
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
											<div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
												<span>Last seen: {fmt(a.connection?.lastSeenAt)}</span>
												<span>
													Last tool:{" "}
													<code dir="ltr">{a.connection?.lastTool ?? "—"}</code>
												</span>
											</div>
										</div>
									))}
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle className="text-base">
										Gateway Heartbeats
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{gateways.data?.length ? (
										gateways.data.map((g) => (
											<div key={g.instanceId} className="rounded-lg border p-4">
												<div className="flex items-center justify-between">
													<code dir="ltr">{g.instanceId}</code>
													<Badge
														variant={
															g.status === "ready" ? "default" : "outline"
														}
													>
														{g.status}
													</Badge>
												</div>
												<p className="mt-2 text-xs text-muted-foreground">
													Last seen: {fmt(g.lastSeenAt)} · templates{" "}
													{g.templateCount}
												</p>
											</div>
										))
									) : (
										<p className="text-sm text-muted-foreground">
											No gateway heartbeat.
										</p>
									)}
								</CardContent>
							</Card>
						</div>
					</TabsContent>
					<TabsContent value="history">
						<Card>
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2">
									<Clock3 className="h-4 w-4" /> Diagnostics History
								</CardTitle>
								<CardDescription>
									هذه القائمة تخص جلسة المتصفح الحالية فقط ولا تُكتب في قاعدة
									البيانات.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{!history.length ? (
									<p className="py-8 text-center text-sm text-muted-foreground">
										شغّل الفحص مرة أو أكثر لعرض التاريخ.
									</p>
								) : (
									<div className="space-y-2">
										{history.map((h) => (
											<div
												key={h.at}
												className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3 text-sm"
											>
												<span>{fmt(h.at)}</span>
												<Badge variant={h.ok ? "default" : "destructive"}>
													{h.ok ? "PASS" : "FAIL"}
												</Badge>
												<span>Core checks: {h.checks}</span>
												<span>
													SMTP: {h.smtpOk}/{h.smtpTotal}
												</span>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="runbook">
						<div className="grid md:grid-cols-2 gap-4">
							<Card>
								<CardHeader>
									<Database className="h-5 w-5" />
									<CardTitle className="text-base">Supabase Failure</CardTitle>
								</CardHeader>
								<CardContent className="text-sm space-y-2">
									<p>1. راجع `SUPABASE_URL` وservice role على السيرفر.</p>
									<p>
										2. تحقق من project ref:{" "}
										<code>
											{settings.data?.supabaseProjectRef ??
												"bxuhcbfdoaflsgbxiqei"}
										</code>
										.
									</p>
									<p>3. لا تعمل reset للقاعدة المشتركة.</p>
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<Server className="h-5 w-5" />
									<CardTitle className="text-base">SMTP Failure</CardTitle>
								</CardHeader>
								<CardContent className="text-sm space-y-2">
									<p>1. تحقق من `smtp.migadu.com:587`.</p>
									<p>2. راجع override للوكيل أولًا ثم password pattern.</p>
									<p>3. اختبر الوكيل المتأثر من صفحة Accounts قبل الإرسال.</p>
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<KeyRound className="h-5 w-5" />
									<CardTitle className="text-base">Token Failure</CardTitle>
								</CardHeader>
								<CardContent className="text-sm space-y-2">
									<p>1. تأكد من mount لـ`/app/data`.</p>
									<p>2. تحقق من صلاحية `agent-tokens.json`.</p>
									<p>3. Rotate يعرض التوكن مرة واحدة ويزامن hash فقط.</p>
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<FileText className="h-5 w-5" />
									<CardTitle className="text-base">Template Failure</CardTitle>
								</CardHeader>
								<CardContent className="text-sm space-y-2">
									<p>1. يجب أن يكون الكتالوج 144.</p>
									<p>2. Sync يحصل عند Gateway startup.</p>
									<p>3. ownership لا يمنع أي Agent من استخدام قالب.</p>
								</CardContent>
							</Card>
						</div>
						<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3 text-sm">
							<TriangleAlert className="h-5 w-5 text-amber-600" />
							<p>
								`/readyz` هو الحكم النهائي قبل توجيه الترافيك للإصدار الجديد.
							</p>
						</div>
					</TabsContent>
				</Tabs>
				{diagnostics.error && (
					<Card className="border-destructive/30">
						<CardContent className="p-4 text-sm text-destructive">
							{diagnostics.error.message}
						</CardContent>
					</Card>
				)}
			</div>
		</AppLayout>
	);
}
