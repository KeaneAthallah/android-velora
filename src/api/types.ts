/** Domain types for the Velora mobile app.
 *
 *  The API returns money as decimal strings with four decimal places, so every
 *  money/quantity field here stays a `string`. Formatting happens at the edge
 *  (`lib/format.ts`) and totals are only ever computed by the server.
 */

export type Permission = string;

export type Workspace = {
  industry: string;
  industryLabel: string;
  modules: Record<string, boolean>;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
  terminology: Record<string, string>;
  defaultRoute: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
};

export type Business = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  industry?: string;
  roleSlug: string;
  roleName: string;
  permissions: Permission[];
};

export type Outlet = {
  id: string;
  businessId: string;
  name: string;
  code: string | null;
  status: "active" | "inactive" | "archived" | string;
};

export type SubscriptionSummary = {
  status: string;
  planName: string | null;
  isTrial: boolean;
  isActive: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
  daysRemaining: number;
};

export type Session = {
  user: User;
  businesses: Business[];
  activeBusiness: Business | null;
  /** Outlets the user is linked to through an outlet membership. */
  memberOutlets: Outlet[];
  permissions: Permission[];
  subscription: SubscriptionSummary | null;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

export type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  sellingPrice: string | null;
  costPrice: string | null;
  isActive: boolean;
};

export type ProductBarcode = {
  id: string;
  barcode: string;
  variantId: string | null;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  unit: string;
  categoryId: string | null;
  category: ProductCategory | null;
  costPrice: string;
  sellingPrice: string;
  trackInventory: boolean;
  isActive: boolean;
  isCombo: boolean;
  variants: ProductVariant[];
  barcodes: ProductBarcode[];
};

export type InventoryBalance = {
  id: string;
  productId: string;
  variantId: string | null;
  outletId: string;
  quantity: string;
  reservedQuantity: string;
  productName: string;
  productSku: string;
  productUnit: string;
};

export type SalesSummary = {
  count: number;
  grossSales: string;
  discounts: string;
  tax: string;
  netSales: string;
  paid: string;
};

export type ProductSalesRow = {
  productId: string;
  productName: string;
  quantity: string;
  total: string;
};

export type OrderType = "dine_in" | "takeaway" | "delivery" | "pickup";

export type SaleItem = {
  id: string;
  productName: string;
  sku: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  lineTotal: string;
  notes: string | null;
};

export type SalePayment = {
  id: string;
  method: string;
  amount: string;
  status: string;
  reference: string | null;
};

export type Sale = {
  id: string;
  receiptNumber: string;
  orderNumber: string;
  status: string;
  orderStatus: string;
  orderType: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
  paidAmount: string;
  changeAmount: string;
  notes: string | null;
  voidReason: string | null;
  voidedAt: string | null;
  createdAt: string;
  items: SaleItem[];
  payments: SalePayment[];
};

/** `GET /sales/{id}/receipt` — a sale plus the entities a printed receipt needs. */
export type SaleReceipt = Sale & {
  outletName: string;
  outletAddress: string | null;
  outletPhone: string | null;
  cashierName: string;
  customerName: string | null;
  promotionCode: string | null;
  promotionDiscount: string;
};

/** A payment rail provisioned for the business (`GET /payment-methods`). */
export type PaymentMethod = {
  id: string;
  code: string;
  name: string;
  /** `cash | qris | debit_card | credit_card | ewallet | transfer | other` */
  type: string;
  requiresReference: boolean;
  isActive: boolean;
  sortOrder: number;
};

/**
 * `POST /promotions/preview` — the server's authoritative cart arithmetic.
 * The client never adds up a total for a customer; it shows this.
 */
export type CartPreview = {
  subtotal: string;
  discountAmount: string;
  promotion: {
    id: string;
    name: string;
    code: string | null;
    type: string;
    value: string;
  } | null;
  promotionDiscount: string;
  loyaltyDiscount: string;
  taxAmount: string;
  total: string;
};

/**
 * `GET /menu?outlet_id=` — a product plus this outlet's live availability, so
 * the register and the 86 board agree on what can be sold right now.
 */
