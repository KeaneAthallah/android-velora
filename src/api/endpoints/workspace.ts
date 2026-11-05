import { apiRequest } from "@/api/client";
import type { Workspace } from "@/api/types";

export async function fetchWorkspace(): Promise<Workspace> {
  const raw = await apiRequest<any>("/workspace");
  const payload = raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
  return {
    industry: payload.industry,
    industryLabel: payload.industry_label ?? payload.industry,
    modules: payload.modules ?? {},
    features: payload.features ?? {},
    limits: payload.limits ?? {},
    terminology: payload.terminology ?? {},
    defaultRoute: payload.default_route ?? "/",
  };
}