/**
 * BotModeSwitch — زر تبديل بين Rasa وAzure AI Foundry
 * ─────────────────────────────────────────────────────────────
 * يعرض:
 *   • حالة online  → emerald pulse
 *   • حالة degraded → amber pulse + تلميح
 *   • حالة offline  → red indicator
 *   • transition animation عند التبديل
 *
 * يظهر فقط إذا كان Azure مُضبوطاً (azureAvailable=true).
 */

import { AlertTriangle, Bot, WifiOff, Zap } from "lucide-react";
import { useState } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FoundryModeState, HealthStatus } from "@/hooks/useFoundryMode";

interface BotModeSwitchProps {
	modeState: FoundryModeState;
	className?: string;
}

// ── مؤشر صغير لحالة الاتصال داخل السويتش ────────────────────
function HealthDot({ status }: { status: HealthStatus }) {
	if (status === "checking") return null;
	if (status === "online")
		return (
			<span
				className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"
				aria-hidden
			/>
		);
	if (status === "degraded")
		return (
			<span
				className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0"
				aria-hidden
			/>
		);
	// offline
	return (
		<span
			className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"
			aria-hidden
		/>
	);
}

export function BotModeSwitch({
	modeState,
	className = "",
}: BotModeSwitchProps) {
	const { mode, isAzure, azureAvailable, toggle, description, health } =
		modeState;
	const [showTooltip, setShowTooltip] = useState(false);

	if (!azureAvailable) return null;

	// ألوان وحالة الزر
	const isDegraded = health.status === "degraded";
	const isOffline = health.status === "offline";

	const btnClass = [
		"relative flex items-center gap-1.5 px-2 py-1 rounded-full border",
		"transition-all duration-300 select-none text-xs font-semibold",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
		isAzure && !isDegraded && !isOffline
			? "bg-[#0078d4] border-[#0078d4]/60 text-white shadow-md shadow-[#0078d4]/30"
			: isAzure && isDegraded
				? "bg-amber-500/90 border-amber-400/60 text-white shadow-md shadow-amber-500/20"
				: isAzure && isOffline
					? "bg-red-500/80 border-red-400/60 text-white"
					: "bg-muted/80 border-border text-muted-foreground hover:text-foreground hover:bg-muted",
		className,
	].join(" ");

	// أيقونة وضع التشغيل
	const ModeIcon = isAzure
		? isOffline
			? WifiOff
			: isDegraded
				? AlertTriangle
				: Zap
		: Bot;

	// نص tooltip
	const tooltipLines = {
		title: isAzure ? "🟦 Azure AI Foundry" : "🤖 Rasa Pro",
		desc: description,
		health:
			health.status === "online"
				? `✅ متصل${health.latencyMs ? ` — ${health.latencyMs}ms` : ""}`
				: health.status === "degraded"
					? `⚠️ بطيء — ${health.latencyMs}ms (فوق 3 ثانية)`
					: health.status === "offline"
						? `❌ غير متصل — ${health.errorHint ?? "تعذّر الوصول"}`
						: "🔄 جارٍ الفحص…",
		action: `اضغط للتبديل إلى ${isAzure ? "Rasa" : "Azure AI"}`,
	};

	return (
		<TooltipProvider delayDuration={200}>
			<Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
				<TooltipTrigger asChild>
					<button
						type="button"
						role="switch"
						aria-checked={isAzure}
						aria-label={`تبديل محرك البوت — حالياً: ${description}`}
						onClick={toggle}
						onMouseEnter={() => setShowTooltip(true)}
						onMouseLeave={() => setShowTooltip(false)}
						className={btnClass}
					>
						{/* أيقونة الوضع */}
						<ModeIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />

						{/* نص الوضع */}
						<span className="leading-none whitespace-nowrap transition-all duration-300">
							{isAzure ? "Azure AI" : "Rasa"}
						</span>

						{/* مؤشر الصحة */}
						<HealthDot status={health.status} />

						{/* Toggle pill */}
						<span
							className={[
								"w-5 h-3 rounded-full flex items-center px-0.5 transition-colors duration-300",
								isAzure ? "bg-white/30" : "bg-border",
							].join(" ")}
							aria-hidden
						>
							<span
								className={[
									"w-2 h-2 rounded-full transition-transform duration-300 ease-in-out",
									isAzure
										? "translate-x-2 bg-white"
										: "translate-x-0 bg-muted-foreground",
								].join(" ")}
							/>
						</span>
					</button>
				</TooltipTrigger>

				<TooltipContent
					side="bottom"
					align="center"
					className="max-w-[240px] text-xs text-center space-y-0.5"
				>
					<p className="font-semibold">{tooltipLines.title}</p>
					<p className="text-muted-foreground">{tooltipLines.desc}</p>
					<p className="text-muted-foreground/80">{tooltipLines.health}</p>
					<p className="mt-1 text-muted-foreground/60">{tooltipLines.action}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

// ── BotModeBadge — badge بسيط لعرض الوضع بدون تبديل ──────────
export function BotModeBadge({ mode }: { mode: "rasa" | "azure" }) {
	if (mode === "rasa") return null;
	return (
		<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0078d4]/15 text-[#0078d4] border border-[#0078d4]/30">
			<Zap className="w-2.5 h-2.5" aria-hidden />
			Azure AI
		</span>
	);
}
