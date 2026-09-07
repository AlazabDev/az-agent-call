import { useQuery } from "@tanstack/react-query";
import {
	KeyRound,
	Search,
	Shield,
	ShieldCheck,
	UserCheck,
	UserCog,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type AdminUser = {
	id: string;
	email?: string;
	role: string;
	lastSignInAt?: string;
	createdAt: string;
};
const fmt = (x: string | undefined) =>
	x ? new Date(x).toLocaleString("ar-EG") : "—";

export default function Teams() {
	const { user, role, roleSource, canOperate, canRotateTokens } = useAuth();
	const [search, setSearch] = useState("");
	const admins = useQuery({
		queryKey: ["mail-admins"],
		queryFn: () => apiFetch<AdminUser[]>("/api/admins"),
		enabled: canRotateTokens,
	});
	const filtered = useMemo(
		() =>
			(admins.data ?? []).filter((u) =>
				`${u.email ?? ""} ${u.role} ${u.id}`
					.toLowerCase()
					.includes(search.toLowerCase()),
			),
		[admins.data, search],
	);
	const counts = useMemo(
		() => ({
			owner: filtered.filter((u) => u.role === "owner").length,
			admin: filtered.filter((u) => u.role === "admin").length,
			delegated: filtered.filter(
				(u) => u.role === "operator" || u.role === "viewer",
			).length,
		}),
		[filtered],
	);

	return (
		<AppLayout
			title="المشرفون"
			subtitle="إدارة وفهم صلاحيات Supabase Auth وAlazab central RBAC لتطبيق Agent Mail"
		>
			<div className="space-y-5">
				<div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
					{[
						{ label: "Your Role", value: role ?? "none", icon: ShieldCheck },
						{
							label: "Owners",
							value: canRotateTokens ? counts.owner : "—",
							icon: Shield,
						},
						{
							label: "Admins",
							value: canRotateTokens ? counts.admin : "—",
							icon: UserCog,
						},
						{
							label: "Delegated",
							value: canRotateTokens ? counts.delegated : "—",
							icon: UserCheck,
						},
					].map((x) => (
						<Card key={x.label}>
							<CardContent className="p-5 flex justify-between">
								<div>
									<p className="text-xs text-muted-foreground">{x.label}</p>
									<p className="text-2xl font-bold mt-2 text-[#030957]">
										{x.value}
									</p>
								</div>
								<x.icon className="h-5 w-5 text-[#030957]" />
							</CardContent>
						</Card>
					))}
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base flex items-center gap-2">
							<KeyRound className="h-4 w-4" /> Current Session
						</CardTitle>
						<CardDescription>
							هوية هذه اللوحة تأتي من Supabase Auth؛ HTTP Basic طبقة أمامية
							إضافية وليست هوية المستخدم.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid md:grid-cols-4 gap-4 text-sm">
						<div>
							<p className="text-xs text-muted-foreground">Email</p>
							<p className="font-mono mt-1" dir="ltr">
								{user?.email ?? "—"}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Role</p>
							<p className="mt-1">
								<Badge>{role ?? "none"}</Badge>
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Role Source</p>
							<p className="font-mono mt-1" dir="ltr">
								{roleSource ?? "—"}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Capabilities</p>
							<p className="mt-1">
								Operate: {canOperate ? "Yes" : "No"} · Rotate:{" "}
								{canRotateTokens ? "Yes" : "No"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Tabs defaultValue="users">
					<TabsList>
						<TabsTrigger value="users">Authorized Users</TabsTrigger>
						<TabsTrigger value="model">RBAC Model</TabsTrigger>
						<TabsTrigger value="permissions">Permissions</TabsTrigger>
						<TabsTrigger value="principles">Security Principles</TabsTrigger>
					</TabsList>
					<TabsContent value="users" className="space-y-4">
						{!canRotateTokens ? (
							<Card>
								<CardContent className="p-8 text-center">
									<Shield className="h-8 w-8 mx-auto text-muted-foreground" />
									<p className="mt-3 text-sm text-muted-foreground">
										عرض جميع الحسابات الإدارية يتطلب owner/admin.
									</p>
								</CardContent>
							</Card>
						) : (
							<>
								<div className="relative max-w-md">
									<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										placeholder="بحث بالبريد أو الدور أو User ID..."
										className="pr-9"
									/>
								</div>
								<Card>
									<CardContent className="p-0">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Email</TableHead>
													<TableHead>Role</TableHead>
													<TableHead>User ID</TableHead>
													<TableHead>Last Sign In</TableHead>
													<TableHead>Created</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filtered.map((u) => (
													<TableRow key={u.id}>
														<TableCell className="font-mono text-xs" dir="ltr">
															{u.email}
														</TableCell>
														<TableCell>
															<Badge
																variant={
																	u.role === "owner" ? "default" : "outline"
																}
															>
																{u.role}
															</Badge>
														</TableCell>
														<TableCell className="font-mono text-xs" dir="ltr">
															{u.id}
														</TableCell>
														<TableCell className="text-xs">
															{fmt(u.lastSignInAt)}
														</TableCell>
														<TableCell className="text-xs">
															{fmt(u.createdAt)}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</CardContent>
								</Card>
							</>
						)}
					</TabsContent>
					<TabsContent value="model">
						<div className="grid md:grid-cols-2 gap-4">
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Central Roles</CardTitle>
									<CardDescription>
										`adp_user_roles` في alazab-db.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4 text-sm">
									<div>
										<Badge>platform_owner</Badge>
										<p className="mt-2 text-muted-foreground">
											→ Mail role: owner
										</p>
									</div>
									<Separator />
									<div>
										<Badge variant="outline">platform_admin</Badge>
										<p className="mt-2 text-muted-foreground">
											→ Mail role: admin
										</p>
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle className="text-base">
										Delegated Mail Roles
									</CardTitle>
									<CardDescription>
										`mail_admins` لا يستبدل Supabase Auth.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4 text-sm">
									<div>
										<Badge variant="outline">operator</Badge>
										<p className="mt-2 text-muted-foreground">
											تشغيل وإرسال واختبارات بدون إدارة التوكنات.
										</p>
									</div>
									<Separator />
									<div>
										<Badge variant="outline">viewer</Badge>
										<p className="mt-2 text-muted-foreground">
											قراءة فقط للوحة والبيانات.
										</p>
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>
					<TabsContent value="permissions">
						<Card>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Capability</TableHead>
											<TableHead>owner</TableHead>
											<TableHead>admin</TableHead>
											<TableHead>operator</TableHead>
											<TableHead>viewer</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{[
											["View dashboard / logs", 1, 1, 1, 1],
											["Render templates", 1, 1, 1, 0],
											["Send test email", 1, 1, 1, 0],
											["Run SMTP diagnostics", 1, 1, 1, 0],
											["Rotate agent tokens", 1, 1, 0, 0],
											["List all administrators", 1, 1, 0, 0],
										].map((r) => (
											<TableRow key={String(r[0])}>
												<TableCell>{r[0]}</TableCell>
												{r.slice(1).map((v, i) => (
													<TableCell key={i}>
														{v ? (
															<UserCheck className="h-4 w-4 text-emerald-600" />
														) : (
															<span className="text-muted-foreground">—</span>
														)}
													</TableCell>
												))}
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="principles">
						<div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
							{[
								{
									title: "No local passwords",
									text: "كلمة مرور المستخدم تبقى في Supabase Auth فقط.",
								},
								{
									title: "Central owner/admin",
									text: "لا نكرر platform owner/admin في mail_admins.",
								},
								{
									title: "Server-side service role",
									text: "service role لا يدخل Vite أو Browser.",
								},
								{
									title: "Least privilege",
									text: "operator/viewer تفويض محدود لتطبيق البريد.",
								},
							].map((x) => (
								<Card key={x.title}>
									<CardHeader>
										<ShieldCheck className="h-5 w-5 text-[#030957]" />
										<CardTitle className="text-base">{x.title}</CardTitle>
									</CardHeader>
									<CardContent className="text-sm text-muted-foreground leading-6">
										{x.text}
									</CardContent>
								</Card>
							))}
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</AppLayout>
	);
}
