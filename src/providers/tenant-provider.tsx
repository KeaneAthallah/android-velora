import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { Business, Outlet } from "@/api/types";
import { fetchOutlets } from "@/api/endpoints/tenant";
import { useAuth } from "@/providers/auth-provider";
import { setTenantContext } from "@/services/api-context";
import { getStoredOutletId, setStoredOutletId } from "@/services/preferences";
import { queryKeys } from "@/lib/query-keys";

type TenantContextValue = {
  businessId: string | null;
  business: Business | null;
  outlets: Outlet[];
  outlet: Outlet | null;
  isResolvingOutlet: boolean;
  isLoading: boolean;
  error: string | null;
  setOutlet: (outletId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used inside <TenantProvider>.");
  return context;
}

/** Active outlet id for query keys, or `null` while it is still resolving. */
export function useOutletId(): string | null {
  return useTenant().outlet?.id ?? null;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { session, status, has, refreshSession } = useAuth();

  const business = session?.activeBusiness ?? null;
  const businessId = business?.id ?? null;
  const canListOutlets = has("outlets.view");

  const outletsQuery = useQuery({
    queryKey: queryKeys.outlets(businessId),
    queryFn: fetchOutlets,
    enabled: Boolean(businessId) && canListOutlets && status === "authenticated",
    staleTime: 5 * 60 * 1_000,
  });

  const fallbackOutlets = useMemo(
    () =>
      (session?.memberOutlets ?? []).filter(
        (outlet) => outlet.businessId === businessId,
      ),
    [session?.memberOutlets, businessId],
  );

  const outlets = useMemo(() => {
    if (outletsQuery.data?.length) return outletsQuery.data;
    return fallbackOutlets;
  }, [outletsQuery.data, fallbackOutlets]);

  const [outletId, setOutletIdState] = useState<string | null>(null);
  const [isResolvingOutlet, setIsResolvingOutlet] = useState(false);

  const outletIds = outlets.map((outlet) => outlet.id).join(",");

  useEffect(() => {
    let cancelled = false;

    const resolveOutlet = async () => {
      // Yield first so the effect body never updates state synchronously.
      await Promise.resolve();
      if (cancelled) return;

      if (!businessId) {
        setOutletIdState(null);
        setTenantContext({ businessId: null, outletId: null });
        return;
      }

      setTenantContext({ businessId });

      if (outlets.length === 0) {
        setOutletIdState(null);
        setTenantContext({ outletId: null });
        return;
      }

      setIsResolvingOutlet(true);

      const stored = await getStoredOutletId(businessId);
      if (cancelled) return;

      const next =
        outlets.find((outlet) => outlet.id === stored) ??
        outlets.find((outlet) => outlet.status === "active") ??
        outlets[0];

      setOutletIdState(next.id);
      setTenantContext({ businessId, outletId: next.id });
      setIsResolvingOutlet(false);
    };

    void resolveOutlet().catch(() => {
      if (!cancelled) setIsResolvingOutlet(false);
    });

    return () => {
      cancelled = true;
    };
    // `outletIds` stands in for the outlet list identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, outletIds]);

  const outlet = useMemo(
    () => outlets.find((item) => item.id === outletId) ?? null,
    [outlets, outletId],
  );

  const setOutlet = useCallback(
    async (nextOutletId: string) => {
      if (!businessId) return;
      const next = outlets.find((item) => item.id === nextOutletId);
      if (!next) return;

      setOutletIdState(next.id);
      setTenantContext({ businessId, outletId: next.id });
      await setStoredOutletId(businessId, next.id);
    },
    [businessId, outlets],
  );

  const refresh = useCallback(async () => {
    await refreshSession();
    if (canListOutlets) await outletsQuery.refetch();
  }, [refreshSession, canListOutlets, outletsQuery]);

  const error = useMemo(() => {
    if (!outletsQuery.isError) return null;
    return outletsQuery.error instanceof Error
      ? outletsQuery.error.message
      : "Could not load outlets.";
  }, [outletsQuery.isError, outletsQuery.error]);

  const value = useMemo<TenantContextValue>(
    () => ({
      businessId,
      business,
      outlets,
      outlet,
      isResolvingOutlet,
      isLoading:
        status === "loading" || isResolvingOutlet || outletsQuery.isLoading,
      error,
      setOutlet,
      refresh,
    }),
    [
      businessId,
      business,
      outlets,
      outlet,
      isResolvingOutlet,
      status,
      outletsQuery.isLoading,
      error,
      setOutlet,
      refresh,
    ],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
