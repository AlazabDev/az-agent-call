/**
 * AzaBot — VoiceView v2
 * محادثة صوتية احترافية:
 * - تسجيل بـ MediaRecorder + noise cancellation
 * - Waveform visualization حقيقي
 * - Auto-TTS بعد كل رد من البوت
 * - اختصار Space للتسجيل
 * - مؤشر مدة + إلغاء
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Volume2, Loader2, Keyboard, VolumeX } from "lucide-react";
import { speechToText, stopSpeechPlayback } from "@/lib/chat-service";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { toast } from "sonner";
import type { Message } from "@/types/chat";

interface VoiceViewProps {
  messages: Message[];
  streaming: boolean;
  onSendText: (text: string) => void;
  onSpeakText: (text: string) => Promise<void>;
  autoSpeak?: boolean;
}

export function VoiceView({
  messages,
  streaming,
  onSendText,
  onSpeakText,
  autoSpeak = true,
}: VoiceViewProps) {
  const [transcript, setTranscript]     = useState("");
  const [playingTTS, setPlayingTTS]     = useState(false);
  const [autoEnabled, setAutoEnabled]   = useState(autoSpeak);
  const lastBotIdRef                    = useRef<string | null>(null);

  const lastBot = messages.filter((m) => m.role === "assistant").pop();

  // Auto-TTS: شغّل الرد تلقائياً عند وصول رسالة جديدة من البوت
  // نستخدم ref لـ lastBot لتجنب deps غير ضرورية
  const lastBotRef = useRef(lastBot);
  lastBotRef.current = lastBot;

  useEffect(() => {
    const bot = lastBotRef.current;
    if (!autoEnabled || !bot || streaming || playingTTS) return;
    if (bot.id === lastBotIdRef.current) return;
    lastBotIdRef.current = bot.id;

    setPlayingTTS(true);
    onSpeakText(bot.content).finally(() => setPlayingTTS(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBot?.id, streaming, autoEnabled, onSpeakText]);

  const handleAudioReady = useCallback(
    async (blob: Blob) => {
      stopSpeechPlayback();
      const text = await speechToText(blob);
      if (text) {
        setTranscript(text);
        onSendText(text);
      } else {
        toast.warning("لم يُتعرف على كلام واضح — حاول مرة أخرى.");
      }
    },
    [onSendText]
  );

  const recorder = useAudioRecorder(handleAudioReady);

  // عرض خطأ الميكروفون
  useEffect(() => {
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error]);

  const handlePlayTTS = useCallback(async () => {
    if (!lastBot || playingTTS) return;
    setPlayingTTS(true);
    try {
      await onSpeakText(lastBot.content);
    } catch {
      toast.error("فشل تشغيل الصوت.");
    } finally {
      setPlayingTTS(false);
    }
  }, [lastBot, playingTTS, onSpeakText]);

  const handleStopTTS = useCallback(() => {
    stopSpeechPlayback();
    setPlayingTTS(false);
  }, []);

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const busy = recorder.state === "processing" || streaming;
  const isRecording = recorder.state === "recording";

  return (
    <div className="flex-1 flex flex-col items-center justify-between gap-4 p-4 select-none" dir="rtl">

      {/* ── قسم علوي: الحالة والـ transcript ── */}
      <div className="w-full flex flex-col items-center gap-3 pt-2">

        {/* دائرة الحالة */}
        <div className="relative">
          {isRecording && (
            <span className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
          )}
          <div className={
            "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 " +
            (busy          ? "bg-brand/10" :
             isRecording   ? "bg-destructive/15 ring-4 ring-destructive/30" :
                             "bg-brand/10")
          }>
            {busy ? (
              <Loader2 className="w-9 h-9 text-brand animate-spin" />
            ) : isRecording ? (
              <Mic className="w-9 h-9 text-destructive" />
            ) : (
              <Mic className="w-9 h-9 text-brand" />
            )}
          </div>
        </div>

        {/* نص الحالة */}
        <div className="text-center">
          <p className="font-semibold text-foreground text-base">
            {recorder.state === "processing" ? "جاري التعرف على الكلام…" :
             streaming                        ? "عزبوت يفكر…" :
             isRecording                      ? fmt(recorder.duration) :
             playingTTS                       ? "جاري التشغيل…" :
             "محادثة صوتية مع عزبوت"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isRecording ? "تحدث الآن — اضغط مرة أخرى للإرسال" :
             busy        ? "" :
             "اضغط زر المايك أو Space للبدء"}
          </p>
        </div>

        {/* ── Waveform ── */}
        <div className="w-full max-w-xs h-12 flex items-center justify-center gap-[2px]">
          {recorder.waveform.map((val, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(4, val * 44)}px`,
                background: isRecording
                  ? `hsl(var(--destructive) / ${0.4 + val * 0.6})`
                  : `hsl(var(--brand) / ${0.15 + val * 0.25})`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── قسم وسط: transcript + رد البوت ── */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        {transcript && !isRecording && recorder.state !== "processing" && (
          <div className="bg-muted/60 rounded-2xl px-4 py-3 text-sm text-right">
            <p className="text-[10px] text-muted-foreground mb-1">ما قلته:</p>
            <p className="text-foreground leading-relaxed">"{transcript}"</p>
          </div>
        )}

        {lastBot && !isRecording && !busy && (
          <div className="bg-brand/5 border border-brand/20 rounded-2xl px-4 py-3 text-sm text-right max-h-32 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={playingTTS ? handleStopTTS : handlePlayTTS}
                className="text-brand hover:text-brand/70 transition-colors"
                aria-label={playingTTS ? "إيقاف" : "تشغيل الرد"}
              >
                {playingTTS
                  ? <VolumeX className="w-3.5 h-3.5" />
                  : <Volume2 className="w-3.5 h-3.5" />
                }
              </button>
              <p className="text-[10px] text-brand">رد عزبوت:</p>
            </div>
            <p className="text-foreground leading-relaxed line-clamp-4">{lastBot.content}</p>
          </div>
        )}
      </div>

      {/* ── أزرار التحكم ── */}
      <div className="flex flex-col items-center gap-4 pb-2">
        <div className="flex items-center gap-5">
          {isRecording ? (
            <>
              {/* إلغاء */}
              <button
                onClick={recorder.cancelRecording}
                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                aria-label="إلغاء التسجيل"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {/* إيقاف وإرسال */}
              <button
                onClick={recorder.stopRecording}
                className="w-20 h-20 rounded-full bg-destructive text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
                aria-label="إيقاف وإرسال"
              >
                <Square className="w-7 h-7 fill-current" />
              </button>
            </>
          ) : (
            <>
              {/* زر TTS إيقاف/تشغيل إذا كان يعمل */}
              {playingTTS && (
                <button
                  onClick={handleStopTTS}
                  className="w-12 h-12 rounded-full bg-brand/15 text-brand flex items-center justify-center hover:bg-brand/25 transition-all"
                  aria-label="إيقاف الصوت"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              )}

              {/* زر التسجيل */}
              <button
                onClick={recorder.startRecording}
                disabled={busy}
                className={
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg " +
                  (busy
                    ? "bg-brand/30 text-brand/50 cursor-not-allowed"
                    : "bg-brand text-brand-foreground hover:scale-105 active:scale-95")
                }
                aria-label="بدء التسجيل"
              >
                <Mic className="w-8 h-8" />
              </button>

              {/* زر تشغيل TTS يدوي */}
              {lastBot && !playingTTS && !busy && (
                <button
                  onClick={handlePlayTTS}
                  className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:bg-brand/10 hover:text-brand transition-all"
                  aria-label="تشغيل الرد صوتياً"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Auto-speak toggle + Space shortcut hint */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <button
            onClick={() => { setAutoEnabled((v) => !v); handleStopTTS(); }}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <div className={
              "w-7 h-4 rounded-full transition-colors relative " +
              (autoEnabled ? "bg-brand" : "bg-muted-foreground/30")
            }>
              <span className={
                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm " +
                (autoEnabled ? "right-0.5" : "left-0.5")
              } />
            </div>
            <span>نطق تلقائي</span>
          </button>

          <div className="flex items-center gap-1 opacity-50">
            <Keyboard className="w-3 h-3" />
            <span>Space</span>
          </div>
        </div>
      </div>
    </div>
  );
}
