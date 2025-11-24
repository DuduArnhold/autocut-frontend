// src/pages/free/index.tsx
import React, { useEffect, useRef, useState } from "react";
import { Upload, Play, Pause, Trash2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ensureFFmpeg } from "@/lib/ffmpeg";

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

  // drop handlers (simple)
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
   * exportClip
   * - usa ensureFFmpeg(setProgress) (importado de src/lib/ffmpeg)
   * - compatível com ffmpeg v0.10.x (fs/writeFile, run, FS('readFile'))
   */
  const exportClip = async () => {
    if (!srcUrl) return toast.error("Nenhum arquivo carregado.");
    if (endMark <= startMark) return toast.error("Fim deve ser maior que o início.");
    if (duration <= 0) return toast.error("Duração inválida.");

    setProcessing(true);
    setProgress(0);
    const loadToast = toast.loading("Inicializando FFmpeg...");

    try {
      // ensureFFmpeg is expected to accept a callback to set progress and return an instance
      const ffmpeg = await ensureFFmpeg((pct: number) => {
        // ensure pct monotonic
        setProgress((prev) => (pct > prev ? pct : prev));
      });

      toast.dismiss(loadToast);
      setProgress(10);

      const inputName = file ? file.name : "demo_input";
      const ext = kind === "audio" ? "mp3" : "mp4";
      const outName = `autocut_clip_${Date.now()}.${ext}`;

      // prepare input buffer and write via FS
      toast.loading("Preparando arquivo...");
      const arrayBuffer = file ? await file.arrayBuffer() : await (await fetch(srcUrl)).arrayBuffer();
      const inputData = new Uint8Array(arrayBuffer);

      // write file into ffmpeg FS
      // v0.10 uses ffmpeg.FS('writeFile', name, data)
      try {
        // @ts-ignore - FS is the Emscripten filesystem available on the ffmpeg instance
        ffmpeg.FS("writeFile", inputName, inputData);
      } catch (fsErr) {
        // fallback if library exposes writeFile helper (some wrappers do)
        if (typeof ffmpeg.writeFile === "function") {
          await ffmpeg.writeFile(inputName, inputData);
        } else {
          throw fsErr;
        }
      }

      setProgress(20);

      const durationSec = Math.max(0.001, endMark - startMark);

      const args: string[] = [
        "-i",
        inputName,
        "-ss",
        String(startMark),
        "-t",
        String(durationSec),
        "-avoid_negative_ts",
        "make_zero",
        "-c:a",
        "aac",
      ];

      if (kind === "video") {
        args.push("-c:v", "libx264");
      } else {
        args.push("-vn");
      }

      args.push("-y", outName);

      // run ffmpeg
      const execStart = performance.now();
      // v0.10 uses run(...)
      if (typeof ffmpeg.run === "function") {
        await ffmpeg.run(...args);
      } else if (typeof ffmpeg.exec === "function") {
        // some versions expose exec; fallback if present
        await ffmpeg.exec(args);
      } else {
        throw new Error("FFmpeg API not compatible: no run/exec method found.");
      }
      const execTime = performance.now() - execStart;

      // fallback estimate if progress callback didn't move enough
      setProgress((prev) => {
        if (prev >= 30) return prev;
        const est = Math.min(95, 20 + (execTime / 1000) * 20);
        return est;
      });

      // read output file
      let outData: Uint8Array;
      try {
        // v0.10: FS('readFile', filename)
        // @ts-ignore
        outData = ffmpeg.FS("readFile", outName);
      } catch (readErr) {
        if (typeof ffmpeg.readFile === "function") {
          // some wrappers provide readFile
          const raw = await ffmpeg.readFile(outName);
          outData = new Uint8Array(raw);
        } else {
          throw readErr;
        }
      }

      const mime = kind === "audio" ? "audio/mpeg" : "video/mp4";
      // data = Uint8Array (SharedArrayBuffer) → precisamos copiar para ArrayBuffer normal
const raw = ffmpeg.FS("readFile", outName);

      // Cria uma cópia em ArrayBuffer "puro"
      const uint8 = new Uint8Array(raw.buffer.slice(0));

      // Agora sim, pode gerar o Blob sem erro de tipo
      const blob = new Blob([uint8.buffer], {
        type: kind === "audio" ? "audio/mpeg" : "video/mp4",
      })

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
      // small visual delay so user sees 100 -> reset
      setTimeout(() => setProgress(0), 900);
      toast.dismiss();
    }
  };

  const clearAll = () => {
    if (mediaRef.current) try { mediaRef.current.pause(); } catch {}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-16 md:py-20">
        <div className="absolute inset-0 bg-black/20" />
        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-black mb-3">Versão FREE — Corte manual no navegador</h1>
          <p className="text-md md:text-lg opacity-90 max-w-3xl mx-auto">
            Carregue um vídeo/áudio, selecione início e fim e exporte o trecho localmente usando ffmpeg.wasm.
            <br className="hidden md:block" />
            <span className="text-yellow-300 font-bold">Sem limite de uso • 100% privado</span>
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-center">
            <Button
              size="lg"
              disabled={processing}
              className="bg-white text-purple-700 hover:bg-gray-100 font-bold text-lg px-6 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* PLAYER + CONTROLES */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 py-10 -mt-8">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-purple-100 overflow-hidden"
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
                    <div className="flex items-center justify-center h-64 bg-gradient-to-br from-purple-600 to-indigo-700">
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
              <div
                className="h-72 md:h-96 flex flex-col items-center justify-center text-center px-6 cursor-pointer select-none"
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

                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">Arraste um arquivo ou clique em “Enviar arquivo”</h3>
                <p className="text-slate-600 text-sm md:text-base">Suporta MP4, MOV, WEBM, MP3, WAV, M4A e muito mais!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Upgrade banner */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl px-6 py-3 border border-purple-200">
          <p className="text-md text-slate-700 text-center">
            Gostou do corte manual? <Link to="/premium" className="font-bold text-purple-600 hover:underline">Conheça o Premium com IA automática →</Link>
          </p>
        </div>
      </div>

      {/* Processing overlay */}
      {processing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex flex-col items-center justify-center text-white px-4">
          <div className="text-2xl md:text-3xl font-bold mb-4">Processando… {progress}%</div>
          <div className="w-72 md:w-96">
            <Progress value={progress} className="h-3" />
          </div>
          <p className="opacity-80 mt-3 text-sm">Não feche a página — o processo roda localmente no seu navegador.</p>
        </div>
      )}
    </div>
  );
}
