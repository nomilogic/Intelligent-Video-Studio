import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, ApiError } from "./api-client";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
  referralCode: string;
  createdAt: string;
}

interface AuthContextShape {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  signinWithPassword: (email: string, password: string) => Promise<AuthUser>;
  signupWithPassword: (input: {
    email: string;
    password: string;
    name?: string;
    referralCode?: string;
  }) => Promise<AuthUser>;
  resetPassword: (token: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextShape | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await apiFetch<{ user: AuthUser | null }>("/auth/me");
      setUser(r.user);
    } catch (err) {
      console.warn("auth refresh failed", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<AuthContextShape>(
    () => ({
      user,
      loading,
      refresh,
      logout: async () => {
        await apiFetch("/auth/logout", { method: "POST" });
        setUser(null);
      },
      signinWithPassword: async (email, password) => {
        const r = await apiFetch<{ user: AuthUser }>("/auth/login", {
          method: "POST",
          body: { email, password },
        });
        setUser(r.user);
        return r.user;
      },
      signupWithPassword: async (input) => {
        const r = await apiFetch<{ user: AuthUser }>("/auth/signup", {
          method: "POST",
          body: input,
        });
        setUser(r.user);
        return r.user;
      },
      forgotPassword: async (email) => {
        await apiFetch("/auth/forgot-password", { method: "POST", body: { email } });
      },
      resetPassword: async (token, password) => {
        await apiFetch("/auth/reset-password", { method: "POST", body: { token, password } });
      },
      verifyEmail: async (token) => {
        await apiFetch("/auth/verify", { method: "POST", body: { token } });
        await refresh();
      },
      resendVerification: async () => {
        await apiFetch("/auth/resend-verification", { method: "POST" });
      },
    }),
    [user, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextShape {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
