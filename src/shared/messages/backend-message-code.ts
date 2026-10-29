import { messageCatalog, type MessageCode } from "./message-catalog";

// Semantic categories for existing control flow, not a reverse mapping of legacyCode.
// One old code can map to several new situations; the recognized new code wins.
const categories: Readonly<Record<string, string>> = {
  "MSG-GEN-01": "MSG01", "MSG-GEN-02": "MSG03", "MSG-GEN-03": "MSG05", "MSG-GEN-04": "MSG09", "MSG-GEN-05": "MSG10", "MSG-GEN-06": "MSG11", "MSG-GEN-08": "MSG02", "MSG-GEN-09": "MSG61", "MSG-GEN-10": "MSG08",
  "MSG-ACCOUNT-02": "MSG57", "MSG-ACCOUNT-03": "MSG14", "MSG-ACCOUNT-04": "MSG67", "MSG-ACCOUNT-05": "MSG12", "MSG-ACCOUNT-06": "MSG69", "MSG-ACCOUNT-07": "MSG13", "MSG-ACCOUNT-08": "MSG68", "MSG-ACCOUNT-09": "MSG01", "MSG-ACCOUNT-10": "MSG18", "MSG-ACCOUNT-11": "MSG18", "MSG-ACCOUNT-13": "MSG04", "MSG-ACCOUNT-14": "MSG17", "MSG-ACCOUNT-15": "NO_VERIFIED_EMAIL", "MSG-ACCOUNT-16": "MSG16", "MSG-ACCOUNT-17": "MSG16", "MSG-ACCOUNT-18": "TOO_MANY_REQUESTS", "MSG-ACCOUNT-19": "MSG62", "MSG-ACCOUNT-20": "MSG15", "MSG-ACCOUNT-21": "MSG22",
  "MSG-WATER-01": "MSG04", "MSG-WATER-05": "MSG28", "MSG-PURCHASE-03": "MSG45", "MSG-PURCHASE-09": "MSG61", "MSG-LABOR-03": "MSG03",
};
export function semanticMessageCode(code: unknown): string | undefined {
  return typeof code === "string" ? Object.hasOwn(categories, code) ? categories[code] : code : undefined;
}
export function isSrsMessageCode(code: unknown): code is MessageCode {
  return typeof code === "string" && Object.hasOwn(categories, code) && Object.hasOwn(messageCatalog, code);
}
export function knownBackendMessageCode(body: unknown): MessageCode | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = body as Record<string, unknown>;
  const extensions = value.extensions && typeof value.extensions === "object" ? value.extensions as Record<string, unknown> : undefined;
  for (const code of [value.code, value.title, value.legacyCode, extensions?.legacyCode]) {
    if (typeof code === "string" && Object.hasOwn(messageCatalog, code)) return code as MessageCode;
  }
}
