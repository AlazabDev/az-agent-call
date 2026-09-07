import {
	AGENT_IDS,
	AGENT_LABELS,
	type AgentId,
	foundryId,
	mailboxFor,
} from "@shared/agents";
import {
	Check,
	ChevronDown,
	FileCode,
	FileText,
	MessageSquare,
	Paperclip,
	Plus,
	Send,
	Sparkles,
	Trash2,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	type ChatMessage,
	type ChatSession,
	createNewSession,
	type FileFeedAttachment,
	formatFileSize,
	loadChatSessions,
	saveChatSessions,
} from "@/lib/chatStore";

type AgentSpec = { role: string; desc: string; color: string; icon: string };

const AGENT_SPECIALTIES: Record<AgentId, AgentSpec> = {
	backend: {
		role: "البنية التحتية للخوادم",
		desc: "إدارة الخوادم، الاتصالات، وبوابات API",
		color: "#3B82F6",
		icon: "💻",
	},
	azabot: {
		role: "المساعد المباشر العام",
		desc: "الإجابة التفاعلية والبريد الذكي",
		color: "#FFB900",
		icon: "🤖",
	},
	auth: {
		role: "الأمان والمصادقة",
		desc: "إدارة الرموز وصلاحيات الوصول",
		color: "#EF4444",
		icon: "🔐",
	},
	prod: {
		role: "إدارة خطوط الإنتاج",
		desc: "متابعة أوامر التشغيل والمخرجات",
		color: "#10B981",
		icon: "🏭",
	},
	maint: {
		role: "الصيانة والتشغيل",
		desc: "متابعة البلاغات وبلاغات الأعطال",
		color: "#F59E0B",
		icon: "🔧",
	},
	core: {
		role: "المركزي وتنسيق النظام",
		desc: "تنسيق 144 قالب وإدارة الوكلاء",
		color: "#6366F1",
		icon: "⚡",
	},
	bim: {
		role: "النمذجة الهندسية BIM",
		desc: "معالجة وتحليل مخططات البناء",
		color: "#8B5CF6",
		icon: "🏗️",
	},
	finance: {
		role: "المالية والمحاسبة",
		desc: "الفواتير والحسابات والتأكيدات",
		color: "#06B6D4",
		icon: "💰",
	},
	payments: {
		role: "التحصيلات والمدفوعات",
		desc: "معالجة وتأكيد سندات القبض",
		color: "#EC4899",
		icon: "💳",
	},
	copilot: {
		role: "المساعد البرمجي",
		desc: "مراجعة وحل الأكواد البرمجية",
		color: "#14B8A6",
		icon: "🚀",
	},
	project: {
		role: "إدارة المشاريع",
		desc: "تتبع المهام والمخططات الزمنية",
		color: "#3B82F6",
		icon: "📊",
	},
	vision: {
		role: "الرؤية والذكاء الاصطناعي",
		desc: "تحليل الصور والمخططات والوثائق",
		color: "#F43F5E",
		icon: "👁️",
	},
};

