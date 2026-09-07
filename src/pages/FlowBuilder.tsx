import type { AgentId } from "@shared/agents";
import type { AgentListItem, TemplateListItem } from "@shared/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	Braces,
	CheckCircle2,
	Copy,
	Eye,
	Info,
	Mail,
	Send,
	ShieldCheck,
	Trash2,
	UserRound,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type SendResult = {
	messageId: string;
	from: string;
	to: string | string[];
	accepted: string[];
	rejected: string[];
};

type RenderResult = {
	templateId: string;
	subject: string;
	text: string;
	html: string;
};

function emails(value: string): string[] {
	return value
		.split(/[;,\n]/)
		.map((entry) => entry.trim())
		.filter(Boolean);
}

function validEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function FlowBuilder() {
	const { canOperate } = useAuth();
	const [mode, setMode] = useState<"free" | "template">("free");
	const [agentId, setAgentId] = useState<AgentId>("core");
	const [to, setTo] = useState("");
	const [cc, setCc] = useState("");
	const [bcc, setBcc] = useState("");
	const [subject, setSubject] = useState("");
	const [textBody, setTextBody] = useState("");
	const [htmlBody, setHtmlBody] = useState("");
	const [includeText, setIncludeText] = useState(true);
	const [includeHtml, setIncludeHtml] = useState(false);
	const [templateId, setTemplateId] = useState("");
	const [templateData, setTemplateData] = useState(
		'{\n  "recipient_name": "محمد"\n}',
	);
	const [rendered, setRendered] = useState<RenderResult | null>(null);
	const [lastResult, setLastResult] = useState<SendResult | null>(null);

	const agentsQuery = useQuery({
		queryKey: ["agents"],
		queryFn: () => apiFetch<AgentListItem[]>("/api/agents"),
	});
	const templatesQuery = useQuery({
		queryKey: ["templates", "global"],
		queryFn: () => apiFetch<TemplateListItem[]>("/api/templates"),
	});
	const agents = agentsQuery.data ?? [];
	const templates = templatesQuery.data ?? [];
	const selectedAgent = agents.find((agent) => agent.id === agentId);
	const selectedTemplate = templates.find(
		(template) => template.id === templateId,
	);

	const recipientState = useMemo(() => {
		const toList = emails(to);
		const ccList = emails(cc);
		const bccList = emails(bcc);
		const all = [...toList, ...ccList, ...bccList];
		return {
			toList,
			ccList,
			bccList,
			all,
			invalid: all.filter((entry) => !validEmail(entry)),
		};
	}, [to, cc, bcc]);

	const freeFormReady =
		mode === "free" &&
		recipientState.toList.length > 0 &&
		recipientState.invalid.length === 0 &&
		subject.trim().length > 0 &&
		((includeText && textBody.trim()) || (includeHtml && htmlBody.trim()));

	const templateReady =
		mode === "template" &&
		recipientState.toList.length > 0 &&
		recipientState.invalid.length === 0 &&
		Boolean(templateId);

	const renderMutation = useMutation({
		mutationFn: async () => {
			if (!selectedTemplate) throw new Error("اختر قالبًا أولًا");
			let data: Record<string, unknown>;
			try {
				data = JSON.parse(templateData) as Record<string, unknown>;
			} catch {
				throw new Error("Template Data ليست JSON صالحة");
			}
			return apiFetch<RenderResult>(
				`/api/templates/${encodeURIComponent(selectedTemplate.id)}/render`,
				{
					method: "POST",
					body: JSON.stringify({ agentId, data }),
				},
			);
		},
		onSuccess: (data) => setRendered(data),
		onError: (error: Error) => toast.error(error.message),
	});

	const sendMutation = useMutation({
		mutationFn: async () => {
			if (!canOperate) throw new Error("صلاحية Operator أو أعلى مطلوبة");
			const common = {
				agentId,
				to:
					recipientState.toList.length === 1
						? recipientState.toList[0]
						: recipientState.toList,
				cc: recipientState.ccList.length ? recipientState.ccList : undefined,
				bcc: recipientState.bccList.length ? recipientState.bccList : undefined,
			};
			if (mode === "template") {
				if (!selectedTemplate) throw new Error("اختر قالبًا");
				let data: Record<string, unknown>;
				try {
					data = JSON.parse(templateData) as Record<string, unknown>;
				} catch {
					throw new Error("Template Data ليست JSON صالحة");
				}
				return apiFetch<SendResult>("/api/test-send", {
					method: "POST",
					body: JSON.stringify({
						...common,
						templateId: selectedTemplate.id,
						data,
					}),
				});
			}
			return apiFetch<SendResult>("/api/test-send", {
				method: "POST",
				body: JSON.stringify({
					...common,
					subject,
					text: includeText ? textBody : undefined,
					html: includeHtml ? htmlBody : undefined,
				}),
			});
		},
		onSuccess: (data) => {
			setLastResult(data);
			toast.success(`تم الإرسال من ${data.from}`);
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const reset = () => {
		setTo("");
		setCc("");
		setBcc("");
		setSubject("");
		setTextBody("");
		setHtmlBody("");
		setTemplateId("");
		setTemplateData('{\n  "recipient_name": "محمد"\n}');
		setRendered(null);
		setLastResult(null);
	};

	return (
		<AppLayout
			title="منشئ إرسال البريد"
			subtitle="واجهة إدارية لاختبار نفس قواعد send_email وsend_template_email قبل استخدامها من Foundry"
			actions={
				<Button variant="outline" size="sm" onClick={reset} className="gap-2">
					<Trash2 className="h-4 w-4" /> تفريغ
				</Button>
			}
		>
			<div className="space-y-6" dir="rtl">
				<Alert>
					<ShieldCheck className="h-4 w-4" />
					<AlertTitle>Sender invariant</AlertTitle>
					<AlertDescription>
						لا توجد خانة From في هذا النموذج عمدًا. Agent المختار يحدد البريد
						الثابت الذي سيتم تمريره إلى Nodemailer كـFrom وReply-To.
					</AlertDescription>
				</Alert>

				<div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
					<div className="space-y-5">
						<Card className="shadow-card">
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2">
									<UserRound className="h-4 w-4" /> 1. هوية الوكيل
								</CardTitle>
								<CardDescription>
									اختر الهوية التي تريد محاكاة الإرسال منها.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<Select
									value={agentId}
									onValueChange={(value) => setAgentId(value as AgentId)}
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
								<div className="grid sm:grid-cols-3 gap-3">
									<div className="rounded-lg border p-3">
										<p className="text-xs text-muted-foreground">Foundry</p>
										<p className="text-xs font-mono mt-1 break-all" dir="ltr">
											{selectedAgent?.foundryId ?? `az-agent-${agentId}`}
										</p>
									</div>
									<div className="rounded-lg border p-3">
										<p className="text-xs text-muted-foreground">Locked From</p>
										<p className="text-xs font-mono mt-1 break-all" dir="ltr">
											{selectedAgent?.mailbox ?? `agent-${agentId}@alazab.com`}
										</p>
									</div>
									<div className="rounded-lg border p-3">
										<p className="text-xs text-muted-foreground">SMTP</p>
										<Badge
											className="mt-1"
											variant={
												selectedAgent?.smtpConfigured
													? "default"
													: "destructive"
											}
										>
											{selectedAgent?.smtpConfigured
												? selectedAgent.smtpPasswordSource
												: "missing"}
										</Badge>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="shadow-card">
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2">
									<Mail className="h-4 w-4" /> 2. المستلمون
								</CardTitle>
								<CardDescription>
									يمكن إدخال أكثر من بريد مفصولًا بفاصلة أو فاصلة منقوطة أو سطر
									جديد.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label>To *</Label>
									<Textarea
										value={to}
										onChange={(event) => setTo(event.target.value)}
										placeholder="user1@example.com, user2@example.com"
										dir="ltr"
										className="mt-1 min-h-[72px]"
									/>
								</div>
								<div className="grid md:grid-cols-2 gap-4">
									<div>
										<Label>CC</Label>
										<Input
											value={cc}
											onChange={(event) => setCc(event.target.value)}
											placeholder="cc@example.com"
											dir="ltr"
											className="mt-1"
										/>
									</div>
									<div>
										<Label>BCC</Label>
										<Input
											value={bcc}
											onChange={(event) => setBcc(event.target.value)}
											placeholder="bcc@example.com"
											dir="ltr"
											className="mt-1"
										/>
									</div>
								</div>
								<div className="flex flex-wrap gap-2">
									<Badge variant="secondary">
										To: {recipientState.toList.length}
									</Badge>
									<Badge variant="outline">
										CC: {recipientState.ccList.length}
									</Badge>
									<Badge variant="outline">
										BCC: {recipientState.bccList.length}
									</Badge>
									{recipientState.invalid.length > 0 && (
										<Badge variant="destructive">
											Invalid: {recipientState.invalid.length}
										</Badge>
									)}
								</div>
								{recipientState.invalid.length > 0 && (
									<p className="text-xs text-destructive font-mono" dir="ltr">
										{recipientState.invalid.join(", ")}
									</p>
								)}
							</CardContent>
						</Card>

						<Card className="shadow-card">
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2">
									<Braces className="h-4 w-4" /> 3. نوع الرسالة
								</CardTitle>
								<CardDescription>
									الإرسال الحر أو أي واحد من القوالب المشتركة الـ144.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Tabs
									value={mode}
									onValueChange={(value) =>
										setMode(value as "free" | "template")
									}
								>
									<TabsList className="grid grid-cols-2 w-full">
										<TabsTrigger value="free">send_email</TabsTrigger>
										<TabsTrigger value="template">
											send_template_email
										</TabsTrigger>
									</TabsList>
									<TabsContent value="free" className="space-y-4 mt-5">
										<div>
											<Label>Subject *</Label>
											<Input
												value={subject}
												onChange={(event) => setSubject(event.target.value)}
												placeholder="عنوان الرسالة"
												className="mt-1"
											/>
										</div>
										<div className="grid md:grid-cols-2 gap-3">
											<label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
												<Checkbox
													checked={includeText}
													onCheckedChange={(value) =>
														setIncludeText(value === true)
													}
												/>
												<div>
													<p className="text-sm font-medium">Plain Text</p>
													<p className="text-[10px] text-muted-foreground">
														text field
													</p>
												</div>
											</label>
											<label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
												<Checkbox
													checked={includeHtml}
													onCheckedChange={(value) =>
														setIncludeHtml(value === true)
													}
												/>
												<div>
													<p className="text-sm font-medium">HTML</p>
													<p className="text-[10px] text-muted-foreground">
														html field
													</p>
												</div>
											</label>
										</div>
										{includeText && (
											<div>
												<Label>Text body</Label>
												<Textarea
													value={textBody}
													onChange={(event) => setTextBody(event.target.value)}
													className="mt-1 min-h-[150px]"
													placeholder="نص الرسالة..."
												/>
											</div>
										)}
										{includeHtml && (
											<div>
												<Label>HTML body</Label>
												<Textarea
													value={htmlBody}
													onChange={(event) => setHtmlBody(event.target.value)}
													dir="ltr"
													className="mt-1 min-h-[190px] font-mono text-xs"
													placeholder={'<div dir="rtl"><h2>...</h2></div>'}
												/>
											</div>
										)}
									</TabsContent>
									<TabsContent value="template" className="space-y-4 mt-5">
										<div>
											<Label>Template *</Label>
											<Select
												value={templateId}
												onValueChange={(value) => {
													setTemplateId(value);
													setRendered(null);
												}}
											>
												<SelectTrigger className="mt-1">
													<SelectValue placeholder="اختر من 144 قالب" />
												</SelectTrigger>
												<SelectContent className="max-h-[320px]">
													{templates.map((template) => (
														<SelectItem key={template.id} value={template.id}>
															{template.system} · {template.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										{selectedTemplate && (
											<div className="rounded-xl border bg-muted/20 p-4 space-y-2">
												<div className="flex flex-wrap gap-2">
													<Badge>{selectedTemplate.system}</Badge>
													<Badge variant="outline">
														موصى: {selectedTemplate.agentId}
													</Badge>
													<Badge variant="secondary">متاح: كل الوكلاء</Badge>
												</div>
												<p className="text-sm font-medium">
													{selectedTemplate.subject}
												</p>
												<p
													className="text-xs text-muted-foreground font-mono break-all"
													dir="ltr"
												>
													{selectedTemplate.id}
												</p>
												<div className="flex flex-wrap gap-1">
													{selectedTemplate.required.map((field) => (
														<Badge
															key={field}
															variant="outline"
															className="text-[10px] font-mono"
														>
															{field}
														</Badge>
													))}
												</div>
											</div>
										)}
										<div>
											<div className="flex items-center justify-between">
												<Label>Template Data</Label>
												<Badge variant="outline">JSON</Badge>
											</div>
											<Textarea
												value={templateData}
												onChange={(event) =>
													setTemplateData(event.target.value)
												}
												dir="ltr"
												className="mt-1 min-h-[190px] font-mono text-xs"
											/>
										</div>
										<Button
											variant="outline"
											onClick={() => renderMutation.mutate()}
											disabled={!selectedTemplate || renderMutation.isPending}
											className="gap-2"
										>
											<Eye className="h-4 w-4" />
											{renderMutation.isPending
												? "Rendering..."
												: "Render before send"}
										</Button>
									</TabsContent>
								</Tabs>
							</CardContent>
						</Card>

						<Card className="shadow-card">
							<CardContent className="p-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
								<div>
									<p className="font-medium">جاهزية الإرسال</p>
									<p className="text-xs text-muted-foreground mt-1">
										{mode === "free"
											? freeFormReady
												? "الرسالة الحرة جاهزة"
												: "أكمل المستلمين والعنوان والمحتوى"
											: templateReady
												? "القالب جاهز للإرسال"
												: "اختر قالبًا وأكمل المستلمين"}
									</p>
								</div>
								<Button
									size="lg"
									className="gap-2 min-w-[180px]"
									disabled={
										!canOperate ||
										sendMutation.isPending ||
										(mode === "free" ? !freeFormReady : !templateReady)
									}
									onClick={() => sendMutation.mutate()}
								>
									<Send className="h-4 w-4" />
									{sendMutation.isPending ? "جاري الإرسال..." : "إرسال الآن"}
								</Button>
							</CardContent>
						</Card>
					</div>

					<div className="space-y-5 xl:sticky xl:top-20">
						<Card className="shadow-card overflow-hidden">
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2">
									<Eye className="h-4 w-4" /> المعاينة
								</CardTitle>
								<CardDescription>
									ليست محاكاة للـFrom؛ المعاينة تستخدم الهوية المختارة نفسها.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Tabs defaultValue="preview">
									<TabsList>
										<TabsTrigger value="preview">Preview</TabsTrigger>
										<TabsTrigger value="request">Request JSON</TabsTrigger>
									</TabsList>
									<TabsContent value="preview" className="mt-4">
										<div className="rounded-2xl border bg-muted/30 p-4 min-h-[360px]">
											<div className="rounded-xl bg-card border shadow-sm overflow-hidden">
												<div className="border-b p-4 space-y-2">
													<div className="flex items-center justify-between">
														<div>
															<p className="text-xs text-muted-foreground">
																From
															</p>
															<p className="font-mono text-xs" dir="ltr">
																{selectedAgent?.mailbox ??
																	`agent-${agentId}@alazab.com`}
															</p>
														</div>
														<ShieldCheck className="h-5 w-5 text-emerald-600" />
													</div>
													<div>
														<p className="text-xs text-muted-foreground">To</p>
														<p className="font-mono text-xs truncate" dir="ltr">
															{recipientState.toList.join(", ") || "—"}
														</p>
													</div>
													<div>
														<p className="text-xs text-muted-foreground">
															Subject
														</p>
														<p className="text-sm font-medium">
															{mode === "template"
																? (rendered?.subject ??
																	selectedTemplate?.subject ??
																	"—")
																: subject || "—"}
														</p>
													</div>
												</div>
												<div className="p-4 min-h-[220px]">
													{mode === "template" ? (
														rendered ? (
															<div
																className="text-sm"
																dangerouslySetInnerHTML={{
																	__html: rendered.html,
																}}
															/>
														) : (
															<div className="h-48 grid place-items-center text-sm text-muted-foreground">
																Render القالب لعرض المحتوى
															</div>
														)
													) : includeHtml && htmlBody ? (
														<div
															className="text-sm"
															dangerouslySetInnerHTML={{ __html: htmlBody }}
														/>
													) : (
														<p className="whitespace-pre-wrap text-sm leading-7">
															{textBody || "محتوى الرسالة سيظهر هنا."}
														</p>
													)}
												</div>
											</div>
										</div>
									</TabsContent>
									<TabsContent value="request" className="mt-4">
										<ScrollArea className="h-[360px]">
											<pre
												className="bg-slate-950 text-slate-100 rounded-xl p-4 text-xs overflow-auto"
												dir="ltr"
											>
												{JSON.stringify(
													{
														agentId,
														to: recipientState.toList,
														cc: recipientState.ccList,
														bcc: recipientState.bccList,
														...(mode === "free"
															? {
																	subject,
																	text: includeText ? textBody : undefined,
																	html: includeHtml ? htmlBody : undefined,
																}
															: {
																	templateId,
																	data: (() => {
																		try {
																			return JSON.parse(templateData);
																		} catch {
																			return "INVALID_JSON";
																		}
																	})(),
																}),
													},
													null,
													2,
												)}
											</pre>
										</ScrollArea>
									</TabsContent>
								</Tabs>
							</CardContent>
						</Card>

						<Card className="shadow-card">
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2">
									<Info className="h-4 w-4" /> قواعد الأداة
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{[
									[
										"Identity",
										"Bearer token هو المرجع الوحيد للـsender في MCP الحقيقي.",
									],
									[
										"Recipients",
										"حتى 20 مستلمًا في كل من to/cc/bcc حسب schema الحالية.",
									],
									["Template access", "كل الـ144 قالبًا متاحة لكل الوكلاء."],
									["Logging", "كل نجاح أو فشل يسجل في mail_send_log."],
									[
										"Remote content",
										"Nodemailer يمنع file/url access داخل الرسالة.",
									],
								].map(([title, text]) => (
									<div key={title} className="rounded-lg border p-3">
										<p className="text-xs font-medium">{title}</p>
										<p className="text-[11px] text-muted-foreground mt-1 leading-5">
											{text}
										</p>
									</div>
								))}
							</CardContent>
						</Card>

						{lastResult && (
							<Card className="shadow-card border-emerald-200">
								<CardHeader>
									<CardTitle className="text-base flex items-center gap-2 text-emerald-700">
										<CheckCircle2 className="h-4 w-4" /> آخر نتيجة
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div>
										<p className="text-xs text-muted-foreground">Message ID</p>
										<div className="flex gap-2">
											<Input
												readOnly
												value={lastResult.messageId}
												dir="ltr"
												className="font-mono text-xs"
											/>
											<Button
												variant="outline"
												size="icon"
												onClick={() => {
													void navigator.clipboard.writeText(
														lastResult.messageId,
													);
													toast.success("تم النسخ");
												}}
											>
												<Copy className="h-4 w-4" />
											</Button>
										</div>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">From</p>
										<p className="font-mono text-xs mt-1" dir="ltr">
											{lastResult.from}
										</p>
									</div>
									<div className="flex gap-2">
										<Badge>Accepted {lastResult.accepted?.length ?? 0}</Badge>
										{(lastResult.rejected?.length ?? 0) > 0 && (
											<Badge variant="destructive">
												Rejected {lastResult.rejected.length}
											</Badge>
										)}
									</div>
								</CardContent>
							</Card>
						)}

						{!canOperate && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertTitle>Read-only role</AlertTitle>
								<AlertDescription>
									حسابك الحالي لا يملك صلاحية إرسال اختبار. يلزم
									operator/admin/owner.
								</AlertDescription>
							</Alert>
						)}
					</div>
				</div>
			</div>
		</AppLayout>
	);
}
