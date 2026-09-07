/**
 * EngineStatusBar — شريط حالة محرك البوت
 * ─────────────────────────────────────────────────────────────
 * يظهر داخل الـ ChatHeader ويعرض:
 *   • مؤشر الاتصال: checking / online / degraded / offline
 *   • اسم المحرك الحالي
 *   • الـ latency بالمللي ثانية (عند online/degraded)
 *   • زر recheck عند offline
 *
 * Props:
 *   mode       — "rasa" | "azure"
 *   health     — EngineHealth من useFoundryMode
 *   streaming  — هل البوت يكتب الآن؟
 *   onRecheck  — callback لإعادة الفحص يدوياً
 */

import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import type { EngineHealth, HealthStatus } from "@/hooks/useFoundryMode";
import type { BotMode } from "@/lib/config";

interface EngineStatusBarProps {
	mode: BotMode;
	health: EngineHealth;
	streaming: boolean;
	onRecheck?: () => void;
}

// ── ثوابت التصميم لكل حالة ───────────────────────────────────
const STATUS_CONFIG: Record<
	HealthStatus,
	{ dot: string; text: string; label: string }
> = {
	checking: {
		dot: "", // لا dot — يُستخدم spinner بدلاً
		text: "text-white/50",
		label: "فحص…",
	},
	online: {
		dot: "bg-emerald-400 animate-pulse",
		text: "text-white/60",
		label: "متصل",
	},
	degraded: {
		dot: "bg-amber-400 animate-pulse",
		text: "text-amber-300/80",
		label: "بطيء",
	},
	offline: {
		dot: "bg-red-400",
		text: "text-red-300 font-semibold",
		label: "غير متصل",
	},
};

export function EngineStatusBar({
	mode,
	health,
	streaming,
	onRecheck,
}: EngineStatusBarProps) {
	const engineLabel = mode === "azure" ? "Azure AI" : "Rasa";

	// أثناء البث — يكتب
	if (streaming) {
		return (
			<div
				className="flex items-center gap-1 text-xs text-white/70"
				aria-live="polite"
				aria-label="البوت يكتب الرد"
			>
				<span
					className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"
					aria-hidden
				/>
				<span>يكتب…</span>
			</div>
		);
	}

	const cfg = STATUS_CONFIG[health.status];

	return (
		<div
			className="flex items-center gap-1.5"
			aria-live="polite"
			aria-label={`${engineLabel} — ${cfg.label}${health.latencyMs ? ` ${health.latencyMs}ms` : ""}`}
		>
			{/* مؤشر الاتصال */}
			{health.status === "checking" ? (
				<Loader2
					className="w-3 h-3 animate-spin text-white/50 shrink-0"
					aria-hidden
				/>
			) : (
				<span
					className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}
					aria-hidden
				/>
			)}

			{/* النص */}
			<span className={`text-xs leading-none whitespace-nowrap ${cfg.text}`}>
				{health.status === "offline" ? (
					<>
						<WifiOff className="inline w-3 h-3 mr-0.5 -mt-px" aria-hidden />
						{cfg.label}
					</>
				) : (
					<>
						{cfg.label}
						{health.latencyMs !== undefined && health.status !== "checking" && (
							<span className="opacity-50 mr-0.5 text-[10px]">
								{health.latencyMs}ms
							</span>
						)}
					</>
				)}
			</span>

			{/* زر recheck عند offline */}
			{health.status === "offline" && onRecheck && (
				<button
					type="button"
					onClick={onRecheck}
					className="p-0.5 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white/80"
					aria-label="إعادة محاولة الاتصال"
					title="إعادة الفحص"
				>
					<RefreshCw className="w-3 h-3" aria-hidden />
				</button>
			)}
		</div>
	);
}
