import {
	Database,
	KeyRound,
	Loader2,
	LockKeyhole,
	PhoneCall,
	ShieldCheck,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
	const { user, loading, isAdmin, signIn } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!loading && user && isAdmin) return <Navigate to="/" replace />;

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		const result = await signIn(email, password);
		setSubmitting(false);
		if (result.error) return setError(result.error);
		const from = (location.state as { from?: string } | null)?.from ?? "/";
		navigate(from, { replace: true });
	};

	return (
		<div
			className="min-h-screen grid lg:grid-cols-[1.05fr_0.95fr] bg-background"
			dir="rtl"
		>
			<section className="hidden lg:flex relative overflow-hidden bg-[#030957] text-white p-12 flex-col justify-between">
				<div
					className="absolute inset-0 opacity-20"
					style={{
						backgroundImage:
							"radial-gradient(circle at 20% 20%, #FFB900 0, transparent 22%), radial-gradient(circle at 80% 70%, #ffffff 0, transparent 18%)",
					}}
				/>
				<div className="relative z-10">
					<div className="h-14 w-14 rounded-2xl bg-[#FFB900] text-[#030957] grid place-items-center">
						<PhoneCall className="h-7 w-7" />
					</div>
					<h1 className="text-4xl font-bold mt-8">Az Agent Call</h1>
					<p className="mt-4 max-w-lg text-white/70 leading-7">
						لوحة إدارية خاصة بمركز اتصال وتوجيه وكلاء الذكاء الاصطناعي في مجموعة
						العزب (Alazab Agent Contact Center). إدارة خطوط الاتصال، سيناريوهات
						الصوت، والتفريغ النصي الصوتي عبر Supabase.
					</p>
				</div>
				<div className="relative z-10 grid grid-cols-3 gap-3">
					{[
						["12", "Call Agents"],
						["144", "Voice Prompts"],
						["1", "alazab-db"],
					].map(([v, l]) => (
						<div
							key={l}
							className="rounded-xl border border-white/15 bg-white/5 p-4"
						>
							<p className="text-2xl font-bold text-[#FFB900]">{v}</p>
							<p className="text-xs text-white/60">{l}</p>
						</div>
					))}
				</div>
			</section>
			<section className="flex items-center justify-center p-4 sm:p-8">
				<Card className="w-full max-w-lg shadow-card border-0 sm:border">
					<div className="h-1.5 bg-[#FFB900] rounded-t-xl" />
					<CardHeader className="pb-4">
						<div className="flex items-center justify-between gap-3">
							<div>
								<CardTitle className="text-2xl text-[#030957]">
									دخول الإدارة
								</CardTitle>
								<CardDescription className="mt-2">
									مصادقة مبسطة باستخدام الحساب الإداري الموجود فعليًا في
									Supabase.
								</CardDescription>
							</div>
							<Badge variant="outline" className="gap-1">
								<Database className="h-3.5 w-3.5" /> alazab-db
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<Alert className="mb-5">
							<LockKeyhole className="h-4 w-4" />
							<AlertTitle>طبقتا حماية</AlertTitle>
							<AlertDescription>
								الوصول إلى `/admin` محمي أولًا بـHTTP Basic، ثم هذه الشاشة تتحقق
								من Supabase Auth وصلاحية Alazab RBAC.
							</AlertDescription>
						</Alert>
						<form className="space-y-4" onSubmit={submit}>
							<div className="space-y-2">
								<Label htmlFor="email">البريد الإلكتروني</Label>
								<Input
									id="email"
									dir="ltr"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="password">كلمة المرور</Label>
								<Input
									id="password"
									dir="ltr"
									type="password"
									autoComplete="current-password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
								/>
							</div>
							{error && (
								<Alert variant="destructive">
									<KeyRound className="h-4 w-4" />
									<AlertTitle>تعذر تسجيل الدخول</AlertTitle>
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}
							<Button className="w-full" disabled={submitting}>
								{submitting ? (
									<Loader2 className="h-4 w-4 animate-spin ml-2" />
								) : (
									<ShieldCheck className="h-4 w-4 ml-2" />
								)}{" "}
								تسجيل الدخول عبر Supabase
							</Button>
						</form>
						<Separator className="my-5" />
						<div
							className="text-[11px] text-muted-foreground leading-5"
							dir="ltr"
						>
							Project: bxuhcbfdoaflsgbxiqei · Auth: password · Access:
							platform_owner / platform_admin / delegated mail role
						</div>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
