import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, LogIn, LogOut, Users } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useAuth, usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/api/client";
import {
  checkIn,
  checkOut,
  fetchAttendances,
  type AttendanceStatus,
} from "@/api/endpoints/attendance";
import { fetchTeamMembers } from "@/api/endpoints/memberships";
import { queryKeys } from "@/lib/query-keys";

function todayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function tone(status: AttendanceStatus): BadgeTone {
  if (status === "present") return "success";
  if (status === "late" || status === "early_leave") return "warning";
  return "danger";
}

function clockTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AttendanceScreen() {
  const { colors } = useTheme();
  const { has } = usePermissions();
  const { session } = useAuth();
  const { business, businessId, outlet } = useTenant();
  const outletId = outlet?.id ?? null;
  const queryClient = useQueryClient();

  const canView = has("attendance.view");
  const canManage = has("attendance.manage");
  const myUserId = session?.user.id ?? null;
  const bounds = useMemo(() => todayBounds(), []);

  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendances(businessId, outletId),
    queryFn: () => fetchAttendances(bounds),
    enabled: Boolean(businessId) && canView,
    refetchInterval: 60_000,
  });

  const teamQuery = useQuery({
    queryKey: queryKeys.teamMembers(businessId),
    queryFn: fetchTeamMembers,
    enabled: Boolean(businessId) && canView && has("employees.view"),
    staleTime: 5 * 60_000,
  });

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of teamQuery.data ?? []) map.set(member.userId, member.name);
    return map;
  }, [teamQuery.data]);

  const records = attendanceQuery.data ?? [];
  const myRecord = records.find(
    (record) => myUserId != null && record.userId === myUserId && !record.checkOutAt,
  );
  const lastMine = myRecord ?? records.find((record) => record.userId === myUserId);

  const onDone = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.attendances(businessId, outletId),
    });

  const signIn = useMutation({
    mutationFn: () => checkIn({ outletId }),
    onSuccess: onDone,
  });

  const signOut = useMutation({
    mutationFn: (id: string) => checkOut(id),
    onSuccess: onDone,
  });

  const pending = signIn.isPending || signOut.isPending;
  const actionError = signIn.error ?? signOut.error;

  if (!canView) {
    return (
      <Screen>
        <AppHeader title="Attendance" subtitle="Clock in and out" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Attendance is not enabled for your role"
            message="A manager can grant attendance view in the Velora web app."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Attendance"
        subtitle={`${outlet?.name ?? business?.name ?? "Workspace"} · today`}
        showBack
      />

      <ScreenScroll
        refreshing={attendanceQuery.isRefetching}
        onRefresh={() => {
          void attendanceQuery.refetch();
          void teamQuery.refetch();
        }}
      >
        {attendanceQuery.isPending ? (
          <View style={{ gap: 10 }}>
            <Skeleton height={120} />
            <Skeleton height={70} />
            <Skeleton height={70} />
          </View>
        ) : attendanceQuery.isError ? (
          <ErrorState
            title="Could not load attendance"
            message={errorMessage(attendanceQuery.error, "Check the connection and try again.")}
            onRetry={() => void attendanceQuery.refetch()}
          />
        ) : (
          <View style={{ gap: 16 }}>
            <Card>
              <View style={styles.cardHead}>
                <CalendarClock size={18} color={colors.primary} />
                <Text variant="title">Your day</Text>
              </View>

              {lastMine ? (
                <View style={{ gap: 2 }}>
                  <Text variant="bodySmall">
                    {lastMine.checkOutAt
                      ? `Checked out at ${clockTime(lastMine.checkOutAt)}`
                      : `Checked in at ${clockTime(lastMine.checkInAt)}`}
                  </Text>
                  <Text variant="caption">
                    In {clockTime(lastMine.checkInAt)} · out{" "}
                    {lastMine.checkOutAt ? clockTime(lastMine.checkOutAt) : "—"}
                  </Text>
                </View>
              ) : (
                <Text variant="bodySmall">You have not checked in today.</Text>
              )}

              {canManage ? (
                <Button
                  label={myRecord ? "Check out" : "Check in"}
                  icon={
                    myRecord ? (
                      <LogOut size={16} color={colors.primaryForeground} />
                    ) : (
                      <LogIn size={16} color={colors.primaryForeground} />
                    )
                  }
                  loading={pending}
                  onPress={() => {
                    if (myRecord) {
                      signOut.mutate(myRecord.id);
                    } else {
                      signIn.mutate();
                    }
                  }}
                />
              ) : (
                <Text variant="caption">
                  Checking in needs the attendance manage permission.
                </Text>
              )}

              {actionError ? (
                <Text variant="caption" color={colors.danger}>
                  {errorMessage(actionError)}
                </Text>
              ) : null}
            </Card>

            <View style={{ gap: 10 }}>
              <Text variant="title">Today · {records.length}</Text>

              {records.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No check-ins yet"
                  description="Attendance records for today appear here as the team clocks in."
                />
              ) : (
                records.map((record) => (
                  <Card key={record.id}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" numberOfLines={1}>
                          {record.userId === myUserId
                            ? "You"
                            : (names.get(record.userId) ?? "Teammate")}
                        </Text>
                        <Text variant="caption">
                          In {clockTime(record.checkInAt)} · out{" "}
                          {record.checkOutAt ? clockTime(record.checkOutAt) : "still in"}
                        </Text>
                      </View>
                      <Badge
                        label={record.status.replace(/_/g, " ")}
                        tone={tone(record.status)}
                      />
                    </View>
                  </Card>
                ))
              )}
            </View>
          </View>
        )}
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
