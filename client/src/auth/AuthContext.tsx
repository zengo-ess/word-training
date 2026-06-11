import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  clearStoredUser,
  clearToken,
  getStoredUser,
  getToken,
  saveStoredUser,
  saveToken,
  type StoredUser,
} from "./token";
import { login as loginApi, register as registerApi } from "./authApi";

interface AuthValue {
  isAuthenticated: boolean;
  user: StoredUser | null;
  login: (userId: string, password: string) => Promise<void>;
  register: (name: string, password: string, familyCode: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser());

  const apply = (result: { token: string; user: StoredUser }): void => {
    saveToken(result.token);
    saveStoredUser(result.user);
    setToken(result.token);
    setUser(result.user);
  };

  const login = async (userId: string, password: string): Promise<void> => {
    apply(await loginApi(userId, password));
  };

  const register = async (name: string, password: string, familyCode: string): Promise<void> => {
    apply(await registerApi(name, password, familyCode));
  };

  const logout = (): void => {
    clearToken();
    clearStoredUser();
    setToken(null);
    setUser(null);
  };

  // Сервер ответил 401 на авторизованный запрос — сессия мертва, выходим к выбору профиля
  useEffect(() => {
    window.addEventListener("wt-unauthorized", logout);
    return () => window.removeEventListener("wt-unauthorized", logout);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: token !== null, user, login, register, logout }}>
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
