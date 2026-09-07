import type { AgentId } from "@shared/agents";
import type { AgentListItem, TemplateListItem } from "@shared/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	BookOpenCheck,
	CheckCircle2,
	Copy,
	Eye,
	Filter,
	MailCheck,
	RefreshCw,
	Search,
	Send,
	ShieldCheck,
	Sparkles,
	Tags,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { apiFetch } from "@/lib/api";

interface RenderedTemplate {
	templateId: string;
	subject: string;
	html: string;
	text: string;
	metadata: {
		id: string;
		recommendedAgent: string;
		required: string[];
		optional: string[];
	};
}

const AGENT_FILTERS: AgentId[] = [
	"backend",
	"azabot",
	"auth",
	"prod",
	"maint",
	"core",
	"bim",
	"finance",
	"payments",
	"copilot",
	"project",
	"vision",
];

function sampleValue(field: string): unknown {
	const key = field.toLowerCase();
	if (key === "recipient_name") return "محمد";
	if (key.includes("email")) return "demo@alazab.com";
	if (key.includes("url")) return "https://alazab.com";
	if (key.includes("amount") || key.includes("total") || key.includes("price"))
		return "15000";
	if (key.includes("date")) return new Date().toISOString().slice(0, 10);
	if (key.includes("status")) return "تم التنفيذ";
	if (key.includes("reference") || key.includes("number")) return "AZ-2026-001";
	return `قيمة ${field}`;
}

function defaultPayload(template: TemplateListItem): string {
	const fields = [...new Set(["recipient_name", ...template.required])];
	return JSON.stringify(
		Object.fromEntries(fields.map((field) => [field, sampleValue(field)])),
		null,
		2,
	);
}

function templateAgentFoundry(template: TemplateListItem): string {
	return `az-agent-${template.agentId}`;
}

