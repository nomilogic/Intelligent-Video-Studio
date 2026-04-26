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
import { useAuth } from "./auth-context";

export interface DiamondsState {
  balance: number;
  dailyClaim: { claimedToday: boolean; amount: number; claimDate: string };
  referral: { code: string; bonus: number };
}

export interface InsufficientPrompt {
  required: number;
  balance: number;
  featureKey: string;
  featureLabel: string;
}

interface DiamondsContextShape {
  data: DiamondsState | null;
  loading: boolean;
  refresh: () => Promise<void>;
  claimDaily: () => Promise<{ balance: number; granted: number }>;
  insufficient: InsufficientPrompt | null;
  promptInsufficient: (p: InsufficientPrompt) => void;
  closeInsufficient: () => void;
  applyHeaderHints: (res: Response) => void;
  loginRequired: { featureKey?: string } | null;
  promptLoginRequired: (p: { featureKey?: string }) => void;
  closeLoginRequired: () => void;
}

const Ctx = createContext<DiamondsContextShape | null>(null);

export function DiamondsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<DiamondsState | null>(null);
  const [loading, setLoading] = useState(false);
  const [insufficient, setInsufficient] = useState<InsufficientPrompt | null>(null);
  const [loginRequired, setLoginRequired] = useState<{ featureKey?: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const r = await apiFetch<DiamondsState>("/diamonds/me");
      setData(r);
    } catch (err) {
      console.warn("diamonds refresh failed", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const claimDaily = useCallback(async () => {
    const r = await apiFetch<{ balance: number; granted: number }>("/diamonds/claim-daily", {
      method: "POST",
    });
    await refresh();
    return r;
  }, [refresh]);

  // Watch any non-fetch hint headers from API responses to keep the balance
  // optimistically up-to-date after a spend.
  const applyHeaderHints = useCallback((res: Response) => {
    const balanceHeader = res.headers.get("x-diamond-balance");
    if (balanceHeader) {
      const n = Number(balanceHeader);
      if (Number.isFinite(n)) {
        setData((cur) => (cur ? { ...cur, balance: n } : cur));
      }
    }
  }, []);

  const value = useMemo<DiamondsContextShape>(
    () => ({
      data,
      loading,
      refresh,
      claimDaily,
      insufficient,
      promptInsufficient: setInsufficient,
      closeInsufficient: () => setInsufficient(null),
      applyHeaderHints,
      loginRequired,
      promptLoginRequired: setLoginRequired,
      closeLoginRequired: () => setLoginRequired(null),
    }),
    [data, loading, refresh, claimDaily, insufficient, applyHeaderHints, loginRequired],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDiamonds(): DiamondsContextShape {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDiamonds must be used within DiamondsProvider");
  return ctx;
}

/**
 * Wrap an API call so that a 402 "Insufficient diamonds" or a 401
 * "Authentication required" response automatically opens the right modal
 * instead of bubbling up as a plain error.
 */
export function useGatedRequest() {
  const { promptInsufficient, refresh: refreshDiamonds, promptLoginRequired } = useDiamonds();
  return useCallback(
    async <T,>(fn: () => Promise<T>, featureKey?: string): Promise<T | null> => {
      try {
        const result = await fn();
        await refreshDiamonds();
        return result;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 402 && err.body) {
            promptInsufficient({
              required: Number(err.body.required ?? 0),
              balance: Number(err.body.balance ?? 0),
              featureKey: String(err.body.featureKey ?? featureKey ?? ""),
              featureLabel: String(err.body.featureLabel ?? featureKey ?? "this feature"),
            });
            return null;
          }
          if (err.status === 401) {
            promptLoginRequired({ featureKey });
            return null;
          }
        }
        throw err;
      }
    },
    [promptInsufficient, refreshDiamonds, promptLoginRequired],
  );
}
