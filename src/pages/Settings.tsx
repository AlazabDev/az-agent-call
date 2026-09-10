import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  Copy,
  Database,
  ExternalLink,
  FileKey2,
  Globe2,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  TerminalSquare,
  Unplug,
} from "lucide-react";
import type { AgentId } from "@shared/agents";
import type { AgentListItem, GatewayInstance, SettingsData } from "@shared/api";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseAuthCard } from "@/components/SupabaseAuthCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

type DiagnosticItem = { name: string; ok: boolean; detail: string };
type SmtpDiagnostic = { id: AgentId; ok: boolean; error?: string };
type Diagnostics = { ok: boolean; checks: DiagnosticItem[]; smtpChecks: SmtpDiagnostic[]; checkedAt: string };

type TestSendResult = {
  messageId: string;
  from: string;
  accepted?: string[];
  rejected?: string[];
};

const ENVIRONMENT_ROWS = [
  ["SUPABASE_PROJECT_REF", "bxuhcbfdoaflsgbxiqei", "server", "معرّف alazab-db"],
  ["SUPABASE_URL", "https://bxuhcbfdoaflsgbxiqei.supabase.co", "server", "API production"],
  ["SUPABASE_SERVICE_ROLE_KEY", "server secret", "server", "مطلوب للـGateway ولا يصل للمتصفح"],
  ["VITE_SUPABASE_PUBLISHABLE_KEY", "publishable", "build", "مسموح للواجهة"],
  ["PUBLIC_APP_URL", "https://mcp.alazab.com", "server", "الدومين العام"],
  ["AGENT_TOKENS_PATH", "/app/data/agent-tokens.json", "server", "ملف التوكنات الدائم"],
  ["MAILBOX_DOMAIN", "alazab.com", "server", "دومين صناديق الوكلاء"],
  ["MIGADU_SMTP_HOST", "smtp.migadu.com", "server", "SMTP provider"],
  ["MIGADU_SMTP_PORT", "587", "server", "STARTTLS"],
  ["MAILBOX_PASSWORD_PATTERN", "{mailbox}@…", "server", "mailbox = local part"],
  ["ADMIN_PASSWORD", "server secret", "server", "HTTP Basic على /admin"],
] as const;

