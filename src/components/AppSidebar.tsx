import { Activity, Bot, Building2, Cpu, FileText, GitBranch, HardHat, PhoneCall, PhoneIncoming, LayoutDashboard, MessageSquare, Radio, Server, Settings, Users, Webhook } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

const operations = [
  { title: "لوحة التحكم", url: "/", icon: LayoutDashboard },
  { title: "المُتصل والدردشة", url: "/chat", icon: MessageSquare },
  { title: "الوكلاء وخطوط الاتصال", url: "/agents", icon: Bot },
  { title: "قنوات الاتصال SIP/DID", url: "/accounts", icon: Building2 },
  { title: "سيناريوهات الصوت 144", url: "/templates", icon: FileText },
  { title: "سجل المكالمات والتفريغ", url: "/inbox", icon: PhoneIncoming },
  { title: "اتصالات MCP الهاتفية", url: "/webhooks", icon: Webhook },
];
const engineering = [
  { title: "إعدادات فوندري الصوتي", url: "/foundry", icon: Cpu },
  { title: "مسارات IVR والتوجيه", url: "/flows", icon: GitBranch },
  { title: "بوابة الاتصال Gateway", url: "/projects", icon: Server },
  { title: "التشخيص وصيانة الخطوط", url: "/maintenance", icon: Activity },
  { title: "مشرفو مركز الاتصال", url: "/teams", icon: HardHat },
  { title: "تحليلات أداء المكالمات", url: "/finance", icon: Radio },
  { title: "إعدادات النظام", url: "/settings", icon: Settings },
  { title: "دليل الاستخدام والـ API", url: "/clients", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const renderItems = (items: typeof operations) => items.map((item) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={location.pathname === item.url}>
        <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/70" activeClassName="bg-sidebar-accent text-white font-medium border-r-2 border-[#FFB900]">
          <item.icon className="h-4 w-4 ml-2" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  ));

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 flex-shrink-0 bg-[#FFB900] text-[#030957]"><PhoneCall className="h-5 w-5" /></div>
          {!collapsed && <div className="text-right"><h2 className="text-sm font-bold text-white">Az Agent Call</h2><p className="text-[11px] text-sidebar-foreground">Alazab Agent Contact Center</p></div>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs">التشغيل ومركز الاتصال</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{renderItems(operations)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs">الإدارة والهندسة</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{renderItems(engineering)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
