type TenantContext = {
  businessId: string | null;
  outletId: string | null;
};

let ctx: TenantContext = {
  businessId: null,
  outletId: null,
};

export function setTenantContext(next: Partial<TenantContext>): void {
  ctx = { ...ctx, ...next };
}

export function getTenantContext(): TenantContext {
  return ctx;
}
