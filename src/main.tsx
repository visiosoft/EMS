import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import App from "./App.tsx";
import { initializeMsal, msalInstance } from "./auth/entra.ts";
import "./index.css";
import "./watermark.css";

async function bootstrap() {
    try {
        await initializeMsal();
    } catch (err) {
        console.error("[MSAL] initialize failed — login page will still load:", err);
    }

    createRoot(document.getElementById("root")!).render(
        <MsalProvider instance={msalInstance}>
            <App />
        </MsalProvider>,
    );
}

void bootstrap();
