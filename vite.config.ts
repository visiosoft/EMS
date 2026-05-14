import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  /** Project root (same folder as this file) — load `.env` / `.env.local` here, not only CWD. */
  const envDir = path.resolve(__dirname);
  const fileEnv = loadEnv(mode, envDir, "");
  const googlePlacesKey = (
    fileEnv.VITE_GOOGLE_PLACES_API_KEY ||
    fileEnv.GOOGLE_PLACES_API_KEY ||
    ""
  ).trim();

  return {
    envDir,
    define: {
      "import.meta.env.VITE_GOOGLE_PLACES_API_KEY": JSON.stringify(googlePlacesKey),
    },
    server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false,
    },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
