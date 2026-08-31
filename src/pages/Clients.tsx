import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Bot, CheckCircle2, Copy, FileJson2, FileText, IdCard, KeyRound, Mail, Search, ShieldCheck, Terminal } from "lucide-react";
import type { AgentListItem } from "@shared/api";
import { AGENT_LABELS } from "@shared/agents";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

async function copy(text: string) { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); }
export default function Clients() {
  const agents = useQuery({ queryKey: ["agents"], queryFn: () => apiFetch<AgentListItem[]>("/api/agents") });
  const [agentId, setAgentId] = useState("finance");
  const [search, setSearch] = useState("");
  const agent = agents.data?.find((a) => a.id === agentId) ?? agents.data?.[0];
  const endpoint = "https://mcp.alazab.com/mail";
  const foundrySnippet = agent ? `MCP URL: ${endpoint}\nAuthorization: Bearer <TOKEN_FOR_${agent.id.toUpperCase()}>\nExpected whoami.foundryId: ${agent.foundryId}\nExpected whoami.email: ${agent.mailbox}` : `MCP URL: ${endpoint}`;
  const guides = useMemo(() => [
    { title: "ربط Agent", tags: "foundry mcp token", text: "ضع MCP endpoint والتوكن الخاص بهذا Agent فقط. لا تشارك نفس التوكن بين الوكلاء." },
    { title: "اختبار الهوية", tags: "whoami identity", text: "أول Tool call يجب أن يكون whoami. طابق agentId وfoundryId والبريد ومؤشر connected." },
    { title: "اكتشاف القوالب", tags: "templates list", text: "list_templates يرجع 144 قالبًا. recommended يوضح القوالب المناسبة للوكيل لكنه لا يمنع بقية القوالب." },
    { title: "Render قبل الإرسال", tags: "render schema", text: "استخدم get_template_schema ثم render_template للتأكد من required fields قبل send_template_email." },
    { title: "الإرسال الحر", tags: "send email raw", text: "send_email يسمح To/CC/BCC/subject/text/html فقط. عنوان المرسل لا يمر كـargument." },
    { title: "مراقبة الاتصال", tags: "heartbeat connections", text: "بعد التشغيل راجع MCP Connections. whoami يحدث last_whoami_at والطلبات تحدث last_seen_at/last_tool." },
  ].filter((g) => `${g.title} ${g.tags} ${g.text}`.toLowerCase().includes(search.toLowerCase())), [search]);

  return <AppLayout title="دليل الاستخدام" subtitle="مرجع تشغيلي كامل لربط Foundry Agents واستخدام MCP Mail Tools">
    <div className="space-y-5">
      <div className="grid md:grid-cols-4 gap-4">{[
        { icon: IdCard, title: "whoami", text: "إثبات token → Agent → Foundry ID → mailbox." }, { icon: FileText, title: "list_templates", text: "144 قالبًا عالميًا مع recommendations." }, { icon: Mail, title: "send_email", text: "إرسال حر والمُرسل ثابت server-side." }, { icon: ShieldCheck, title: "Identity Lock", text: "Prompt أو arguments لا يغيران From." },
      ].map((x)=><Card key={x.title}><CardHeader><x.icon className="h-5 w-5 text-[#030957]" /><CardTitle className="text-base font-mono" dir="ltr">{x.title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground leading-6">{x.text}</CardContent></Card>)}</div>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> Agent-specific Setup</CardTitle><CardDescription>اختر الوكيل للحصول على القيم المتوقع ظهورها في whoami.</CardDescription></CardHeader><CardContent className="space-y-4"><Select value={agentId} onValueChange={setAgentId}><SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger><SelectContent>{agents.data?.map((a)=><SelectItem key={a.id} value={a.id}>{AGENT_LABELS[a.id]} · {a.id}</SelectItem>)}</SelectContent></Select>{agent && <div className="grid md:grid-cols-4 gap-3 text-sm"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Agent ID</p><code dir="ltr">{agent.id}</code></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Foundry ID</p><code dir="ltr">{agent.foundryId}</code></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Mailbox</p><code dir="ltr">{agent.mailbox}</code></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Templates</p><strong>{agent.availableTemplateCount}</strong> global</div></div>}<div className="relative"><pre className="rounded-lg bg-slate-950 text-slate-100 p-5 text-xs overflow-auto" dir="ltr">{foundrySnippet}</pre><Button size="sm" variant="secondary" className="absolute top-3 left-3" onClick={()=>void copy(foundrySnippet)}><Copy className="h-4 w-4 ml-1" /> نسخ</Button></div></CardContent></Card>

      <Tabs defaultValue="checklist"><TabsList><TabsTrigger value="checklist">Checklist</TabsTrigger><TabsTrigger value="tools">Tools</TabsTrigger><TabsTrigger value="examples">Examples</TabsTrigger><TabsTrigger value="troubleshoot">Troubleshooting</TabsTrigger></TabsList>
        <TabsContent value="checklist"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Foundry Integration Checklist</CardTitle></CardHeader><CardContent><ol className="space-y-4">{[
          "استخرج أو Rotate التوكن الخاص بالوكيل، ثم خزنه في Foundry secret/config وليس داخل prompt.", `اضبط MCP endpoint على ${endpoint} مع Authorization Bearer.`, "شغّل whoami وطابق agentId وFoundry ID والبريد مع الوكيل المختار.", "شغّل list_templates وتأكد أن count=144 وaccess=global.", "اختر قالبًا، نفذ get_template_schema ثم render_template ببيانات اختبار.", "اختبر send_template_email ثم send_email إلى بريد آمن تملكه.", "راجع MCP Connections وتأكد من last_seen_at وlast_whoami_at وlast_tool.", "راجع Send Log للتحقق من messageId والحالة والمستلم.",
        ].map((x,i)=><li key={x} className="flex gap-3"><div className="h-7 w-7 rounded-full bg-[#030957] text-white grid place-items-center text-xs shrink-0">{i+1}</div><p className="text-sm leading-7">{x}</p></li>)}</ol></CardContent></Card></TabsContent>
        <TabsContent value="tools" className="space-y-4"><div className="relative max-w-md"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="بحث في دليل الأدوات..." className="pr-9" /></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{guides.map((g)=><Card key={g.title}><CardHeader><CardTitle className="text-base">{g.title}</CardTitle><CardDescription className="font-mono" dir="ltr">{g.tags}</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground leading-6">{g.text}</CardContent></Card>)}</div></TabsContent>
        <TabsContent value="examples"><div className="grid xl:grid-cols-2 gap-4"><Card><CardHeader><CardTitle className="text-base font-mono" dir="ltr">send_email</CardTitle></CardHeader><CardContent><pre className="bg-slate-950 text-white rounded-lg p-5 text-xs overflow-auto" dir="ltr">{`{\n  "to": ["user@example.com"],\n  "cc": ["audit@example.com"],\n  "subject": "Subject",\n  "text": "Plain text",\n  "html": "<p>HTML</p>"\n}\n// No from / replyTo fields`}</pre></CardContent></Card><Card><CardHeader><CardTitle className="text-base font-mono" dir="ltr">send_template_email</CardTitle></CardHeader><CardContent><pre className="bg-slate-950 text-white rounded-lg p-5 text-xs overflow-auto" dir="ltr">{`{\n  "template_id": "<any-template-id>",\n  "to": ["user@example.com"],\n  "data": {\n    "recipient_name": "Mohamed"\n  }\n}\n// Any enabled template in the 144 catalog`}</pre></CardContent></Card><Card><CardHeader><CardTitle className="text-base font-mono" dir="ltr">get_template_schema</CardTitle></CardHeader><CardContent><pre className="bg-slate-950 text-white rounded-lg p-5 text-xs overflow-auto" dir="ltr">{`{\n  "template_id": "<template-id>"\n}\n// Use required/optional before render`}</pre></CardContent></Card><Card><CardHeader><CardTitle className="text-base font-mono" dir="ltr">whoami expected</CardTitle></CardHeader><CardContent><pre className="bg-slate-950 text-white rounded-lg p-5 text-xs overflow-auto" dir="ltr">{agent ? JSON.stringify({connected:true,agentId:agent.id,foundryId:agent.foundryId,email:agent.mailbox,fromLocked:true,templateAccess:"global",templateCount:144},null,2) : "{}"}</pre></CardContent></Card></div></TabsContent>
        <TabsContent value="troubleshoot"><div className="grid md:grid-cols-2 gap-4">{[
          { icon: KeyRound, title: "401 / Invalid token", text: "تحقق أن Bearer token يخص هذا Agent وأن ملف token store persistent بعد إعادة الحاوية." }, { icon: IdCard, title: "whoami mismatch", text: "لا تكمل الإرسال. راجع Foundry secret والـAgent token المرتبط به." }, { icon: FileJson2, title: "Template validation", text: "نفذ get_template_schema وتأكد من required fields وأن template ID موجود ومفعّل." }, { icon: Terminal, title: "Gateway offline", text: "راجع /healthz و/readyz وDocker logs ثم Gateway heartbeat في صفحة بوابة التشغيل." },
        ].map((x)=><Card key={x.title}><CardHeader><x.icon className="h-5 w-5 text-[#030957]" /><CardTitle className="text-base">{x.title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground leading-6">{x.text}</CardContent></Card>)}</div><div className="mt-4 rounded-lg border bg-emerald-50 border-emerald-200 p-4 flex gap-3 text-sm"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><p>المسار المرجعي السليم: <code>whoami → list_templates → get_template_schema → render_template → send</code>.</p></div></TabsContent>
      </Tabs>
    </div>
  </AppLayout>;
}
