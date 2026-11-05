import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Users } from "lucide-react-native";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import {
  useInviteTeamMemberMutation,
  useTeamMembers,
  useTeamRoles,
} from "@/features/team/use-team";
import { formatDate } from "@/lib/format";
import { AppHeader } from "@/components/layout/app-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import type { TeamMember } from "@/api/types";

function statusTone(status: string): BadgeTone {
  if (status === "active") return "success";
  if (status === "invited") return "info";
  return "neutral";
}

export default function TeamScreen() {
  const { colors } = useTheme();
  const { has } = usePermissions();
  const membersQuery = useTeamMembers();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), 250);
  const [detail, setDetail] = useState<TeamMember | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const rolesQuery = useTeamRoles(inviteOpen);
  const inviteMutation = useInviteTeamMemberMutation();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const members = useMemo(() => {
    const rows = membersQuery.data ?? [];
    if (!search) return rows;
    return rows.filter(
      (member) =>
        member.name.toLowerCase().includes(search) ||
        member.email.toLowerCase().includes(search) ||
        member.roleName.toLowerCase().includes(search),
    );
  }, [membersQuery.data, search]);

  if (!has("employees.view")) {
    return (
      <Screen>
        <AppHeader title="Team" subtitle="Members and roles" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Team not enabled for your role"
            message="A manager can grant employees view."
          />
        </View>
      </Screen>
    );
  }

  const canManage = has("employees.manage");
  const roles = rolesQuery.data ?? [];

  const openInvite = () => {
    setError(null);
    setEmail("");
    setRoleId(null);
    setInviteOpen(true);
  };

  const submitInvite = async () => {
    if (!email.trim() || !roleId) {
      setError("An email and a role are both required.");
      return;
    }

    setError(null);
    try {
      await inviteMutation.mutateAsync({ email: email.trim(), roleId });
      setInviteOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the invite.");
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Team"
        subtitle={`${members.length} ${members.length === 1 ? "member" : "members"}`}
        showBack
        right={
          canManage ? <Button label="Invite" size="sm" onPress={openInvite} /> : undefined
        }
      />

      <View style={styles.controls}>
        <SearchField
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search name, email or role"
          accessibilityLabel="Search team"
        />
      </View>

      {membersQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} height={76} radius={12} />
          ))}
        </View>
      ) : membersQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              membersQuery.error instanceof Error
                ? membersQuery.error.message
                : "Could not load the team."
            }
            onRetry={() => void membersQuery.refetch()}
          />
        </View>
      ) : members.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={Users}
            title={search ? "No matching members" : "No teammates yet"}
            description={
              search
                ? "Try a different name, email or role."
                : "Invite a teammate to let them sign in to this business."
            }
            actionLabel={search ? "Clear search" : undefined}
            onAction={search ? () => setSearchInput("") : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(member) => member.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={membersQuery.isRefetching && !membersQuery.isLoading}
              onRefresh={() => void membersQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.name}`}
              onPress={() => setDetail(item)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Card style={styles.row}>
                <Avatar name={item.name} size={40} />
                <View style={styles.rowText}>
                  <Text variant="body" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {item.email || "No email"}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {item.roleName}
                    {item.outletNames.length > 0
                      ? ` · ${item.outletNames.join(", ")}`
                      : ""}
                  </Text>
                </View>
                <Badge label={item.status} tone={statusTone(item.status)} />
              </Card>
            </Pressable>
          )}
        />
      )}

      <Sheet
        visible={detail != null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description={detail?.email || "Team member"}
      >
        {detail ? (
          <View style={styles.sheetBody}>
            <Card padded={false} style={styles.sheetCard}>
              <View style={styles.sheetRow}>
                <Text variant="label">Role</Text>
                <Text variant="body">{detail.roleName}</Text>
              </View>
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <View style={styles.sheetRow}>
                <Text variant="label">Status</Text>
                <Badge label={detail.status} tone={statusTone(detail.status)} />
              </View>
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <View style={styles.sheetRow}>
                <Text variant="label">Outlets</Text>
                <Text variant="body" style={styles.sheetValue}>
                  {detail.outletNames.length > 0
                    ? detail.outletNames.join(", ")
                    : "No outlets assigned"}
                </Text>
              </View>
              {detail.joinedAt ? (
                <>
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  <View style={styles.sheetRow}>
                    <Text variant="label">Joined</Text>
                    <Text variant="body">{formatDate(detail.joinedAt)}</Text>
                  </View>
                </>
              ) : null}
            </Card>

            <Text variant="caption">
              Changing a role, outlet access or removing a member is done in the
              Team screen on the web app.
            </Text>
          </View>
        ) : null}
      </Sheet>

      <Sheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a teammate"
        description="They get access to this business only"
      >
        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="teammate@company.com"
          />

          <View>
            <Text variant="label" style={styles.roleLabel}>
              Role
            </Text>

            {rolesQuery.isLoading ? (
              <Skeleton height={54} radius={12} />
            ) : rolesQuery.isError ? (
              <View style={styles.rolesError}>
                <Text variant="caption" color={colors.danger}>
                  {rolesQuery.error instanceof Error
                    ? rolesQuery.error.message
                    : "Could not load roles."}
                </Text>
                <Button
                  label="Retry"
                  size="sm"
                  variant="secondary"
                  onPress={() => void rolesQuery.refetch()}
                />
              </View>
            ) : roles.length === 0 ? (
              <Text variant="caption">
                No roles found for this business. Create one on the web app first.
              </Text>
            ) : (
              <View style={styles.roleList}>
                {roles.map((role) => {
                  const selected = roleId === role.id;
                  return (
                    <Pressable
                      key={role.id}
                      accessibilityRole="button"
                      accessibilityLabel={role.name}
                      accessibilityState={{ selected }}
                      onPress={() => setRoleId(role.id)}
                      style={[
                        styles.roleChip,
                        {
                          backgroundColor: selected
                            ? colors.primarySoft
                            : colors.surface,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        variant="bodySmall"
                        color={selected ? colors.primary : colors.ink}
                      >
                        {role.name}
                      </Text>
                      <Text variant="caption">
                        {role.permissionCount}{" "}
                        {role.permissionCount === 1 ? "permission" : "permissions"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {error ? (
            <Text variant="caption" color={colors.danger}>
              {error}
            </Text>
          ) : null}

          <Button
            label={inviteMutation.isPending ? "Sending…" : "Send invite"}
            onPress={() => void submitInvite()}
            loading={inviteMutation.isPending}
            disabled={inviteMutation.isPending}
            fullWidth
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { flex: 1, gap: 1 },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { paddingHorizontal: 16, gap: 10 },
  sheetBody: { gap: 12, paddingBottom: 8 },
  sheetCard: { paddingVertical: 2 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sheetValue: { flex: 1, textAlign: "right" },
  separator: { height: StyleSheet.hairlineWidth },
  form: { gap: 12, paddingBottom: 8 },
  roleLabel: { marginBottom: 6 },
  roleList: { gap: 8 },
  rolesError: { gap: 8, alignItems: "flex-start" },
  roleChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 1,
  },
});
