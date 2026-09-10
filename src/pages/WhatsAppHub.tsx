import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building,
  CheckCircle2,
  Clock,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  ShieldAlert,
  Smartphone,
  UserCheck,
  Users,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface WhatsAppNumberRecord {
  id: number;
  wabaId: string;
  phoneNumberId: string;
  phoneNumber: string;
  displayName: string;
  role: "agent" | "team" | "project";
  allocatedAgentId?: string | null;
  isActive: boolean;
}

interface WhatsAppMessageRecord {
  id: number;
  waba_id: string;
  phone_number_id: string;
  sender_number: string;
  recipient_number: string;
  direction: "inbound" | "outbound";
  message_type: string;
  body_text?: string;
  template_name?: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  agent_id?: string;
  created_at: string;
}

export default function WhatsAppHub() {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const numbersQuery = useQuery({
    queryKey: ["whatsapp-numbers"],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; data: WhatsAppNumberRecord[] }>("/api/whatsapp/numbers");
      return res.data || [];
    },
  });

  const logsQuery = useQuery({
    queryKey: ["whatsapp-logs"],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; data: WhatsAppMessageRecord[] }>("/api/whatsapp/logs");
      return res.data || [];
    },
    refetchInterval: 15_000,
  });

  const numbers = numbersQuery.data || [];
  const logs = logsQuery.data || [];

  const agentLines = numbers.filter((n) => n.role === "agent");
  const teamLines = numbers.filter((n) => n.role === "team");
  const projectLines = numbers.filter((n) => n.role === "project");

  const handleSend = async () => {
    if (!recipient.trim() || !message.trim()) {
      toast.error("يرجى إدخال رقم المستلم ونص الرسالة.");
      return;
    }

    setSending(true);
    try {
      await apiFetch("/api/whatsapp/send", {
        method: "POST",
        body: JSON.stringify({
          recipientPhone: recipient,
          text: message,
        }),
      });

      toast.success("تم إرسال رسالة الوتساب بنجاح!");
      setMessage("");
      setDialogOpen(false);
      void logsQuery.refetch();
    } catch (err: any) {
      toast.error(`فشل الإرسال: ${err.message || "حدث خطأ غير متوقع"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout
      title="نظام مركز إشعارات الوتساب — Multi-WABA Hub"
      subtitle="إدارة 9 أرقام وتساب موثقة عبر 7 WABAs مخصصة للوكلاء الذكائيين والفريق والمشاريع"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void logsQuery.refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> تحديث
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Send className="h-4 w-4" /> إرسال رسالة تجريبية
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إرسال إشعار وتساب مباشر</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>رقم المستلم (مع مفتاح الدولة)</Label>
                  <Input
                    placeholder="+201115723930"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    dir="ltr"
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>نص الرسالة</Label>
                  <Textarea
                    placeholder="اكتب نص إشعار الوتساب هنا..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                <Button onClick={handleSend} disabled={sending}>
                  {sending ? "جاري الإرسال..." : "إرسال الإشعار"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-6" dir="rtl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Portfolio WABAs</p>
              <p className="text-2xl font-bold mt-1 text-primary">7 WABAs</p>
              <p className="text-[10px] text-muted-foreground mt-2">Business Portfolio</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">إجمالي أرقام الوتساب</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">9 أرقام</p>
              <p className="text-[10px] text-muted-foreground mt-2">مصر + أمريكا</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">أرقام وكلاء الاتصال (Agents)</p>
              <p className="text-2xl font-bold mt-1">{agentLines.length} أرقام</p>
              <p className="text-[10px] text-muted-foreground mt-2">تكامل مباشر مع MCP</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">أرقام الفريق والمشاريع</p>
              <p className="text-2xl font-bold mt-1">{teamLines.length + projectLines.length} أرقام</p>
              <p className="text-[10px] text-muted-foreground mt-2">توجيه العمليات والمشروعات</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" /> دليل أرقام الوتساب والـ WABAs الموزعة
            </CardTitle>
            <CardDescription>خريطة توزيع خطوط الوتساب الـ 9 على وكلاء الذكاء الاصطناعي وفريق العمليات</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الخط/الهوية</TableHead>
                  <TableHead>رقم الوتساب</TableHead>
                  <TableHead>Phone Number ID</TableHead>
                  <TableHead>WABA ID</TableHead>
                  <TableHead>التخصص / الدور</TableHead>
                  <TableHead>الوكيل المخصص</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((n) => (
                  <TableRow key={n.phoneNumberId}>
                    <TableCell className="font-medium">{n.displayName}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-xs">{n.phoneNumber}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-[11px] text-muted-foreground">{n.phoneNumberId}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-[11px] text-muted-foreground">{n.wabaId}</TableCell>
                    <TableCell>
                      <Badge variant={n.role === "agent" ? "default" : n.role === "team" ? "secondary" : "outline"}>
                        {n.role === "agent" ? "وكيل ذكي (Agent)" : n.role === "team" ? "فريق العمليات" : "مشروع / تجريبي"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{n.allocatedAgentId || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="gap-1 bg-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> نشط
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-card overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" /> سجل إشعارات ورسائل الوتساب الحية
            </CardTitle>
            <CardDescription>الرسائل المباشرة والقوالب الصادرة والواردة عبر كافة الأرقام</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوقت</TableHead>
                  <TableHead>الاتجاه</TableHead>
                  <TableHead>رقم المرسل</TableHead>
                  <TableHead>رقم المستلم</TableHead>
                  <TableHead>محتوى الرسالة / القالب</TableHead>
                  <TableHead>الوكيل</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      جاري تحميل سجل الوتساب...
                    </TableCell>
                  </TableRow>
                )}
                {!logsQuery.isLoading && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      لا توجد رسائل وتساب مسجلة حتى الآن.
                    </TableCell>
                  </TableRow>
                )}
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono">
                      {new Date(log.created_at).toLocaleString("ar-EG")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.direction === "outbound" ? "default" : "secondary"}>
                        {log.direction === "outbound" ? "صادر" : "وارد"}
                      </Badge>
                    </TableCell>
                    <TableCell dir="ltr" className="font-mono text-xs">{log.sender_number}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-xs">{log.recipient_number}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-xs">
                      {log.body_text || log.template_name || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.agent_id || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === "failed" ? "destructive" : "outline"}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
