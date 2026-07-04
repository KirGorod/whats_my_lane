import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  type UserRole,
  USER_ROLE_STORAGE_KEY,
  isUserRole,
} from "../types/auth";

type AuthContextType = {
  role: UserRole | null;
  isAdmin: boolean;
  isHost: boolean;
  isLoggedIn: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
const HOST_USERNAME = import.meta.env.VITE_HOST_USERNAME;
const HOST_PASSWORD = import.meta.env.VITE_HOST_PASSWORD;

function persistRole(role: UserRole) {
  localStorage.setItem(USER_ROLE_STORAGE_KEY, role);
}

function loadSavedRole(): UserRole | null {
  const saved = localStorage.getItem(USER_ROLE_STORAGE_KEY);
  if (isUserRole(saved)) return saved;

  const legacyAdmin = localStorage.getItem("isAdmin");
  if (legacyAdmin === "true") {
    localStorage.removeItem("isAdmin");
    persistRole("admin");
    return "admin";
  }

  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    setRole(loadSavedRole());
  }, []);

  const login = (username: string, password: string) => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setRole("admin");
      persistRole("admin");
      return true;
    }
    if (username === HOST_USERNAME && password === HOST_PASSWORD) {
      setRole("host");
      persistRole("host");
      return true;
    }
    return false;
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem(USER_ROLE_STORAGE_KEY);
    localStorage.removeItem("isAdmin");
  };

  const isAdmin = role === "admin";
  const isHost = role === "host";
  const isLoggedIn = role !== null;

  return (
    <AuthContext.Provider
      value={{ role, isAdmin, isHost, isLoggedIn, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
