import { useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./screens/LoginScreen";
import { AuthedApp } from "./AuthedApp";

export function App() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AuthedApp /> : <LoginScreen />;
}
