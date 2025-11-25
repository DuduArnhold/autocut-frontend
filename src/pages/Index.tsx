import { Button } from "@/components/ui/button";
import { ArrowRight, Scissors, Sparkles, ShieldCheck } from "lucide-react";
import heroWaves from "@/assets/hero-waves.jpg";
import LightLogo from "@/assets/LightLogo.svg";
import logo from "@/assets/logo.svg";

// --------------------------------------------------
// LANDING PAGE FINAL
// --------------------------------------------------
const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 antialiased">
    
      {/* HERO */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroWaves})` }}
        />

        <div className="max-w-6xl mx-auto px-6 py-28 text-center">
          {/* Logo + Nome (MAIOR) */}
          <div className="flex items-center justify-center gap-5 mb-8">
            <img src={logo} alt="AutoCut Logo" className="w-24 h-24 md:w-32 md:h-32" />
            <h2 className="text-5xl md:text-6xl font-black text-slate-900">AutoCut</h2>
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
            Corte vídeos com precisão — direto no navegador
          </h1>

          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Corte os melhores momentos do seu vídeo em segundos — direto do navegador,
            sem instalar nada. 100% gratuito, rápido e totalmente privado.
          </p>

          <div className="flex flex-col items-center mt-10">
            <Button
              className="flex items-center justify-center gap-3 px-10 py-8 text-2xl font-bold shadow-2xl bg-purple-600 hover:bg-purple-700 text-white rounded-2xl transform hover:scale-[1.03] transition-all"
              onClick={() => (window.location.href = "/free")}
            >
              Começar Agora — Grátis e Sem Login
              <ArrowRight className="!w-10 !h-10 ml-3" size={32}/>
            </Button>

            <p className="text-slate-500 text-sm mt-4">
              Sem login • Sem limite de uso • Privacidade total
            </p>
          </div>
        </div>
      </header>

      {/* DIFERENCIAIS */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">
            Por que usar o AutoCut?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

            <Feature
              icon={<ShieldCheck className="w-10 h-10 text-slate-900" />}
              title="Privacidade total"
              desc="Nada é enviado para servidores — todo processamento acontece localmente."
            />

            <Feature
              icon={<Scissors className="w-10 h-10 text-slate-900" />}
              title="Cortes precisos"
              desc="Selecione início e fim com total controle e exporte com um clique."
            />

            <Feature
              icon={<Sparkles className="w-10 h-10 text-slate-900" />}
              title="Extremamente rápido"
              desc="FFmpeg rodando direto no navegador garante velocidade absurda."
            />

          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">Como funciona?</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

            <div className="text-center">
              <UploadIcon />
              <h3 className="text-xl font-semibold mt-4">1. Envie o arquivo</h3>
              <p className="text-slate-600 mt-2">
                MP4, MOV, WEBM, MP3, WAV — suporte para até 50MB.
              </p>
            </div>

            <div className="text-center">
              <AIIcon />
              <h3 className="text-xl font-semibold mt-4">2. Marque o trecho</h3>
              <p className="text-slate-600 mt-2">
                Defina início e fim com precisão milimétrica.
              </p>
            </div>

            <div className="text-center">
              <Scissors className="w-12 h-12 mx-auto text-slate-900" />
              <h3 className="text-xl font-semibold mt-4">3. Exporte instantaneamente</h3>
              <p className="text-slate-600 mt-2">
                O clipe é gerado localmente e baixado na hora.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-28 text-center bg-white">
        <h2 className="text-4xl font-bold mb-6">
          Comece a cortar seus vídeos agora
        </h2>
        <p className="text-slate-600 mb-10">Gratuito, ilimitado e totalmente seguro.</p>

        <Button
          className="px-8 py-8 text-lg font-semibold"
          onClick={() => (window.location.href = "/free")}
        >
          Acessar a ferramenta gratuita
          <ArrowRight className="!w-8 !h-8 ml-2" />
        </Button>
      </section>

      {/* FOOTER */}
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

    </div>
  );
};

// --------------------------------------------------
// ÍCONES
// --------------------------------------------------
const UploadIcon = () => (
  <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 flex items-center justify-center">
    <ArrowRight className="w-6 h-6 text-white" />
  </div>
);

const AIIcon = () => (
  <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 flex items-center justify-center">
    <Sparkles className="w-6 h-6 text-white" />
  </div>
);

// --------------------------------------------------
// COMPONENTE REUTILIZÁVEL
// --------------------------------------------------
const Feature = ({ icon, title, desc }: any) => (
  <div className="p-6 rounded-xl bg-white shadow-sm border border-slate-100 text-center">
    {icon}
    <h3 className="text-xl font-semibold mt-4">{title}</h3>
    <p className="mt-2 text-slate-600">{desc}</p>
  </div>
);

export default Landing;