import { useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";

export function App() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <HomeScreen /> : <LoginScreen />;
}
