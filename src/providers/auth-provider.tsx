import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Permission, Session } from "@/api/types";
import {
  fetchSession,
  logoutRequest,
  signInRequest,
  signUpRequest,
  googleSignInRequest,
  type SignInInput,
  type SignUpInput,
} from "@/api/endpoints/auth";
import { ApiError, onUnauthorized } from "@/api/client";
import { hasPermission } from "@/lib/permissions";
import { setTenantContext } from "@/services/api-context";
import {
  clearTenantPreferences,
  getStoredBusinessId,
  setStoredBusinessId,
} from "@/services/preferences";
import { loadStoredToken, persistToken } from "@/services/token-store";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  /** Fatal startup problem (e.g. the API is unreachable), if any. */
  bootError: string | null;
  permissions: Permission[];
  has: (required: Permission | Permission[] | null | undefined) => boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchBusiness: (businessId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  retryBootstrap: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}

export function usePermissions(): {
  permissions: Permission[];
  has: (required: Permission | Permission[] | null | undefined) => boolean;
} {
  const { permissions, has } = useAuth();
  return { permissions, has };
}

async function clearDeviceSession(): Promise<void> {
  await persistToken(null);
  await clearTenantPreferences();
  setTenantContext({ businessId: null, outletId: null });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  const loadSession = useCallback(
    async (desiredBusinessId: string | null) => {
      const next = await fetchSession(desiredBusinessId);
      setSession(next);
      setStatus("authenticated");
      setBootError(null);
      return next;
    },
    [],
  );

  const bootstrap = useCallback(async () => {
    try {
      const token = await loadStoredToken();
      if (!token) {
        setSession(null);
        setStatus("anonymous");
        return;
      }

      const businessId = await getStoredBusinessId();
      await loadSession(businessId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearDeviceSession();
        setSession(null);
        setStatus("anonymous");
        return;
      }

      setSession(null);
      setStatus("anonymous");
      setBootError(
        error instanceof Error
          ? error.message
          : "Could not restore your session.",
      );
    }
  }, [loadSession]);

  useEffect(() => {
    // Session restoration reads the secure token store and resolves `/me`;
    // every state update happens asynchronously inside `bootstrap`, not during
    // the effect body. The rule treats the call site as synchronous anyway.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrap();
  }, [bootstrap]);

  // A 401 on any authenticated request means the token is dead. Drop it and
  // let the route guards take the user back to sign-in.
  useEffect(() => {
    return onUnauthorized(() => {
      void clearDeviceSession().then(() => {
        queryClient.clear();
        setSession(null);
        setStatus("anonymous");
      });
    });
  }, [queryClient]);

  const signIn = useCallback(
    async (input: SignInInput) => {
      const token = await signInRequest(input);
      await persistToken(token);
      try {
        const next = await loadSession(null);
        void setStoredBusinessId(next.activeBusiness?.id ?? null);
        queryClient.clear();
      } catch (error) {
        await clearDeviceSession();
        setSession(null);
        setStatus("anonymous");
        throw error;
      }
    },
    [loadSession, queryClient],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const token = await signUpRequest(input);
      await persistToken(token);
      try {
        const next = await loadSession(null);
        void setStoredBusinessId(next.activeBusiness?.id ?? null);
        queryClient.clear();
      } catch (error) {
        await clearDeviceSession();
        setSession(null);
        setStatus("anonymous");
        throw error;
      }
    },
    [loadSession, queryClient],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const token = await googleSignInRequest(idToken);
      await persistToken(token);
      try {
        const next = await loadSession(null);
        void setStoredBusinessId(next.activeBusiness?.id ?? null);
        queryClient.clear();
      } catch (error) {
        await clearDeviceSession();
        setSession(null);
        setStatus("anonymous");
        throw error;
      }
    },
    [loadSession, queryClient],
  );

  const signOut = useCallback(async () => {
    await logoutRequest();
    await clearDeviceSession();
    queryClient.clear();
    setSession(null);
    setStatus("anonymous");
    setBootError(null);
  }, [queryClient]);

  const switchBusiness = useCallback(
    async (businessId: string) => {
      setTenantContext({ businessId, outletId: null });
      const next = await loadSession(businessId);
      await setStoredBusinessId(next.activeBusiness?.id ?? businessId);
      queryClient.clear();
    },
    [loadSession, queryClient],
  );

  const refreshSession = useCallback(async () => {
    const businessId = session?.activeBusiness?.id ?? null;
    await loadSession(businessId);
  }, [loadSession, session]);

  const retryBootstrap = useCallback(async () => {
    setStatus("loading");
    setBootError(null);
    await bootstrap();
  }, [bootstrap]);

  const permissions = useMemo(() => session?.permissions ?? [], [session]);
  const has = useCallback(
    (required: Permission | Permission[] | null | undefined) =>
      hasPermission(permissions, required),
    [permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      bootError,
      permissions,
      has,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      switchBusiness,
      refreshSession,
      retryBootstrap,
    }),
    [
      status,
      session,
      bootError,
      permissions,
      has,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      switchBusiness,
      refreshSession,
      retryBootstrap,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
