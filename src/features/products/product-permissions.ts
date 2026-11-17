type Held = { functionCode: string; action: string };
type Pair = readonly [string, string];
/** The functions that let a staff account read the whole product catalogue (stock, movements, lots, price history, groups, export); the Owner always may. Same set as the backend's product reader. */
export const catalogueReaders: readonly Pair[] = [["SALES_INVOICES", "Create"], ["SALES_INVOICES", "View"], ["PRODUCT_DISPOSALS", "View"], ["HARVEST_LOTS", "View"]];
/** Whoever records or corrects harvests may also read the plain list and detail of the products In Use, to pick the products of a lot. */
export const pickerReaders: readonly Pair[] = [...catalogueReaders, ["HARVESTS", "Create"], ["HARVESTS", "Edit"], ["SALES_ORDERS", "View"], ["SALES_ORDERS", "Create"]];

const holds = (pairs: readonly Pair[], functions: readonly Held[]) => pairs.some(([fn, action]) => functions.some((p) => p.functionCode === fn && p.action === action));

/** Whether the account may open the Sản phẩm catalogue: the Owner, or a staff account holding one of the reading functions. */
export const canReadProducts = (identity: { subjectType: string }, functions: readonly Held[]) =>
  identity.subjectType === "CooperativeOwner" || identity.subjectType === "Staff" && holds(catalogueReaders, functions);
