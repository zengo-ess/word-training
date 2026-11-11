import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth/AuthContext";
import { App } from "./App";
import "./styles.css";
import { ensureOfflineShell } from "./offline/shell";
import { primeSpeechVoices } from "./lib/wordVisual";

primeSpeechVoices();

if (import.meta.env.PROD) void ensureOfflineShell().catch(() => undefined);

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
}
