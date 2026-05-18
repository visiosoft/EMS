import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "path";
import type { Socket } from "node:net";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

/** One clear message instead of dozens of ECONNREFUSED lines when the API is down. */
function apiProxyErrorHandler(proxy: {
  on(
    event: "error",
    listener: (err: NodeJS.ErrnoException, req: IncomingMessage, res: ServerResponse | Socket) => void,
  ): void;
}) {
  let warned = false;
  proxy.on("error", (err, _req, res) => {
    if (!warned && (err.code === "ECONNREFUSED" || err.code === "ECONNRESET")) {
      warned = true;
      console.error(
        "\n\x1b[31m[vite proxy]\x1b[0m API not reachable at http://127.0.0.1:3001 — run \x1b[1mnpm run dev\x1b[0m from the repo root (starts API + Vite).\n",
      );
    }
    if (res && "writeHead" in res && !(res as ServerResponse).headersSent) {
      (res as ServerResponse).writeHead(503, { "Content-Type": "application/json" });
      (res as ServerResponse).end(
        JSON.stringify({
          message:
            "API server unavailable. From the repo root run: npm run dev",
        }),
      );
    }
  });
}

/**
 * Env files for this app:
 * - Primary: repository root (same directory as this file) — `.env`, `.env.local`, `.env.[mode]`, etc.
 * - Optional: `frontend/.env*` if a `frontend/` folder exists (monorepo-style layouts). Root values win
 *   on duplicate keys so a single root `.env` stays authoritative.
 *
 * Azure / CI: `import.meta.env.VITE_*` is inlined at `npm run build`. Dropping a `.env` on the server
 * after deploy does not change the built bundle — set variables in the build environment (e.g. GitHub
 * Actions `vars` / `secrets`, or `az webapp config appsettings` before a pipeline build that runs `vite build`).
 */
function loadMergedEnv(mode: string, rootDir: string): Record<string, string> {
  const fromRoot = loadEnv(mode, rootDir, "");
  const frontendDir = path.join(rootDir, "frontend");
  if (!fs.existsSync(frontendDir)) {
    return fromRoot;
  }
  const fromFrontend = loadEnv(mode, frontendDir, "");
  return { ...fromFrontend, ...fromRoot };
}

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname);
  const fileEnv = loadMergedEnv(mode, rootDir);

  const vitePublicDefines: Record<string, string> = {
    "import.meta.env.VITE_API_URL": JSON.stringify((fileEnv.VITE_API_URL ?? "").trim()),
    "import.meta.env.VITE_ENTRA_CLIENT_ID": JSON.stringify((fileEnv.VITE_ENTRA_CLIENT_ID ?? "").trim()),
    "import.meta.env.VITE_ENTRA_TENANT_ID": JSON.stringify((fileEnv.VITE_ENTRA_TENANT_ID ?? "").trim()),
    "import.meta.env.VITE_ENTRA_API_SCOPE": JSON.stringify((fileEnv.VITE_ENTRA_API_SCOPE ?? "").trim()),
    "import.meta.env.VITE_ENTRA_REDIRECT_URI": JSON.stringify((fileEnv.VITE_ENTRA_REDIRECT_URI ?? "").trim()),
    "import.meta.env.VITE_ENTRA_REDIRECT_PATH": JSON.stringify(
      (fileEnv.VITE_ENTRA_REDIRECT_PATH ?? "/login").trim() || "/login",
    ),
    "import.meta.env.VITE_APP_SUITE": JSON.stringify((fileEnv.VITE_APP_SUITE ?? "all").trim() || "all"),
  };

  return {
    /** Vite’s default file discovery for `.env*` — keep at repo root. */
    envDir: rootDir,
    define: vitePublicDefines,
    server: {
      host: "::",
      port: 8080,
      /**
       * Nest `dev:backend` writes to `backend/dist` continuously. Without ignores, Vite watches
       * that tree and can hit Linux ENOSPC (inotify watcher limit).
       */
      watch: {
        ignored: [
          "**/backend/**",
          "**/node_modules/**",
          "**/dist/**",
          "**/dist-ssr/**",
          "**/.git/**",
          "**/coverage/**",
          "**/playwright-report/**",
          "**/test-results/**",
          "**/.cache/**",
        ],
      },
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3001",
          changeOrigin: true,
          configure: apiProxyErrorHandler,
        },
        "/uploads": {
          target: "http://127.0.0.1:3001",
          changeOrigin: true,
          configure: apiProxyErrorHandler,
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
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
  };
});
