import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";

mermaid.initialize({
	startOnLoad: false,
	theme: "dark",
	securityLevel: "loose",
	themeVariables: {
		fontFamily: "Cairo, Inter, system-ui, sans-serif",
		primaryColor: "#3b82f6",
		primaryTextColor: "#ffffff",
		primaryBorderColor: "#60a5fa",
		lineColor: "#94a3b8",
		secondaryColor: "#10b981",
		tertiaryColor: "#8b5cf6",
	},
});

interface MermaidDiagramProps {
	chart: string;
	id?: string;
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [svgContent, setSvgContent] = useState<string>("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		const diagramId =
			id || `mermaid-${Math.random().toString(36).substring(2, 9)}`;

		async function renderDiagram() {
			if (!chart || !containerRef.current) return;
			try {
				setError(null);
				// Clean up markdown code fence backticks if present
				const cleanChart = chart
					.replace(/^```mermaid\s*/i, "")
					.replace(/^```\s*/, "")
					.replace(/```$/, "")
					.trim();
				const { svg } = await mermaid.render(diagramId, cleanChart);
				if (mounted) {
					setSvgContent(svg);
				}
			} catch (err: any) {
				console.warn("Mermaid render error:", err);
				if (mounted) {
					setError("عذراً، لم نتمكن من رسم المخطط البياني بشكل صحيح.");
				}
			}
		}

		renderDiagram();

		return () => {
			mounted = false;
		};
	}, [chart, id]);

	if (error) {
		return (
			<div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
				{error}
			</div>
		);
	}

	return (
		<div className="w-full my-3 p-4 rounded-xl bg-slate-900/90 border border-border/50 shadow-inner overflow-x-auto">
			<div
				ref={containerRef}
				className="mermaid-svg-container flex justify-center text-center"
				dangerouslySetInnerHTML={{ __html: svgContent }}
			/>
		</div>
	);
}
