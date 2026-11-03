import type { Permission } from "@/api/types";

/**
 * Permission gate for UI only — the API enforces every rule. `"*"` means the
 * member is an owner/admin and holds every permission. An array means "any of".
 */
export function hasPermission(
  permissions: Permission[] | null | undefined,
  required: Permission | Permission[] | null | undefined,
): boolean {
  if (!required) return true;
  const list = permissions ?? [];
  if (list.includes("*")) return true;
  const wanted = Array.isArray(required) ? required : [required];
  if (wanted.length === 0) return true;
  return wanted.some((permission) => list.includes(permission));
}
