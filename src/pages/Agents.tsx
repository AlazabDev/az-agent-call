import type { AgentId } from "@shared/agents";
import type { AgentListItem } from "@shared/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Bot,
	CheckCircle2,
	ClipboardCopy,
	Eye,
	EyeOff,
	FileText,
	RefreshCw,
	RotateCcw,
	Search,
	Send,
	ShieldCheck,
	Unplug,
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type RotateResult = {
	agentId: AgentId;
	token: string;
	hint: string;
	note: string;
};
type TestResult = {
	messageId: string;
	from: string;
	accepted: string[];
	rejected: string[];
};

const STATUS_ORDER = { online: 0, degraded: 1, offline: 2 } as const;

export default function Agents() {
	const { canRotateTokens, canOperate } = useAuth();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [connectionFilter, setConnectionFilter] = useState("all");
	const [smtpFilter, setSmtpFilter] = useState("all");
	const [selected, setSelected] = useState<AgentListItem | null>(null);
	const [rotated, setRotated] = useState<RotateResult | null>(null);
	const [showToken, setShowToken] = useState(false);
	const [testTo, setTestTo] = useState("");
	const [testSubject, setTestSubject] = useState("Agent identity test");
	const [testText, setTestText] = useState(
		"اختبار إرسال من الوكيل المحدد عبر Migadu SMTP.",
	);

	const agentsQuery = useQuery({
		queryKey: ["agents"],
		queryFn: () => apiFetch<AgentListItem[]>("/api/agents"),
		refetchInterval: 20_000,
	});
	const agents = agentsQuery.data ?? [];

	const filtered = useMemo(
		() =>
			agents
				.filter((agent) => {
					const term = search.trim().toLowerCase();
					const matchesText =
						!term ||
						[agent.id, agent.foundryId, agent.mailbox].some((value) =>
							value.toLowerCase().includes(term),
						);
					const status = agent.connection?.status ?? "offline";
					const matchesConnection =
						connectionFilter === "all" || status === connectionFilter;
					const matchesSmtp =
						smtpFilter === "all" ||
						(smtpFilter === "ready"
							? agent.smtpConfigured
							: !agent.smtpConfigured);
					return matchesText && matchesConnection && matchesSmtp;
				})
				.sort((a, b) => {
					const sa = a.connection?.status ?? "offline";
					const sb = b.connection?.status ?? "offline";
					return (
						STATUS_ORDER[sa] - STATUS_ORDER[sb] || a.id.localeCompare(b.id)
					);
				}),
		[agents, search, connectionFilter, smtpFilter],
	);

	const stats = useMemo(
		() => ({
			online: agents.filter((agent) => agent.connection?.status === "online")
				.length,
			smtp: agents.filter((agent) => agent.smtpConfigured).length,
			tokens: agents.filter((agent) => Boolean(agent.tokenHint)).length,
			sent: agents.reduce((sum, agent) => sum + agent.sentCount, 0),
			whoami: agents.filter((agent) => Boolean(agent.connection?.lastWhoamiAt))
				.length,
		}),
		[agents],
	);

	const rotateMutation = useMutation({
		mutationFn: (id: AgentId) =>
			apiFetch<RotateResult>(`/api/agents/${id}/rotate-token`, {
				method: "POST",
				body: "{}",
			}),
		onSuccess: (data) => {
			setRotated(data);
			setShowToken(true);
			void queryClient.invalidateQueries({ queryKey: ["agents"] });
			toast.success(`تم إنشاء Token جديد لـ${data.agentId}`);
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const testMutation = useMutation({
		mutationFn: () => {
			if (!selected) throw new Error("اختر Agent");
			if (!testTo.includes("@")) throw new Error("أدخل بريد مستلم صحيح");
			return apiFetch<TestResult>("/api/test-send", {
				method: "POST",
				body: JSON.stringify({
					agentId: selected.id,
					to: testTo,
					subject: testSubject,
					text: testText,
				}),
			});
		},
		onSuccess: (data) => toast.success(`تم إرسال الاختبار من ${data.from}`),
		onError: (error: Error) => toast.error(error.message),
	});

	const openAgent = (agent: AgentListItem) => {
		setSelected(agent);
		setRotated(null);
		setShowToken(false);
		setTestTo("");
	};

	const copy = async (value: string, label: string) => {
		await navigator.clipboard.writeText(value);
		toast.success(`تم نسخ ${label}`);
	};

	return (
		<AppLayout
			title="وكلاء البريد"
			subtitle="Foundry identities · fixed mailboxes · MCP tokens · live connection status"
			actions={
				<Button
					variant="outline"
					size="sm"
					className="gap-2"
					onClick={() => void agentsQuery.refetch()}
				>
					<RefreshCw
						className={`h-4 w-4 ${agentsQuery.isFetching ? "animate-spin" : ""}`}
					/>
					تحديث
				</Button>
			}
		>
			<div className="space-y-6" dir="rtl">
				<div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
					<Card className="shadow-card">
						<CardContent className="p-4">
							<p className="text-xs text-muted-foreground">Online</p>
							<p className="text-2xl font-bold mt-1">{stats.online}/12</p>
							<Progress value={(stats.online / 12) * 100} className="mt-3" />
						</CardContent>
					</Card>
					<Card className="shadow-card">
						<CardContent className="p-4">
							<p className="text-xs text-muted-foreground">SMTP ready</p>
							<p className="text-2xl font-bold mt-1">{stats.smtp}/12</p>
							<p className="text-[10px] text-muted-foreground mt-2">
								Migadu credentials
							</p>
						</CardContent>
					</Card>
					<Card className="shadow-card">
						<CardContent className="p-4">
							<p className="text-xs text-muted-foreground">Tokens</p>
							<p className="text-2xl font-bold mt-1">{stats.tokens}/12</p>
							<p className="text-[10px] text-muted-foreground mt-2">
								persistent store
							</p>
						</CardContent>
					</Card>
					<Card className="shadow-card">
						<CardContent className="p-4">
							<p className="text-xs text-muted-foreground">whoami verified</p>
							<p className="text-2xl font-bold mt-1">{stats.whoami}/12</p>
							<p className="text-[10px] text-muted-foreground mt-2">
								identity probe
							</p>
						</CardContent>
					</Card>
					<Card className="shadow-card">
						<CardContent className="p-4">
							<p className="text-xs text-muted-foreground">Total sent</p>
							<p className="text-2xl font-bold mt-1">{stats.sent}</p>
							<p className="text-[10px] text-muted-foreground mt-2">
								all recorded sends
							</p>
						</CardContent>
					</Card>
				</div>

				<Alert>
					<FileText className="h-4 w-4" />
					<AlertTitle>144 قالبًا متاحًا لكل Agent</AlertTitle>
					<AlertDescription>
						عمود Recommended Templates يعرض فقط القوالب المصممة أصلًا للوكيل.
						Available Templates يظل 144 للجميع ولا يدخل في صلاحيات MCP.
					</AlertDescription>
				</Alert>

				<Card className="shadow-card">
					<CardHeader>
						<CardTitle className="text-base">بحث وتصفية الوكلاء</CardTitle>
						<CardDescription>
							استخدم البريد أو Agent ID أو Foundry ID للوصول السريع للهوية.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid md:grid-cols-3 gap-3">
						<div className="relative">
							<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="finance / az-agent-finance..."
								className="pr-9"
							/>
						</div>
						<Select
							value={connectionFilter}
							onValueChange={setConnectionFilter}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">كل حالات الاتصال</SelectItem>
								<SelectItem value="online">Online</SelectItem>
								<SelectItem value="degraded">Degraded</SelectItem>
								<SelectItem value="offline">Offline</SelectItem>
							</SelectContent>
						</Select>
						<Select value={smtpFilter} onValueChange={setSmtpFilter}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">كل حالات SMTP</SelectItem>
								<SelectItem value="ready">SMTP Ready</SelectItem>
								<SelectItem value="missing">SMTP Missing</SelectItem>
							</SelectContent>
						</Select>
					</CardContent>
				</Card>

				<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
					{filtered.map((agent) => {
						const status = agent.connection?.status ?? "offline";
						return (
							<Card
								key={agent.id}
								className="shadow-card hover:shadow-lg transition-shadow"
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between gap-3">
										<div className="flex gap-3 min-w-0">
											<div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
												<Bot className="h-5 w-5 text-primary" />
											</div>
											<div className="min-w-0">
												<CardTitle className="text-base">{agent.id}</CardTitle>
												<CardDescription
													className="font-mono text-[11px] truncate"
													dir="ltr"
												>
													{agent.foundryId}
												</CardDescription>
											</div>
										</div>
										<Badge
											variant={
												status === "online"
													? "default"
													: status === "degraded"
														? "secondary"
														: "outline"
											}
										>
											{status}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="rounded-lg border bg-muted/20 p-3">
										<p className="text-[10px] text-muted-foreground">
											Locked mailbox
										</p>
										<p className="font-mono text-xs mt-1 break-all" dir="ltr">
											{agent.mailbox}
										</p>
									</div>
									<div className="grid grid-cols-3 gap-2 text-center">
										<div className="rounded-lg bg-muted/40 p-2">
											<p className="font-bold">
												{agent.recommendedTemplateCount}
											</p>
											<p className="text-[9px] text-muted-foreground">
												Recommended
											</p>
										</div>
										<div className="rounded-lg bg-muted/40 p-2">
											<p className="font-bold">
												{agent.availableTemplateCount}
											</p>
											<p className="text-[9px] text-muted-foreground">
												Available
											</p>
										</div>
										<div className="rounded-lg bg-muted/40 p-2">
											<p className="font-bold">{agent.sentCount}</p>
											<p className="text-[9px] text-muted-foreground">Sent</p>
										</div>
									</div>
									<div className="flex flex-wrap gap-2">
										<Badge
											variant={
												agent.smtpConfigured ? "secondary" : "destructive"
											}
										>
											SMTP{" "}
											{agent.smtpConfigured
												? agent.smtpPasswordSource
												: "missing"}
										</Badge>
										<Badge variant="outline">
											Token {agent.tokenHint ?? "—"}
										</Badge>
										{agent.connection?.lastWhoamiAt && (
											<Badge variant="outline" className="gap-1">
												<CheckCircle2 className="h-3 w-3" /> whoami
											</Badge>
										)}
									</div>
									<Button
										variant="outline"
										className="w-full"
										onClick={() => openAgent(agent)}
									>
										تفاصيل وإدارة
									</Button>
								</CardContent>
							</Card>
						);
					})}
				</div>

				<Card className="shadow-card overflow-hidden">
					<CardHeader>
						<CardTitle className="text-base">جدول الهوية التشغيلي</CardTitle>
						<CardDescription>
							عرض مكثف للمقارنة بين كل الوكلاء في صف واحد.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Agent</TableHead>
									<TableHead>Mailbox</TableHead>
									<TableHead>SMTP</TableHead>
									<TableHead>Token hint</TableHead>
									<TableHead>Recommended</TableHead>
									<TableHead>Available</TableHead>
									<TableHead>Last Tool</TableHead>
									<TableHead>Requests</TableHead>
									<TableHead>Last Seen</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{agents.map((agent) => (
									<TableRow key={agent.id}>
										<TableCell className="font-medium">{agent.id}</TableCell>
										<TableCell className="font-mono text-xs" dir="ltr">
											{agent.mailbox}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													agent.smtpConfigured ? "default" : "destructive"
												}
											>
												{agent.smtpPasswordSource}
											</Badge>
										</TableCell>
										<TableCell className="font-mono text-xs" dir="ltr">
											{agent.tokenHint ?? "—"}
										</TableCell>
										<TableCell>{agent.recommendedTemplateCount}</TableCell>
										<TableCell>{agent.availableTemplateCount}</TableCell>
										<TableCell className="font-mono text-xs" dir="ltr">
											{agent.connection?.lastTool ?? "—"}
										</TableCell>
										<TableCell>{agent.connection?.requestCount ?? 0}</TableCell>
										<TableCell className="text-xs" dir="ltr">
											{agent.connection?.lastSeenAt
												? new Date(agent.connection.lastSeenAt).toLocaleString()
												: "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<Dialog
					open={Boolean(selected)}
					onOpenChange={(open) => {
						if (!open) setSelected(null);
					}}
				>
					<DialogContent className="max-w-3xl" dir="rtl">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Bot className="h-5 w-5" /> {selected?.id}
							</DialogTitle>
							<DialogDescription>
								Foundry identity، Token management، واختبار SMTP تحت نفس قواعد
								الـGateway.
							</DialogDescription>
						</DialogHeader>
						{selected && (
							<Tabs defaultValue="identity" className="space-y-4">
								<TabsList>
									<TabsTrigger value="identity">الهوية</TabsTrigger>
									<TabsTrigger value="token">Bearer Token</TabsTrigger>
									<TabsTrigger value="connection">الاتصال</TabsTrigger>
									<TabsTrigger value="test">اختبار إرسال</TabsTrigger>
								</TabsList>
								<TabsContent value="identity" className="space-y-4">
									<div className="grid sm:grid-cols-2 gap-3">
										{[
											["Agent ID", selected.id],
											["Foundry ID", selected.foundryId],
											["Mailbox", selected.mailbox],
											["SMTP source", selected.smtpPasswordSource],
										].map(([label, value]) => (
											<div key={label} className="rounded-lg border p-3">
												<p className="text-xs text-muted-foreground">{label}</p>
												<div className="flex items-center justify-between gap-2 mt-1">
													<p className="font-mono text-xs break-all" dir="ltr">
														{value}
													</p>
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7"
														onClick={() => void copy(String(value), label)}
													>
														<ClipboardCopy className="h-3.5 w-3.5" />
													</Button>
												</div>
											</div>
										))}
									</div>
									<Alert>
										<ShieldCheck className="h-4 w-4" />
										<AlertTitle>From locked</AlertTitle>
										<AlertDescription>
											الـMCP server يتم بناؤه Scoped على هذا Agent؛ كل
											`send_email` و`send_template_email` يمران إلى mailer الذي
											يفرض `from` و`replyTo` على `{selected.mailbox}`.
										</AlertDescription>
									</Alert>
								</TabsContent>
								<TabsContent value="token" className="space-y-4">
									<div className="rounded-xl border p-4">
										<p className="text-xs text-muted-foreground">
											Current hint
										</p>
										<p className="font-mono mt-1" dir="ltr">
											{selected.tokenHint ?? "not initialized"}
										</p>
										<p className="text-[11px] text-muted-foreground mt-2">
											Clear token موجود فقط في `/app/data/agent-tokens.json`.
										</p>
									</div>
									{rotated && (
										<div className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 space-y-3">
											<p className="text-sm font-medium">
												انسخ التوكن الآن؛ هذه هي القيمة التي ستضعها في Foundry.
											</p>
											<div className="flex gap-2">
												<Input
													readOnly
													type={showToken ? "text" : "password"}
													value={rotated.token}
													dir="ltr"
													className="font-mono text-xs"
												/>
												<Button
													variant="outline"
													size="icon"
													onClick={() => setShowToken((value) => !value)}
												>
													{showToken ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
												<Button
													variant="outline"
													size="icon"
													onClick={() => void copy(rotated.token, "Token")}
												>
													<ClipboardCopy className="h-4 w-4" />
												</Button>
											</div>
										</div>
									)}
									<Button
										variant="destructive"
										disabled={!canRotateTokens || rotateMutation.isPending}
										onClick={() => rotateMutation.mutate(selected.id)}
										className="gap-2"
									>
										<RotateCcw className="h-4 w-4" />
										{rotateMutation.isPending
											? "جاري التدوير..."
											: "Rotate token"}
									</Button>
								</TabsContent>
								<TabsContent value="connection" className="space-y-4">
									{selected.connection ? (
										<div className="grid sm:grid-cols-2 gap-3">
											{[
												["Status", selected.connection.status],
												[
													"Gateway",
													selected.connection.gatewayInstanceId ?? "—",
												],
												["Last Tool", selected.connection.lastTool ?? "—"],
												["Requests", String(selected.connection.requestCount)],
												["Last Seen", selected.connection.lastSeenAt ?? "—"],
												[
													"Last whoami",
													selected.connection.lastWhoamiAt ?? "—",
												],
											].map(([label, value]) => (
												<div key={label} className="rounded-lg border p-3">
													<p className="text-xs text-muted-foreground">
														{label}
													</p>
													<p
														className="font-mono text-xs mt-1 break-all"
														dir="ltr"
													>
														{value}
													</p>
												</div>
											))}
										</div>
									) : (
										<Alert>
											<Unplug className="h-4 w-4" />
											<AlertTitle>Offline</AlertTitle>
											<AlertDescription>
												لم يسجل هذا الوكيل اتصال MCP بعد.
											</AlertDescription>
										</Alert>
									)}
								</TabsContent>
								<TabsContent value="test" className="space-y-4">
									<div className="rounded-lg border bg-muted/20 p-3">
										<p className="text-xs text-muted-foreground">Locked From</p>
										<p className="font-mono text-xs mt-1" dir="ltr">
											{selected.mailbox}
										</p>
									</div>
									<div>
										<Label>Recipient</Label>
										<Input
											value={testTo}
											onChange={(event) => setTestTo(event.target.value)}
											placeholder="recipient@example.com"
											dir="ltr"
											className="mt-1"
										/>
									</div>
									<div>
										<Label>Subject</Label>
										<Input
											value={testSubject}
											onChange={(event) => setTestSubject(event.target.value)}
											className="mt-1"
										/>
									</div>
									<div>
										<Label>Text</Label>
										<Textarea
											value={testText}
											onChange={(event) => setTestText(event.target.value)}
											className="mt-1 min-h-[100px]"
										/>
									</div>
									<Button
										disabled={
											!canOperate ||
											testMutation.isPending ||
											!selected.smtpConfigured
										}
										onClick={() => testMutation.mutate()}
										className="gap-2"
									>
										<Send className="h-4 w-4" />
										{testMutation.isPending ? "Sending..." : "Send SMTP test"}
									</Button>
								</TabsContent>
							</Tabs>
						)}
						<Separator />
						<DialogFooter>
							<Button variant="outline" onClick={() => setSelected(null)}>
								إغلاق
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</AppLayout>
	);
}
