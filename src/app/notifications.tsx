import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Bell, CheckCheck } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/theme";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ScreenScroll } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/endpoints/notifications";

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const inbox = useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => fetchNotifications(unreadOnly),
  });

  const read = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const rows = inbox.data?.notifications ?? [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <AppHeader
        title="Notifications"
        subtitle={`${inbox.data?.unreadCount ?? 0} unread`}
        showBack
        right={
          <Button
            label="Read all"
            size="sm"
            variant="ghost"
            icon={<CheckCheck size={15} color={colors.primary} />}
            onPress={() => readAll.mutate()}
            loading={readAll.isPending}
            disabled={(inbox.data?.unreadCount ?? 0) === 0}
          />
        }
      />

      <ScreenScroll
        refreshing={inbox.isRefetching}
        onRefresh={() => inbox.refetch()}
      >
        <View style={styles.filterRow}>
          <Button
            label={unreadOnly ? "Show all" : "Unread only"}
            size="sm"
            variant={unreadOnly ? "primary" : "secondary"}
            onPress={() => setUnreadOnly((value) => !value)}
          />
        </View>

        {inbox.isPending ? (
          <View style={{ gap: 10 }}>
            <Skeleton height={72} />
            <Skeleton height={72} />
          </View>
        ) : inbox.isError ? (
          <ErrorState
            title="Could not load notifications"
            message="Check the connection and try again."
            onRetry={() => inbox.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="You are all caught up"
            description="Sales, stock and support updates appear here."
          />
        ) : (
          <View style={{ gap: 10 }}>
            {rows.map((row) => {
              const unread = !row.readAt;
              return (
                <Pressable
                  key={row.id}
                  disabled={!unread || read.isPending}
                  onPress={() => read.mutate(row.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.title}. ${unread ? "Mark as read" : "Read"}`}
                >
                  <Card>
                    <View style={styles.cardHead}>
                      <Text variant="title" style={{ flex: 1 }}>
                        {row.title}
                      </Text>
                      {unread ? <Badge label="New" tone="info" /> : null}
                    </View>
                    {row.body ? (
                      <Text variant="bodySmall" color={colors.inkMuted}>
                        {row.body}
                      </Text>
                    ) : null}
                    <Text variant="caption" color={colors.inkMuted}>
                      {relative(row.createdAt)} · {row.type}
                    </Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  filterRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 12 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
});
