// src/pages/index.tsx
import { useState, useRef, useCallback } from "react";
import { Upload, Wand2, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import heroWaves from "@/assets/hero-waves.jpg";

type ProcessingStage = "idle" | "uploading" | "analyzing" | "cutting" | "complete";

interface Highlight {
  clip_id: string;
  start: string;
  end: string;
  title: string;
  context: string;
  cut_url?: string;
}

/**
 * Utilitário: formata bytes para string legível
 */
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const Index = () => {
  // estado do processamento
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [progress, setProgress] = useState(0);

  // arquivo e highlights
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // backend (não usado no mock, mantém para integração futura)
  const BACKEND_URL = "http://localhost:5000";

  // ref para scroll / foco do dropzone
  const dropRef = useRef<HTMLDivElement | null>(null);

  /* -------------------------
     Helpers para seleção de arquivo
     ------------------------- */
  const onFileSelected = (f: File | null) => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo permitido: 50MB.");
      return;
    }
    setFile(f);
    toast.success(`Arquivo selecionado: ${f.name} • ${formatBytes(f.size)}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    onFileSelected(selectedFile);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    const dropped = dt.files?.[0] ?? null;
    if (dropped) onFileSelected(dropped);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /* -------------------------
     PROCESSAMENTO (MOCK)
     - Mantive sua versão mockada, para não chamar a IA/backend
     - Quando quiser reativar backend, eu reaponto para a rota /analyze
     ------------------------- */
  const processFile = async () => {
    if (!file) return;

    try {
      setStage("uploading");
      setProgress(15);
      await new Promise((r) => setTimeout(r, 600));

      setStage("analyzing");
      setProgress(45);
      await new Promise((r) => setTimeout(r, 1200));

      // MOCK dos highlights (mantido)
      const mock: Highlight[] = [
        {
          clip_id: "mock_1",
          start: "00:12",
          end: "00:27",
          title: "O melhor momento do podcast",
          context: "Aqui a conversa tomou um rumo mais emocional e envolvente.",
        },
        {
          clip_id: "mock_2",
          start: "03:55",
          end: "04:22",
          title: "Parte engraçada",
          context: "Um trecho descontraído que prende muito bem a atenção.",
        },
        {
          clip_id: "mock_3",
          start: "07:10",
          end: "07:40",
          title: "Momento de insight",
          context: "Aqui surge um argumento forte e memorável.",
        },
      ];

      setHighlights(mock);
      setProgress(100);

      await new Promise((r) => setTimeout(r, 600));

      setStage("complete");
      toast.success("Mock gerado — layout liberado.");
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado.");
      setStage("idle");
    }
  };

  /* -------------------------
     DOWNLOAD (MOCK)
     - Não faz request real, apenas simula para testes de UI
     ------------------------- */
  const downloadClip = async (highlight: Highlight) => {
    toast.success(`Mock de download gerado para: ${highlight.clip_id}.mp4`);
  };

  /* -------------------------
     Stepper (UI)
     ------------------------- */
  const steps = [
    { id: 1, key: "uploading", label: "Upload" },
    { id: 2, key: "analyzing", label: "Análise" },
    { id: 3, key: "cutting", label: "Corte" },
    { id: 4, key: "complete", label: "Pronto" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-slate-900 antialiased">
      {/* HERO */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroWaves})` }}
          aria-hidden
        />
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-3">Ferramenta local • Privacidade total</p>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                Transforme podcasts em clipes virais — automaticamente
              </h1>
              <p className="mt-4 text-slate-600 max-w-xl">
                Envie seu arquivo, nossa IA encontra os melhores momentos e gera cortes prontos para redes sociais.
                Simples, rápido e totalmente local.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {/* O botão aqui abre o seletor e rola para o dropzone */}
                <Button
                  onClick={() => {
                    dropRef.current?.scrollIntoView({ behavior: "smooth" });
                    document.getElementById("file-upload")?.click();
                  }}
                  className="inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Enviar arquivo
                </Button>

                <a href="#como-funciona" className="text-sm text-slate-500 self-center hover:text-slate-700 transition">
                  Como funciona
                </a>
              </div>

              <div className="mt-6 text-sm text-slate-500">
                <strong className="text-slate-700">Max 50MB</strong> • Formatos: mp3, wav, mp4
              </div>
            </div>

            <div>
              <Card className="p-6 border border-slate-100 shadow-sm">
                {/* texto de demonstração — você disse que ajustou, mantive simples */}
                <div className="text-slate-700 font-medium tracking-wide mb-4">Demonstração rápida</div>

                <div className="rounded-md bg-white p-4 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-900 font-medium">Exemplo: Podcast Ep. 12</div>
                      <div className="text-xs text-slate-500">Duração: 42:13 • Gerado 3 highlights</div>
                    </div>
                    <div className="text-xs text-slate-500">Privado • Local</div>
                  </div>

                  <div className="mt-4">
                    <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                      <div className="h-2 bg-gradient-to-r from-sky-400 to-indigo-500 rounded" style={{ width: "45%" }} />
                    </div>
                    <div className="mt-3 text-xs text-slate-500">Status: Processamento simulado</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 max-w-6xl mx-auto px-6 -mt-6 mb-24">
        {/* UPLOAD + STEPPER */}
        <section id="upload-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dropzone (col-span 2) */}
          <div ref={dropRef} onDrop={handleDrop} onDragOver={handleDragOver} className="col-span-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => document.getElementById("file-upload")?.click()}
              onKeyDown={(e) => e.key === "Enter" && document.getElementById("file-upload")?.click()}
              className="relative rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-md transition cursor-pointer"
              aria-label="Área de upload - arraste e solte o arquivo aqui"
            >
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gradient-to-br from-slate-50 to-white border border-slate-100 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-slate-500" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Arraste e solte ou selecione um arquivo</div>
                      <div className="text-sm text-slate-500 mt-1">Suporta mp3, wav, mp4 — Max 50MB</div>
                    </div>

                    <div>
                      <label htmlFor="file-upload" className="inline-block">
                        {/* input escondido — abre pelo botão / dropzone */}
                        <input id="file-upload" type="file" className="hidden" accept=".mp3,.wav,.mp4" onChange={handleFileChange} />
                        <Button asChild>
                          <span className="px-4 py-2 text-sm">Selecionar</span>
                        </Button>
                      </label>
                    </div>
                  </div>

                  {/* preview do arquivo selecionado */}
                  {file ? (
                    <div className="mt-4 flex items-center justify-between bg-slate-50 border border-slate-100 rounded p-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{file.name}</div>
                        <div className="text-xs text-slate-500">{formatBytes(file.size)}</div>
                      </div>
                      <div className="text-sm text-slate-500">{file.type || "—"}</div>
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-slate-400">Nenhum arquivo selecionado</div>
                  )}

                  {/* ações */}
                  <div className="mt-6 flex items-center gap-3">
                    <Button onClick={processFile} disabled={!file} className="inline-flex items-center gap-2" aria-disabled={!file}>
                      <Wand2 className="w-4 h-4" />
                      Processar
                    </Button>
                    <Button variant="ghost" onClick={() => { setFile(null); setHighlights([]); setFileUrl(""); }}>
                      Limpar
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* stepper */}
            <div className="mt-4 flex items-center gap-3">
              {steps.map((s) => {
                const active = stage === (s.key as ProcessingStage);
                const completed =
                  (s.key === "uploading" && (stage === "uploading" || stage === "analyzing" || stage === "complete")) ||
                  (s.key === "analyzing" && (stage === "analyzing" || stage === "complete")) ||
                  (s.key === "cutting" && (stage === "cutting" || stage === "complete")) ||
                  (s.key === "complete" && stage === "complete");

                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                        completed ? "bg-slate-900 text-white" : active ? "bg-slate-200 text-slate-900" : "bg-white text-slate-500 border border-slate-100"
                      }`}
                    >
                      {s.id}
                    </div>
                    <div className="text-sm">
                      <div className={`font-medium ${completed ? "text-slate-900" : "text-slate-600"}`}>{s.label}</div>
                      <div className="text-xs text-slate-400">{completed ? "Concluído" : active ? "Em andamento" : "Pendente"}</div>
                    </div>
                  </div>
                );
              })}

              <div className="flex-1">
                <div className="h-2 bg-slate-100 rounded mt-2 overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-sky-400 to-indigo-500 rounded" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* SIDEBAR - dicas */}
          <div className="space-y-4 p-6 rounded-xl bg-white/60 backdrop-blur-md shadow-sm border border-purple-100">
            <div className="flex items-start gap-3">
              <span className="text-purple-500 text-xl">✔</span>
              <p className="text-gray-700 leading-snug">Use trechos curtos (5–20s) para melhores clipes.</p>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-purple-500 text-xl">✔</span>
              <p className="text-gray-700 leading-snug">Se quiser vários clipes, use o botão “Gerar todos” (futuro).</p>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-purple-500 text-xl">✔</span>
              <p className="text-gray-700 leading-snug">Privacidade: processamento totalmente local.</p>
            </div>
          </div>
        </section>

        {/* RESULTADOS */}
        <section id="results-section" className="mt-16">
          {stage === "complete" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Clipes encontrados</h3>
                <div className="text-sm text-slate-500">{highlights.length} resultado(s)</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {highlights.map((h) => (
                  <Card
                    key={h.clip_id}
                    className="p-6 min-h-[250px] flex flex-col rounded-xl bg-[#0B0F1A] border border-slate-800 shadow-md hover:shadow-lg transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col flex-1">
                        <div>
                          <div className="text-sm text-slate-400 mb-1">
                            {h.start} → {h.end}
                          </div>

                          <h4 className="text-md font-semibold text-slate-200 mb-2">{h.title}</h4>
                        </div>

                        <p className="text-sm text-slate-400 mt-auto line-clamp-3">{h.context}</p>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <Button size="sm" onClick={() => downloadClip(h)} className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                          <Download className="w-4 h-4" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {stage !== "complete" && (
            <div className="text-center mt-12 text-slate-500">
              {stage === "idle" && <div>Envie um arquivo para iniciar a análise.</div>}
              {stage === "uploading" && <div>Enviando arquivo...</div>}
              {stage === "analyzing" && <div>Analisando conteúdo — pode levar alguns segundos.</div>}
              {stage === "cutting" && <div>Gerando cortes...</div>}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#070B16] py-6 border-t border-white/5">
        <div className="text-center text-sm text-white/60">AutoCut © {new Date().getFullYear()} — Feito com ❤️ • Privacidade local</div>
      </footer>
    </div>
  );
};

export default Index;