export type MenuProduct = Product & {
  available: boolean;
  unavailableReason: string | null;
};

/** `GET /tables` — a floor area (room, terrace, bar). */
export type DiningArea = {
  id: string;
  outletId: string;
  name: string;
  sortOrder: number;
};

export type ActiveTableOrder = {
  id: string;
  orderNumber: string;
  orderStatus: string;
  total: string;
  itemsCount: number;
  createdAt: string | null;
};

/** `GET /tables` — one table, with the open tab that occupies it, if any. */
export type DiningTable = {
  id: string;
  outletId: string;
  name: string;
  seats: number;
  shape: string;
  /** `available | occupied | reserved | inactive`, derived from the open order. */
  status: string;
  manualStatus: string;
  occupied: boolean;
  isActive: boolean;
  notes: string | null;
  areaId: string | null;
  areaName: string;
  activeOrder: ActiveTableOrder | null;
};

export type FloorPlan = {
  areas: DiningArea[];
  tables: DiningTable[];
};

/** `GET /suppliers` — the contact a purchase order is addressed to. */
export type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

/**
 * `GET /promotions` — a discount code or an automatic offer. `value` is a
 * percentage when `type` is `percentage` and a money amount when it is `fixed`.
 */
export type Promotion = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  type: string;
  value: string;
  minSpend: string | null;
  maxDiscount: string | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
};

/** `GET /stock-transfers` — one line of stock moving between outlets. */
export type StockTransferItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
};

/** `GET /stock-transfers` — a draft that becomes a stock movement when completed. */
export type StockTransfer = {
  id: string;
  fromOutletId: string;
  toOutletId: string;
  status: string;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  items: StockTransferItem[];
};

/** `GET /stocktakes/{id}` — a counted product with expected vs counted stock. */
export type StocktakeItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  expectedQuantity: string;
  countedQuantity: string;
};

/** `GET /stocktakes` — a physical count; posting it writes the variance. */
export type Stocktake = {
  id: string;
  outletId: string;
  outletName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  items: StocktakeItem[];
};

/** `GET /recipes` — one ingredient in a product's bill of materials. */
export type RecipeLine = {
  id: string | null;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantity: string;
  unitCost: string;
  lineCost: string;
};

/** `GET /recipes` — a product with its recipe and recipe cost. */
export type RecipeProduct = {
  productId: string;
  name: string;
  sku: string;
  sellingPrice: string;
  recipeCost: string;
  lines: RecipeLine[];
};

/** `GET /memberships` — one teammate's seat in the business. */
export type TeamMember = {
  id: string;
  /** `users.id` — the id attendance and leave rows reference. */
  userId: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string;
  outletNames: string[];
  status: string;
  joinedAt: string | null;
};

/** `GET /roles` — a role that can be attached to a membership. */
export type TeamRole = {
  id: string;
  name: string;
  slug: string | null;
  permissionCount: number;
};

/** `GET /channels` — an inbound marketplace or online ordering channel. */
export type SalesChannel = {
  id: string;
  name: string;
  code: string;
  kind: string;
  outletId: string | null;
  commissionPercent: string;
  paymentMethodCode: string | null;
  autoAccept: boolean;
  prepBufferMinutes: number;
  active: boolean;
  webhookUrl: string | null;
  lastOrderAt: string | null;
};

/** One row of `usage` on `GET /subscription`. */
export type SubscriptionUsageMetric = {
  metric: string;
  label: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  percent: number;
  unlimited: boolean;
};

/** `GET /subscription` — plan, period, usage meters and feature flags. */
export type SubscriptionDetail = {
  planName: string | null;
  planDescription: string | null;
  status: string;
  isActive: boolean;
  billingPeriod: string;
  priceAmount: number | null;
  currency: string | null;
  trialDaysRemaining: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  daysRemaining: number;
  cancelAtPeriodEnd: boolean;
  usage: SubscriptionUsageMetric[];
  features: { key: string; enabled: boolean }[];
};
