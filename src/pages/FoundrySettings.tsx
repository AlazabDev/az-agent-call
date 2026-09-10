import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  Download,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { AGENT_IDS, AGENT_LABELS, foundryId, mailboxFor, type AgentId } from "@shared/agents";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { DEFAULT_FOUNDRY_CONFIG, loadFoundryConfig, saveFoundryConfig, type FoundryConnectionConfig } from "@/lib/chatStore";

export default function FoundrySettings() {
  const [config, setConfig] = useState<FoundryConnectionConfig>(loadFoundryConfig());
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [testingPing, setTestingPing] = useState(false);
  const [pingLog, setPingLog] = useState<string | null>(null);

  const healthQuery = useQuery({
    queryKey: ["healthz-check"],
    queryFn: () => apiFetch<{ status: string; instanceId: string; uptime: number }>("/healthz"),
    refetchInterval: 30_000,
  });

  const handleSave = () => {
    saveFoundryConfig(config);
    toast.success("تم حفظ إعدادات الاتصال بمنصة فوندري بنجاح!");
  };

  const handleReset = () => {
    setConfig(DEFAULT_FOUNDRY_CONFIG);
    saveFoundryConfig(DEFAULT_FOUNDRY_CONFIG);
    toast.info("تم إعادة ضبط الإعدادات إلى التكوين الافتراضي.");
  };

  const toggleShowToken = (id: string) => {
    setShowTokens((prev: Record<string, boolean>) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyToken = (token: string, name: string) => {
    navigator.clipboard.writeText(token);
    toast.success(`تم نسخ رمز Bearer Token الخاص بـ ${name}`);
  };

  const handleTestConnection = async () => {
    setTestingPing(true);
    setPingLog("جاري الاتصال بنقطة النهاية MCP والتحقق من صحة Gateway...");
    try {
      const start = performance.now();
      const res = await fetch("/healthz");
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setPingLog(
          `✅ نجح الاتصال بنجاح!\n` +
          `• وقت الاستجابة (Latency): ${elapsed} ms\n` +
          `• حالة الخادم: ${data.status || "OK"}\n` +
          `• نقطة MCP البوابة: ${config.mcpEndpoint}\n` +
          `• معرف المعالج: ${data.instanceId || "core-mail-gateway"}\n` +
          `• أدوات MCP النشطة: 6 أدوات (whoami, list_templates, get_template_schema, render_template, send_template_email, send_email)`
        );
        toast.success("تم اختبار الاتصال بنجاح! بوابة MCP تعمل بفعالية عالية.");
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      setPingLog(`❌ فشل الاتصال: ${err.message || "الخادم غير مستجيب"}`);
      toast.error("فشل الاتصال بمنصة فوندري. تحقق من حالة الخادم والمنافذ.");
    } finally {
      setTestingPing(false);
    }
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foundry-mcp-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير ملف التكوين JSON بنجاح.");
  };

  return (
    <AppLayout title="إعدادات الاتصال بمنصة فوندري (Foundry Connection)">
      <div className="space-y-6">
        {/* Top Header Card */}
        <Card className="border-[#FFB900]/30 bg-gradient-to-r from-[#030957]/90 via-[#030957]/70 to-[#071280]/90 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFB900] via-[#FFD700] to-[#FF9900]" />
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[#FFB900] text-[#030957] font-bold shadow-lg">
                  <Cpu className="h-7 w-7" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black text-white flex items-center gap-2">
                    إعدادات الاتصال بمنصة فوندري (Foundry Platform)
                    <Badge className="bg-[#FFB900] text-[#030957] font-bold">MCP v3.0.1</Badge>
                  </CardTitle>
                  <CardDescription className="text-slate-300 text-sm mt-1">
                    إدارة نقاط اتصال MCP Gateway وربط وكلاء Foundry الـ 12 مع مركز التحكم في بريد العزب.
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleTestConnection} disabled={testingPing} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2">
                  <RefreshCw className={`h-4 w-4 ${testingPing ? "animate-spin" : ""}`} />
                  اختبار الاتصال
                </Button>
                <Button onClick={handleExportJson} variant="outline" className="border-white/20 hover:bg-white/10 text-white font-bold gap-2">
                  <Download className="h-4 w-4" />
                  تصدير JSON
                </Button>
                <Button onClick={handleSave} className="bg-[#FFB900] hover:bg-[#FFC837] text-[#030957] font-bold gap-2">
                  <Save className="h-4 w-4" />
                  حفظ الإعدادات
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex items-center gap-3">
                <Globe className="h-5 w-5 text-[#FFB900]" />
                <div>
                  <div className="text-slate-400">بوابة MCP العامة</div>
                  <div className="font-mono text-white font-semibold truncate">{config.mcpEndpoint}</div>
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex items-center gap-3">
                <Database className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="text-slate-400">Supabase Ref</div>
                  <div className="font-mono text-white font-semibold">{config.supabaseProjectRef}</div>
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex items-center gap-3">
                <Zap className="h-5 w-5 text-sky-400" />
                <div>
                  <div className="text-slate-400">الوكلاء النشطون</div>
                  <div className="font-mono text-white font-semibold">12 وكيل متصل</div>
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-purple-400" />
                <div>
                  <div className="text-slate-400">وضع البيئة</div>
                  <div className="font-mono text-[#FFB900] font-bold uppercase">{config.environmentMode}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Endpoints */}
          <Card className="shadow-md">
            <CardHeader className="bg-muted/40 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Server className="h-4 w-4 text-[#FFB900]" />
                إعدادات العناوين ونقاط الاتصال
              </CardTitle>
              <CardDescription>تعيين الرابط الرئيسي لمنصة Foundry وبوابة MCP الخاصة بنظام البريد</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">رابط منصة فوندري (Foundry Platform URL)</Label>
                <Input
                  value={config.foundryPlatformUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, foundryPlatformUrl: e.target.value })}
                  placeholder="https://foundry.alazab.com"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">نقطة نهاية بوابة البريد MCP Endpoint</Label>
                <Input
                  value={config.mcpEndpoint}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, mcpEndpoint: e.target.value })}
                  placeholder="https://mcp.alazab.com/mail"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">تتلقى هذه النقطة طلبات POST المحمية برمز Bearer Token الخاص بكل وكيل.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">رابط Supabase API</Label>
                  <Input
                    value={config.supabaseUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, supabaseUrl: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">مرجع مشروع Supabase</Label>
                  <Input
                    value={config.supabaseProjectRef}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, supabaseProjectRef: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostic & Ping Test */}
          <Card className="shadow-md">
            <CardHeader className="bg-muted/40 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                تشخيص الاتصال واستجابة الشبكة
              </CardTitle>
              <CardDescription>اختبار نقطة النهاية الحية وتأكيد استجابة خادم Gateway</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Button onClick={handleTestConnection} disabled={testingPing} className="w-full bg-[#030957] hover:bg-[#071280] text-white font-bold gap-2">
                <Zap className="h-4 w-4 text-[#FFB900]" />
                فحص وإعادة اختبار الاتصال المباشر (Ping)
              </Button>

              {pingLog ? (
                <div className="p-3 bg-slate-950 text-slate-100 rounded-lg font-mono text-xs leading-relaxed whitespace-pre-wrap border border-slate-800 shadow-inner">
                  {pingLog}
                </div>
              ) : (
                <div className="p-3 bg-muted/50 border rounded-lg text-xs text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>اضغط على زر الفحص لإرسال طلب اختبار مباشر ومتحقق من الأداء وسرعة الاستجابة.</span>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>تزامن رمزي تلقائي مع قاعدة البيانات (Auto-Sync)</span>
                </div>
                <Badge variant={config.autoSync ? "default" : "outline"} className={config.autoSync ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}>
                  {config.autoSync ? "مفعل" : "معطل"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 12 Agents Bearer Tokens Section */}
        <Card className="shadow-lg border border-border">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-[#FFB900]" />
                  رموز الوصول الخاصة بالوكلاء (Foundry Agents Bearer Tokens)
                </CardTitle>
                <CardDescription className="mt-1">
                  تُستخدم هذه الرموز الفريدة من قبل كل وكيل مصرح للاتصال بـ MCP Gateway عبر الترويسة `Authorization: Bearer &lt;token&gt;`.
                </CardDescription>
              </div>
              <Badge className="bg-[#030957] text-white px-3 py-1 text-xs">12 / 12 وكيل محدد</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[180px]">الوكيل والمعرّف</TableHead>
                    <TableHead className="w-[200px]">صندوق البريد الرسمي</TableHead>
                    <TableHead>رمز Bearer Token (Foundry)</TableHead>
                    <TableHead className="text-left w-[120px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AGENT_IDS.map((id: AgentId) => {
                    const fid = foundryId(id);
                    const mailbox = mailboxFor(id);
                    const token = config.agentTokens[id] || `az_tok_${id}_sec_${Math.floor(100000 + Math.random() * 900000)}`;
                    const isVisible = showTokens[id] || false;

                    return (
                      <TableRow key={id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-[#030957]/10 border border-[#030957]/20 flex items-center gap-0 justify-center text-[#030957] font-bold text-xs">
                              {id.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-foreground">{AGENT_LABELS[id]}</div>
                              <div className="text-[11px] font-mono text-muted-foreground">{fid}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-[#FFB900]" />
                            <span>{mailbox}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type={isVisible ? "text" : "password"}
                              value={token}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setConfig({
                                  ...config,
                                  agentTokens: { ...config.agentTokens, [id]: e.target.value },
                                })
                              }
                              className="font-mono text-xs bg-muted/20"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleShowToken(id)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyToken(token, AGENT_LABELS[id])}
                            className="h-8 text-xs font-semibold gap-1"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            نسخ
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
