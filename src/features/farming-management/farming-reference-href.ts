const routes = {
  zone: "/farming/zones", raft: "/farming/rafts", nursery: "/farming/nursery",
  seeding: "/operations/seeding", material: "/operations/material-usages", harvest: "/operations/harvest",
  yield: "/operations/harvest-yield", lot: "/operations/lot-tracing", water: "/operations/water",
  employee: "/employees", supplier: "/workspace/suppliers", purchaseReceipt: "/operations/purchase-receipts",
  inputItem: "/inputs/items", customer: "/workspace/customers", salesInvoice: "/operations/sales-invoice-list",
  cashBook: "/operations/cash-book", inputUse: "/inputs/uses", inputDisposal: "/inputs/disposals",
} as const;

/** `cycle` has no screen of its own: the cycles live in the "Chu kỳ nuôi" tab of the raft (see `farmingReferenceHref`). */
export type FarmingReferenceKind = keyof typeof routes | "cycle";
export type FarmingReference = {
  recordId?: string | null; search?: string | null; code?: string | null;
  zoneId?: string | null; raftId?: string | null; cycleId?: string | null;
  from?: string | null; to?: string | null;
  /** Opens this tab of the target record (raft: info | cycles | logs | materials | lanes; zone: info | map | rafts | licenses | staff | water). */
  tab?: string | null;
};

/**
 * Use returned identifiers only. Catalogue/document lists already open exact matches through `code`.
 * A `cycle` reference opens its raft on the "Chu kỳ nuôi" tab (the cycle id is not needed: the tab shows the open cycle and the history); `tab: "logs"` opens the care log.
 */
export function farmingReferenceHref(kind: FarmingReferenceKind, reference: FarmingReference = {}): string {
  if (kind === "cycle") return farmingReferenceHref("raft", { zoneId: reference.zoneId, recordId: reference.raftId, search: reference.search, tab: reference.tab === "logs" ? "logs" : "cycles" });
  const params = new URLSearchParams();
  for (const key of ["zoneId", "raftId", "cycleId", "recordId", "search", "code", "tab", "from", "to"] as const) {
    const value = reference[key]?.trim();
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return `${routes[kind as keyof typeof routes]}${query ? `?${query}` : ""}`;
}
