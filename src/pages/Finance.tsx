import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarDays, FileText, MailCheck, MailX, Search, Send, TrendingUp, Users } from "lucide-react";
import type { AgentListItem, SendLogItem } from "@shared/api";
import { AGENT_LABELS } from "@shared/agents";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";

function dayKey(iso: string) { return new Date(iso).toISOString().slice(0,10); }
export default function Finance() {
  const [agentFilter, setAgentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const logs = useQuery({ queryKey: ["send-log", "analytics"], queryFn: () => apiFetch<SendLogItem[]>("/api/send-log?limit=500"), refetchInterval: 30_000 });
  const agents = useQuery({ queryKey: ["agents"], queryFn: () => apiFetch<AgentListItem[]>("/api/agents") });
  const filtered = useMemo(() => (logs.data ?? []).filter((r) => (agentFilter === "all" || r.agentId === agentFilter) && `${r.recipient} ${r.subject} ${r.templateId ?? ""}`.toLowerCase().includes(search.toLowerCase())), [logs.data, agentFilter, search]);
  const stats = useMemo(() => { const success = filtered.filter((r) => r.status === "success").length; const failed = filtered.length-success; return { total: filtered.length, success, failed, rate: filtered.length ? Math.round(success/filtered.length*100) : 0, templates: filtered.filter((r) => r.source === "template").length, raw: filtered.filter((r) => r.source === "raw").length }; }, [filtered]);
  const byAgent = useMemo(() => (agents.data ?? []).map((a) => { const rows = filtered.filter((r) => r.agentId === a.id); const success = rows.filter((r) => r.status === "success").length; return { id: a.id, total: rows.length, success, failed: rows.length-success, rate: rows.length ? Math.round(success/rows.length*100) : 0, last: rows[0]?.createdAt ?? null }; }).sort((a,b) => b.total-a.total), [agents.data, filtered]);
  const byDay = useMemo(() => { const map = new Map<string,{day:string,total:number,success:number,failed:number}>(); for (const r of filtered) { const day=dayKey(r.createdAt); const x=map.get(day) ?? {day,total:0,success:0,failed:0}; x.total++; r.status === "success" ? x.success++ : x.failed++; map.set(day,x); } return [...map.values()].sort((a,b) => b.day.localeCompare(a.day)).slice(0,14); }, [filtered]);
  const recipients = useMemo(() => { const map = new Map<string,number>(); for (const r of filtered) map.set(r.recipient,(map.get(r.recipient)??0)+1); return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20); }, [filtered]);

  return <AppLayout title="تحليلات الإرسال" subtitle="تحليل تشغيلي مفصل لآخر 500 سجل في call_logs">
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3"><div className="relative min-w-[260px] flex-1 max-w-md"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pr-9" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="بحث في المستلم أو الموضوع أو Template ID..." /></div><Select value={agentFilter} onValueChange={setAgentFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الوكلاء</SelectItem>{agents.data?.map((a)=><SelectItem key={a.id} value={a.id}>{AGENT_LABELS[a.id]}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">{[
        { label: "Total", value: stats.total, icon: BarChart3 }, { label: "Success", value: stats.success, icon: MailCheck }, { label: "Failed", value: stats.failed, icon: MailX }, { label: "Success Rate", value: `${stats.rate}%`, icon: TrendingUp }, { label: "Template Sends", value: stats.templates, icon: FileText },
      ].map((x)=><Card key={x.label}><CardContent className="p-5 flex justify-between"><div><p className="text-xs text-muted-foreground">{x.label}</p><p className="text-3xl font-bold mt-2 text-[#030957]">{x.value}</p></div><x.icon className="h-5 w-5 text-[#030957]" /></CardContent></Card>)}</div>

      <Tabs defaultValue="agents"><TabsList><TabsTrigger value="agents">By Agent</TabsTrigger><TabsTrigger value="days">Daily</TabsTrigger><TabsTrigger value="sources">Sources</TabsTrigger><TabsTrigger value="recipients">Recipients</TabsTrigger></TabsList>
        <TabsContent value="agents"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Agent Delivery Performance</CardTitle><CardDescription>مقارنة الحجم ومعدل النجاح لكل Agent ضمن الفلتر الحالي.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Total</TableHead><TableHead>Success</TableHead><TableHead>Failed</TableHead><TableHead>Rate</TableHead><TableHead>Progress</TableHead><TableHead>Last Activity</TableHead></TableRow></TableHeader><TableBody>{byAgent.map((r)=><TableRow key={r.id}><TableCell>{AGENT_LABELS[r.id]}</TableCell><TableCell>{r.total}</TableCell><TableCell><Badge variant="outline">{r.success}</Badge></TableCell><TableCell><Badge variant={r.failed ? "destructive" : "outline"}>{r.failed}</Badge></TableCell><TableCell>{r.rate}%</TableCell><TableCell className="w-48"><Progress value={r.rate} /></TableCell><TableCell className="text-xs">{r.last ? new Date(r.last).toLocaleString("ar-EG") : "—"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
        <TabsContent value="days"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Daily Delivery</CardTitle><CardDescription>حتى 14 يومًا من البيانات الموجودة ضمن آخر 500 سجل.</CardDescription></CardHeader><CardContent className="space-y-3">{byDay.map((d)=><div key={d.day} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><strong dir="ltr">{d.day}</strong><div className="flex gap-2"><Badge variant="outline">Total {d.total}</Badge><Badge variant="outline">Success {d.success}</Badge><Badge variant={d.failed ? "destructive" : "outline"}>Failed {d.failed}</Badge></div></div><Progress className="mt-3" value={d.total ? d.success/d.total*100 : 0} /></div>)}{!byDay.length && <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات.</p>}</CardContent></Card></TabsContent>
        <TabsContent value="sources"><div className="grid md:grid-cols-3 gap-4">{[{name:"Template",value:stats.templates,desc:"send_template_email",icon:FileText},{name:"Raw",value:stats.raw,desc:"send_email",icon:Send},{name:"Admin Test",value:filtered.filter((r)=>r.source==="admin-test").length,desc:"Dashboard test-send",icon:Users}].map((x)=><Card key={x.name}><CardHeader><x.icon className="h-5 w-5 text-[#030957]" /><CardTitle className="text-base">{x.name}</CardTitle><CardDescription>{x.desc}</CardDescription></CardHeader><CardContent><p className="text-4xl font-bold">{x.value}</p><Progress className="mt-4" value={stats.total ? x.value/stats.total*100 : 0} /></CardContent></Card>)}</div></TabsContent>
        <TabsContent value="recipients"><Card><CardHeader><CardTitle className="text-base">Most Active Recipients</CardTitle><CardDescription>تجميع recipient strings كما سُجلت في Audit log.</CardDescription></CardHeader><CardContent className="space-y-2">{recipients.map(([recipient,count],i)=><div key={recipient} className="rounded-lg border p-3 flex items-center justify-between gap-3"><div className="min-w-0 flex items-center gap-3"><span className="text-xs text-muted-foreground w-6">#{i+1}</span><code className="text-xs truncate" dir="ltr">{recipient}</code></div><Badge variant="outline">{count}</Badge></div>)}{!recipients.length && <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات.</p>}</CardContent></Card></TabsContent>
      </Tabs>
      <Card><CardContent className="p-4 text-xs text-muted-foreground">هذه الصفحة تحليلات تشغيلية للبريد وليست محاسبة مالية. تم الاحتفاظ بموقع Finance من القالب وإعادة توظيفه بدل حذف بنية القالب.</CardContent></Card>
    </div>
  </AppLayout>;
}
