// src/pages/free/index.tsx
import React, { useEffect, useRef, useState } from "react";
import { Upload, Play, Pause, Trash2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ensureFFmpeg } from "@/lib/ffmpeg";
import LightLogo from "@/assets/LightLogo.svg";

const SAMPLE_FILE_URL = "/sample-demo.mp4";

const formatTime = (s: number) => {
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

  // Cleanup blob url on unmount
  useEffect(() => {
    return () => {
      if (srcUrl && srcUrl.startsWith("blob:")) URL.revokeObjectURL(srcUrl);
    };
  }, [srcUrl]);

  // media event handlers
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    const onTimeUpdate = () => setCurrent(el.currentTime);
    const onLoaded = () => {
      setDuration(el.duration || 0);
      setEndMark(el.duration || 0);
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoaded);

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoaded);
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
    if (srcUrl && srcUrl.startsWith("blob:")) URL.revokeObjectURL(srcUrl);

    setFile(f);
    const url = URL.createObjectURL(f);
    setSrcUrl(url);
    setKind(f.type.startsWith("audio") ? "audio" : "video");

    // reset markers/frame states
    setStartMark(0);
    setEndMark(0);
    setDuration(0);
    setCurrent(0);

    toast.success(`Arquivo carregado: ${f.name}`);
  };

  // drop handlers
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

  const setStartToCurrent = () => setStartMark(Math.min(current, endMark));
  const setEndToCurrent = () => setEndMark(Math.max(current, startMark));

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
    const loadToast = toast.loading("Inicializando FFmpeg...");

    try {
      // Carrega FFmpeg
      const ffmpeg = await ensureFFmpeg((pct: number) => {
        setProgress((prev) => Math.max(prev, pct));
      });

      toast.dismiss(loadToast);
      setProgress(10);

      const inputName = file ? file.name : "demo_input.mp4";
      const ext = kind === "audio" ? "mp3" : "mp4";
      const outName = `autocut_clip_${Date.now()}.${ext}`;

      // Prepara input buffer
      toast.loading("Preparando arquivo...");
      const arrayBuffer = file 
        ? await file.arrayBuffer() 
        : await (await fetch(srcUrl)).arrayBuffer();
      const inputData = new Uint8Array(arrayBuffer);

      // Escreve no FS do FFmpeg
      ffmpeg.FS("writeFile", inputName, inputData);
      setProgress(20);

      const durationSec = Math.max(0.001, endMark - startMark);

      // Monta argumentos FFmpeg
      const args: string[] = [
        "-i", inputName,
        "-ss", String(startMark),
        "-t", String(durationSec),
        "-avoid_negative_ts", "make_zero",
        "-c:a", "aac",
      ];

      if (kind === "video") {
        args.push("-c:v", "libx264");
      } else {
        args.push("-vn");
      }

      args.push("-y", outName);

      // Executa FFmpeg
      toast.loading("Processando vídeo...");
      await ffmpeg.run(...args);

      setProgress(90);

      // ✅ SOLUÇÃO DO SHAREDARRAYBUFFER
      // Lê o arquivo de saída
      const raw = ffmpeg.FS("readFile", outName);

      // Copia para ArrayBuffer normal (não-shared)
      const buffer = new ArrayBuffer(raw.length);
      const view = new Uint8Array(buffer);
      view.set(raw);

      // Cria Blob com o buffer copiado
      const mime = kind === "audio" ? "audio/mpeg" : "video/mp4";
      const blob = new Blob([buffer], { type: mime });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success("Corte exportado com sucesso!");

    } catch (err: any) {
      console.error("FFmpeg error:", err);
      toast.error(`Erro ao processar: ${err?.message ?? "Desconhecido"}`);
      setProgress(0);
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 900);
      toast.dismiss();
    }
  };

  const clearAll = () => {
    if (mediaRef.current) {
      try {
        mediaRef.current.pause();
      } catch {}
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
    // Adicionei a classe flex-grow para garantir que este container ocupe todo o espaço disponível
    <div className="flex-grow flex flex-col bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100"> 
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-900 to-cyan-600 text-white py-16 md:py-20">
        <div className="absolute inset-0 bg-black/20" />
        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-black mb-3">Corte manual direto no navegador</h1>
          <p className="text-md md:text-lg opacity-90 max-w-3xl mx-auto">
            Carregue um vídeo/áudio, selecione início e fim e exporte o trecho localmente usando ffmpeg.wasm.
            <br className="hidden md:block" />
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
                if (srcUrl && srcUrl.startsWith("blob:")) URL.revokeObjectURL(srcUrl);
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

      {/* ALTERAÇÃO CRÍTICA:
        1. Removido o '-mt-8' para não sobrepor o HERO.
        2. Adicionado padding vertical GRANDE (pt-16 pb-16 md:pt-24 md:pb-24)
           para criar a distância entre o Header/Hero e o Footer.
        3. Adicionado flex-grow para empurrar o footer para baixo.
      */}
      <section className="flex-grow flex flex-col items-center max-w-5xl mx-auto px-4 md:px-6 pt-16 pb-16 md:pt-24 md:pb-24">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="w-full bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-purple-100 overflow-hidden"
        >
          <div className="p-6 md:p-8">
            {srcUrl ? (
              <div className="space-y-6">
                {/* Vídeo ou Áudio */}
                <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl">
                  {kind === "video" ? (
                    <video
                      ref={mediaRef as React.RefObject<HTMLVideoElement>}
                      src={srcUrl}
                      className={`w-full aspect-video object-contain ${processing ? "pointer-events-none opacity-60" : ""}`}
                      controls={false}
                      onLoadedMetadata={() => {
                        if (mediaRef.current) {
                          setDuration(mediaRef.current.duration || 0);
                          setEndMark(mediaRef.current.duration || 0);
                        }
                      }}
                      onTimeUpdate={() => {
                        if (mediaRef.current) setCurrent(mediaRef.current.currentTime);
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-gradient-to-br from-fuchsia-600 to-indigo-700">
                      <div className="text-white text-center">
                        <div className="text-6xl mb-4">♪</div>
                        <p className="text-xl font-medium">Áudio carregado</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controles de Play + Timeline */}
                <div className="bg-slate-900/90 rounded-2xl p-4 md:p-6 text-white">
                  <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 mb-2">
                    <Button size="lg" variant="ghost" className="text-white hover:bg-white/10" onClick={togglePlay} disabled={processing}>
                      {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </Button>

                    <div className="flex-1 flex flex-col md:flex-row items-center gap-3 md:gap-4 w-full">
                      <span className="font-mono text-sm md:text-lg w-16 text-right">{formatTime(current)}</span>

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

                      <span className="font-mono text-sm md:text-lg w-16">{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>

                {/* Marcadores Início/Fim */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 md:p-6 rounded-2xl text-white" style={{ background: "linear-gradient(90deg,#10b981,#14b8a6)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Início</p>
                        <p className="text-2xl md:text-3xl font-black">{formatTime(startMark)}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={setStartToCurrent} disabled={processing} className="bg-white/10 hover:bg-white/20">
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
                      <Button size="sm" variant="secondary" onClick={setEndToCurrent} disabled={processing} className="bg-white/10 hover:bg-white/20">
                        <Scissors className="w-5 h-5 mr-2" />
                        Setar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Ações Finais */}
                <div className="flex flex-col md:flex-row gap-3 md:gap-6 items-center justify-between pt-4">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-lg px-8 py-4 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                    onClick={exportClip}
                    disabled={processing || !srcUrl || endMark <= startMark}
                  >
                    {processing ? `Processando... ${progress}%` : "Exportar Corte"}
                  </Button>

                  <div className="w-full md:w-auto">
                    <Progress value={progress} className="h-3" />
                  </div>

                  <Button size="lg" variant="destructive" onClick={clearAll} disabled={processing} className="disabled:opacity-50 disabled:cursor-not-allowed">
                    <Trash2 className="w-5 h-5 mr-2" />
                    Limpar tudo
                  </Button>
                </div>
              </div>
            ) : (
              /* Drag & Drop area */
              // Eu ajustei este contêiner para ter um padding implícito com 'min-h-[300px]' e padding ao redor.
              // Para ter certeza que ele está bem espaçado, o padding foi para o elemento pai (section acima).
              <div
                className="w-full flex flex-col items-center justify-center text-center px-6 py-12 cursor-pointer select-none border-4 border-dashed border-gray-300 rounded-2xl min-h-[400px] hover:border-purple-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
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

                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">Arraste um arquivo ou clique em "Enviar arquivo"</h3>
                <p className="text-slate-600 text-sm md:text-base">Suporta MP4, MOV, WEBM, MP3, WAV, M4A e muito mais!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="bg-black py-8">
        <div className="max-w-6xl mx-auto px-6">
          {/* Logo + Nome no Footer */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={LightLogo} alt="AutoCut Logo" className="w-10 h-10 opacity-90" />
            <span className="text-xl font-bold text-white">AutoCut</span>
          </div>
          
          <div className="text-center text-sm text-white/70">
            AutoCut © 2025 — Processamento local • Nenhum dado enviado para servidores
          </div>
        </div>
      </footer>

      {/* Processing overlay */}
      {processing && (
        <div className="fixed inset-0 bg-black/100 backdrop-blur-sm z-[999] flex flex-col items-center justify-center text-white px-4">
          <div className="text-2xl md:text-3xl font-bold mb-4">Processando... {progress}%</div>
          <div className="w-72 md:w-96">
            <Progress value={progress} className="h-3" />
          </div>
          <p className="opacity-80 mt-3 text-sm">Não feche a página — o processo roda localmente no seu navegador.</p>
        </div>
      )}
    </div>
  );
}