import { Button } from "@/components/ui/button";
import { ArrowRight, Scissors, Sparkles, ShieldCheck } from "lucide-react";
import heroWaves from "@/assets/hero-waves.jpg";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 antialiased">
      
      {/* HERO */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroWaves})` }}
          aria-hidden
        />

        <div className="max-w-6xl mx-auto px-6 py-28 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
            Transforme vídeos longos em clipes virais — em segundos
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Nossa ferramenta identifica automaticamente os melhores momentos,
            gera cortes perfeitos e entrega tudo pronto para TikTok, Reels e Shorts.
          </p>

          <div className="flex justify-center gap-4 mt-10">
            <Button className="px-6 py-4 text-base" onClick={() => (window.location.href = "/free")}>
              Usar versão gratuita
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <Button
              variant="outline"
              className="px-6 py-4 text-base"
              onClick={() => (window.location.href = "/premium")}
            >
              Conhecer versão premium
            </Button>
          </div>
        </div>
      </header>

      {/* COMO FUNCIONA */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">Como funciona?</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <UploadStepIcon />
              <h3 className="text-xl font-semibold mt-4">1. Envie seu vídeo</h3>
              <p className="text-slate-600 mt-2">
                Suporte para MP4, MP3, WAV — até 50MB.
              </p>
            </div>

            <div className="text-center">
              <AIIcon />
              <h3 className="text-xl font-semibold mt-4">2. A IA analisa tudo</h3>
              <p className="text-slate-600 mt-2">
                Detecta humor, emoção, momentos importantes e pontos virais.
              </p>
            </div>

            <div className="text-center">
              <Scissors className="w-12 h-12 mx-auto text-slate-900" />
              <h3 className="text-xl font-semibold mt-4">3. Gere cortes perfeitos</h3>
              <p className="text-slate-600 mt-2">
                Baixe cada highlight ou exporte tudo de uma vez.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">
            Por que usar o AutoCut?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <Feature
              icon={<ShieldCheck className="w-10 h-10 text-slate-900" />}
              title="Privado e Seguro"
              desc="Processamento local, sem servidores externos."
            />

            <Feature
              icon={<Sparkles className="w-10 h-10 text-slate-900" />}
              title="Edição Automatizada"
              desc="Cortes inteligentes prontos para redes sociais."
            />

            <Feature
              icon={<Scissors className="w-10 h-10 text-slate-900" />}
              title="Velocidade absurda"
              desc="Converta 1h de vídeo em 30 segundos."
            />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-28 text-center bg-white">
        <h2 className="text-4xl font-bold mb-6">
          Comece a transformar seus vídeos agora
        </h2>
        <p className="text-slate-600 mb-10">
          Totalmente gratuito, sem login e sem limite de uso.
        </p>

        <Button className="px-8 py-4 text-lg" onClick={() => (window.location.href = "/free")}>
          Acessar a ferramenta gratuita
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 py-6">
        <div className="text-center text-sm text-white/70">
          AutoCut © 2025 — Feito com ❤️ • Privacidade local
        </div>
      </footer>
    </div>
  );
};

/* ícones pequenos personalizados para o "Como funciona" */
const UploadStepIcon = () => (
  <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 flex items-center justify-center">
    <ArrowRight className="w-6 h-6 text-white" />
  </div>
);

const AIIcon = () => (
  <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 flex items-center justify-center">
    <Sparkles className="w-6 h-6 text-white" />
  </div>
);

const Feature = ({ icon, title, desc }: any) => (
  <div className="p-6 rounded-xl bg-white shadow-sm border border-slate-100 text-center">
    {icon}
    <h3 className="text-xl font-semibold mt-4">{title}</h3>
    <p className="mt-2 text-slate-600">{desc}</p>
  </div>
);

export default Landing;
