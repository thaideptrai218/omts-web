import type { ZoneDocument, ZoneDocumentState } from "./farming-zone";

export const documentStateLabels: Record<ZoneDocumentState, string> = {
  valid: "Còn hiệu lực",
  expiring: "Sắp hết hạn",
  expired: "Đã hết hạn",
  "not-effective": "Chưa có hiệu lực",
  superseded: "Đã thay thế",
};
export function zoneDocumentState(
  document: ZoneDocument,
  documents: readonly ZoneDocument[],
  asOf: string,
): ZoneDocumentState {
  if (document.effectiveDate > asOf) return "not-effective";
  if (
    (document.replacementEffectiveDate &&
      document.replacementEffectiveDate <= asOf) ||
    documents.some(
      (item) => item.replacesId === document.id && item.effectiveDate <= asOf,
    )
  )
    return "superseded";
  if (document.expiryDate && document.expiryDate < asOf) return "expired";
  if (
    document.expiryDate &&
    (Date.parse(`${document.expiryDate}T00:00:00Z`) -
      Date.parse(`${asOf}T00:00:00Z`)) /
      86400000 <=
      30
  )
    return "expiring";
  return "valid";
}
export function missingZoneDocuments(
  zoneId: string,
  documents: readonly ZoneDocument[],
  asOf: string,
): readonly string[] {
  return ["SEA_AREA_ALLOCATION", "AQUACULTURE_LICENSE"].filter(
    (type) =>
      !documents.some(
        (item) =>
          item.zoneIds.includes(zoneId) &&
          item.type === type &&
          ["valid", "expiring"].includes(
            zoneDocumentState(item, documents, asOf),
          ),
      ),
  );
}
