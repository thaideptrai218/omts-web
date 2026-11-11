const routes = {
  zone: "/farming/zones", raft: "/farming/rafts", cycle: "/farming/cycles",
  seeding: "/operations/seeding", material: "/operations/material-usages", harvest: "/operations/harvest",
  yield: "/operations/harvest-yield", lot: "/operations/lot-tracing", water: "/operations/water",
  employee: "/employees", supplier: "/workspace/suppliers", purchaseReceipt: "/operations/purchase-receipts",
  inputItem: "/inputs/items", customer: "/workspace/customers", salesInvoice: "/operations/sales-invoice-list",
  cashBook: "/operations/cash-book",
} as const;

export type FarmingReferenceKind = keyof typeof routes;
export type FarmingReference = {
  recordId?: string | null; search?: string | null; code?: string | null;
  zoneId?: string | null; raftId?: string | null; cycleId?: string | null;
  from?: string | null; to?: string | null;
};

/** Use returned identifiers only. Catalogue/document lists already open exact matches through `code`. */
export function farmingReferenceHref(kind: FarmingReferenceKind, reference: FarmingReference = {}) {
  const params = new URLSearchParams();
  for (const key of ["zoneId", "raftId", "cycleId", "recordId", "search", "code", "from", "to"] as const) {
    const value = reference[key]?.trim();
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return `${routes[kind]}${query ? `?${query}` : ""}`;
}
