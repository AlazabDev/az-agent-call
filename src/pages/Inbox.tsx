import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  Mail,
  RefreshCw,
  Search,
  Send,
  Server,
  XCircle,
} from "lucide-react";
import type { SendLogItem } from "@shared/api";
import { AppLayout } from "@/components/AppLayout";
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
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

function exportCsv(rows: SendLogItem[]) {
  const headers = ["created_at", "agent_id", "from", "recipient", "subject", "status", "source", "template_id", "message_id", "error"];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => [row.createdAt, row.agentId, row.senderMailbox, row.recipient, row.subject, row.status, row.source, row.templateId, row.messageId, row.errorMessage].map(escape).join(","))].join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `az-agent-mail-log-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diff / 60_000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return new Date(iso).toLocaleString("ar-EG");
}

export default function Inbox() {
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selected, setSelected] = useState<SendLogItem | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const logQuery = useQuery({
    queryKey: ["send-log", 500],
    queryFn: () => apiFetch<SendLogItem[]>("/api/send-log?limit=500"),
    refetchInterval: autoRefresh ? 20_000 : false,
  });
  const rows = logQuery.data ?? [];

  const agents = useMemo(() => [...new Set(rows.map((row) => row.agentId))].sort(), [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const term = search.trim().toLowerCase();
    const textMatch = !term || [row.subject, row.recipient, row.senderMailbox, row.messageId ?? "", row.templateId ?? ""].some((value) => value.toLowerCase().includes(term));
    const agentMatch = agentFilter === "all" || row.agentId === agentFilter;
    const statusMatch = statusFilter === "all" || row.status === statusFilter;
    const sourceMatch = sourceFilter === "all" || row.source === sourceFilter;
    return textMatch && agentMatch && statusMatch && sourceMatch;
  }), [rows, search, agentFilter, statusFilter, sourceFilter]);

  const stats = useMemo(() => {
    const last24 = rows.filter((row) => Date.now() - new Date(row.createdAt).getTime() <= 86_400_000);
    const success = last24.filter((row) => row.status === "success").length;
    const failed = last24.filter((row) => row.status === "failed").length;
    const template = last24.filter((row) => row.source === "template").length;
    const raw = last24.filter((row) => row.source === "raw").length;
    const rate = success + failed ? Math.round((success / (success + failed)) * 100) : 100;
    return { success, failed, template, raw, rate, total24: last24.length };
  }, [rows]);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`تم نسخ ${label}`);
  };

  return (
    <AppLayout
      title="سجل المكالمات والتفريغ الصوتي"
      subtitle="سجل التدقيق المركزي لكل المكالمات الهاتفية، السيناريوهات، والتوجيه الصوتي للوكلاء"
      actions={<div className="flex gap-2"><Button size="sm" variant={autoRefresh ? "secondary" : "outline"} onClick={() => setAutoRefresh((value) => !value)} className="gap-2"><Clock3 className="h-4 w-4" /> {autoRefresh ? "Live Call Audit" : "Paused"}</Button><Button size="sm" variant="outline" onClick={() => void logQuery.refetch()}><RefreshCw className={`h-4 w-4 ${logQuery.isFetching ? "animate-spin" : ""}`} /></Button></div>}
    >
      <div className="space-y-6" dir="rtl">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">آخر 24 ساعة</p><p className="text-2xl font-bold mt-1">{stats.total24}</p><p className="text-[10px] text-muted-foreground mt-2">إجمالي المكالمات</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold mt-1 text-emerald-600">{stats.success}</p><Progress value={stats.rate} className="mt-3" /></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Dropped / Missed</p><p className="text-2xl font-bold mt-1 text-destructive">{stats.failed}</p><p className="text-[10px] text-muted-foreground mt-2">Completion rate {stats.rate}%</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Script Voice Calls</p><p className="text-2xl font-bold mt-1">{stats.template}</p><p className="text-[10px] text-muted-foreground mt-2">Voice Template Catalog</p></CardContent></Card>
          <Card className="shadow-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Direct Calls</p><p className="text-2xl font-bold mt-1">{stats.raw}</p><p className="text-[10px] text-muted-foreground mt-2">make_call / direct</p></CardContent></Card>
        </div>

        <Card className="shadow-card">
          <CardHeader><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><CardTitle className="text-base">فلاتر تدقيق المكالمات</CardTitle><CardDescription>السجل يحتفظ بهوية المتصل، خط الاتصال، المستلم، سيناريو الصوت، النتيجة، ومعرّف المكالمة.</CardDescription></div><Button variant="outline" className="gap-2" onClick={() => exportCsv(filtered)} disabled={!filtered.length}><Download className="h-4 w-4" /> CSV ({filtered.length})</Button></div></CardHeader>
          <CardContent className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="subject / extension / call-id" className="pr-9" /></div>
            <Select value={agentFilter} onValueChange={setAgentFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الوكلاء</SelectItem>{agents.map((agent) => <SelectItem key={agent} value={agent}>{agent}</SelectItem>)}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل النتائج</SelectItem><SelectItem value="success">Completed</SelectItem><SelectItem value="failed">Failed / Dropped</SelectItem></SelectContent></Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل المصادر</SelectItem><SelectItem value="raw">make_call</SelectItem><SelectItem value="template">script_template</SelectItem><SelectItem value="admin-test">admin-test</SelectItem></SelectContent></Select>
          </CardContent>
        </Card>

        <Card className="shadow-card overflow-hidden">
          <CardHeader><div className="flex items-center justify-between"><div><CardTitle className="text-base">call_audit_log</CardTitle><CardDescription>{filtered.length} مكالمة ظاهرة من {rows.length} محمّلة.</CardDescription></div><Badge variant="outline" className="gap-1"><Filter className="h-3.5 w-3.5" /> Supabase</Badge></div></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>الوقت</TableHead><TableHead>الوكيل</TableHead><TableHead>الخط/Caller</TableHead><TableHead>المستلم/DID</TableHead><TableHead>موضوع/سيناريو المكالمة</TableHead><TableHead>المصدر</TableHead><TableHead>الحالة</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {logQuery.isLoading && <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">جاري تحميل سجل المكالمات...</TableCell></TableRow>}
                {!logQuery.isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">لا توجد مكالمات مطابقة.</TableCell></TableRow>}
                {filtered.map((row) => <TableRow key={row.id} className={row.status === "failed" ? "bg-destructive/[0.03]" : undefined}>
                  <TableCell className="text-xs whitespace-nowrap"><p>{relativeTime(row.createdAt)}</p><p className="text-[10px] text-muted-foreground" dir="ltr">{new Date(row.createdAt).toLocaleTimeString()}</p></TableCell>
                  <TableCell><Badge variant="outline">{row.agentId}</Badge></TableCell>
                  <TableCell className="font-mono text-[11px]" dir="ltr">{row.senderMailbox}</TableCell>
                  <TableCell className="font-mono text-[11px] max-w-[180px] truncate" dir="ltr" title={row.recipient}>{row.recipient}</TableCell>
                  <TableCell className="max-w-[280px]"><p className="truncate text-sm">{row.subject}</p>{row.templateId && <p className="truncate text-[10px] text-muted-foreground font-mono" dir="ltr">{row.templateId}</p>}</TableCell>
                  <TableCell><Badge variant="secondary">{row.source}</Badge></TableCell>
                  <TableCell>{row.status === "success" ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> completed</Badge> : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> dropped</Badge>}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => setSelected(row)}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Caller Audit</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground leading-6">تسجيل هوية الخط والـDID المستخدم في إجراء أو استلام المكالمة لضمان الدقة التشغيلية التامة.</CardContent></Card>
          <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Voice Script Trace</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground leading-6">المكالمات المستندة إلى سيناريو تسجل `template_id` لتسهيل متابعة أداء قوائم IVR وسيناريوهات التحدث.</CardContent></Card>
          <Card className="shadow-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Server className="h-4 w-4" /> Telephony & Audio Result</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground leading-6">تسجيل معرّف المكالمة (Call Session ID) والتشخيص الصوتي الفوري عبر بوابة Az Agent Call.</CardContent></Card>
        </div>

        <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader><DialogTitle className="flex items-center gap-2">{selected?.status === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-destructive" />} تفاصيل عملية الإرسال</DialogTitle><DialogDescription>سجل Audit من Supabase، وليس Log نصيًا محليًا.</DialogDescription></DialogHeader>
            {selected && <Tabs defaultValue="details" className="space-y-4"><TabsList><TabsTrigger value="details">التفاصيل</TabsTrigger><TabsTrigger value="raw">Raw record</TabsTrigger></TabsList><TabsContent value="details" className="space-y-3">{[
              ["Agent", selected.agentId], ["Sender", selected.senderMailbox], ["Recipient", selected.recipient], ["Subject", selected.subject], ["Source", selected.source], ["Template", selected.templateId ?? "—"], ["Message ID", selected.messageId ?? "—"], ["Created", selected.createdAt],
            ].map(([label, value]) => <div key={label} className="grid sm:grid-cols-[120px_1fr_auto] gap-2 items-center rounded-lg border p-3"><Label>{label}</Label><p className="text-xs font-mono break-all" dir="ltr">{value}</p>{value !== "—" && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void copy(String(value), label)}><Copy className="h-3.5 w-3.5" /></Button>}</div>)}{selected.errorMessage && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"><p className="text-xs font-medium text-destructive">Error</p><p className="mt-2 text-xs font-mono break-all" dir="ltr">{selected.errorMessage}</p></div>}</TabsContent><TabsContent value="raw"><pre className="bg-slate-950 text-slate-100 rounded-xl p-4 text-xs overflow-auto max-h-[430px]" dir="ltr">{JSON.stringify(selected, null, 2)}</pre></TabsContent></Tabs>}
            <Separator />
            <DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>إغلاق</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