export default function AgentChat() {
	const [sessions, setSessions] = useState<ChatSession[]>([]);
	const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
	const [selectedAgentId, setSelectedAgentId] = useState<AgentId>("azabot");
	const [inputText, setInputText] = useState("");
	const [attachments, setAttachments] = useState<FileFeedAttachment[]>([]);
	const [isSending, setIsSending] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Initialize chat sessions
	useEffect(() => {
		const loaded = loadChatSessions();
		if (loaded.length > 0) {
			setSessions(loaded);
			setCurrentSessionId(loaded[0].id);
			setSelectedAgentId(loaded[0].agentId);
		} else {
			const init = createNewSession("azabot", "محادثة البداية مع عزبوت");
			setSessions([init]);
			setCurrentSessionId(init.id);
			setSelectedAgentId("azabot");
		}
	}, []);

	const activeSession = sessions.find(
		(s: ChatSession) => s.id === currentSessionId,
	);

	// Scroll to bottom on messages update
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	// Handle switching agent
	const handleSelectAgent = (id: AgentId) => {
		setSelectedAgentId(id);
		const existing = sessions.find((s: ChatSession) => s.agentId === id);
		if (existing) {
			setCurrentSessionId(existing.id);
		} else {
			const newSess = createNewSession(id, `محادثة مع ${AGENT_LABELS[id]}`);
			const updated = [newSess, ...sessions];
			setSessions(updated);
			saveChatSessions(updated);
			setCurrentSessionId(newSess.id);
		}
		toast.info(`تم التبديل إلى الوكيل: ${AGENT_LABELS[id]}`);
	};

	// Handle creating new session
	const handleNewChat = () => {
		const newSess = createNewSession(
			selectedAgentId,
			`جلسة جديدة - ${AGENT_LABELS[selectedAgentId]}`,
		);
		const updated = [newSess, ...sessions];
		setSessions(updated);
		saveChatSessions(updated);
		setCurrentSessionId(newSess.id);
		toast.success("تم إنشاء جلسة محادثة جديدة.");
	};

	// Handle file uploads for feeding agent
	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		const newAttachments: FileFeedAttachment[] = [];
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			let textSnippet: string | undefined;

			if (
				file.type.includes("text") ||
				file.type.includes("json") ||
				file.name.endsWith(".ts") ||
				file.name.endsWith(".js") ||
				file.name.endsWith(".md")
			) {
				try {
					textSnippet = (await file.text()).substring(0, 1000);
				} catch {}
			}

			newAttachments.push({
				id: `att_${Date.now()}_${i}`,
				name: file.name,
				size: file.size,
				type: file.type || "application/octet-stream",
				textSnippet,
			});
		}

		setAttachments((prev: FileFeedAttachment[]) => [
			...prev,
			...newAttachments,
		]);
		toast.success(`تم إضافة ${newAttachments.length} ملف لتغذية الوكيل بها.`);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const removeAttachment = (id: string) => {
		setAttachments((prev: FileFeedAttachment[]) =>
			prev.filter((a: FileFeedAttachment) => a.id !== id),
		);
	};

	// Handle Sending Message
	const handleSendMessage = async () => {
		if (!inputText.trim() && attachments.length === 0) return;
		if (!currentSessionId || isSending) return;

		const userMessageContent = inputText.trim();
		const userAttachments = [...attachments];

		setInputText("");
		setAttachments([]);
		setIsSending(true);

		const userMsg: ChatMessage = {
			id: `user_msg_${Date.now()}`,
			role: "user",
			content:
				userMessageContent ||
				(userAttachments.length > 0 ? "[تم إرفاق ملفات تغذية]" : ""),
			agentId: selectedAgentId,
			createdAt: new Date().toISOString(),
			attachments: userAttachments.length > 0 ? userAttachments : undefined,
		};

		const updatedSessions = sessions.map((sess: ChatSession) => {
			if (sess.id === currentSessionId) {
				return {
					...sess,
					updatedAt: new Date().toISOString(),
					messages: [...sess.messages, userMsg],
				};
			}
			return sess;
		});

		setSessions(updatedSessions);
		saveChatSessions(updatedSessions);

		setTimeout(() => {
			const responseText = generateAgentResponse(
				selectedAgentId,
				userMessageContent,
				userAttachments,
			);

			const botMsg: ChatMessage = {
				id: `bot_msg_${Date.now()}`,
				role: "assistant",
				content: responseText,
				agentId: selectedAgentId,
				createdAt: new Date().toISOString(),
			};

			const finalSessions = updatedSessions.map((sess: ChatSession) => {
				if (sess.id === currentSessionId) {
					return {
						...sess,
						updatedAt: new Date().toISOString(),
						messages: [...sess.messages, botMsg],
					};
				}
				return sess;
			});

			setSessions(finalSessions);
			saveChatSessions(finalSessions);
			setIsSending(false);
		}, 1000);
	};

	const handleDeleteSession = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setSessionToDelete(id);
		setDeleteDialogOpen(true);
	};

	const confirmDeleteSession = () => {
		if (!sessionToDelete) return;
		const remaining = sessions.filter(
			(s: ChatSession) => s.id !== sessionToDelete,
		);
		setSessions(remaining);
		saveChatSessions(remaining);
		if (currentSessionId === sessionToDelete) {
			if (remaining.length > 0) {
				setCurrentSessionId(remaining[0].id);
				setSelectedAgentId(remaining[0].agentId);
			} else {
				const fresh = createNewSession("azabot", "محادثة جديدة");
				setSessions([fresh]);
				setCurrentSessionId(fresh.id);
			}
		}
		setDeleteDialogOpen(false);
		setSessionToDelete(null);
		toast.success("تم حذف جلسة المحادثة.");
	};

	const agentSpec: AgentSpec =
		AGENT_SPECIALTIES[selectedAgentId] || AGENT_SPECIALTIES.azabot;

	return (
		<AppLayout title="دردشة وتفاعل الوكلاء (Agent Chat & Sessions)">
			<div className="h-[calc(100vh-8.5rem)] flex gap-4 overflow-hidden">
				{/* Left Sidebar */}
				<Card className="w-80 flex flex-col border-border bg-card shadow-lg shrink-0 overflow-hidden">
					<CardHeader className="p-3 border-b border-border bg-muted/30">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<MessageSquare className="h-5 w-5 text-[#FFB900]" />
								<CardTitle className="text-sm font-bold">
									الجلسات والمحادثات
								</CardTitle>
							</div>
							<Button
								onClick={handleNewChat}
								size="sm"
								className="h-8 bg-[#030957] hover:bg-[#071280] text-white text-xs gap-1 font-bold"
							>
								<Plus className="h-3.5 w-3.5" />
								محادثة جديدة
							</Button>
						</div>
					</CardHeader>

					<div className="p-3 border-b border-border bg-muted/10 space-y-1.5">
						<label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
							تبديل الوكيل الفعّال
						</label>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									className="w-full justify-between h-11 bg-background border-border hover:bg-muted/50 text-right px-3"
								>
									<div className="flex items-center gap-2 truncate">
										<span className="text-lg">{agentSpec.icon}</span>
										<div className="truncate">
											<div className="text-xs font-bold text-foreground truncate">
												{AGENT_LABELS[selectedAgentId]}
											</div>
											<div className="text-[10px] text-muted-foreground truncate">
												{foundryId(selectedAgentId)}
											</div>
										</div>
									</div>
									<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-72 max-h-80 overflow-y-auto p-1">
								{AGENT_IDS.map((id: AgentId) => {
									const spec = AGENT_SPECIALTIES[id];
									const isSelected = id === selectedAgentId;
									return (
										<DropdownMenuItem
											key={id}
											onClick={() => handleSelectAgent(id)}
											className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer ${
												isSelected
													? "bg-[#030957] text-white font-bold"
													: "hover:bg-muted"
											}`}
										>
											<div className="flex items-center gap-2.5 truncate">
												<span className="text-base">{spec.icon}</span>
												<div className="truncate">
													<div className="text-xs font-bold">
														{AGENT_LABELS[id]}
													</div>
													<div
														className={`text-[10px] ${isSelected ? "text-slate-300" : "text-muted-foreground"}`}
													>
														{spec.role}
													</div>
												</div>
											</div>
											{isSelected && (
												<Check className="h-4 w-4 text-[#FFB900]" />
											)}
										</DropdownMenuItem>
									);
								})}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					<ScrollArea className="flex-1 p-2">
						<div className="space-y-1">
							{sessions.map((sess: ChatSession) => {
								const isActive = sess.id === currentSessionId;
								const spec =
									AGENT_SPECIALTIES[sess.agentId] || AGENT_SPECIALTIES.azabot;
								return (
									<div
										key={sess.id}
										onClick={() => {
											setCurrentSessionId(sess.id);
											setSelectedAgentId(sess.agentId);
										}}
										className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border ${
											isActive
												? "bg-muted/80 border-[#FFB900]/50 shadow-sm"
												: "border-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
										}`}
									>
										<div className="flex items-center gap-2.5 truncate min-w-0">
											<span className="text-sm shrink-0">{spec.icon}</span>
											<div className="truncate min-w-0">
												<div
													className={`text-xs truncate ${isActive ? "font-bold text-foreground" : "font-medium"}`}
												>
													{sess.title}
												</div>
												<div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
													<span>{sess.messages.length} رسالة</span>
													<span>•</span>
													<span>
														{new Date(sess.updatedAt).toLocaleTimeString(
															"ar-SA",
															{ hour: "2-digit", minute: "2-digit" },
														)}
													</span>
												</div>
											</div>
										</div>

										<Button
											variant="ghost"
											size="icon"
											onClick={(e: React.MouseEvent) =>
												handleDeleteSession(sess.id, e)
											}
											className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-opacity shrink-0"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								);
							})}
						</div>
					</ScrollArea>
				</Card>

				{/* Right Main Chat Area */}
				<Card className="flex-1 flex flex-col border-border bg-card shadow-xl overflow-hidden relative">
					<CardHeader className="p-3 border-b border-border bg-gradient-to-r from-[#030957] to-[#071280] text-white flex-row items-center justify-between shrink-0">
						<div className="flex items-center gap-3">
							<div
								className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-md border border-white/20"
								style={{ backgroundColor: `${agentSpec.color}33` }}
							>
								{agentSpec.icon}
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h3 className="text-base font-bold text-white">
										{AGENT_LABELS[selectedAgentId]}
									</h3>
									<Badge className="bg-[#FFB900] text-[#030957] font-bold text-[10px]">
										{agentSpec.role}
									</Badge>
									<span className="flex h-2 w-2 relative">
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
										<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
									</span>
								</div>
								<div className="text-xs text-slate-300 font-mono mt-0.5 flex items-center gap-2">
									<span>{mailboxFor(selectedAgentId)}</span>
									<span>•</span>
									<span>MCP Bearer Connected</span>
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Badge
								variant="outline"
								className="text-white/80 border-white/20 text-xs"
							>
								Foundry ID: {foundryId(selectedAgentId)}
							</Badge>
						</div>
					</CardHeader>

					<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10 scrollbar-thin">
						{activeSession?.messages.map((msg: ChatMessage) => {
							const isUser = msg.role === "user";
							return (
								<div
									key={msg.id}
									className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
								>
									{!isUser && (
										<div className="h-8 w-8 rounded-full bg-[#030957] text-[#FFB900] flex items-center justify-center font-bold text-xs shrink-0 shadow">
											{agentSpec.icon}
										</div>
									)}

									<div
										className={`max-w-[75%] space-y-2 ${isUser ? "items-end" : "items-start"}`}
									>
										<div
											className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
												isUser
													? "bg-[#030957] text-white rounded-tl-none font-medium"
													: "bg-background border border-border text-foreground rounded-tr-none shadow-md"
											}`}
										>
											<div className="whitespace-pre-wrap">{msg.content}</div>

											{msg.attachments && msg.attachments.length > 0 && (
												<div className="mt-2.5 pt-2 border-t border-white/20 space-y-1.5">
													<div className="text-[11px] font-bold opacity-80 flex items-center gap-1">
														<Paperclip className="h-3 w-3" />
														الملفات المغذاة للوكيل:
													</div>
													<div className="flex flex-wrap gap-1.5">
														{msg.attachments.map((att: FileFeedAttachment) => (
															<div
																key={att.id}
																className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded text-xs"
															>
																<FileText className="h-3.5 w-3.5 text-[#FFB900]" />
																<span className="font-mono text-[11px] truncate max-w-[140px]">
																	{att.name}
																</span>
																<span className="opacity-70 text-[10px]">
																	({formatFileSize(att.size)})
																</span>
															</div>
														))}
													</div>
												</div>
											)}
										</div>

										<div
											className={`text-[10px] text-muted-foreground px-1 ${isUser ? "text-left" : "text-right"}`}
										>
											{new Date(msg.createdAt).toLocaleTimeString("ar-SA", {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</div>
									</div>

									{isUser && (
										<div className="h-8 w-8 rounded-full bg-[#FFB900] text-[#030957] flex items-center justify-center font-bold text-xs shrink-0 shadow">
											<User className="h-4 w-4" />
										</div>
									)}
								</div>
							);
						})}

						{isSending && (
							<div className="flex gap-3 justify-start items-center">
								<div className="h-8 w-8 rounded-full bg-[#030957] text-[#FFB900] flex items-center justify-center font-bold text-xs shrink-0">
									{agentSpec.icon}
								</div>
								<div className="p-3 bg-background border border-border rounded-2xl rounded-tr-none flex items-center gap-2 shadow">
									<span className="text-xs text-muted-foreground font-medium">
										جاري معالجة الطلب وتغذية الوكيل...
									</span>
									<Sparkles className="h-4 w-4 text-[#FFB900] animate-spin" />
								</div>
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>

					{attachments.length > 0 && (
						<div className="p-2 border-t border-border bg-muted/20 flex flex-wrap gap-2">
							{attachments.map((att: FileFeedAttachment) => (
								<div
									key={att.id}
									className="flex items-center gap-2 px-2.5 py-1 bg-card border rounded-lg text-xs shadow-sm"
								>
									<FileCode className="h-4 w-4 text-[#FFB900]" />
									<span className="font-mono text-xs font-semibold max-w-[160px] truncate">
										{att.name}
									</span>
									<span className="text-muted-foreground text-[10px]">
										({formatFileSize(att.size)})
									</span>
									<button
										onClick={() => removeAttachment(att.id)}
										className="text-red-400 hover:text-red-600 p-0.5"
									>
										<X className="h-3.5 w-3.5" />
									</button>
								</div>
							))}
						</div>
					)}

					<div className="p-3 border-t border-border bg-card flex gap-2 items-center">
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileChange}
							multiple
							className="hidden"
						/>

						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => fileInputRef.current?.click()}
							title="إرفاق ملفات لتغذية الوكيل"
							className="h-10 w-10 border-border hover:bg-muted shrink-0"
						>
							<Paperclip className="h-4 w-4 text-[#FFB900]" />
						</Button>

						<Input
							value={inputText}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setInputText(e.target.value)
							}
							onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSendMessage();
								}
							}}
							placeholder={`أرسل استفسارك أو أمرك للوكيل ${AGENT_LABELS[selectedAgentId]}...`}
							className="flex-1 h-10 bg-background text-sm"
							disabled={isSending}
						/>

						<Button
							onClick={handleSendMessage}
							disabled={
								isSending || (!inputText.trim() && attachments.length === 0)
							}
							className="h-10 px-4 bg-[#030957] hover:bg-[#071280] text-white font-bold gap-2 shrink-0 shadow-md"
						>
							<span>إرسال</span>
							<Send className="h-4 w-4 text-[#FFB900]" />
						</Button>
					</div>
				</Card>
			</div>

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="text-base font-bold text-red-600">
							حذف جلسة المحادثة
						</DialogTitle>
						<DialogDescription>
							هل أنت تأكد من رغبتك في حذف هذه الجلسة؟ لن تتمكن من استعادتها
							لاحقاً.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
						>
							إلغاء
						</Button>
						<Button variant="destructive" onClick={confirmDeleteSession}>
							نعم، احذف
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</AppLayout>
	);
}

function generateAgentResponse(
	agentId: AgentId,
	userText: string,
	attachments: FileFeedAttachment[],
): string {
	const fileContextNotice =
		attachments.length > 0
			? `\n\n📄 **تمت معالجة التغذية المرفقة (${attachments.length} ملفات):**\n` +
				attachments
					.map(
						(a: FileFeedAttachment) =>
							`- ${a.name} (${formatFileSize(a.size)})`,
					)
					.join("\n")
			: "";

	const responses: Record<AgentId, string> = {
		backend: `أهلاً بك! بصفتي وكيل البنية التحتية والشبكات، قمت بتحليل طلبك: "${userText}".\nكافة الخدمات تعمل بكفاءة عالية على خوادم Alazab.${fileContextNotice}`,
		azabot: `أهلاً وسهلاً! أنا عزبوت. استلمت استفسارك وشارفت على إنهاء المعالجة المطلوب لخدمتك.${fileContextNotice}`,
		auth: `تحياتي! بصفتي وكيل الأمن والمصادقة، قمت بمراجعة الرموز والصلاحيات المتعلقة بطلبك وتم التأكد من توافقية معايير الأمان.${fileContextNotice}`,
		prod: `مرحباً! وكيل خطوط الإنتاج يحييكم. تم تسجيل التحديث وجاري جدولة عمليات التشغيل المطلوبة.${fileContextNotice}`,
		maint: `أهلاً بك! تم استلام البلاغ/طلب الصيانة وتحويله إلى الفرق الميدانية للتشغيل والمتابعة المباشرة.${fileContextNotice}`,
		core: `تم استقبال الطلب من قبل الوكيل المركزي core. تم التحقق من القوالب الـ 144 ومطابقتها لمواصفات الهيكلية.${fileContextNotice}`,
		bim: `أهلاً بك! قمت باستلام البيانات المخططية والهندسية للنمذجة BIM وجاري المطابقة والتحليل الهندسي.${fileContextNotice}`,
		finance: `مرحباً! قمت بفتح الملفات المحاسبية والسجلات المالية الخاصة بطلبك وتم التأكد من سلامة القيود والمعاملات.${fileContextNotice}`,
		payments: `أهلاً بك! تم التأكد من حالة عمليات التحصيل والدفع وإصدار إشعار المعاملة بنجاح.${fileContextNotice}`,
		copilot: `مرحباً بك! الكوبايلوت المساعد البرمجي استلم كودك/طلبك ويقوم بفحص التركيب والتحسين البنيوي للأكواد.${fileContextNotice}`,
		project: `أهلاً بك! تم تحديث الجدول الزمني للمشروع وتخصيص المهام المحددة بناءً على البيانات المدخلة.${fileContextNotice}`,
		vision: `مرحباً بك! وكيل الرؤية والذكاء الاصطناعي قام بقراءة وتحليل الصور والمستندات المرفقة وتحديد المعالم الفنية.${fileContextNotice}`,
	};

	return (
		responses[agentId] ||
		`تم استلام طلبك وبدء المعالجة بواسطة الوكيل ${agentId}.${fileContextNotice}`
	);
}
