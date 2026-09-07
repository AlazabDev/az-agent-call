/**
 * AzaBot — ChatHeader
 * ─────────────────────────────────────────────────────────────
 * يعرض: شعار + اسم البوت + EngineStatusBar + BotModeSwitch + قائمة
 * يستقبل FoundryModeState من AzaBot (يشمل health + recheck).
 */

import { LayoutGrid, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import azabotLogo from "@/assets/azabot-logo.png";
import { useSite } from "@/context/useSite";
import type { FoundryModeState } from "@/hooks/useFoundryMode";
import { NAV_ITEMS } from "@/types/chat";
import { BotModeBadge, BotModeSwitch } from "./BotModeSwitch";
import { EngineStatusBar } from "./EngineStatusBar";

interface ChatHeaderProps {
	onClose: () => void;
	onClear: () => void;
	streaming: boolean;
	modeState: FoundryModeState;
}

export function ChatHeader({
	onClose,
	onClear,
	streaming,
	modeState,
}: ChatHeaderProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const navigate = useNavigate();
	const { site } = useSite();

	const handleNavItemClick = (href: string, external?: boolean) => {
		setMenuOpen(false);
		onClose();
		if (external || href.startsWith("http") || href.startsWith("tel:")) {
			window.open(
				href,
				href.startsWith("tel:") ? "_self" : "_blank",
				"noopener,noreferrer",
			);
			return;
		}
		navigate(href);
	};

	return (
		<header
			className="rounded-t-2xl shrink-0"
			style={{ background: site.gradientHeader }}
		>
			<div className="flex items-center justify-between px-3 py-3">
				{/* ── يسار: إغلاق + تجديد ──────────────────────────── */}
				<div className="flex items-center gap-1">
					<button
						onClick={onClose}
						className="p-1.5 rounded-full hover:bg-white/15 transition-colors text-white"
						aria-label="إغلاق"
					>
						<X className="w-4 h-4" aria-hidden />
					</button>
					<button
						onClick={onClear}
						disabled={streaming}
						className="p-1.5 rounded-full hover:bg-white/15 transition-colors disabled:opacity-40 text-white"
						aria-label="محادثة جديدة"
						title="محادثة جديدة"
					>
						<RefreshCw className="w-4 h-4" aria-hidden />
					</button>
				</div>

				{/* ── وسط: اسم البوت + حالة + سويتش ──────────────── */}
				<div className="text-right flex-1 px-2 min-w-0">
					<div className="font-bold text-sm flex items-center gap-1.5 justify-end text-white">
						<BotModeBadge mode={modeState.mode} />
						<span className="opacity-90 truncate">{site.botName}</span>
					</div>
					<div className="flex items-center gap-2 justify-end mt-1">
						<BotModeSwitch modeState={modeState} />
						<EngineStatusBar
							mode={modeState.mode}
							health={modeState.health}
							streaming={streaming}
							onRecheck={modeState.recheck}
						/>
					</div>
				</div>

				{/* ── يمين: شعار + قائمة ───────────────────────────── */}
				<div className="flex items-center gap-1 shrink-0">
					<div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center">
						<img
							src={azabotLogo}
							alt={site.botName}
							className="w-7 h-7 object-contain"
						/>
					</div>
					<div className="relative">
						<button
							onClick={() => setMenuOpen((v) => !v)}
							className="p-1.5 rounded-full hover:bg-white/15 transition-colors text-white"
							aria-label="قائمة الروابط"
							aria-expanded={menuOpen}
						>
							<LayoutGrid className="w-4 h-4" aria-hidden />
						</button>

						{menuOpen && (
							<div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-xl shadow-xl overflow-hidden w-64 animate-fade-in-up">
								{/* سويتش داخل القائمة */}
								{modeState.azureAvailable && (
									<div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
										<span className="text-xs text-muted-foreground">
											محرك البوت
										</span>
										<BotModeSwitch modeState={modeState} />
									</div>
								)}
								<div className="max-h-64 overflow-y-auto py-1" dir="rtl">
									{NAV_ITEMS.map((item) => (
										<button
											key={item.href}
											onClick={() =>
												handleNavItemClick(item.href, item.external)
											}
											className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-right"
										>
											<span aria-hidden>{item.icon}</span>
											<span className="truncate">{item.label}</span>
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
