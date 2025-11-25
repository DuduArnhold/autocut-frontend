// src/App.tsx
import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button"; // Mantida a importação
import Landing from "./pages/Index";
import FreePage from "./pages/free";

// A importação já estava correta, mantida aqui.
import logoAutoCut from '../src/assets/logo.svg';

const Navbar: React.FC = () => {
  const location = useLocation();
  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      location.pathname === path
        ? "bg-slate-100 text-slate-900"
        : "text-slate-700 hover:text-slate-900"
    }`;

  return (
    <header className="border-b border-slate-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          
          {/*
            ALTERAÇÃO APLICADA AQUI:
            1. Adicionada as classes "flex items-center gap-2" para alinhar.
            2. Inserida a tag <img> com tamanho definido (h-8).
            3. O texto "AutoCut" foi movido para um <span> para manter os estilos de fonte.
          */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src={logoAutoCut} 
              alt="AutoCut Logo" 
              className="!h-12 w-auto" 
            />
            <span className="font-extrabold text-xl text-slate-900">
              AutoCut
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-2">
            <Link to="/" className={linkClass("/")}>
              Home
            </Link>
            <Link to="/free" className={linkClass("/free")}>
              Free
            </Link>
          </nav>
        </div>

        {/* lado direito da navbar — AGORA VAZIO */}
        <div />
      </div>
    </header>
  );
};

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-slate-900 antialiased">
      <Navbar />

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/free" element={<FreePage />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </div>
  );
};

export default App;