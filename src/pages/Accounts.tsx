import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  ServerCog,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";
import type { AgentId } from "@shared/agents";
import type { AgentListItem, SettingsData } from "@shared/api";
import { AppLayout } from "@/components/AppLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type RotateResult = { agentId: AgentId; token: string; hint: string; note: string };
type TestResult = { messageId: string; from: string; accepted: string[]; rejected: string[] };

function statusBadge(agent: AgentListItem) {
  const status = agent.connection?.status ?? "offline";
  if (status === "online") return <Badge className="gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Online</Badge>;
  if (status === "degraded") return <Badge variant="secondary">Degraded</Badge>;
  return <Badge variant="outline">Offline</Badge>;
}

export default function Accounts() {
  const { canRotateTokens, canOperate } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [passwordFilter, setPasswordFilter] = useState("all");
  const [selected, setSelected] = useState<AgentListItem | null>(null);
  const [tokenResult, setTokenResult] = useState<RotateResult | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testSubject, setTestSubject] = useState("اختبار صندوق بريد الوكيل");
  const [testBody, setTestBody] = useState("اختبار اتصال SMTP من لوحة Az Agent Mail.");

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiFetch<AgentListItem[]>("/api/agents"),
    refetchInterval: 30_000,
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<SettingsData>("/api/settings"),
    staleTime: 60_000,
  });

  const agents = agentsQuery.data ?? [];
  const filtered = useMemo(() => agents.filter((agent) => {
    const term = search.trim().toLowerCase();
    const textMatch = !term || [agent.id, agent.mailbox, agent.foundryId].some((value) => value.toLowerCase().includes(term));
    const status = agent.connection?.status ?? "offline";
    const statusMatch = statusFilter === "all" || status === statusFilter;
    const passwordMatch = passwordFilter === "all" || agent.smtpPasswordSource === passwordFilter;
    return textMatch && statusMatch && passwordMatch;
  }), [agents, search, statusFilter, passwordFilter]);

  const stats = useMemo(() => ({
    configured: agents.filter((agent) => agent.smtpConfigured).length,
    override: agents.filter((agent) => agent.smtpPasswordSource === "override").length,
    pattern: agents.filter((agent) => agent.smtpPasswordSource === "pattern").length,
    online: agents.filter((agent) => agent.connection?.status === "online").length,
    tokens: agents.filter((agent) => Boolean(agent.tokenHint)).length,
  }), [agents]);

  const rotateMutation = useMutation({
    mutationFn: (agentId: AgentId) => apiFetch<RotateResult>(`/api/agents/${agentId}/rotate-token`, { method: "POST", body: "{}" }),
    onSuccess: (data) => {
      setTokenResult(data);
      setShowToken(true);
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`تم تدوير Token الخاص بـ${data.agentId}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("لم يتم تحديد Agent");
      if (!testTo.includes("@")) throw new Error("أدخل مستلمًا صحيحًا");
      return apiFetch<TestResult>("/api/test-send", {
        method: "POST",
        body: JSON.stringify({ agentId: selected.id, to: testTo, subject: testSubject, text: testBody }),
      });
    },
    onSuccess: (data) => toast.success(`تم الإرسال من ${data.from}`),
    onError: (error: Error) => toast.error(error.message),
  });

  const copyValue = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`تم نسخ ${label}`);
  };

  return (
    <AppLayout
      title="صناديق بريد الوكلاء"
      subtitle="12 هوية ثابتة على alazab.com — SMTP + Foundry + Tokens"
      actions={<Button size="sm" variant="outline" onClick={() => void agentsQuery.refetch()} className="gap-2"><RefreshCw className="h-4 w-4" /> تحديث</Button>}
    >
      <div className="space-y-6" dir="rtl">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Mailboxes</p><p className="text-2xl font-bold mt-1">{agents.length || 12}</p><Progress value={(agents.length / 12) * 100} className="mt-3" /></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">SMTP ready</p><p className="text-2xl font-bold mt-1">{stats.configured}/12</p><p className="text-[10px] text-muted-foreground mt-2">Pattern أو Override</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Token initialized</p><p className="text-2xl font-bold mt-1">{stats.tokens}/12</p><p className="text-[10px] text-muted-foreground mt-2">Persistent volume</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Online</p><p className="text-2xl font-bold mt-1">{stats.online}/12</p><p className="text-[10px] text-muted-foreground mt-2">Activity ≤ 10 min</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Overrides</p><p className="text-2xl font-bold mt-1">{stats.override}</p><p className="text-[10px] text-muted-foreground mt-2">{stats.pattern} على النمط المشترك</p></CardContent></Card>
        </div>

        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>هوية الإرسال غير قابلة للتغيير</AlertTitle>
          <AlertDescription>كل Bearer Token يحدد Agent واحدًا وصندوق بريد واحدًا. حتى عند استخدام قالب تابع لنظام آخر يظل From وReply-To مساويين لصندوق الوكيل المصادق.</AlertDescription>
        </Alert>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">فلترة الصناديق</CardTitle><CardDescription>ابحث في الهوية أو البريد أو Foundry ID، ثم افتح الصندوق لفحص كل تفاصيله واختبار SMTP.</CardDescription></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="agent-finance..." className="pr-9" /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل حالات الاتصال</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="degraded">Degraded</SelectItem><SelectItem value="offline">Offline</SelectItem></SelectContent></Select>
            <Select value={passwordFilter} onValueChange={setPasswordFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل مصادر كلمات المرور</SelectItem><SelectItem value="pattern">Pattern</SelectItem><SelectItem value="override">Override</SelectItem><SelectItem value="missing">Missing</SelectItem></SelectContent></Select>
          </CardContent>
        </Card>

        <Card className="shadow-card overflow-hidden">
          <CardHeader><CardTitle className="text-base">Mailbox Registry</CardTitle><CardDescription>المصدر الفعلي: `public.mail_agents` + حالة الاتصال من `mail_agent_connections`.</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Mailbox</TableHead><TableHead>Foundry ID</TableHead><TableHead>SMTP</TableHead><TableHead>Password</TableHead><TableHead>Token</TableHead><TableHead>Connection</TableHead><TableHead>Sent</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {agentsQuery.isLoading && <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground">جاري تحميل سجلات الوكلاء...</TableCell></TableRow>}
                {filtered.map((agent) => <TableRow key={agent.id}>
                  <TableCell><div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center"><Mail className="h-4 w-4 text-primary" /></div><div><p className="font-medium">{agent.id}</p><p className="text-[10px] text-muted-foreground">{agent.enabled ? "enabled" : "disabled"}</p></div></div></TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{agent.mailbox}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{agent.foundryId}</TableCell>
                  <TableCell><Badge variant={agent.smtpConfigured ? "default" : "destructive"}>{agent.smtpConfigured ? "Ready" : "Missing"}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{agent.smtpPasswordSource}</Badge></TableCell>
                  <TableCell><span className="font-mono text-xs" dir="ltr">{agent.tokenHint ?? "—"}</span></TableCell>
                  <TableCell>{statusBadge(agent)}</TableCell>
                  <TableCell>{agent.sentCount}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => { setSelected(agent); setTokenResult(null); setTestTo(""); }}>إدارة</Button></TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><ServerCog className="h-4 w-4" /> SMTP Strategy</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Host</p><p className="font-mono text-sm mt-1" dir="ltr">{settingsQuery.data?.smtpHost ?? "smtp.migadu.com"}:{settingsQuery.data?.smtpPort ?? 587}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Password fallback</p><p className="font-mono text-sm mt-1" dir="ltr">{settingsQuery.data?.smtpPasswordPatternConfigured ? "Configured in server environment" : "Disabled"}</p><p className="text-[10px] text-muted-foreground mt-1">Per-agent override remains the preferred source.</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Per-agent override</p><p className="font-mono text-xs mt-1" dir="ltr">MAILBOX_PASSWORD_&lt;AGENT&gt;</p></div></CardContent></Card>
          <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Token Store</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-xs text-muted-foreground">Clear tokens never go to Supabase.</p><div className="rounded-lg bg-slate-950 text-slate-100 p-3 font-mono text-xs break-all" dir="ltr">{settingsQuery.data?.agentTokensPath ?? "/app/data/agent-tokens.json"}</div><div className="flex items-center justify-between"><span className="text-sm">Loaded</span><Badge>{settingsQuery.data?.tokenStoreLoaded ?? 0}/{settingsQuery.data?.tokenStoreExpected ?? 12}</Badge></div><p className="text-xs text-muted-foreground">Supabase يحتفظ بـSHA-256 وtoken hint فقط لأغراض المطابقة والتدقيق.</p></CardContent></Card>
          <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Connection Semantics</CardTitle></CardHeader><CardContent className="space-y-3">{[["Online", "آخر MCP activity خلال 10 دقائق"],["whoami", "يسجل last_whoami_at كاختبار هوية واتصال"],["Offline", "يُستنتج تلقائيًا عند تقادم heartbeat"]].map(([title,text]) => <div key={title} className="rounded-lg border p-3"><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground mt-1">{text}</p></div>)}</CardContent></Card>
        </div>

        <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
          <DialogContent className="max-w-3xl" dir="rtl">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><UserRoundCog className="h-5 w-5" /> إدارة {selected?.id}</DialogTitle><DialogDescription>تفاصيل الهوية، Token، واختبار إرسال حقيقي من صندوق الوكيل.</DialogDescription></DialogHeader>
            {selected && <Tabs defaultValue="identity" className="space-y-4">
              <TabsList><TabsTrigger value="identity">الهوية</TabsTrigger><TabsTrigger value="token">Token</TabsTrigger><TabsTrigger value="test">اختبار SMTP</TabsTrigger></TabsList>
              <TabsContent value="identity" className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">{[["Agent ID",selected.id],["Foundry ID",selected.foundryId],["Mailbox",selected.mailbox],["Token hint",selected.tokenHint ?? "—"],["Password source",selected.smtpPasswordSource],["Connection",selected.connection?.status ?? "offline"]].map(([label,value]) => <div key={label} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><div className="flex items-center justify-between gap-2 mt-1"><p className="text-sm font-mono truncate" dir="ltr">{value}</p><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void copyValue(String(value), label)}><Copy className="h-3.5 w-3.5" /></Button></div></div>)}</div>
                <Separator />
                <div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-lg bg-muted/40 p-3"><p className="text-lg font-bold">{selected.recommendedTemplateCount}</p><p className="text-[10px] text-muted-foreground">Recommended</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-lg font-bold">{selected.availableTemplateCount}</p><p className="text-[10px] text-muted-foreground">Available</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-lg font-bold">{selected.sentCount}</p><p className="text-[10px] text-muted-foreground">Sent</p></div></div>
              </TabsContent>
              <TabsContent value="token" className="space-y-4">
                <Alert><KeyRound className="h-4 w-4" /><AlertTitle>Rotate returns the clear token once</AlertTitle><AlertDescription>بعد التدوير يجب تحديث Secret الخاص باتصال MCP في Foundry. التوكن الجديد يُكتب إلى volume قبل مزامنة hash إلى Supabase.</AlertDescription></Alert>
                {tokenResult ? <div className="rounded-xl border p-4 space-y-3"><Label>New bearer token</Label><div className="flex gap-2"><Input readOnly type={showToken ? "text" : "password"} value={tokenResult.token} dir="ltr" className="font-mono text-xs" /><Button variant="outline" size="icon" onClick={() => setShowToken((value) => !value)}>{showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button><Button variant="outline" size="icon" onClick={() => void copyValue(tokenResult.token, "Token")}><Copy className="h-4 w-4" /></Button></div><p className="text-xs text-muted-foreground">Hint: {tokenResult.hint}</p></div> : <div className="rounded-xl border p-4"><p className="text-sm">Current hint: <span className="font-mono" dir="ltr">{selected.tokenHint ?? "not initialized"}</span></p></div>}
                <Button variant="destructive" disabled={!canRotateTokens || rotateMutation.isPending} onClick={() => rotateMutation.mutate(selected.id)} className="gap-2"><RotateCw className="h-4 w-4" />{rotateMutation.isPending ? "جاري التدوير..." : "Rotate Agent Token"}</Button>
              </TabsContent>
              <TabsContent value="test" className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Locked From / Reply-To</p><p className="font-mono text-sm mt-1" dir="ltr">{selected.mailbox}</p></div>
                <div><Label>To</Label><Input value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="recipient@example.com" dir="ltr" className="mt-1" /></div>
                <div><Label>Subject</Label><Input value={testSubject} onChange={(event) => setTestSubject(event.target.value)} className="mt-1" /></div>
                <div><Label>Text</Label><Textarea value={testBody} onChange={(event) => setTestBody(event.target.value)} className="mt-1 min-h-[100px]" /></div>
                <Button disabled={!canOperate || testMutation.isPending || !selected.smtpConfigured} onClick={() => testMutation.mutate()} className="gap-2"><Send className="h-4 w-4" />{testMutation.isPending ? "جاري الإرسال..." : "إرسال اختبار"}</Button>
              </TabsContent>
            </Tabs>}
            <DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>إغلاق</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
