import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center" dir="rtl"><div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> جاري التحقق من جلسة Supabase والصلاحيات...</div></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isAdmin) return <div className="min-h-screen grid place-items-center p-6" dir="rtl"><Card className="max-w-lg"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><ShieldX className="h-5 w-5" /> لا توجد صلاحية لإدارة البريد</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-muted-foreground"><p>المصادقة نجحت في Supabase، لكن الحساب لا يحمل `platform_owner` أو `platform_admin` ولا تفويض `operator/viewer` في `call_admins`.</p><Button variant="outline" onClick={() => void signOut()}>تسجيل الخروج</Button></CardContent></Card></div>;
  return <Outlet />;
}
