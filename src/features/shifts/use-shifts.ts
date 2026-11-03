import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCashRegisters, fetchShifts, openShift, closeShift } from "@/api/endpoints/shifts";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

export function useCashRegisters() {
  const { has } = usePermissions();
  const { businessId } = useTenant();
  return useQuery({
    queryKey: ["cash-registers", businessId],
    queryFn: fetchCashRegisters,
    enabled: Boolean(businessId) && has("shifts.view"),
    staleTime: 60_000,
  });
}

export function useShifts() {
  const { has } = usePermissions();
  const { businessId } = useTenant();
  return useQuery({
    queryKey: ["shifts", businessId],
    queryFn: fetchShifts,
    enabled: Boolean(businessId) && has("shifts.view"),
    staleTime: 30_000,
  });
}

export function useOpenShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: openShift,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useCloseShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actualCash }: { id: string; actualCash: string }) => closeShift(id, actualCash),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}