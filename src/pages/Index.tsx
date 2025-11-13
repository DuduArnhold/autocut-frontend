import { useState } from "react";
import { Upload, Wand2, Download, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import heroWaves from "@/assets/hero-waves.jpg";

type ProcessingStage = 
  "idle" | "uploading" | "analyzing" | "cutting" | "complete";

interface Highlight {
  clip_id: string;
  start: string;
  end: string;
  title: string;
  context: string;
  cut_url?: string;
}

const Index = () => {
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const BACKEND_URL = "http://localhost:5000";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 50MB.");
      return;
    }

    setFile(selectedFile);
    toast.success(`Arquivo selecionado: ${selectedFile.name}`);
  };

  const processFile = async () => {
    if (!file) return;

    try {
      // UPLOAD LOCAL
      setStage("uploading");
      setProgress(20);

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      setFileUrl(uploadData.file_url);
      setProgress(40);

      // SIMULAÇÃO DA ANÁLISE (porque removeu IA do Supabase)
      setStage("analyzing");
      toast.info("Analisando o áudio (simulação)…");

      await new Promise((res) => setTimeout(res, 1500));

      // Highlights mockados antes da IA real
      const fakeHighlights = [
        {
          clip_id: "clip1",
          start: "00:00:02",
          end: "00:00:08",
          title: "Momento 1",
          context: "Exemplo de trecho viral detectado.",
        },
        {
          clip_id: "clip2",
          start: "00:00:10",
          end: "00:00:18",
          title: "Momento 2",
          context: "Outro trecho interessante.",
        },
      ];

      setHighlights(fakeHighlights);
      setProgress(100);
      setStage("complete");

      toast.success("Análise concluída!");

    } catch (error: any) {
      toast.error(error.message);
      setStage("idle");
      setProgress(0);
    }
  };

  const downloadClip = async (highlight: Highlight) => {
    try {
      toast.info("Cortando com FFmpeg…");

      const response = await fetch(`${BACKEND_URL}/cut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: fileUrl,
          start: highlight.start,
          end: highlight.end,
          clip_id: highlight.clip_id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao cortar vídeo.");

      // Download do clipe
      const link = document.createElement("a");
      link.href = data.cut_url;
      link.download = `${highlight.clip_id}.mp4`;
      link.click();

      toast.success("Clip baixado!");

    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative">

      {/* Background image */}
      <div 
        className="absolute inset-0 opacity-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroWaves})` }}
      />

      <div className="container mx-auto px-4 py-16 relative z-10">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            AutoCut (Local)
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80 mb-8 max-w-2xl mx-auto">
            Upload → Análise (simulada) → Corte local com FFmpeg
          </p>
        </div>

        {/* Upload */}
        {stage === "idle" && (
          <Card className="max-w-2xl mx-auto p-8">
            <div className="text-center">

              <input 
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".mp3,.wav,.mp4"
              />

              <label htmlFor="file-upload">
                <Button className="w-full" asChild>
                  <span>
                    <Upload className="w-5 h-5 mr-2" />
                    Escolher arquivo
                  </span>
                </Button>
              </label>

              {file && (
                <Button
                  onClick={processFile}
                  className="w-full mt-6"
                >
                  <Wand2 className="w-5 h-5 mr-2" />
                  Processar
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Loading */}
        {stage !== "idle" && stage !== "complete" && (
          <Card className="max-w-2xl mx-auto p-8 text-center">
            <Loader2 className="w-10 h-10 mx-auto animate-spin mb-4" />
            <h2 className="text-xl font-bold">Processando…</h2>
            <Progress value={progress} className="h-2 mt-4" />
          </Card>
        )}

        {/* Resultados */}
        {stage === "complete" && (
          <div className="max-w-4xl mx-auto space-y-6">

            <Card className="p-6">
              <h2 className="text-2xl font-bold">Clipes Encontrados</h2>
            </Card>

            {highlights.map((h) => (
              <Card key={h.clip_id} className="p-6">
                <h3 className="text-xl font-bold">{h.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {h.start} → {h.end}
                </p>
                <p className="mt-4">{h.context}</p>

                <Button
                  onClick={() => downloadClip(h)}
                  className="mt-4"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar corte
                </Button>
              </Card>
            ))}

          </div>
        )}

      </div>
    </div>
  );
};

export default Index;