export default function Templates() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [systemFilter, setSystemFilter] = useState("all");
	const [agentFilter, setAgentFilter] = useState("all");
	const [fieldFilter, setFieldFilter] = useState("all");
	const [selected, setSelected] = useState<TemplateListItem | null>(null);
	const [renderAgent, setRenderAgent] = useState<AgentId>("core");
	const [payload, setPayload] = useState("{}");
	const [preview, setPreview] = useState<RenderedTemplate | null>(null);
	const [testRecipient, setTestRecipient] = useState("");

	const templatesQuery = useQuery({
		queryKey: ["templates", "global"],
		queryFn: () => apiFetch<TemplateListItem[]>("/api/templates"),
		staleTime: 30_000,
	});

	const agentsQuery = useQuery({
		queryKey: ["agents"],
		queryFn: () => apiFetch<AgentListItem[]>("/api/agents"),
		staleTime: 30_000,
	});

	const templates = templatesQuery.data ?? [];
	const agents = agentsQuery.data ?? [];

	const systems = useMemo(
		() => [...new Set(templates.map((template) => template.system))].sort(),
		[templates],
	);

	const filtered = useMemo(
		() =>
			templates.filter((template) => {
				const term = search.trim().toLowerCase();
				const textMatch =
					!term ||
					[
						template.id,
						template.name,
						template.subject,
						template.preheader,
						template.system,
						template.agentId,
					].some((value) => value.toLowerCase().includes(term));
				const systemMatch =
					systemFilter === "all" || template.system === systemFilter;
				const agentMatch =
					agentFilter === "all" || template.agentId === agentFilter;
				const fieldMatch =
					fieldFilter === "all" ||
					(fieldFilter === "required" && template.required.length > 0) ||
					(fieldFilter === "simple" && template.required.length <= 1);
				return textMatch && systemMatch && agentMatch && fieldMatch;
			}),
		[templates, search, systemFilter, agentFilter, fieldFilter],
	);

	const counts = useMemo(
		() => ({
			total: templates.length,
			systems: systems.length,
			withRequired: templates.filter((template) => template.required.length > 0)
				.length,
			visibleAgents: new Set(templates.map((template) => template.agentId))
				.size,
		}),
		[templates, systems],
	);

	const renderMutation = useMutation({
		mutationFn: async () => {
			if (!selected) throw new Error("اختر قالبًا أولًا");
			let data: Record<string, unknown>;
			try {
				data = JSON.parse(payload) as Record<string, unknown>;
			} catch {
				throw new Error("JSON الخاص ببيانات القالب غير صالح");
			}
			return apiFetch<RenderedTemplate>(
				`/api/templates/${encodeURIComponent(selected.id)}/render`,
				{
					method: "POST",
					body: JSON.stringify({ agentId: renderAgent, data }),
				},
			);
		},
		onSuccess: (data) => setPreview(data),
		onError: (error: Error) => toast.error(error.message),
	});

	const testSendMutation = useMutation({
		mutationFn: async () => {
			if (!selected) throw new Error("اختر قالبًا أولًا");
			if (!testRecipient.includes("@")) throw new Error("أدخل بريد مستلم صحيح");
			let data: Record<string, unknown>;
			try {
				data = JSON.parse(payload) as Record<string, unknown>;
			} catch {
				throw new Error("JSON الخاص ببيانات القالب غير صالح");
			}
			return apiFetch<{ messageId: string; from: string }>("/api/test-send", {
				method: "POST",
				body: JSON.stringify({
					agentId: renderAgent,
					to: testRecipient,
					templateId: selected.id,
					data,
				}),
			});
		},
		onSuccess: (data) => {
			toast.success(`تم الإرسال من ${data.from}`);
			void queryClient.invalidateQueries({ queryKey: ["send-log"] });
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const openTemplate = (template: TemplateListItem) => {
		setSelected(template);
		setRenderAgent(template.agentId || "core");
		setPayload(defaultPayload(template));
		setPreview(null);
		setTestRecipient("");
	};

	return (
		<AppLayout
			title="كتالوج قوالب البريد"
			subtitle={`${counts.total || 144} قالب مشترك — الملكية الأصلية توصية فقط، والاستخدام متاح لكل الوكلاء`}
			actions={
				<Button
					variant="outline"
					size="sm"
					className="gap-2"
					onClick={() => void templatesQuery.refetch()}
					disabled={templatesQuery.isFetching}
				>
					<RefreshCw
						className={`h-4 w-4 ${templatesQuery.isFetching ? "animate-spin" : ""}`}
					/>
					تحديث
				</Button>
			}
		>
			<div className="space-y-6" dir="rtl">
				<div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
					<Card className="shadow-card">
						<CardContent className="p-5">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-2xl font-bold">{counts.total || "—"}</p>
									<p className="text-xs text-muted-foreground mt-1">
										إجمالي القوالب
									</p>
								</div>
								<BookOpenCheck className="h-7 w-7 text-primary" />
							</div>
						</CardContent>
					</Card>
					<Card className="shadow-card">
						<CardContent className="p-5">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-2xl font-bold">{counts.systems || "—"}</p>
									<p className="text-xs text-muted-foreground mt-1">
										أنظمة القوالب
									</p>
								</div>
								<Tags className="h-7 w-7 text-primary" />
							</div>
						</CardContent>
					</Card>
					<Card className="shadow-card">
						<CardContent className="p-5">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-2xl font-bold">
										{counts.withRequired || "—"}
									</p>
									<p className="text-xs text-muted-foreground mt-1">
										تتطلب بيانات
									</p>
								</div>
								<Sparkles className="h-7 w-7 text-primary" />
							</div>
						</CardContent>
					</Card>
					<Card className="shadow-card">
						<CardContent className="p-5">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-2xl font-bold">144 / 144</p>
									<p className="text-xs text-muted-foreground mt-1">
										متاح لكل Agent
									</p>
								</div>
								<ShieldCheck className="h-7 w-7 text-emerald-600" />
							</div>
						</CardContent>
					</Card>
				</div>

				<Card className="shadow-card">
					<CardHeader className="pb-4">
						<div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
							<div>
								<CardTitle className="text-base">البحث والتصفية</CardTitle>
								<CardDescription>
									ابحث بالمعرّف أو العنوان أو النظام، ثم افتح القالب للمعاينة
									باستخدام أي وكيل.
								</CardDescription>
							</div>
							<Badge variant="outline" className="w-fit gap-1">
								<Filter className="h-3.5 w-3.5" /> {filtered.length} نتيجة
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
							<div className="relative">
								<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									value={search}
									onChange={(event) => setSearch(event.target.value)}
									placeholder="بحث في 144 قالب..."
									className="pr-9"
								/>
							</div>
							<Select value={systemFilter} onValueChange={setSystemFilter}>
								<SelectTrigger>
									<SelectValue placeholder="النظام" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">كل الأنظمة</SelectItem>
									{systems.map((system) => (
										<SelectItem key={system} value={system}>
											{system}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={agentFilter} onValueChange={setAgentFilter}>
								<SelectTrigger>
									<SelectValue placeholder="الوكيل الموصى له" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">كل الوكلاء</SelectItem>
									{AGENT_FILTERS.map((agent) => (
										<SelectItem key={agent} value={agent}>
											{agent}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={fieldFilter} onValueChange={setFieldFilter}>
								<SelectTrigger>
									<SelectValue placeholder="درجة التعقيد" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">كل القوالب</SelectItem>
									<SelectItem value="required">بها حقول مطلوبة</SelectItem>
									<SelectItem value="simple">بسيطة</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				<Card className="shadow-card overflow-hidden">
					<CardHeader>
						<CardTitle className="text-base">القوالب المشتركة</CardTitle>
						<CardDescription>
							عمود «موصى له» للتنظيم فقط. الـMCP لا يمنع أي وكيل من استخدام أي
							صف.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>القالب</TableHead>
									<TableHead>النظام</TableHead>
									<TableHead>موصى له</TableHead>
									<TableHead>الحقول</TableHead>
									<TableHead>العنوان</TableHead>
									<TableHead className="w-[150px]">الإجراء</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{templatesQuery.isLoading && (
									<TableRow>
										<TableCell
											colSpan={6}
											className="h-32 text-center text-muted-foreground"
										>
											جاري قراءة الكتالوج من Supabase...
										</TableCell>
									</TableRow>
								)}
								{!templatesQuery.isLoading && filtered.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={6}
											className="h-32 text-center text-muted-foreground"
										>
											لا توجد نتائج مطابقة.
										</TableCell>
									</TableRow>
								)}
								{filtered.map((template) => (
									<TableRow key={template.id}>
										<TableCell className="max-w-[260px]">
											<p className="font-medium truncate">{template.name}</p>
											<p
												className="text-[11px] text-muted-foreground font-mono truncate"
												dir="ltr"
											>
												{template.id}
											</p>
										</TableCell>
										<TableCell>
											<Badge variant="secondary">{template.system}</Badge>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Badge variant="outline">{template.agentId}</Badge>
												<span
													className="hidden 2xl:inline text-[10px] text-muted-foreground font-mono"
													dir="ltr"
												>
													{templateAgentFoundry(template)}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex gap-1 flex-wrap">
												<Badge
													variant={
														template.required.length ? "default" : "outline"
													}
												>
													{template.required.length} مطلوب
												</Badge>
												<Badge variant="outline">
													{template.optional.length} اختياري
												</Badge>
											</div>
										</TableCell>
										<TableCell className="max-w-[330px]">
											<p className="truncate text-sm">{template.subject}</p>
											<p className="truncate text-[11px] text-muted-foreground">
												{template.preheader}
											</p>
										</TableCell>
										<TableCell>
											<Button
												size="sm"
												variant="outline"
												className="gap-1"
												onClick={() => openTemplate(template)}
											>
												<Eye className="h-3.5 w-3.5" /> فتح
											</Button>
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
					<DialogContent
						className="max-w-5xl max-h-[92vh] overflow-hidden"
						dir="rtl"
					>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<MailCheck className="h-5 w-5" />{" "}
								{selected?.name ?? "معاينة القالب"}
							</DialogTitle>
							<DialogDescription className="font-mono" dir="ltr">
								{selected?.id}
							</DialogDescription>
						</DialogHeader>
						{selected && (
							<div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-5 min-h-0">
								<ScrollArea className="max-h-[68vh] pl-3">
									<div className="space-y-5">
										<div className="rounded-xl border bg-muted/20 p-4 space-y-3">
											<div className="flex flex-wrap gap-2">
												<Badge>{selected.system}</Badge>
												<Badge variant="outline">
													موصى: {selected.agentId}
												</Badge>
												<Badge variant="secondary">v{selected.version}</Badge>
											</div>
											<div>
												<p className="text-xs text-muted-foreground">Subject</p>
												<p className="mt-1 text-sm font-medium">
													{selected.subject}
												</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground">
													Preheader
												</p>
												<p className="mt-1 text-sm">
													{selected.preheader || "—"}
												</p>
											</div>
										</div>

										<div className="space-y-2">
											<Label>نفّذ المعاينة باسم أي Agent</Label>
											<Select
												value={renderAgent}
												onValueChange={(value) =>
													setRenderAgent(value as AgentId)
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{agents.map((agent) => (
														<SelectItem key={agent.id} value={agent.id}>
															{agent.id} — {agent.mailbox}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<p className="text-[11px] text-muted-foreground">
												اختيار Agent مختلف عن الموصى به مسموح عمدًا وفق سياسة
												Global Template Access.
											</p>
										</div>

										<div className="space-y-2">
											<div className="flex items-center justify-between">
												<Label>Template Data (JSON)</Label>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setPayload(defaultPayload(selected))}
												>
													إعادة المثال
												</Button>
											</div>
											<Textarea
												value={payload}
												onChange={(event) => setPayload(event.target.value)}
												dir="ltr"
												className="font-mono text-xs min-h-[210px]"
											/>
											<div className="flex flex-wrap gap-1">
												{selected.required.map((field) => (
													<Badge
														key={field}
														variant="default"
														className="font-mono text-[10px]"
													>
														{field}
													</Badge>
												))}
												{selected.optional.slice(0, 8).map((field) => (
													<Badge
														key={field}
														variant="outline"
														className="font-mono text-[10px]"
													>
														{field}
													</Badge>
												))}
											</div>
										</div>

										<Button
											className="w-full gap-2"
											onClick={() => renderMutation.mutate()}
											disabled={renderMutation.isPending}
										>
											<Sparkles className="h-4 w-4" />{" "}
											{renderMutation.isPending
												? "جاري الرندر..."
												: "Render Template"}
										</Button>

										<Separator />
										<div className="space-y-2">
											<Label>اختبار إرسال فعلي</Label>
											<div className="flex gap-2">
												<Input
													value={testRecipient}
													onChange={(event) =>
														setTestRecipient(event.target.value)
													}
													placeholder="recipient@example.com"
													dir="ltr"
												/>
												<Button
													variant="secondary"
													onClick={() => testSendMutation.mutate()}
													disabled={testSendMutation.isPending}
												>
													<Send className="h-4 w-4" />
												</Button>
											</div>
											<p className="text-[11px] text-muted-foreground">
												From/Reply-To سيتم قفلهما على mailbox الخاص بـAgent
												المختار، ولا توجد خانة لتغييره.
											</p>
										</div>
									</div>
								</ScrollArea>

								<div className="rounded-2xl border bg-muted/20 overflow-hidden min-h-[520px] flex flex-col">
									<div className="flex items-center justify-between border-b bg-background px-4 py-3">
										<div>
											<p className="text-sm font-medium">المعاينة</p>
											<p className="text-[11px] text-muted-foreground">
												HTML / Text / Metadata
											</p>
										</div>
										{preview && (
											<Button
												variant="ghost"
												size="sm"
												className="gap-1"
												onClick={() => {
													void navigator.clipboard.writeText(preview.html);
													toast.success("تم نسخ HTML");
												}}
											>
												<Copy className="h-3.5 w-3.5" /> نسخ
											</Button>
										)}
									</div>
									{!preview ? (
										<div className="flex-1 grid place-items-center p-8 text-center text-muted-foreground">
											<div>
												<Eye className="h-10 w-10 mx-auto mb-3 opacity-40" />
												<p className="text-sm">
													اضغط Render Template لرؤية النتيجة الفعلية.
												</p>
											</div>
										</div>
									) : (
										<Tabs
											defaultValue="html"
											className="flex-1 flex flex-col min-h-0"
										>
											<div className="px-4 pt-3">
												<TabsList>
													<TabsTrigger value="html">HTML</TabsTrigger>
													<TabsTrigger value="text">Text</TabsTrigger>
													<TabsTrigger value="meta">Metadata</TabsTrigger>
												</TabsList>
											</div>
											<TabsContent
												value="html"
												className="flex-1 m-0 p-4 min-h-0"
											>
												<div
													className="bg-white rounded-xl border h-[460px] overflow-auto p-4"
													dir="rtl"
													dangerouslySetInnerHTML={{ __html: preview.html }}
												/>
											</TabsContent>
											<TabsContent value="text" className="flex-1 m-0 p-4">
												<ScrollArea className="h-[460px]">
													<pre
														className="whitespace-pre-wrap text-xs bg-slate-950 text-slate-100 rounded-xl p-4"
														dir="rtl"
													>
														{preview.text}
													</pre>
												</ScrollArea>
											</TabsContent>
											<TabsContent value="meta" className="flex-1 m-0 p-4">
												<pre
													className="text-xs bg-slate-950 text-slate-100 rounded-xl p-4 overflow-auto"
													dir="ltr"
												>
													{JSON.stringify(preview.metadata, null, 2)}
												</pre>
											</TabsContent>
										</Tabs>
									)}
								</div>
							</div>
						)}
						<DialogFooter className="sm:justify-between">
							<div className="text-xs text-muted-foreground flex items-center gap-1">
								<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> كتالوج
								مشترك، Sender ثابت حسب Bearer Token.
							</div>
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
