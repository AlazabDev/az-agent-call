import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Database, KeyRound, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type EdgeStatus = {
  ok: boolean;
  projectRef: string;
  auth: { userId: string; email?: string; role: string };
  counts: { agents: number; templates: number; sent24h: number; failed24h: number };
  checkedAt: string;
};

async function loadEdgeStatus(): Promise<EdgeStatus> {
  const { data, error } = await supabase.functions.invoke("agent-mail-status", { method: "GET" });
  if (error) throw error;
  return data as EdgeStatus;
}

export function SupabaseAuthCard({ compact = false }: { compact?: boolean }) {
  const { user, role, roleSource, refreshAccess } = useAuth();
  const status = useQuery({ queryKey: ["supabase-edge-status", user?.id], queryFn: loadEdgeStatus, enabled: Boolean(user), refetchInterval: 60_000 });
  const connected = Boolean(status.data?.ok && status.data.projectRef === "bxuhcbfdoaflsgbxiqei");

  return (
    <Card className="shadow-card">
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> مصادقة Supabase الفعلية</CardTitle>
            <CardDescription>جلسة الإدارة مرتبطة مباشرة بـ alazab-db وليست بطاقة ثابتة أو بيانات Mock.</CardDescription>
          </div>
          <Badge variant={connected ? "default" : "destructive"} className="gap-1">
            {connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {connected ? "Connected" : status.isLoading ? "Checking" : "Disconnected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">الحساب</p><p className="mt-1 font-medium truncate" dir="ltr">{user?.email ?? "—"}</p></div>
          <div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">الدور</p><p className="mt-1 font-medium">{role ?? "—"} <span className="text-xs text-muted-foreground">· {roleSource ?? "—"}</span></p></div>
          <div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Project Ref</p><p className="mt-1 font-mono text-xs" dir="ltr">{status.data?.projectRef ?? "bxuhcbfdoaflsgbxiqei"}</p></div>
          <div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Edge Function</p><p className="mt-1 text-xs font-medium">agent-mail-status · JWT required</p></div>
        </div>
        {!compact && <>
          <Separator />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-muted/40 p-2"><p className="text-lg font-bold">{status.data?.counts.agents ?? "—"}</p><p className="text-[10px] text-muted-foreground">Agents</p></div>
            <div className="rounded-lg bg-muted/40 p-2"><p className="text-lg font-bold">{status.data?.counts.templates ?? "—"}</p><p className="text-[10px] text-muted-foreground">Templates</p></div>
            <div className="rounded-lg bg-muted/40 p-2"><p className="text-lg font-bold">{status.data?.counts.sent24h ?? "—"}</p><p className="text-[10px] text-muted-foreground">Sent / 24h</p></div>
            <div className="rounded-lg bg-muted/40 p-2"><p className="text-lg font-bold">{status.data?.counts.failed24h ?? "—"}</p><p className="text-[10px] text-muted-foreground">Failed / 24h</p></div>
          </div>
        </>}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Supabase Password Auth + Alazab RBAC</div>
          <Button variant="outline" size="sm" onClick={() => { void refreshAccess(); void status.refetch(); }}><RefreshCw className="h-3.5 w-3.5 ml-1" /> تحقق الآن</Button>
        </div>
        {status.error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2"><KeyRound className="h-4 w-4" />{status.error.message}</div>}
      </CardContent>
    </Card>
  );
}
