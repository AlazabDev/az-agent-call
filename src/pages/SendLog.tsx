import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox as InboxIcon, Search } from "lucide-react";
import type { SendLogItem } from "@shared/api";
import { AGENT_IDS, AGENT_LABELS } from "@shared/agents";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";

export default function SendLog() {
  const logs = useQuery({ queryKey: ["send-log"], queryFn: () => apiFetch<SendLogItem[]>("/api/send-log?limit=500"), refetchInterval: 20_000 });
  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState("all");
  const [status, setStatus] = useState("all");
  const rows = useMemo(() => (logs.data ?? []).filter((row) => {
    const q = search.toLowerCase().trim();
    return (agent === "all" || row.agentId === agent) && (status === "all" || row.status === status) && (!q || `${row.recipient} ${row.subject} ${row.messageId ?? ""}`.toLowerCase().includes(q));
  }), [logs.data, search, agent, status]);
  return <AppLayout title="سجل الإرسال" subtitle="Audit مركزي لكل رسالة خرجت من Migadu عبر الوكلاء أو لوحة الإدارة">
    <div className="space-y-5"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><InboxIcon className="h-4 w-4" /> Mail Send Log</CardTitle><CardDescription>المرسل ثابت ومحفوظ مع كل عملية، حتى لو تغير إعداد الوكيل لاحقًا.</CardDescription></CardHeader><CardContent><div className="grid md:grid-cols-[1fr_180px_160px] gap-3"><div className="relative"><Search className="h-4 w-4 absolute right-3 top-3 text-muted-foreground" /><Input className="pr-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="المستلم، الموضوع، Message ID" /></div><Select value={agent} onValueChange={setAgent}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الوكلاء</SelectItem>{AGENT_IDS.map((id) => <SelectItem key={id} value={id}>{AGENT_LABELS[id]}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select></div></CardContent></Card><Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>الحالة</TableHead><TableHead>الوكيل</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>الموضوع</TableHead><TableHead>المصدر</TableHead><TableHead>الوقت</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><Badge variant={row.status === "success" ? "default" : "destructive"}>{row.status}</Badge></TableCell><TableCell>{AGENT_LABELS[row.agentId]}</TableCell><TableCell dir="ltr" className="font-mono text-[11px]">{row.senderMailbox}</TableCell><TableCell dir="ltr" className="text-xs max-w-[220px] truncate">{row.recipient}</TableCell><TableCell className="max-w-[300px] truncate">{row.subject}</TableCell><TableCell><Badge variant="outline">{row.source}</Badge></TableCell><TableCell dir="ltr" className="text-[11px]">{new Date(row.createdAt).toLocaleString()}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>
  </AppLayout>;
}
