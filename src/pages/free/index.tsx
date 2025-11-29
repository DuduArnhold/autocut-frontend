// src/pages/free/index.tsx
import React, { useEffect, useRef, useState } from "react";
import { Upload, Play, Pause, Trash2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ensureFFmpeg, setFFmpegContext } from "@/lib/ffmpeg";
import LightLogo from "@/assets/LightLogo.svg";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";

const SAMPLE_FILE_URL = "/sample-demo.mp4";

const formatTime = (s: number): string => {
  if (isNaN(s) || !isFinite(s)) return "00:00";
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

export default function FreePage(): JSX.Element {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [srcUrl, setSrcUrl] = useState<string>("");
  const [kind, setKind] = useState<"video" | "audio" | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [current, setCurrent] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [startMark, setStartMark] = useState<number>(0);
  const [endMark, setEndMark] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [processing, setProcessing] = useState<boolean>(false);
  const [vertical, setVertical] = useState<boolean>(false);

  // Cleanup blob URL on unmount or change
  useEffect(() => {
    return () => {
      if (srcUrl.startsWith("blob:")) {
        URL.revokeObjectURL(srcUrl);
      }
    };
  }, [srcUrl]);

  // Media event listeners
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    const onTimeUpdate = () => setCurrent(el.currentTime);
    const onLoadedMetadata = () => {
      setDuration(el.duration || 0);
      setEndMark(el.duration || 0);
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [srcUrl]);

  const togglePlay = async () => {
    const el = mediaRef.current;
    if (!el) return;

    try {
      if (el.paused) {
        await el.play();
        setPlaying(true);
      } else {
        el.pause();
        setPlaying(false);
      }
    } catch (err) {
      console.warn("Play failed:", err);
      setPlaying(false);
    }
  };

  const handleFile = (f: File | null) => {
    if (!f) return;

    if (srcUrl.startsWith("blob:")) {
      URL.revokeObjectURL(srcUrl);
    }

    setFile(f);
    const url = URL.createObjectURL(f);
    setSrcUrl(url);
    setKind(f.type.startsWith("audio") ? "audio" : "video");

    // Reset states
    setStartMark(0);
    setEndMark(0);
    setDuration(0);
    setCurrent(0);

    toast.success(`Arquivo carregado: ${f.name}`);
    track("file_selected", {
      type: f.type,
      size: f.size,
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) handleFile(f);
  };

  const seekTo = (t: number) => {
    if (!mediaRef.current) return;
    mediaRef.current.currentTime = t;
    setCurrent(t);
  };

  const setStartToCurrent = () => {
    setStartMark(Math.min(current, endMark));
    track("marker_set", { start: Math.min(current, endMark), end: endMark });
  };
  const setEndToCurrent = () => {
    setEndMark(Math.max(current, startMark));
    track("marker_set", { start: startMark, end: Math.max(current, startMark) });
  };

  const handleVerticalToggle = (enabled: boolean) => {
    setVertical(enabled);
    track("vertical_mode_toggled", {
      enabled,
      file_type: kind,
      duration_sec: duration,
    });

    if (enabled) {
      track("vertical_preview_enabled", {
        verticalMode: true,
        file_type: kind,
      });
    } else {
      track("vertical_preview_disabled", {
        verticalMode: false,
        file_type: kind,
      });
    }
  };

  /**
   * exportClip - CORRIGIDO
   * - Resolve bug do SharedArrayBuffer
   * - Error handling melhorado
   * - Progress tracking mais preciso
   */
  const exportClip = async () => {
    if (!srcUrl) return toast.error("Nenhum arquivo carregado.");
    if (endMark <= startMark) return toast.error("Fim deve ser maior que o início.");
    if (duration <= 0) return toast.error("Duração inválida.");

    setProcessing(true);
    setProgress(0);

    // Set context for worker errors
    setFFmpegContext({ kind: kind || "unknown", vertical });

    track("export_started", {
      start_ms: startMark * 1000,
      end_ms: endMark * 1000,
      vertical: vertical,
      file_type: kind,
    });

    const loadToast = toast.loading("Inicializando FFmpeg...");

    try {
      const ffmpeg = await ensureFFmpeg((pct: number) => {
        const safe = Math.min(100, Math.max(0, pct));
        setProgress(safe);
      });

      toast.dismiss(loadToast);

      const inputName = file ? file.name : "demo_input.mp4";
      const ext = kind === "audio" ? "mp3" : "mp4";
      const outName = `autocut_clip_${Date.now()}.${ext}`;

      // Ler input
      const arrayBuffer = file
        ? await file.arrayBuffer()
        : await (await fetch(srcUrl)).arrayBuffer();

      ffmpeg.FS("writeFile", inputName, new Uint8Array(arrayBuffer));

      const durationSec = Math.max(0.001, endMark - startMark);

      // Argumentos OTIMIZADOS
      const args: string[] = [
        "-i", inputName,
        "-ss", String(startMark),
        "-t", String(durationSec),
        "-avoid_negative_ts", "make_zero",
      ];

      if (vertical && kind === "video") {
        // MODO LENTO: Recodificar para Vertical (9:16)
        // Lógica Inteligente: Mantém a altura original e corta a largura para 9:16
        // Se a altura for muito pequena, definimos um mínimo razoável, mas evitamos upscale gigante.

        // Recupera dimensões originais do elemento de vídeo
        const videoEl = mediaRef.current as HTMLVideoElement;
        const originalHeight = videoEl.videoHeight || 720;
        const originalWidth = videoEl.videoWidth || 1280;

        // Alvo: 9:16
        // Exemplo: Se altura é 1080, largura alvo deve ser 607.5 -> 608
        // Exemplo: Se altura é 360, largura alvo deve ser 202.5 -> 202

        // Vamos garantir que a altura seja par (requisito do x264)
        const targetH = originalHeight % 2 === 0 ? originalHeight : originalHeight - 1;

        // Calcula largura para 9:16 (targetH * 9 / 16)
        let targetW = Math.floor((targetH * 9) / 16);
        if (targetW % 2 !== 0) targetW -= 1; // Garante par

        // O filtro crop corta o centro. 
        // Sintaxe: crop=w:h:x:y
        // Mas primeiro precisamos garantir que o vídeo preenche a altura.
        // Se o vídeo original for wide (16:9), a altura já é o limitante.
        // Então apenas cortamos as laterais.

        args.push("-vf", `crop=${targetW}:${targetH}`);
        args.push("-c:v", "libx264");
        args.push("-preset", "ultrafast");
        args.push("-c:a", "aac");
      } else {
        // MODO RÁPIDO: Stream Copy (sem recodificar)
        args.push("-c", "copy");
      }

      args.push("-y", outName);

      await ffmpeg.run(...args);

      // Exporta
      const data = ffmpeg.FS("readFile", outName);
      const url = URL.createObjectURL(
        new Blob([data.buffer], { type: kind === "audio" ? "audio/mp3" : "video/mp4" })
      );

      const a = document.createElement("a");
      a.href = url;
      a.download = outName;
      a.click();

      track("export_success", {
        final_ms: durationSec * 1000,
        vertical: vertical,
        file_type: kind,
        browser: navigator.userAgent,
      });

    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao processar o arquivo.");
      track("export_failed", {
        error: err.message || String(err)
      });
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 400);
    }
  };

  const clearAll = () => {
    if (mediaRef.current) {
      try { mediaRef.current.pause(); } catch { }
    }

    if (srcUrl && srcUrl.startsWith("blob:")) URL.revokeObjectURL(srcUrl);

    setSrcUrl("");
    setFile(null);
    setKind(null);
    setDuration(0);
    setCurrent(0);
    setStartMark(0);
    setEndMark(0);
    setProgress(0);
    setProcessing(false);

    toast.info("Limpado.");
  };

  return (
    <div className="flex-grow flex flex-col bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-900 to-cyan-600 text-white py-16 md:py-20">
        <div className="absolute inset-0 bg-black/20" />
        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-black mb-3">
            Corte manual direto no navegador
          </h1>
          <p className="text-md md:text-lg opacity-90 max-w-3xl mx-auto">
            Carregue um vídeo/áudio, selecione início e fim e exporte o trecho localmente usando ffmpeg.wasm. <br className="hidden md:block" />
            <span className="text-yellow-300 font-bold">Sem limite de uso • 100% privado</span>
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-center">
            <Button
              size="lg"
              disabled={processing}
              className="bg-white text-blue-900 hover:bg-gray-100 font-bold text-lg px-6 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => !processing && fileInputRef.current?.click()}
            >
              <Upload className="w-5 h-5 mr-2" />
              Enviar arquivo
            </Button>

            <Button
              size="lg"
              variant="outline"
              disabled={processing}
              className="border-white text-white hover:bg-white/20 font-bold text-lg px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                if (processing) return;
                if (srcUrl.startsWith("blob:")) URL.revokeObjectURL(srcUrl);
                setSrcUrl(SAMPLE_FILE_URL);
                setKind("video");
                setFile(null);
                setStartMark(0);
                setEndMark(0);
                setDuration(0);
                setCurrent(0);
                toast.success("Demo carregada!");
              }}
            >
              Carregar DEMO
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*,audio/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              disabled={processing}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="flex-grow flex flex-col items-center max-w-5xl mx-auto px-4 md:px-6 pt-16 pb-16 md:pt-24 md:pb-24">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="w-full bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-purple-100 overflow-hidden"
        >
          <div className="p-6 md:p-8">
            {srcUrl ? (
              <div className="space-y-6">
                {/* Video / Audio Player */}
                <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl">
                  {kind === "video" ? (
                    <video
                      ref={mediaRef as React.RefObject<HTMLVideoElement>}
                      src={srcUrl}
                      className={`w-full aspect-video object-contain ${processing ? "pointer-events-none opacity-60" : ""}`}
                      controls={false}
                    />
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600 to-indigo-700 flex items-center justify-center">
                        <div className="text-white text-center pointer-events-none">
                          <div className="text-6xl mb-4">♪</div>
                          <p className="text-xl font-medium">Áudio carregado</p>
                        </div>
                      </div>
                      <audio
                        ref={mediaRef as React.RefObject<HTMLAudioElement>}
                        src={srcUrl}
                        preload="metadata"
                        controls={false}
                        className={`w-full h-48 md:h-64 relative z-10 ${processing ? "pointer-events-none opacity-0" : "opacity-0"}`}
                        aria-label="Player de áudio"
                      />
                    </div>
                  )}
                </div>

                {/* Play Controls + Timeline */}
                <div className="bg-slate-900/90 rounded-2xl p-4 md:p-6 text-white">
                  <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 mb-2">
                    <Button
                      size="lg"
                      variant="ghost"
                      className="text-white hover:bg-white/10"
                      onClick={togglePlay}
                      disabled={processing}
                    >
                      {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </Button>

                    <div className="flex-1 flex flex-col md:flex-row items-center gap-3 md:gap-4 w-full">
                      <span className="font-mono text-sm md:text-lg w-16 text-right">
                        {formatTime(current)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(1, duration)}
                        value={current}
                        onChange={(e) => seekTo(Number(e.target.value))}
                        className="flex-1 h-3 bg-white/30 rounded-full appearance-none cursor-pointer slider-thumb disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: `linear-gradient(to right, #a78bfa ${(current / Math.max(1, duration)) * 100}%, #ffffff33 ${(current / Math.max(1, duration)) * 100}%)`,
                        }}
                        disabled={processing}
                      />
                      <span className="font-mono text-sm md:text-lg w-16">
                        {formatTime(duration)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Start / End Markers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 md:p-6 rounded-2xl text-white" style={{ background: "linear-gradient(90deg,#10b981,#14b8a6)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Início</p>
                        <p className="text-2xl md:text-3xl font-black">{formatTime(startMark)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={setStartToCurrent}
                        disabled={processing}
                        className="bg-white/10 hover:bg-white/20"
                      >
                        <Scissors className="w-5 h-5 mr-2" />
                        Setar
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 md:p-6 rounded-2xl text-white" style={{ background: "linear-gradient(90deg,#fb7185,#f43f5e)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Fim</p>
                        <p className="text-2xl md:text-3xl font-black">{formatTime(endMark)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={setEndToCurrent}
                        disabled={processing}
                        className="bg-white/10 hover:bg-white/20"
                      >
                        <Scissors className="w-5 h-5 mr-2" />
                        Setar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Final Actions */}
                <div className="flex flex-col gap-4 pt-4">

                  {/* Options */}
                  <div className="flex items-center gap-4 bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="vertical-mode"
                        checked={vertical}
                        onCheckedChange={handleVerticalToggle}
                        disabled={processing}
                      />
                      <Label htmlFor="vertical-mode" className="cursor-pointer text-slate-700 font-medium">
                        Converter para Vertical (TikTok/Reels)
                      </Label>
                    </div>
                    {vertical && (
                      <span className="text-xs text-amber-600 font-bold animate-pulse">
                        (Requer recodificação • Mais lento)
                      </span>
                    )}
                    {!vertical && (
                      <span className="text-xs text-green-600 font-bold">
                        (Instantâneo • Cópia direta)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 md:gap-6 items-center justify-between">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-lg px-8 py-4 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                      onClick={exportClip}
                      disabled={processing || !srcUrl || endMark <= startMark}
                    >
                      {processing ? `Processando... ${progress}%` : "Exportar Corte"}
                    </Button>

                    <div className="w-full md:w-auto flex-1 mx-4">
                      <Progress value={progress} className="h-3" />
                    </div>

                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={clearAll}
                      disabled={processing}
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      Limpar tudo
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Drag & Drop Area */
              <div
                className="w-full flex flex-col items-center justify-center text-center px-6 py-12 cursor-pointer select-none border-4 border-dashed border-gray-300 rounded-2xl min-h-[400px] hover:border-purple-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const f = e.dataTransfer.files?.[0] ?? null;
                  if (f) handleFile(f);
                }}
                role="button"
                aria-label="Arraste um arquivo ou clique para selecionar"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-10 h-10 md:w-12 md:h-12 text-purple-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">
                  Arraste um arquivo ou clique em "Enviar arquivo"
                </h3>
                <p className="text-slate-600 text-sm md:text-base">
                  Suporta MP4, MOV, WEBM, MP3, WAV, M4A e muito mais!
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={LightLogo} alt="AutoCut Logo" className="w-10 h-10 opacity-90" />
            <span className="text-xl font-bold text-white">AutoCut</span>
          </div>
          <div className="text-center text-sm text-white/70">
            AutoCut © 2025 — Processamento local • Nenhum dado enviado para servidores
          </div>
        </div>
      </footer>

      {/* Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 bg-black/100 backdrop-blur-sm z-[999] flex flex-col items-center justify-center text-white px-4">
          <div className="text-2xl md:text-3xl font-bold mb-4">
            Processando... {progress}%
          </div>
          <div className="w-72 md:w-96">
            <Progress value={progress} className="h-3" />
          </div>
          <p className="opacity-80 mt-3 text-sm">
            Não feche a página — o processo roda localmente no seu navegador.
          </p>
        </div>
      )}
    </div>
  );
}