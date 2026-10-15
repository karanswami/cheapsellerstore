export type SupplierSettingsDto = {
  enabled: boolean;
  configured: boolean;
  apiKeyMasked: string;
  hasApiKey: boolean;
  baseUrl: string;
};

export type SupplierBalanceDto = {
  balance: string;
  currency: string;
  lifetime_keys: number;
};

export type SupplierCatalogItemDto = {
  id: number;
  name: string;
  price: string;
  in_stock: boolean;
  group_name?: string;
  validity_days?: number | null;
  stock_count?: number | null;
  list_price?: string | null;
  requires_android_id?: boolean;
};

export type SupplierCatalogSummaryDto = {
  totalProducts: number;
  totalGroups: number;
  inStock: number;
  outOfStock: number;
};

export type SupplierCatalogMappingDto = {
  supplierProductId: number;
  durationId: string;
  durationLabel: string;
  productId: string;
  productTitle: string;
};

export type SupplierCatalogDto = {
  items: SupplierCatalogItemDto[];
  fetchedAt: string | null;
  summary: SupplierCatalogSummaryDto;
  mappings: SupplierCatalogMappingDto[];
};

export type SupplierLogRow = {
  id: string;
  endpoint: string;
  method: string;
  httpStatus: number;
  ok: boolean;
  productId: number | null;
  quantity: number | null;
  idempotencyKey: string | null;
  orderId: string | null;
  durationId: string | null;
  userId: string | null;
  requestJson: string;
  responseJson: string;
  usedFallback: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type SupplierLogsPage = {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  rows: SupplierLogRow[];
};