export default function Settings() {
  const [testAgent, setTestAgent] = useState<AgentId>("core");
  const [testRecipient, setTestRecipient] = useState("");
  const [testSubject, setTestSubject] = useState("Az Agent Call Center — اختبار اتصال");
  const [testBody, setTestBody] = useState("رسالة اختبار من بوابة بريد وكلاء العزب.");
  const [testHtml, setTestHtml] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<SettingsData>("/api/settings"),
    refetchInterval: 60_000,
  });

  const diagnosticsQuery = useQuery({
    queryKey: ["diagnostics"],
    queryFn: () => apiFetch<Diagnostics>("/api/diagnostics"),
    enabled: false,
  });

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiFetch<AgentListItem[]>("/api/agents"),
    refetchInterval: 30_000,
  });

  const gatewaysQuery = useQuery({
    queryKey: ["gateways"],
    queryFn: () => apiFetch<GatewayInstance[]>("/api/gateways"),
    refetchInterval: 30_000,
  });

  const testMutation = useMutation({
    mutationFn: () => apiFetch<TestSendResult>("/api/test-send", {
      method: "POST",
      body: JSON.stringify({
        agentId: testAgent,
        to: testRecipient,
        subject: testSubject,
        text: testHtml ? undefined : testBody,
        html: testHtml ? `<div dir="rtl"><h2>${testSubject}</h2><p>${testBody}</p></div>` : undefined,
      }),
    }),
    onSuccess: (data) => toast.success(`نجح الإرسال من ${data.from}`),
    onError: (error: Error) => toast.error(error.message),
  });

  const settings = settingsQuery.data;
  const agents = agentsQuery.data ?? [];
  const gateways = gatewaysQuery.data ?? [];
  const diagnostics = diagnosticsQuery.data;
  const smtpReady = agents.filter((agent) => agent.smtpConfigured).length;
  const tokenReady = agents.filter((agent) => Boolean(agent.tokenHint)).length;
  const onlineAgents = agents.filter((agent) => agent.connection?.status === "online").length;
  const readiness = useMemo(() => {
    const checks = [
      agents.length === 12,
      (settings?.templates ?? 0) === 144,
      (settings?.tokenStoreLoaded ?? 0) === 12,
      smtpReady === 12,
      gateways.some((gateway) => gateway.status === "ready"),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [agents.length, settings?.templates, settings?.tokenStoreLoaded, smtpReady, gateways]);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`تم نسخ ${label}`);
  };

  return (
    <AppLayout
      title="إعدادات Az Agent Call Center"
      subtitle="Supabase Production · Gateway · Migadu · Security · Deployment"
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            void settingsQuery.refetch();
            void agentsQuery.refetch();
            void gatewaysQuery.refetch();
          }}
        >
          <RefreshCw className="h-4 w-4" /> تحديث الحالة
        </Button>
      }
    >
      <div className="space-y-6" dir="rtl">
        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Readiness</p><div className="flex items-end justify-between mt-2"><p className="text-2xl font-bold">{readiness}%</p><Activity className="h-6 w-6 text-primary" /></div><Progress value={readiness} className="mt-3" /></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Templates</p><p className="text-2xl font-bold mt-2">{settings?.templates ?? "—"} / 144</p><p className="text-[11px] text-muted-foreground mt-2">Global shared catalog</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Token Store</p><p className="text-2xl font-bold mt-2">{settings?.tokenStoreLoaded ?? "—"} / {settings?.tokenStoreExpected ?? 12}</p><p className="text-[11px] text-muted-foreground mt-2">Persistent clear tokens</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs text-muted-foreground">SMTP Configured</p><p className="text-2xl font-bold mt-2">{smtpReady} / 12</p><p className="text-[11px] text-muted-foreground mt-2">Pattern or override</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Agents Online</p><p className="text-2xl font-bold mt-2">{onlineAgents} / 12</p><p className="text-[11px] text-muted-foreground mt-2">Fresh MCP activity</p></CardContent></Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-5">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="w-max">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="supabase">Supabase</TabsTrigger>
              <TabsTrigger value="migadu">Migadu / Mailboxes</TabsTrigger>
              <TabsTrigger value="gateway">Gateway / MCP</TabsTrigger>
              <TabsTrigger value="security">الأمان</TabsTrigger>
              <TabsTrigger value="environment">Environment</TabsTrigger>
              <TabsTrigger value="test">اختبار الإرسال</TabsTrigger>
            </TabsList>
          </ScrollArea>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-5">
              <SupabaseAuthCard />
              <Card className="shadow-card">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Production Gate</CardTitle><CardDescription>المؤشرات التي يجب أن تكون مكتملة قبل فتح الخدمة للوكلاء.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    ["12 Agent identities", agents.length === 12, `${agents.length}/12`],
                    ["144 templates synchronized", settings?.templates === 144, `${settings?.templates ?? 0}/144`],
                    ["Persistent token store", settings?.tokenStoreLoaded === 12, `${settings?.tokenStoreLoaded ?? 0}/12`],
                    ["SMTP credentials configured", smtpReady === 12, `${smtpReady}/12`],
                    ["Gateway heartbeat", gateways.some((gateway) => gateway.status === "ready"), gateways[0]?.status ?? "offline"],
                  ].map(([label, ok, detail]) => (
                    <div key={String(label)} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleOff className="h-4 w-4 text-muted-foreground" />}<span className="text-sm">{label}</span></div>
                      <Badge variant={ok ? "default" : "outline"}>{detail}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-card">
              <CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-base">تشخيص شامل</CardTitle><CardDescription>يفحص Supabase وTemplate Catalog وToken Store ثم يجرب SMTP AUTH لكل صندوق.</CardDescription></div><Button onClick={() => void diagnosticsQuery.refetch()} disabled={diagnosticsQuery.isFetching} className="gap-2"><Activity className="h-4 w-4" /> {diagnosticsQuery.isFetching ? "جاري الفحص..." : "فحص كامل"}</Button></CardHeader>
              <CardContent>
                {!diagnostics && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">لم يتم تشغيل التشخيص بعد. هذا الفحص لا يرسل بريدًا؛ يستخدم SMTP verify فقط.</div>}
                {diagnostics && <div className="space-y-5">
                  <div className="grid md:grid-cols-3 gap-3">{diagnostics.checks.map((check) => <div key={check.name} className="rounded-lg border p-4"><div className="flex items-center justify-between"><p className="font-medium text-sm">{check.name}</p>{check.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}</div><p className="mt-2 text-xs text-muted-foreground break-all" dir="ltr">{check.detail}</p></div>)}</div>
                  <Separator />
                  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">{diagnostics.smtpChecks.map((check) => <div key={check.id} className="flex items-start justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{check.id}</p><p className="text-[10px] text-muted-foreground break-all" dir="ltr">{check.ok ? "SMTP verify OK" : check.error}</p></div><Badge variant={check.ok ? "default" : "destructive"}>{check.ok ? "OK" : "FAIL"}</Badge></div>)}</div>
                </div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supabase" className="space-y-5">
            <SupabaseAuthCard compact />
            <div className="grid lg:grid-cols-2 gap-5">
              <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> alazab-db</CardTitle><CardDescription>الاتصال الذي تعتمد عليه الواجهة والـGateway فعليًا.</CardDescription></CardHeader><CardContent className="space-y-4">
                <div><Label>Project Ref</Label><div className="flex gap-2 mt-1"><Input readOnly value={settings?.supabaseProjectRef ?? "bxuhcbfdoaflsgbxiqei"} dir="ltr" /><Button variant="outline" size="icon" onClick={() => void copy(settings?.supabaseProjectRef ?? "bxuhcbfdoaflsgbxiqei", "Project Ref")}><Copy className="h-4 w-4" /></Button></div></div>
                <div><Label>Project URL</Label><div className="flex gap-2 mt-1"><Input readOnly value={settings?.supabaseUrl ?? "https://bxuhcbfdoaflsgbxiqei.supabase.co"} dir="ltr" /><Button variant="outline" size="icon" onClick={() => void copy(settings?.supabaseUrl ?? "https://bxuhcbfdoaflsgbxiqei.supabase.co", "Supabase URL")}><Copy className="h-4 w-4" /></Button></div></div>
                <div><Label>Authenticated Edge Function</Label><div className="flex gap-2 mt-1"><Input readOnly value={settings?.edgeStatusFunction ?? ".../functions/v1/agent-call-status"} dir="ltr" /><Button variant="outline" size="icon" onClick={() => window.open(settings?.edgeStatusFunction, "_blank")}><ExternalLink className="h-4 w-4" /></Button></div></div>
              </CardContent></Card>

              <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Data Model</CardTitle><CardDescription>الجداول التي تشكل Control Plane لبريد الوكلاء.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 gap-2">{[
                "call_agents", "call_templates", "call_logs", "call_settings", "call_admins", "call_gateway_instances", "call_agent_connections", "call_agent_stats",
              ].map((table) => <div key={table} className="rounded-lg border bg-muted/20 px-3 py-2 font-mono text-xs" dir="ltr">{table}</div>)}</div><Alert className="mt-4"><ShieldCheck className="h-4 w-4" /><AlertTitle>RLS integrated</AlertTitle><AlertDescription>قراءة الإدارة تستخدم أدوار العزب المركزية، والكتابة التشغيلية محصورة في Service Role داخل الـGateway.</AlertDescription></Alert></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="migadu" className="space-y-5">
            <div className="grid lg:grid-cols-3 gap-5">
              <Card className="shadow-card lg:col-span-2"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Migadu SMTP</CardTitle><CardDescription>كل Agent يرسل بهويته الثابتة. لا توجد خاصية From قابلة للتعديل.</CardDescription></CardHeader><CardContent className="grid sm:grid-cols-2 gap-4"><div><Label>Host</Label><Input readOnly value={settings?.smtpHost ?? "smtp.migadu.com"} dir="ltr" className="mt-1" /></div><div><Label>Port</Label><Input readOnly value={String(settings?.smtpPort ?? 587)} dir="ltr" className="mt-1" /></div><div><Label>Mailbox Domain</Label><Input readOnly value={settings?.mailboxDomain ?? "alazab.com"} dir="ltr" className="mt-1" /></div><div><Label>Password Strategy</Label><Input readOnly value={settings?.smtpPasswordPatternConfigured ? "Pattern + per-agent overrides" : "Per-agent overrides only"} className="mt-1" /></div></CardContent></Card>
              <Card className="shadow-card"><CardHeader><CardTitle className="text-base">مصدر كلمة المرور</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-xl bg-slate-950 p-4 text-slate-100 font-mono text-sm" dir="ltr">{settingsQuery.data?.smtpPasswordPatternConfigured ? "Fallback configured in server env" : "Fallback disabled"}</div><p className="text-xs text-muted-foreground leading-6">القيم الفعلية لا تُعرض في الواجهة. لكل وكيل متغير `MAILBOX_PASSWORD_&lt;AGENT&gt;`، والـoverride له الأولوية.</p><Badge variant="outline">Override wins</Badge></CardContent></Card>
            </div>

            <Card className="shadow-card overflow-hidden"><CardHeader><CardTitle className="text-base">حالة صناديق الوكلاء</CardTitle><CardDescription>لا تعرض الواجهة كلمات المرور. تعرض فقط مصدرها وحالة الإعداد.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Mailbox</TableHead><TableHead>SMTP</TableHead><TableHead>Password Source</TableHead><TableHead>Token</TableHead><TableHead>Last Activity</TableHead></TableRow></TableHeader><TableBody>{agents.map((agent) => <TableRow key={agent.id}><TableCell className="font-medium">{agent.id}</TableCell><TableCell className="font-mono text-xs" dir="ltr">{agent.mailbox}</TableCell><TableCell><Badge variant={agent.smtpConfigured ? "default" : "destructive"}>{agent.smtpConfigured ? "Configured" : "Missing"}</Badge></TableCell><TableCell><Badge variant="outline">{agent.smtpPasswordSource}</Badge></TableCell><TableCell><Badge variant={agent.tokenHint ? "secondary" : "outline"}>{agent.tokenHint ?? "Not initialized"}</Badge></TableCell><TableCell className="text-xs" dir="ltr">{agent.connection?.lastSeenAt ? new Date(agent.connection.lastSeenAt).toLocaleString() : "—"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
          </TabsContent>

          <TabsContent value="gateway" className="space-y-5">
            <div className="grid lg:grid-cols-2 gap-5">
              <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Server className="h-4 w-4" /> Runtime URLs</CardTitle></CardHeader><CardContent className="space-y-4">{[
                ["Public App", settings?.publicAppUrl ?? "https://mcp.alazab.com"],
                ["Admin", settings?.adminEndpoint ?? "https://mcp.alazab.com/admin/"],
                ["MCP", settings?.mcpEndpoint ?? "https://mcp.alazab.com/mail"],
              ].map(([label, value]) => <div key={label}><Label>{label}</Label><div className="flex gap-2 mt-1"><Input readOnly value={value} dir="ltr" /><Button variant="outline" size="icon" onClick={() => void copy(value, label)}><Copy className="h-4 w-4" /></Button></div></div>)}</CardContent></Card>
              <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><FileKey2 className="h-4 w-4" /> Persistent Token Store</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>Container path</Label><Input readOnly value={settings?.agentTokensPath ?? "/app/data/agent-tokens.json"} dir="ltr" className="mt-1" /></div><div className="grid grid-cols-2 gap-3"><div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Loaded</p><p className="text-xl font-bold">{settings?.tokenStoreLoaded ?? 0}</p></div><div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Expected</p><p className="text-xl font-bold">{settings?.tokenStoreExpected ?? 12}</p></div></div><p className="text-xs text-muted-foreground">الملف النصي يبقى على volume الخادم. Supabase يحتفظ بالـSHA-256 + hint فقط.</p></CardContent></Card>
            </div>

            <Card className="shadow-card overflow-hidden"><CardHeader><CardTitle className="text-base">Gateway Heartbeats</CardTitle><CardDescription>الحالة تصبح Offline تلقائيًا إذا مر أكثر من 90 ثانية دون heartbeat.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Instance</TableHead><TableHead>Host</TableHead><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead>SMTP</TableHead><TableHead>Templates</TableHead><TableHead>Last Seen</TableHead></TableRow></TableHeader><TableBody>{gateways.length === 0 && <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">لا توجد Gateway شغالة حتى الآن.</TableCell></TableRow>}{gateways.map((gateway) => <TableRow key={gateway.instanceId}><TableCell className="font-mono text-xs" dir="ltr">{gateway.instanceId}</TableCell><TableCell dir="ltr">{gateway.hostname}</TableCell><TableCell>{gateway.version}</TableCell><TableCell><Badge variant={gateway.status === "ready" ? "default" : gateway.status === "offline" ? "destructive" : "outline"}>{gateway.status}</Badge></TableCell><TableCell className="font-mono text-xs" dir="ltr">{gateway.smtpHost}:{gateway.smtpPort}</TableCell><TableCell>{gateway.templateCount}</TableCell><TableCell className="text-xs" dir="ltr">{new Date(gateway.lastSeenAt).toLocaleString()}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-5">
            <div className="grid lg:grid-cols-2 gap-5">
              <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><LockKeyhole className="h-4 w-4" /> Admin authentication</CardTitle><CardDescription>طبقتان مستقلتان بدل وضع سر Supabase في المتصفح.</CardDescription></CardHeader><CardContent className="space-y-3">{[
                ["1", "HTTP Basic", "يحمي /admin/ قبل تحميل React. أي username، كلمة المرور من ADMIN_PASSWORD."],
                ["2", "Supabase Password Auth", "جلسة فعلية من alazab-db عبر email/password."],
                ["3", "Central RBAC", "platform_owner / platform_admin، مع operator/viewer اختياريين."],
              ].map(([n, title, text]) => <div key={n} className="flex gap-3 rounded-lg border p-4"><div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">{n}</div><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground mt-1 leading-5">{text}</p></div></div>)}</CardContent></Card>
              <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Agent isolation</CardTitle></CardHeader><CardContent className="space-y-3"><Alert><KeyRound className="h-4 w-4" /><AlertTitle>Bearer token = sender identity</AlertTitle><AlertDescription>التوكن يحدد Agent ID ثم Foundry ID ثم mailbox. أدوات الإرسال لا تحتوي From parameter.</AlertDescription></Alert><Alert><Mail className="h-4 w-4" /><AlertTitle>Global templates ≠ global sender</AlertTitle><AlertDescription>كل Agent يستطيع استخدام أي قالب، لكنه يظل يرسل من بريده هو فقط.</AlertDescription></Alert><Alert><Database className="h-4 w-4" /><AlertTitle>Service Role server-only</AlertTitle><AlertDescription>المفتاح لا يدخل أي متغير يبدأ بـVITE_ ولا يصل إلى Bundle الواجهة.</AlertDescription></Alert></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="environment" className="space-y-5">
            <Alert><TerminalSquare className="h-4 w-4" /><AlertTitle>Production environment contract</AlertTitle><AlertDescription>هذه الصفحة تعرض أسماء المتغيرات ووظيفتها فقط. القيم السرية لا تُقرأ من الخادم ولا يتم إرجاعها عبر API.</AlertDescription></Alert>
            <Card className="shadow-card overflow-hidden"><CardHeader><CardTitle className="text-base">Environment Matrix</CardTitle><CardDescription>المتغيرات الأساسية التي يجب أن تبقى متطابقة بين `.env.production` وDocker Compose.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Key</TableHead><TableHead>Value / Type</TableHead><TableHead>Scope</TableHead><TableHead>Purpose</TableHead></TableRow></TableHeader><TableBody>{ENVIRONMENT_ROWS.map(([key, value, scope, purpose]) => <TableRow key={key}><TableCell className="font-mono text-xs" dir="ltr">{key}</TableCell><TableCell className="font-mono text-xs" dir="ltr">{value}</TableCell><TableCell><Badge variant={scope === "build" ? "secondary" : "outline"}>{scope}</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{purpose}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
          </TabsContent>

          <TabsContent value="test" className="space-y-5">
            <div className="grid xl:grid-cols-[0.8fr_1.2fr] gap-5">
              <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> اختبار SMTP فعلي</CardTitle><CardDescription>يرسل رسالة حقيقية من Agent تختاره. From ثابت ولا يمكن تغييره.</CardDescription></CardHeader><CardContent className="space-y-4">
                <div><Label>Agent / From</Label><Select value={testAgent} onValueChange={(value) => setTestAgent(value as AgentId)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{agents.map((agent) => <SelectItem key={agent.id} value={agent.id}>{agent.id} — {agent.mailbox}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>To</Label><Input value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="recipient@example.com" dir="ltr" className="mt-1" /></div>
                <div><Label>Subject</Label><Input value={testSubject} onChange={(event) => setTestSubject(event.target.value)} className="mt-1" /></div>
                <div><div className="flex items-center justify-between"><Label>Body</Label><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">HTML</span><Switch checked={testHtml} onCheckedChange={setTestHtml} /></div></div><Textarea value={testBody} onChange={(event) => setTestBody(event.target.value)} className="mt-1 min-h-[130px]" /></div>
                <Button className="w-full gap-2" disabled={testMutation.isPending || !testRecipient} onClick={() => testMutation.mutate()}><Send className="h-4 w-4" />{testMutation.isPending ? "جاري الإرسال..." : "إرسال اختبار"}</Button>
              </CardContent></Card>

              <Card className="shadow-card"><CardHeader><CardTitle className="text-base">المسار الذي يتم اختباره</CardTitle></CardHeader><CardContent className="space-y-5">
                <div className="grid gap-3">{[
                  { title: "Admin JWT", detail: "Supabase session authenticates /api/test-send", icon: ShieldCheck },
                  { title: "Agent lookup", detail: `Selected: ${testAgent}`, icon: KeyRound },
                  { title: "Sender lock", detail: agents.find((agent) => agent.id === testAgent)?.mailbox ?? `agent-${testAgent}@alazab.com`, icon: Mail },
                  { title: "SMTP", detail: `${settings?.smtpHost ?? "smtp.migadu.com"}:${settings?.smtpPort ?? 587} STARTTLS`, icon: Server },
                  { title: "Audit", detail: "Result is written to call_logs", icon: Database },
                ].map((item) => <div key={item.title} className="flex items-center gap-3 rounded-xl border p-4"><div className="rounded-lg bg-muted p-2"><item.icon className="h-4 w-4" /></div><div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground mt-1" dir={item.detail.includes("@") || item.detail.includes(":") ? "ltr" : "rtl"}>{item.detail}</p></div></div>)}</div>
                {testMutation.isError && <Alert variant="destructive"><Unplug className="h-4 w-4" /><AlertTitle>فشل الاختبار</AlertTitle><AlertDescription>{testMutation.error.message}</AlertDescription></Alert>}
                {testMutation.data && <Alert><CheckCircle2 className="h-4 w-4" /><AlertTitle>تم الإرسال</AlertTitle><AlertDescription><span dir="ltr">Message-ID: {testMutation.data.messageId}</span></AlertDescription></Alert>}
              </CardContent></Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
