/**
 * AzaBot — المكوّن الرئيسي
 * ─────────────────────────────────────────────────────────
 * بُنية نظيفة: كل منطق في Hooks، كل UI في مكوّنات منفصلة
 * يستخدم SiteContext لتخصيص تجربة كل موقع ديناميكياً
 * ─────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { MessageSquare, Mic, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import sloBotGif from "@/assets/slo-bot.gif";

import { useChat } from "@/hooks/useChat";
import { useTTS } from "@/hooks/useTTS";
import { useSite } from "@/context/useSite";
import { useFoundryMode } from "@/hooks/useFoundryMode";

import { ChatHeader } from "./chat/ChatHeader";
import { MessageBubble } from "./chat/MessageBubble";
import { TypingDots } from "./chat/TypingDots";
import { WelcomeScreen } from "./chat/WelcomeScreen";
import { ChatInput } from "./chat/ChatInput";
import { VoiceView } from "./chat/VoiceView";
import { VoiceSelector } from "./chat/VoiceSelector";

import type { Attachment, ChatTab } from "@/types/chat";

const LAUNCHER_PHRASES = [
  "أهلاً بك 👋",
  "أنا عزبوت",
  "جاهز أساعدك",
];

export default function AzaBot() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ChatTab>("text");

  // رسالة مؤقتة + ملفات مؤقتة قبل الإرسال
  const [inputText, setInputText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [launcherTextIndex, setLauncherTextIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAutoSpokenMessageId = useRef<string | null>(null);

  // إعدادات الموقع النشط
  const { site } = useSite();

  // وضع تشغيل البوت
  const modeState = useFoundryMode();

  // Hooks
  const { messages, streaming, send, clearMessages, downloadConversation } = useChat(site.id, modeState.mode);
  const tts = useTTS();

  // تدوير نص زر البوت المغلق ليتماشى مع حركة التحية
  useEffect(() => {
    if (open) return;

    const id = window.setInterval(() => {
      setLauncherTextIndex((prev) => (prev + 1) % LAUNCHER_PHRASES.length);
    }, 2200);

    return () => window.clearInterval(id);
  }, [open]);

  // Auto-scroll عند كل رسالة جديدة
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // TTS تلقائي لرد البوت في تبويب الصوت
  useEffect(() => {
    if (tab !== "voice") return;
    const lastBot = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastBot || streaming) return;
    if (lastAutoSpokenMessageId.current === lastBot.id) return;
    lastAutoSpokenMessageId.current = lastBot.id;
    tts.speak(lastBot.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, streaming, tab]);

  // ─── Handlers ───────────────────────────────────────────

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text && pendingFiles.length === 0) return;
    if (streaming) return;

    send(
      text,
      pendingAttachments.length > 0 ? pendingAttachments : undefined,
      pendingFiles.length > 0 ? pendingFiles : undefined,
    );
    setInputText("");
    setPendingAttachments([]);
    setPendingFiles([]);
  }, [inputText, pendingFiles, pendingAttachments, streaming, send]);

  const handlePickQuestion = useCallback(
    (q: string) => send(q),
    [send]
  );

  const handleVoiceSend = useCallback(
    (text: string) => send(text),
    [send]
  );

  const handleAddFiles = useCallback((files: File[]) => {
    setPendingFiles((p) => [...p, ...files]);
    setPendingAttachments((p) => [
      ...p,
      ...files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    ]);
  }, []);

  const handleRemoveFile = useCallback((idx: number) => {
    setPendingFiles((p) => p.filter((_, i) => i !== idx));
    setPendingAttachments((p) => p.filter((_, i) => i !== idx));
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    tts.stop();
  }, [tts]);

  const handleClear = useCallback(() => {
    clearMessages();
    setInputText("");
    setPendingAttachments([]);
    setPendingFiles([]);
    lastAutoSpokenMessageId.current = null;
    toast.success("تم بدء محادثة جديدة.");
  }, [clearMessages]);

  // ─── Floating Button ─────────────────────────────────────

  if (!open) {
    return (
      <div className="fixed bottom-2 left-4 z-50 flex flex-col items-center overflow-visible translate-y-4">
        <style>
          {`
            @keyframes azabot-float {
              0%, 100% { transform: translateY(0) scale(1.55); }
              50% { transform: translateY(-6px) scale(1.55); }
            }

            @keyframes azabot-bubble {
              0%, 100% { transform: translateY(0); opacity: 0.98; }
              50% { transform: translateY(-2px); opacity: 1; }
            }
          `}
        </style>

        <div
          className="relative mb-[-6px]"
          style={{ animation: "azabot-bubble 2.6s ease-in-out infinite" }}
          aria-hidden
        >
          <div className="min-h-[38px] rounded-2xl border border-slate-200 bg-white/95 px-4 py-2 text-sm font-bold text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <span
              key={launcherTextIndex}
              className="block whitespace-nowrap animate-in fade-in-0 slide-in-from-bottom-1 duration-500"
            >
              {LAUNCHER_PHRASES[launcherTextIndex]}
            </span>
          </div>

          <span
            className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white/95"
          />
        </div>

        <button
          onClick={() => setOpen(true)}
          className="group relative flex h-[190px] w-[150px] items-end justify-center overflow-visible rounded-[2rem] bg-transparent p-0 border-0 outline-none hover:scale-105 active:scale-95 transition-transform duration-300"
          aria-label={`فتح المساعد الذكي ${site.botName}`}
        >
          <span
            className="absolute bottom-8 left-1/2 h-14 w-14 -translate-x-1/2 rounded-full bg-[#f5bf23]/18 blur-2xl opacity-70 transition-all duration-300 group-hover:opacity-90 group-hover:scale-110"
            aria-hidden
          />

          <img
            src={sloBotGif}
            alt=""
            className="relative h-[170px] w-auto origin-bottom object-contain drop-shadow-[0_18px_28px_rgba(15,23,42,0.26)]"
            style={{ animation: "azabot-float 3.2s ease-in-out infinite" }}
            draggable={false}
            aria-hidden
          />
        </button>
      </div>
    );
  }

  // ─── Chat Window ─────────────────────────────────────────

  return (
    <div
      className="fixed bottom-6 left-6 z-50 w-[390px] max-w-[calc(100vw-1.5rem)] h-[600px] max-h-[calc(100svh-2rem)] bg-background rounded-2xl shadow-[var(--shadow-chat)] border border-border flex flex-col overflow-hidden animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      aria-label={`نافذة دردشة ${site.botName}`}
    >
      {/* Header */}
      <ChatHeader onClose={handleClose} onClear={handleClear} streaming={streaming} modeState={modeState} />

      {/* Tabs */}
      <div className="flex items-stretch border-b border-border bg-card shrink-0">
        <div className="flex flex-1" role="tablist">
          <TabButton
            active={tab === "text"}
            onClick={() => setTab("text")}
            icon={<MessageSquare className="w-4 h-4" />}
            label="محادثة نصية"
            id="tab-text"
          />
          <TabButton
            active={tab === "voice"}
            onClick={() => setTab("voice")}
            icon={<Mic className="w-4 h-4" />}
            label="محادثة صوتية"
            id="tab-voice"
          />
        </div>
        {tab === "text" && (
          <div className="flex items-center px-2 border-r border-border">
            <Button
              size="icon"
              variant="ghost"
              onClick={tts.toggle}
              className="w-9 h-9 rounded-full"
              aria-label={tts.enabled ? "إيقاف النطق" : "تشغيل النطق"}
              title={tts.enabled ? "إيقاف النطق" : "تشغيل النطق"}
            >
              {tts.enabled
                ? <Volume2 className="w-4 h-4 text-brand" />
                : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </div>
        )}
      </div>

      {/* Voice selector (تبويب الصوت فقط) */}
      {tab === "voice" && (
        <VoiceSelector
          voices={tts.voices}
          selected={tts.selectedVoice}
          onSelect={tts.setSelectedVoice}
        />
      )}

      {/* Body */}
      {tab === "voice" ? (
        <VoiceView
          messages={messages}
          streaming={streaming}
          onSendText={handleVoiceSend}
          onSpeakText={tts.speak}
        />
      ) : (
        <>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-border"
            role="log"
            aria-live="polite"
            aria-label="سجل المحادثة"
          >
            {messages.length === 0 ? (
              <WelcomeScreen onPickQuestion={handlePickQuestion} />
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    ttsEnabled={tts.enabled}
                    onSpeak={() => tts.speak(msg.content)}
                  />
                ))}
                {/* أنيميشن الكتابة: يظهر فقط إذا آخر رسالة بوت لا تزال فارغة */}
                {streaming && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
                  <TypingDots />
                )}
              </>
            )}
          </div>

          {/* Input */}
          <ChatInput
            value={inputText}
            onChange={setInputText}
            onSend={handleSend}
            onDownload={downloadConversation}
            streaming={streaming}
            pendingAttachments={pendingAttachments}
            pendingFiles={pendingFiles}
            onAddFiles={handleAddFiles}
            onRemoveFile={handleRemoveFile}
          />
        </>
      )}
    </div>
  );
}

// ─── TabButton ───────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
  id,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  id: string;
}) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={"flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors relative " +
        (active ? "text-brand" : "text-muted-foreground hover:text-foreground")}
    >
      {label}
      {icon}
      {active && (
        <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-brand rounded-full" aria-hidden />
      )}
    </button>
  );
}
