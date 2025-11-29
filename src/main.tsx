import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics, track } from "@/lib/analytics";

// Inicializa Analytics (Plausible)
initAnalytics();

// Rastreia carregamento da aplicação
track("app_loaded");

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
