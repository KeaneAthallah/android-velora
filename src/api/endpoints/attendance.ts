import { apiRequest } from "@/api/client";

export type AttendanceStatus = "present" | "late" | "early_leave" | "absent";

export type AttendanceRecord = {
  id: string;
  userId: string;
  outletId: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  notes: string | null;
};

type RawAttendance = {
  id: number | string;
  user_id: number | string;
  outlet_id: number | string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  status?: string | null;
  notes?: string | null;
};

function mapAttendance(raw: RawAttendance): AttendanceRecord {
  return {
    id: String(raw.id),
    userId: String(raw.user_id),
    outletId: raw.outlet_id != null ? String(raw.outlet_id) : null,
    checkInAt: raw.check_in_at,
    checkOutAt: raw.check_out_at,
    status: (raw.status ?? "present") as AttendanceStatus,
    notes: raw.notes ?? null,
  };
}

/** `GET /attendances` — needs `attendance.view`. `from`/`to` are ISO bounds. */
export async function fetchAttendances({
  userId,
  from,
  to,
}: {
  userId?: string | null;
  from?: string;
  to?: string;
} = {}): Promise<AttendanceRecord[]> {
  const rows = await apiRequest<RawAttendance[]>("/attendances", {
    params: { user_id: userId ?? undefined, from, to },
  });

  return (rows ?? []).map(mapAttendance);
}

/** `POST /attendances/check-in` — needs `attendance.manage`; always the caller. */
export async function checkIn({
  outletId,
  notes,
}: {
  outletId?: string | null;
  notes?: string;
} = {}): Promise<AttendanceRecord> {
  const raw = await apiRequest<RawAttendance>("/attendances/check-in", {
    method: "POST",
    body: {
      outlet_id: outletId ? Number(outletId) : undefined,
      notes: notes?.trim() || undefined,
    },
  });

  return mapAttendance(raw);
}

/** `POST /attendances/{id}/check-out` — needs `attendance.manage`. */
export async function checkOut(id: string): Promise<AttendanceRecord> {
  const raw = await apiRequest<RawAttendance>(
    `/attendances/${encodeURIComponent(id)}/check-out`,
    { method: "POST" },
  );

  return mapAttendance(raw);
}
