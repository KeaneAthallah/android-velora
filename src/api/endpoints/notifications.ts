import { apiRequest } from "@/api/client";

export type InboxNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

type RawNotification = {
  id: number | string;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  read_at?: string | null;
  created_at?: string | null;
};

type RawInbox = {
  notifications?: { data?: RawNotification[] };
  unread_count?: number;
};

function mapNotification(raw: RawNotification): InboxNotification {
  return {
    id: String(raw.id),
    type: raw.type ?? "system",
    title: raw.title ?? "",
    body: raw.body ?? null,
    readAt: raw.read_at ?? null,
    createdAt: raw.created_at ?? new Date().toISOString(),
  };
}

export async function fetchNotifications(unreadOnly = false): Promise<{
  notifications: InboxNotification[];
  unreadCount: number;
}> {
  const data = await apiRequest<RawInbox>(
    `/notifications${unreadOnly ? "?unread_only=1" : ""}`,
  );

  return {
    notifications: (data.notifications?.data ?? []).map(mapNotification),
    unreadCount: Number(data.unread_count ?? 0),
  };
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const data = await apiRequest<{ unread_count?: number }>(
    "/notifications/unread-count",
  );
  return Number(data.unread_count ?? 0);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest("/notifications/read-all", { method: "POST" });
}
