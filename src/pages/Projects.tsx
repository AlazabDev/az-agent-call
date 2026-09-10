import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Container, Copy, Database, Globe2, HardDrive, RefreshCw, Server, ShieldCheck, Terminal, TriangleAlert } from "lucide-react";
import type { DashboardData, GatewayInstance, SettingsData } from "@shared/api";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const fmt = (x: string | null | undefined) => x ? new Date(x).toLocaleString("ar-EG") : "—";
async function copy(text: string) { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); }

export default function Projects() {
  const qc = useQueryClient();
  const gateways = useQuery({ queryKey: ["gateways"], queryFn: () => apiFetch<GatewayInstance[]>("/api/gateways"), refetchInterval: 20_000 });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => apiFetch<SettingsData>("/api/settings") });
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => apiFetch<DashboardData>("/api/dashboard") });
  const active = (gateways.data ?? []).filter((g) => g.status === "ready").length;
  const readiness = useMemo(() => {
    const s = settings.data;
    if (!s) return 0;
    return Math.round(([s.templates === 144, s.tokenStoreLoaded === s.tokenStoreExpected, s.agents.every((a) => a.smtpConfigured), active > 0].filter(Boolean).length / 4) * 100);
  }, [settings.data, active]);
  const refresh = () => void Promise.all([qc.invalidateQueries({ queryKey: ["gateways"] }), qc.invalidateQueries({ queryKey: ["settings"] }), qc.invalidateQueries({ queryKey: ["dashboard"] })]);

  return <AppLayout title="بوابة التشغيل" subtitle="مركز نشر وتشغيل Gateway على Docker/Nginx وربطه بـalazab-db"
    actions={<Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4 ml-1" /> تحديث</Button>}>
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[{ label: "Active Gateways", value: active, icon: Container },{ label: "Templates", value: settings.data?.templates ?? "—", icon: Database },{ label: "Persistent Tokens", value: `${settings.data?.tokenStoreLoaded ?? 0}/${settings.data?.tokenStoreExpected ?? 12}`, icon: HardDrive },{ label: "Readiness", value: `${readiness}%`, icon: CheckCircle2 }].map((x) => <Card key={x.label}><CardContent className="p-5 flex justify-between"><div><p className="text-xs text-muted-foreground">{x.label}</p><p className="text-3xl font-bold mt-2 text-[#030957]">{x.value}</p></div><x.icon className="h-5 w-5 text-[#030957]" /></CardContent></Card>)}
      </div>

      <div className="grid xl:grid-cols-[0.85fr_1.15fr] gap-4">
        <Card><CardHeader><CardTitle className="text-base">Production Readiness</CardTitle><CardDescription>لا يعتبر النشر ناجحًا قبل `/readyz = 200`.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex justify-between"><span className="text-sm">Overall</span><strong>{readiness}%</strong></div><Progress value={readiness} />
          {[{ label: "Template catalog 144", ok: settings.data?.templates === 144 },{ label: "Token store 12/12", ok: settings.data?.tokenStoreLoaded === settings.data?.tokenStoreExpected && Boolean(settings.data?.tokenStoreExpected) },{ label: "SMTP 12/12", ok: settings.data?.agents.every((a) => a.smtpConfigured) },{ label: "Gateway ready", ok: active > 0 }].map((x) => <div key={x.label} className="flex items-center justify-between text-sm"><span>{x.label}</span><Badge variant={x.ok ? "default" : "outline"}>{x.ok ? "READY" : "PENDING"}</Badge></div>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe2 className="h-4 w-4" /> Public Endpoints</CardTitle><CardDescription>الواجهات المنشورة عبر Nginx.</CardDescription></CardHeader><CardContent className="space-y-3">{[
          ["Admin", settings.data?.adminEndpoint ?? "https://mcp.alazab.com/admin/"], ["MCP", settings.data?.mcpEndpoint ?? "https://mcp.alazab.com/mail"], ["Health", `${settings.data?.publicAppUrl ?? "https://mcp.alazab.com"}/healthz`], ["Readiness", `${settings.data?.publicAppUrl ?? "https://mcp.alazab.com"}/readyz`], ["Supabase Edge", settings.data?.edgeStatusFunction ?? "—"],
        ].map(([label,url]) => <div key={label} className="rounded-lg border p-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="font-mono text-xs truncate" dir="ltr">{url}</p></div><Button size="icon" variant="ghost" onClick={() => void copy(url)}><Copy className="h-4 w-4" /></Button></div>)}</CardContent></Card>
      </div>

      <Tabs defaultValue="instances">
        <TabsList><TabsTrigger value="instances">Instances</TabsTrigger><TabsTrigger value="topology">Topology</TabsTrigger><TabsTrigger value="docker">Docker</TabsTrigger><TabsTrigger value="nginx">Nginx</TabsTrigger><TabsTrigger value="runbook">Runbook</TabsTrigger></TabsList>
        <TabsContent value="instances"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Server className="h-4 w-4" /> Gateway Instances</CardTitle><CardDescription>حالة Runtime الفعلية من `call_gateway_instances`.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Instance</TableHead><TableHead>Host</TableHead><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead>SMTP</TableHead><TableHead>Templates</TableHead><TableHead>Started</TableHead><TableHead>Last Seen</TableHead></TableRow></TableHeader><TableBody>{gateways.data?.map((g) => <TableRow key={g.instanceId}><TableCell className="font-mono text-xs" dir="ltr">{g.instanceId}</TableCell><TableCell dir="ltr">{g.hostname}</TableCell><TableCell>{g.version}</TableCell><TableCell><Badge variant={g.status === "ready" ? "default" : "outline"}>{g.status}</Badge></TableCell><TableCell className="font-mono text-xs" dir="ltr">{g.smtpHost}:{g.smtpPort}</TableCell><TableCell>{g.templateCount}</TableCell><TableCell className="text-xs">{fmt(g.startedAt)}</TableCell><TableCell className="text-xs">{fmt(g.lastSeenAt)}</TableCell></TableRow>)}</TableBody></Table>{!gateways.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">لا توجد Instances مسجلة حتى الآن.</p>}</CardContent></Card></TabsContent>
        <TabsContent value="topology"><Card><CardHeader><CardTitle className="text-base">Production Topology</CardTitle></CardHeader><CardContent><pre className="rounded-lg bg-slate-950 text-slate-100 p-5 text-xs leading-6 overflow-auto" dir="ltr">{`Internet\n  │\n  ▼\nNginx / TLS : mcp.alazab.com\n  ├── /admin/ ── HTTP Basic ── React/Vite ── Supabase Auth + RBAC\n  ├── /api/*  ── Supabase JWT ── Admin API\n  ├── /mail   ── Agent Bearer Token ── MCP Gateway ── Migadu\n  ├── /healthz\n  └── /readyz\n\nNode Gateway\n  ├── alazab-db (service role, server only)\n  ├── /app/data/agent-tokens.json\n  ├── 144 Git templates\n  └── smtp.migadu.com:587`}</pre></CardContent></Card></TabsContent>
        <TabsContent value="docker"><div className="grid xl:grid-cols-2 gap-4"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Container className="h-4 w-4" /> Container Hardening</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{["Node 22 Alpine multi-stage", "read_only root filesystem", "tmpfs /tmp", "cap_drop: ALL", "no-new-privileges", "bind 127.0.0.1:3300", "persistent /app/data", "healthcheck enabled"].map((x) => <div key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {x}</div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><HardDrive className="h-4 w-4" /> Persistence</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div><p className="text-muted-foreground">Host</p><code dir="ltr">/var/lib/az-agent-call/data</code></div><Separator /><div><p className="text-muted-foreground">Container</p><code dir="ltr">/app/data</code></div><Separator /><div><p className="text-muted-foreground">Token file</p><code dir="ltr">/app/data/agent-tokens.json</code></div></CardContent></Card></div></TabsContent>
        <TabsContent value="nginx"><div className="grid md:grid-cols-3 gap-4"><Card><CardHeader><ShieldCheck className="h-5 w-5" /><CardTitle className="text-base">TLS</CardTitle></CardHeader><CardContent className="text-sm">TLS 1.2/1.3 مع HTTP/2 على `mcp.alazab.com`.</CardContent></Card><Card><CardHeader><ShieldCheck className="h-5 w-5" /><CardTitle className="text-base">Admin</CardTitle></CardHeader><CardContent className="text-sm">`/admin/` محمي بـHTTP Basic قبل وصول React.</CardContent></Card><Card><CardHeader><ShieldCheck className="h-5 w-5" /><CardTitle className="text-base">Gateway</CardTitle></CardHeader><CardContent className="text-sm">التطبيق لا يستمع مباشرة على Public interface.</CardContent></Card></div></TabsContent>
        <TabsContent value="runbook"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Terminal className="h-4 w-4" /> Production Runbook</CardTitle><CardDescription>مسار نشر واحد بدون migrations عشوائية على القاعدة المشتركة.</CardDescription></CardHeader><CardContent className="space-y-4"><ol className="list-decimal pr-5 space-y-3 text-sm"><li>ضع المشروع في <code>/var/www/apps/az-agent-call</code>.</li><li>املأ `SUPABASE_SERVICE_ROLE_KEY` وMigadu secrets في `.env.production` على السيرفر.</li><li>شغّل <code>deploy/install-production.sh</code>.</li><li>تحقق من `/healthz` ثم `/readyz`.</li><li>نفذ `whoami` لكل Agent من Foundry وتابع MCP Connections.</li></ol><div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3 text-sm"><TriangleAlert className="h-5 w-5 text-amber-600 shrink-0" /><p>لا تستخدم `supabase db reset` على `alazab-db`. هذه قاعدة مشتركة والمigrations الخاصة بـAgent Call Center مطبقة بالفعل.</p></div></CardContent></Card></TabsContent>
      </Tabs>

      <Card><CardContent className="p-4 text-xs text-muted-foreground">Dashboard reports active gateways: <strong>{dashboard.data?.activeGateways ?? 0}</strong> · MCP endpoint: <code dir="ltr">{dashboard.data?.mcpEndpoint ?? "—"}</code></CardContent></Card>
    </div>
  </AppLayout>;
}
