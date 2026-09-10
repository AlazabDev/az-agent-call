import type { ReactNode } from "react";
import { Bell, LogOut, ShieldCheck } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const { user, role, roleSource, signOut } = useAuth();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b bg-card/95 backdrop-blur px-4 lg:px-6 gap-3 sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <div className="min-w-0">
                <h1 className="text-base lg:text-lg font-semibold text-foreground truncate">{title}</h1>
                {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {actions}
              <div className="hidden md:flex items-center gap-2 rounded-lg border px-3 py-1.5 bg-background">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <div className="text-right leading-tight">
                  <p className="text-[11px] font-medium">{user?.email ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{role ?? "no-role"} · {roleSource ?? "—"}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" title="الإشعارات"><Bell className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => void signOut()} title="تسجيل الخروج"><LogOut className="h-4 w-4" /></Button>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
