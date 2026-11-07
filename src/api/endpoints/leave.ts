import { apiRequest } from "@/api/client";

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export type LeaveRequest = {
  id: string;
  userId: string;
  userName: string;
  categoryName: string | null;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  approvalNotes: string | null;
  approvedAt: string | null;
};

export type LeaveCategory = {
  id: string;
  name: string;
  defaultDays: number;
  isPaid: boolean;
};

type RawLeaveRequest = {
  id: number | string;
  user_id: number | string;
  user?: { name?: string | null } | null;
  category?: { name?: string | null } | null;
  start_date: string;
  end_date: string;
  days?: number | string | null;
  reason?: string | null;
  status?: string | null;
  approval_notes?: string | null;
  approved_at?: string | null;
};

type RawLeaveCategory = {
  id: number | string;
  name: string;
  default_days?: number | string | null;
  is_paid?: boolean | null;
};

function mapLeaveRequest(raw: RawLeaveRequest): LeaveRequest {
  return {
    id: String(raw.id),
    userId: String(raw.user_id),
    userName: raw.user?.name ?? "Teammate",
    categoryName: raw.category?.name ?? null,
    startDate: raw.start_date,
    endDate: raw.end_date,
    days: Number(raw.days ?? 1) || 1,
    reason: raw.reason ?? null,
    status: (raw.status ?? "pending") as LeaveStatus,
    approvalNotes: raw.approval_notes ?? null,
    approvedAt: raw.approved_at ?? null,
  };
}

/** `GET /leave-requests` — needs `leave.view`. */
export async function fetchLeaveRequests({
  status,
  userId,
}: {
  status?: LeaveStatus;
  userId?: string | null;
} = {}): Promise<LeaveRequest[]> {
  const rows = await apiRequest<RawLeaveRequest[]>("/leave-requests", {
    params: { status, user_id: userId ?? undefined },
  });

  return (rows ?? []).map(mapLeaveRequest);
}

/** `GET /leave-categories` — needs `leave.view`. */
export async function fetchLeaveCategories(): Promise<LeaveCategory[]> {
  const rows = await apiRequest<RawLeaveCategory[]>("/leave-categories");

  return (rows ?? []).map((raw) => ({
    id: String(raw.id),
    name: raw.name,
    defaultDays: Number(raw.default_days ?? 0) || 0,
    isPaid: raw.is_paid !== false,
  }));
}

/** `POST /leave-requests` — needs `leave.view`; the request is the caller's. */
export async function createLeaveRequest({
  categoryId,
  startDate,
  endDate,
  reason,
}: {
  categoryId?: string | null;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<LeaveRequest> {
  const raw = await apiRequest<RawLeaveRequest>("/leave-requests", {
    method: "POST",
    body: {
      leave_category_id: categoryId ? Number(categoryId) : undefined,
      start_date: startDate,
      end_date: endDate,
      reason: reason?.trim() || undefined,
    },
  });

  return mapLeaveRequest(raw);
}

/** `POST /leave-requests/{id}/approve` — needs `leave.manage`. */
export async function decideLeaveRequest(
  id: string,
  {
    status,
    approvalNotes,
  }: {
    status: "approved" | "rejected";
    approvalNotes?: string;
  },
): Promise<LeaveRequest> {
  const raw = await apiRequest<RawLeaveRequest>(
    `/leave-requests/${encodeURIComponent(id)}/approve`,
    {
      method: "POST",
      body: { status, approval_notes: approvalNotes?.trim() || undefined },
    },
  );

  return mapLeaveRequest(raw);
}
