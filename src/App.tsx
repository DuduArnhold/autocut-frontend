// src/App.tsx
import React, { useState } from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Index from "./pages/premium";
import Landing from "./pages/Index";
import FreePage from "./pages/free";

/**
 * App.tsx - Roteamento básico com placeholders
 * - Troque os componentes Home / Premium / Login / Dashboard por arquivos próprios quando quiser
 * - Mantive o visual neutro usando classes Tailwind (consistentes com seu projeto)
 */

/* ---------- Helpers / Mock Auth (simples) ---------- */
const useMockAuth = () => {
  const [user, setUser] = useState<string | null>(null);
  return {
    user,
    login: (name = "usuário") => setUser(name),
    logout: () => setUser(null),
  };
};

/* ---------- Layout / Navbar ---------- */
const Navbar: React.FC<{ user: string | null; onLogout: () => void }> = ({ user, onLogout }) => {
  const location = useLocation();
  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium ${location.pathname === path ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:text-slate-900"}`;

  return (
    <header className="border-b border-slate-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-extrabold text-xl text-slate-900">AutoCut</Link>

          <nav className="hidden sm:flex items-center gap-2">
            <Link to="/" className={linkClass("/")}>Home</Link>
            <Link to="/free" className={linkClass("/free")}>Free</Link>
            <Link to="/premium" className={linkClass("/premium")}>Premium</Link>
            <Link to="/dashboard" className={linkClass("/dashboard")}>Dashboard</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-slate-700">Olá, <strong>{user}</strong></span>
              <Button variant="ghost" onClick={() => { onLogout(); toast.success("Deslogado"); }}>Sair</Button>
            </>
          ) : (
            <Link to="/login">
              <Button>Entrar</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

/* ---------- Placeholder Pages ---------- */
const Home: React.FC<{ onQuickUpload: () => void }> = ({ onQuickUpload }) => {
  return (
    <main className="max-w-6xl mx-auto px-6 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-sm text-slate-500 mb-3">Ferramenta local • Privacidade total</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
            Transforme podcasts em clipes virais — automaticamente
          </h1>
          <p className="text-slate-600 mb-6">
            Envie seu arquivo, nossa IA encontra os melhores momentos e gera cortes prontos para redes sociais.
            Simples, rápido e totalmente local.
          </p>

          <div className="flex items-center gap-3">
            <Button onClick={onQuickUpload} className="inline-flex items-center gap-2">
              Enviar arquivo
            </Button>
            <Link to="/premium" className="text-sm text-slate-500 self-center hover:text-slate-700 transition">Conheça o Premium</Link>
          </div>

          <div className="mt-4 text-sm text-slate-500"><strong>Max 50MB</strong> • Formatos: mp3, wav, mp4</div>
        </div>

        <div>
          <div className="rounded-xl bg-[#0B0F1A] p-6 text-white shadow-md">
            <h3 className="font-semibold mb-2">Demonstração rápida</h3>
            <div className="rounded-md bg-white p-4 text-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Exemplo: Podcast Ep. 12</div>
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
          </div>
        </div>
      </div>

      {/* breve seção de instruções (placeholder) */}
      <section className="mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
              <h4 className="text-lg font-semibold mb-3">Área de Upload (mock)</h4>
              <p className="text-sm text-slate-500">Arraste, selecione e gere mocks — use o botão "Enviar arquivo" acima para simular.</p>
            </div>
          </div>

          <aside className="p-6 rounded-xl bg-white/60 backdrop-blur-md shadow-sm border border-purple-100">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Dicas rápidas</h4>
            <ul className="text-sm text-slate-700 space-y-2">
              <li>Use trechos curtos (5–20s) para melhores clipes.</li>
              <li>Privacidade: processamento local (se backend rodar localmente).</li>
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
};

const Premium: React.FC = () => {
  return (
    <main className="max-w-4xl mx-auto px-6 py-14">
      <h2 className="text-2xl font-bold mb-4">AutoCut Premium</h2>
      <p className="text-slate-600 mb-6">
        Aqui você pode descrever o plano premium, preços, vantagens (ex.: processamento na nuvem, geração automática de thumbnails, frames do vídeo, etc).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded shadow">Feature 1</div>
        <div className="p-6 bg-white rounded shadow">Feature 2</div>
      </div>
    </main>
  );
};

const Login: React.FC<{ onLogin: (name: string) => void }> = ({ onLogin }) => {
  return (
    <main className="max-w-md mx-auto px-6 py-14">
      <h2 className="text-2xl font-bold mb-4">Entrar</h2>
      <p className="text-slate-600 mb-4">Login mock (sem backend) — clique no botão para simular.</p>

      <div className="flex gap-3">
        <Button onClick={() => onLogin("João")}>Entrar como João</Button>
        <Button variant="ghost" onClick={() => onLogin("Maria")}>Entrar como Maria</Button>
      </div>
    </main>
  );
};

const Dashboard: React.FC = () => {
  return (
    <main className="max-w-6xl mx-auto px-6 py-14">
      <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
      <p className="text-slate-600">Área interna (placeholder). Mais tarde aqui você mostraria uploads, histórico, clipes gerados, etc.</p>
    </main>
  );
};

const NotFound: React.FC = () => (
  <main className="max-w-4xl mx-auto px-6 py-14">
    <h2 className="text-2xl font-bold mb-4">Página não encontrada</h2>
    <p className="text-slate-600">Ops — a página que você tentou acessar não existe.</p>
    <Link to="/"><Button className="mt-4">Voltar para Home</Button></Link>
  </main>
);

/* ---------- Rota protegida (exemplo leve) ---------- */
const ProtectedRoute: React.FC<{ user: string | null; children: React.ReactNode }> = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/* ---------- App principal ---------- */
const App: React.FC = () => {
  const auth = useMockAuth();

  // função usada no Home para simular "abrir seletor + scroll"
  const handleQuickUpload = () => {
    // se quiser acionar o seletor de arquivo, aqui você pode disparar um evento personalizado
    // como estamos em mock, apenas mostraremos um toast
    toast.success("Abrir seletor (mock) — envie um arquivo para liberar layout");
    // caso queira acionar input real, você pode document.getElementById("file-upload")?.click()
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-slate-900 antialiased">
      <Navbar user={auth.user} onLogout={auth.logout} />

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/free" element={<FreePage />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/login" element={<Login onLogin={(name) => { auth.login(name); toast.success(`Bem-vindo, ${name}`); }} />} />
        <Route path="/dashboard" element={
          <ProtectedRoute user={auth.user}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <footer className="mt-auto bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-slate-500 text-center">
          AutoCut © {new Date().getFullYear()} — Feito com ❤️ • Privacidade local
        </div>
      </footer>
    </div>
  );
};

export default App;
