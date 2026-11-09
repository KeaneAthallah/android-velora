import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Check, Plus, X } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useAuth, usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { errorMessage } from "@/api/client";
import { useToast } from "@/components/providers/toast";
import {
  createLeaveRequest,
  decideLeaveRequest,
  fetchLeaveCategories,
  fetchLeaveRequests,
  type LeaveRequest,
  type LeaveStatus,
} from "@/api/endpoints/leave";
import { formatDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

const FILTERS: { key: "pending" | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "all", label: "All" },
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function tone(status: LeaveStatus): BadgeTone {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "cancelled") return "neutral";
  return "warning";
}

export default function ApprovalsScreen() {
  const { colors, radii } = useTheme();
  const { has } = usePermissions();
  const { session } = useAuth();
  const { businessId } = useTenant();
  const queryClient = useQueryClient();

  const canView = has("leave.view");
  const canManage = has("leave.manage");

  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [decision, setDecision] = useState<{
    request: LeaveRequest;
    status: "approved" | "rejected";
  } | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { showToast } = useToast();

  const requestsQuery = useQuery({
    queryKey: queryKeys.leaveRequests(businessId, filter),
    queryFn: () => fetchLeaveRequests(filter === "pending" ? { status: "pending" } : {}),
    enabled: Boolean(businessId) && canView,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.leaveCategories(businessId),
    queryFn: fetchLeaveCategories,
    enabled: Boolean(businessId) && canView && requestOpen,
  });

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ["leave", businessId],
    });

  const decide = useMutation({
    mutationFn: ({ request, status }: { request: LeaveRequest; status: "approved" | "rejected" }) =>
      decideLeaveRequest(request.id, { status }),
    onSuccess: async (_data, variables) => {
      setDecision(null);
      showToast(
        variables.status === "approved" ? "Leave approved" : "Leave rejected",
        "success",
      );
      await refresh();
    },
    onError: () => setDecision(null),
  });

  const submit = useMutation({
    mutationFn: () =>
      createLeaveRequest({
        categoryId,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        reason,
      }),
    onSuccess: async () => {
      setRequestOpen(false);
      setCategoryId(null);
      setStartDate("");
      setEndDate("");
      setReason("");
      setFormError(null);
      showToast("Leave request sent", "success");
      await refresh();
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const requests = requestsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const pendingCount = requests.filter((request) => request.status === "pending").length;

  const submitRequest = () => {
    if (!DATE_PATTERN.test(startDate.trim()) || !DATE_PATTERN.test(endDate.trim())) {
      setFormError("Use YYYY-MM-DD for both dates.");
      return;
    }
    if (endDate.trim() < startDate.trim()) {
      setFormError("The end date cannot be before the start date.");
      return;
    }
    setFormError(null);
    submit.mutate();
  };

  if (!canView) {
    return (
      <Screen>
        <AppHeader title="Approvals" subtitle="Leave requests" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Approvals are not enabled for your role"
            message="A manager can grant leave view in the Velora web app."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Approvals"
        subtitle={
          filter === "pending" ? `${pendingCount} waiting on a decision` : "All leave requests"
        }
        showBack
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Request leave"
            hitSlop={8}
            onPress={() => setRequestOpen(true)}
            style={({ pressed }) => [
              styles.addButton,
              {
                backgroundColor: colors.primary,
                borderRadius: radii.full,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Plus size={18} color={colors.primaryForeground} />
          </Pressable>
        }
      />

      <ScreenScroll
        refreshing={requestsQuery.isRefetching}
        onRefresh={() => void requestsQuery.refetch()}
      >
        <View style={styles.filterRow}>
          {FILTERS.map((option) => {
            const active = filter === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(option.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primarySoft : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: radii.full,
                  },
                ]}
              >
                <Text variant="caption" color={active ? colors.primary : colors.inkSecondary}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {decide.isError ? (
          <View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[
              styles.errorBanner,
              { backgroundColor: colors.dangerBg, borderRadius: radii.md },
            ]}
          >
            <Text variant="caption" color={colors.danger} style={{ flex: 1 }}>
              {errorMessage(decide.error, "The decision was not saved.")}
            </Text>
          </View>
        ) : null}

        {requestsQuery.isPending ? (
          <View style={{ gap: 10 }}>
            <Skeleton height={90} />
            <Skeleton height={90} />
          </View>
        ) : requestsQuery.isError ? (
          <ErrorState
            title="Could not load leave requests"
            message={errorMessage(requestsQuery.error, "Check the connection and try again.")}
            onRetry={() => void requestsQuery.refetch()}
          />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={filter === "pending" ? "Nothing waiting" : "No leave requests"}
            description={
              filter === "pending"
                ? "Every leave request has been decided."
                : "Requests submitted by the team appear here."
            }
          />
        ) : (
          <View style={{ gap: 10 }}>
            {requests.map((request) => {
              const mine = session?.user.id === request.userId;
              return (
                <Card key={request.id}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" numberOfLines={1}>
                        {mine ? "You" : request.userName}
                      </Text>
                      <Text variant="caption">
                        {request.categoryName ?? "Leave"} · {request.days}{" "}
                        {request.days === 1 ? "day" : "days"}
                      </Text>
                    </View>
                    <Badge label={request.status} tone={tone(request.status)} />
                  </View>

                  <Text variant="bodySmall" color={colors.inkMuted}>
                    {formatDate(request.startDate)} → {formatDate(request.endDate)}
                  </Text>
                  {request.reason ? (
                    <Text variant="bodySmall" numberOfLines={3}>
                      {request.reason}
                    </Text>
                  ) : null}

                  {request.status === "pending" && canManage ? (
                    <View style={styles.actions}>
                      <Button
                        label="Approve"
                        size="sm"
                        icon={<Check size={15} color={colors.primaryForeground} />}
                        onPress={() => setDecision({ request, status: "approved" })}
                        style={{ flex: 1 }}
                      />
                      <Button
                        label="Reject"
                        size="sm"
                        variant="secondary"
                        icon={<X size={15} color={colors.ink} />}
                        onPress={() => setDecision({ request, status: "rejected" })}
                        style={{ flex: 1 }}
                      />
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </ScreenScroll>

      <ConfirmDialog
        visible={decision != null}
        title={decision?.status === "approved" ? "Approve this leave?" : "Reject this leave?"}
        message={
          decision
            ? `${decision.request.userName} · ${decision.request.days} ${
                decision.request.days === 1 ? "day" : "days"
              } from ${formatDate(decision.request.startDate)}.`
            : ""
        }
        confirmLabel={decision?.status === "approved" ? "Approve" : "Reject"}
        cancelLabel="Cancel"
        tone={decision?.status === "rejected" ? "danger" : "primary"}
        loading={decide.isPending}
        onConfirm={() => {
          if (decision) decide.mutate(decision);
        }}
        onCancel={() => setDecision(null)}
      />

      <Sheet
        visible={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request leave"
        description="Your manager decides on the request. Dates use YYYY-MM-DD."
      >
        <View style={{ gap: 12 }}>
          {categories.length > 0 ? (
            <View style={styles.categoryRow}>
              {categories.map((category) => {
                const active = categoryId === category.id;
                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setCategoryId(active ? null : category.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primarySoft : colors.surfaceMuted,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: radii.full,
                      },
                    ]}
                  >
                    <Text variant="caption" color={active ? colors.primary : colors.inkSecondary}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <TextField
            label="Start date"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-11-10"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
          <TextField
            label="End date"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="2026-11-12"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
          <TextField
            label="Reason (optional)"
            value={reason}
            onChangeText={setReason}
            placeholder="Family visit"
            multiline
          />

          {formError ? (
            <Text variant="caption" color={colors.danger}>
              {formError}
            </Text>
          ) : null}

          <Button label="Submit request" loading={submit.isPending} onPress={submitRequest} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  addButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: "center",
    borderWidth: 1,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  errorBanner: { flexDirection: "row", alignItems: "center", padding: 10, marginBottom: 12 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
});
