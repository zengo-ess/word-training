import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  clearStoredUser,
  clearToken,
  getStoredUser,
  getToken,
  saveStoredUser,
  saveToken,
  withSettingsDefaults,
  type StoredUser,
} from "./token";
import {
  login as loginApi,
  register as registerApi,
  updateSettings as updateSettingsApi,
  type SettingsPatch,
} from "./authApi";

interface AuthValue {
  isAuthenticated: boolean;
  user: StoredUser | null;
  login: (userId: string, password: string) => Promise<void>;
  register: (name: string, password: string, familyCode: string) => Promise<void>;
  updateSettings: (patch: SettingsPatch) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser());

  const apply = (result: { token: string; user: StoredUser }): void => {
    const stored = withSettingsDefaults(result.user);
    saveToken(result.token);
    saveStoredUser(stored);
    setToken(result.token);
    setUser(stored);
  };

  const login = async (userId: string, password: string): Promise<void> => {
    apply(await loginApi(userId, password));
  };

  const register = async (name: string, password: string, familyCode: string): Promise<void> => {
    apply(await registerApi(name, password, familyCode));
  };

  const updateSettings = async (patch: SettingsPatch): Promise<void> => {
    const updated = withSettingsDefaults(await updateSettingsApi(patch));
    saveStoredUser(updated);
    setUser(updated);
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
    <AuthContext.Provider
      value={{ isAuthenticated: token !== null, user, login, register, updateSettings, logout }}
    >
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
