import { apiRequest } from "@/api/client";
import type { TeamMember, TeamRole } from "@/api/types";

type RawOutlet = { id?: number | string | null; name?: string | null };

type RawMembership = {
  id: number | string;
  user_id?: number | string | null;
  role_id?: number | string | null;
  role?: { name?: string | null } | null;
  user?: { name?: string | null; email?: string | null } | null;
  outlets?: RawOutlet[];
  status?: string | null;
  joined_at?: string | null;
};

type RawRole = {
  id: number | string;
  name: string;
  slug?: string | null;
  permissions?: unknown[];
};

/** `GET /memberships` — needs `employees.view`; one row per teammate. */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const page = await apiRequest<{ data: RawMembership[] }>("/memberships", {
    params: { per_page: 50 },
  });

  return (page.data ?? []).map((raw) => ({
    id: String(raw.id),
    userId: raw.user_id == null ? String(raw.id) : String(raw.user_id),
    name: raw.user?.name ?? "Unnamed member",
    email: raw.user?.email ?? "",
    roleId: raw.role_id == null ? null : String(raw.role_id),
    roleName: raw.role?.name ?? "No role",
    outletNames: (raw.outlets ?? [])
      .map((outlet) => outlet.name ?? "")
      .filter(Boolean),
    status: raw.status ?? "active",
    joinedAt: raw.joined_at ?? null,
  }));
}

/** `GET /roles` — needs `employees.view`; the roles an invite can be given. */
export async function fetchTeamRoles(): Promise<TeamRole[]> {
  const data = await apiRequest<RawRole[]>("/roles");
  return (Array.isArray(data) ? data : []).map((raw) => ({
    id: String(raw.id),
    name: raw.name,
    slug: raw.slug ?? null,
    permissionCount: (raw.permissions ?? []).length,
  }));
}

/** `POST /memberships/invite` — needs `employees.manage`. */
export async function inviteTeamMember({
  email,
  roleId,
}: {
  email: string;
  roleId: string;
}): Promise<void> {
  await apiRequest("/memberships/invite", {
    method: "POST",
    body: { email: email.trim(), role_id: Number(roleId) },
  });
}
