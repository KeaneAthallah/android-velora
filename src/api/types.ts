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

/** One product's recipe share of an ingredient, from the ingredients dashboard. */
export type IngredientUsageProduct = {
  productId: string;
  productName: string | null;
  productVariantId: string | null;
  /** Quantity as written on the recipe line, in `unit`. */
  quantity: string;
  unit: string;
  /** The same quantity converted into the ingredient's stocking unit. */
  quantityInIngredientUnit: string;
  /** Whole units still producible from the outlet balance; null when no stock. */
  producible: number | null;
};

/** `GET /ingredients/dashboard` — stock, usage and where an ingredient goes. */
export type IngredientUsage = {
  ingredientId: string;
  name: string;
  sku: string;
  unit: string;
  remaining: string;
  consumed: string;
  received: string;
  reorderLevel: string;
  /** Hard floor below the reorder level; 0 means no floor is set. */
  safetyStock: string;
  lowStock: boolean;
  /** At or under the safety stock, even if the reorder level has not fired. */
  critical: boolean;
  trackInventory: boolean;
  products: IngredientUsageProduct[];
};

/** One `ingredient_movements` row: a purchase, sale deduction, void or wastage. */
export type IngredientStockMovement = {
  id: string;
  ingredientId: string;
  type: string;
  /** Signed quantity in the ingredient's stocking unit. */
  quantity: string;
  balanceAfter: string;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
};

/** One ingredient's contribution to a product's sellable count. */
export type AvailabilityLine = {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  available: string;
  requiredPerUnit: string;
  reorderLevel: string;
  possible: number;
};

/** `GET /recipes/availability` — how many whole units an outlet can still make. */
export type ProductAvailability = {
  productId: string;
  productName: string;
  /** null when the recipe has no tracked ingredients. */
  sellable: number | null;
  unlimited: boolean;
  status: "available" | "low_stock" | "out_of_stock";
  limiting: AvailabilityLine | null;
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

/** How a reorder forecast was produced: recipe demand, photo/use pattern, none. */
export type ReorderMethod = "recipe-demand" | "photo-demand" | "none";

/** Theoretical recipe usage vs product units actually sold over the lookback. */
export type ReorderConsumption = {
  theoretical: string;
  soldUnits: number;
  recipeDriven: boolean;
};

/** Shelf-life risk for a perishable ingredient, when the server can model it. */
export type ReorderWasteRisk = {
  likelyWasteQuantity: string;
  note: string;
};

/** The forecast a parcel's supplier lead time would produce. */
export type ReorderParcelPreview = {
  leadTimeDays: number;
  leadTimeDemand: string;
  targetStock: string;
  reorderQuantity: string;
  predictedStockAtReorderDate: string;
  /** Whole parcels needed for `reorderQuantity`, or null if the size is unknown. */
  parcelsRequired: number | null;
  /** `parcelsRequired × parcelCost`, priced by the server. */
  totalCost: string | null;
  /** Stock still on hand after the cover window, from buying whole parcels. */
  leftoverStock: string | null;
};

/** A supplier parcel suggested for a product line; the copilot never orders it. */
export type ReorderParcel = {
  parcelQuantity: string;
  parcelCost: string;
  /** `parcelCost ÷ parcelQuantity`, i.e. the price per ingredient unit. */
  unitCost: string | null;
  supplierId: string;
  supplierName: string | null;
  supplierLeadTimeDays: number | null;
  /** null when the supplier has no lead time, so the parcel changes nothing. */
  preview: ReorderParcelPreview | null;
};

/** Photo/use-pattern model output, used when an ingredient has no recipe. */
export type ReorderPhotoPattern = {
  patternId: string;
  name: string;
  consumptionRate: string;
  photoShareEstimate: string;
  suggestedParcels: ReorderParcel[];
};

/** `GET /reorder/forecast` — one ingredient's projected demand and buy quantity. */
export type ReorderIngredientForecast = {
  method: ReorderMethod;
  dailyDemand: string;
  leadTimeDemand: string;
  /** null when the ingredient has no demand model. */
  targetStock: string | null;
  currentStock: string;
  reorderQuantity: string;
  reorderQuantityUnit: string;
  reorderReason: string;
  predictedStockAtReorderDate: string;
  daysOfStockRemaining: string | null;
  wasteRisk: ReorderWasteRisk | null;
  blindSpot: string | null;
  shelfLifeNote: string | null;
  leadTimeDays: number | null;
};

/** `GET /reorder/forecast` — an ingredient with its forecast and consumption. */
export type ReorderIngredient = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  costPerUnit: string;
  currentStock: string;
  reorderLevel: string;
  shelfLifeDays: number;
  isTracked: boolean;
  leadTimeDays: number;
  photoPattern: ReorderPhotoPattern | null;
  /** Supplier parcels recorded for this ingredient, cheapest per unit first. */
  suggestedParcels: ReorderParcel[];
  forecast: ReorderIngredientForecast;
  consumption: ReorderConsumption;
};

/** `GET /reorder/forecast` — read-only demand forecast for the active outlet. */
export type ReorderForecast = {
  forecastAt: string;
  lookback: { from: string; until: string; days: number };
  settings: {
    defaultLeadDays: number;
    minCoverageDays: number;
    models: { demand: boolean; shelfLife: boolean; leadTime: boolean };
  };
  ingredients: ReorderIngredient[];
  purchaseMoneyBudget: { amount: string; currency: string; note: string };
  suggestedParcelsByProduct: Record<string, ReorderParcel[]>;
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
