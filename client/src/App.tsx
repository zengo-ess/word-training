import { useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./screens/LoginScreen";
import { AppShell } from "./AppShell";
import { useEffect, useState } from "react";
import { OfflineLibrary } from "./offline/OfflineLibrary";

export function App() {
  const { isAuthenticated } = useAuth();
  const [offline, setOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const open = () => setOffline(true);
    window.addEventListener("offline", open);
    window.addEventListener("wt-open-offline", open);
    return () => {
      window.removeEventListener("offline", open);
      window.removeEventListener("wt-open-offline", open);
    };
  }, []);
  if (offline) return <OfflineLibrary onClose={() => setOffline(false)} />;
  return isAuthenticated ? <AppShell /> : <LoginScreen />;
}
