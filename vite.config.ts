import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { copyFileSync } from "fs";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,

    // 🔥 ISSO HABILITA SharedArrayBuffer!
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Copy vercel.json to dist/ for Vercel to recognize it
    {
      name: 'copy-vercel-json',
      closeBundle() {
        copyFileSync('vercel.json', 'dist/vercel.json');
        console.log('✓ Copied vercel.json to dist/');
      }
    }
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
