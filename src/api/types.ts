/** Domain types for the Velora mobile app.
 *
 *  The API returns money as decimal strings with four decimal places, so every
 *  money/quantity field here stays a `string`. Formatting happens at the edge
 *  (`lib/format.ts`) and totals are only ever computed by the server.
 */

export type Permission = string;

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

export type SaleItem = {
  id: string;
  productName: string;
  sku: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
};

export type SalePayment = {
  id: string;
  method: string;
  amount: string;
  status: string;
};

export type Sale = {
  id: string;
  receiptNumber: string;
  orderNumber: string;
  status: string;
  orderType: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
  paidAmount: string;
  createdAt: string;
  items: SaleItem[];
  payments: SalePayment[];
};
