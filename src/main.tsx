import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import App from "./App.tsx";
import { initializeMsal, msalInstance } from "./auth/entra.ts";
import "./index.css";

async function bootstrap() {
    await initializeMsal();

    createRoot(document.getElementById("root")!).render(
        <MsalProvider instance={msalInstance}>
            <App />
        </MsalProvider>,
    );
}

void bootstrap();
