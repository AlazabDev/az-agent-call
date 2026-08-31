/**
 * VoiceSelector v2 — اختيار الصوت مع معاينة فورية
 */
import { ChevronDown, Volume2, Play } from "lucide-react";
import { useState } from "react";
import type { VoiceOption } from "@/types/chat";

interface VoiceSelectorProps {
  voices: VoiceOption[];
  selected: VoiceOption;
  onSelect: (v: VoiceOption) => void;
  onPreview?: (v: VoiceOption) => void;
}

export function VoiceSelector({ voices, selected, onSelect, onPreview }: VoiceSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="px-4 pt-3 relative z-10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors rounded-xl px-3 py-2 text-sm border border-border/50"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="اختيار صوت البوت"
      >
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium text-xs">{selected.label}</span>
          <span className="text-muted-foreground text-[10px]">{selected.desc}</span>
          <Volume2 className="w-3.5 h-3.5 text-brand" />
        </div>
      </button>

      {open && (
        <div
          className="absolute top-full right-4 left-4 mt-1 bg-popover border border-border rounded-xl overflow-hidden shadow-lg"
          role="listbox"
          aria-label="قائمة الأصوات"
        >
          {voices.map((v) => (
            <div
              key={v.id}
              className={`flex items-center justify-between px-3 py-2.5 hover:bg-muted/60 transition-colors cursor-pointer ${selected.id === v.id ? "bg-accent" : ""}`}
              role="option"
              aria-selected={selected.id === v.id}
              onClick={() => { onSelect(v); setOpen(false); }}
            >
              <div className="flex items-center gap-2">
                {onPreview && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPreview(v); }}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-brand/20 text-muted-foreground hover:text-brand transition-colors"
                    aria-label={`معاينة صوت ${v.label}`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                )}
                {selected.id === v.id && <span className="text-brand text-xs font-bold">✓</span>}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">{v.label}</div>
                <div className="text-[10px] text-muted-foreground">{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
