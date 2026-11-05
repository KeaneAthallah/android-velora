import { apiRequest } from "@/api/client";
import { setTenantContext } from "@/services/api-context";
import {
  setStoredBusinessId,
} from "@/services/preferences";
import type {
  Business,
  Outlet,
  Permission,
  Session,
  SubscriptionSummary,
  User,
} from "@/api/types";

/* ------------------------------------------------------------------ */
/*  Raw backend shapes — only this file knows about snake_case.        */
/* ------------------------------------------------------------------ */

type RawPermission = { name?: string; slug?: string } | string;

type RawRole = {
  id: number;
  name: string;
  slug: string;
  permissions?: RawPermission[] | null;
};

type RawBusiness = {
  id: number | string;
  name: string;
  slug: string;
  currency: string | null;
  timezone: string | null;
  industry?: string | null;
};

type RawMembership = {
  id: number | string;
  business_id: number | string;
  status: string | null;
  business?: RawBusiness | null;
  role?: RawRole | null;
};

type RawOutlet = {
  id: number | string;
  business_id: number | string;
  name: string;
  code: string | null;
  status: string | null;
};

type RawOutletMembership = {
  id: number | string;
  outlet_id: number | string;
  outlet?: RawOutlet | null;
};

type RawSubscription = {
  status?: string;
  is_active?: boolean;
  plan?: { name?: string | null; is_trial?: boolean } | null;
  trial_ends_at?: string | null;
  trial_days_remaining?: number;
  days_remaining?: number;
};

type RawUser = {
  id: number | string;
  name: string;
  email: string;
  avatar_url?: string | null;
  is_platform_admin?: boolean;
  business_memberships?: RawMembership[] | null;
  outlet_memberships?: RawOutletMembership[] | null;
  subscription?: RawSubscription | null;
};

type AuthResponse = { token: string; user?: RawUser };

export type SignInInput = { email: string; password: string };
export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

/* ------------------------------------------------------------------ */
/*  Mapping                                                           */
/* ------------------------------------------------------------------ */

const OWNER_ROLES = new Set(["owner", "admin"]);

function permissionNames(role: RawRole | null | undefined): Permission[] {
  if (!role) return [];
  const names: Permission[] = [];
  for (const entry of role.permissions ?? []) {
    const name = typeof entry === "string" ? entry : entry.name ?? entry.slug;
    if (name) names.push(name);
  }
  return Array.from(new Set(names));
}

function mapBusiness(membership: RawMembership): Business {
  const raw = membership.business;
  const role = membership.role ?? null;
  const permissions = permissionNames(role);
  const isOwner = role != null && OWNER_ROLES.has(role.slug);

  return {
    id: String(membership.business_id),
    name: raw?.name ?? "Business",
    slug: raw?.slug ?? String(membership.business_id),
    currency: raw?.currency ?? "USD",
    timezone: raw?.timezone ?? "UTC",
    industry: raw?.industry ?? undefined,
    roleSlug: role?.slug ?? "member",
    roleName: role?.name ?? "Member",
    permissions: isOwner && !permissions.includes("*") ? ["*", ...permissions] : permissions,
  };
}

function mapOutlet(raw: RawOutlet): Outlet {
  return {
    id: String(raw.id),
    businessId: String(raw.business_id),
    name: raw.name,
    code: raw.code ?? null,
    status: raw.status ?? "active",
  };
}

function mapSubscription(raw: RawSubscription | null | undefined): SubscriptionSummary | null {
  if (!raw) return null;
  return {
    status: raw.status ?? "unknown",
    planName: raw.plan?.name ?? null,
    isTrial: raw.plan?.is_trial ?? false,
    isActive: raw.is_active === true,
    trialEndsAt: raw.trial_ends_at ?? null,
    trialDaysRemaining: raw.trial_days_remaining ?? 0,
    daysRemaining: raw.days_remaining ?? 0,
  };
}

export function mapSession(raw: RawUser, desiredBusinessId: string | null): Session {
  const memberships = (raw.business_memberships ?? []).filter(
    (membership) =>
      membership.status !== "inactive" && membership.business != null,
  );

  const businesses = memberships.map(mapBusiness);

  const activeBusiness =
    businesses.find((business) => business.id === desiredBusinessId) ??
    businesses[0] ??
    null;

  const seen = new Set<string>();
  const memberOutlets: Outlet[] = [];
  for (const membership of raw.outlet_memberships ?? []) {
    if (!membership.outlet) continue;
    const outlet = mapOutlet(membership.outlet);
    if (seen.has(outlet.id)) continue;
    seen.add(outlet.id);
    memberOutlets.push(outlet);
  }

  const user: User = {
    id: String(raw.id),
    name: raw.name,
    email: raw.email,
    avatarUrl: raw.avatar_url ?? null,
    isPlatformAdmin: raw.is_platform_admin === true,
  };

  return {
    user,
    businesses,
    activeBusiness,
    memberOutlets,
    permissions:
      activeBusiness?.permissions ??
      (user.isPlatformAdmin ? ["*"] : []),
    subscription: mapSubscription(raw.subscription),
  };
}

/* ------------------------------------------------------------------ */
/*  Requests                                                          */
/* ------------------------------------------------------------------ */

export async function signInRequest(input: SignInInput): Promise<string> {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email: input.email.trim(), password: input.password },
  });
  return response.token;
}

export async function googleSignInRequest(idToken: string): Promise<string> {
  const response = await apiRequest<AuthResponse>("/auth/google/token", {
    method: "POST",
    body: { id_token: idToken },
  });
  return response.token;
}

export async function signUpRequest(input: SignUpInput): Promise<string> {
  const response = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: {
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    },
  });
  return response.token;
}

/**
 * Load `/me` for a business. The tenant header has to be set before the
 * request because `/me` resolves the active membership (and subscription)
 * from `X-Business-Id`.
 */
export async function fetchSession(desiredBusinessId: string | null): Promise<Session> {
  setTenantContext({ businessId: desiredBusinessId, outletId: null });

  const raw = await apiRequest<RawUser>("/me");
  const session = mapSession(raw, desiredBusinessId);

  if (session.activeBusiness && session.activeBusiness.id !== desiredBusinessId) {
    await setStoredBusinessId(session.activeBusiness.id);
  }
  setTenantContext({
    businessId: session.activeBusiness?.id ?? null,
    outletId: null,
  });

  return session;
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiRequest<null>("/auth/logout", { method: "POST" });
  } catch {
    // The device token is cleared regardless; an offline logout is fine.
  }
}
