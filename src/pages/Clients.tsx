import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Mail, Phone, RefreshCw, Search, UserCheck } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";

interface DaftraClientRecord {
  id: number;
  client_number?: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  email?: string;
  phone1?: string;
  balance?: number;
  unpaid?: number;
  status?: string;
}

export default function Clients() {
  const [search, setSearch] = useState("");

  const clientsQuery = useQuery({
    queryKey: ["daftra-clients", search],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; data: DaftraClientRecord[] }>(
        `/api/daftra/clients${search ? `?query=${encodeURIComponent(search)}` : ""}`
      );
      return res.data || [];
    },
  });

  const clients = clientsQuery.data || [];

  return (
    <AppLayout
      title="سجل العملاء — Daftra ERP"
      subtitle="إدارة وقراءة ملفات العملاء الحقيقية المربوطة بنظام دفتره المحاسبي"
      actions={
        <Button size="sm" variant="outline" onClick={() => void clientsQuery.refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> تحديث البيانات
        </Button>
      }
    >
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم، رقم الهاتف، أو البريد الإلكتروني..."
              className="pr-9"
            />
          </div>
          <Badge variant="outline" className="px-3 py-1 text-sm font-mono">
            {clients.length} عميل مسجل
          </Badge>
        </div>

        <Card className="shadow-card overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> قائمة العملاء المباشرة
            </CardTitle>
            <CardDescription>مصدر البيانات: Daftra ERP Live API Engine</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>معرف العميل</TableHead>
                  <TableHead>اسم العميل / المؤسسة</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>الرصيد المتبقي</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      جاري تحميل بيانات العملاء من دفتره...
                    </TableCell>
                  </TableRow>
                )}
                {clientsQuery.isError && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-amber-600">
                      لم يتم تهيئة الربط المباشر مع Daftra ERP (DAFTRA_NOT_CONFIGURED)
                    </TableCell>
                  </TableRow>
                )}
                {clients.map((c) => {
                  const fullName = [c.first_name, c.last_name, c.business_name].filter(Boolean).join(" ") || `عميل #${c.id}`;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">#{c.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="font-mono text-xs">
                        {c.phone1 ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {c.phone1}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell dir="ltr" className="font-mono text-xs">
                        {c.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {c.email}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs">
                        {c.unpaid || c.balance ? `${(c.unpaid || c.balance || 0).toLocaleString()} EGP` : "0 EGP"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === "active" ? "default" : "secondary"}>
                          {c.status || "نشط"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
