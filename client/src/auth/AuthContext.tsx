import { createContext, useContext, useState, type ReactNode } from "react";
import { clearToken, getToken, saveToken } from "./token";
import { login as loginApi } from "./authApi";

interface AuthValue {
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());

  const login = async (password: string): Promise<void> => {
    const newToken = await loginApi(password);
    saveToken(newToken);
    setToken(newToken);
  };

  const logout = (): void => {
    clearToken();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: token !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth вызван вне AuthProvider");
  }
  return ctx;
}
