import { Link } from "react-router-dom";
import { Home, MailQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return <div className="min-h-screen grid place-items-center p-6 bg-background" dir="rtl"><Card className="max-w-md w-full"><CardContent className="p-8 text-center"><div className="h-14 w-14 rounded-2xl bg-muted grid place-items-center mx-auto"><MailQuestion className="h-7 w-7 text-[#030957]" /></div><p className="text-5xl font-bold mt-5 text-[#030957]">404</p><h1 className="text-lg font-semibold mt-3">الصفحة غير موجودة</h1><p className="text-sm text-muted-foreground mt-2">المسار المطلوب ليس جزءًا من لوحة Az Agent Call Center.</p><Button asChild className="mt-5"><Link to="/"><Home className="h-4 w-4 ml-1" /> العودة للوحة التحكم</Link></Button></CardContent></Card></div>;
}
