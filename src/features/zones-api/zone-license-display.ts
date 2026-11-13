import { expiryText } from "./zone-summary-model";

type OverviewRow = { documentType: string; documentId: string | null; effectiveDate: string | null; isReplaced: boolean };
/**
 * The overview lists every document of the zone, replaced ones included. The licence display (and its reminders) is about the NEWEST document of each type:
 * the one not replaced, latest effective date first; a type with no document keeps its "Missing" row.
 */
export function newestLicensePerType<Row extends OverviewRow>(rows: readonly Row[]): Row[] {
  const byType = new Map<string, Row>();
  for (const row of rows) {
    const held = byType.get(row.documentType);
    const better = !held || (!row.isReplaced && (held.isReplaced || !held.documentId || (row.effectiveDate ?? "") > (held.effectiveDate ?? "")));
    if (better) byType.set(row.documentType, row);
  }
  return [...byType.values()];
}

/** Reminders (display only, nothing is changed from here): the newest licence of each type that has expired or expires soon. */
export function licenseReminders<Row extends OverviewRow & { state: string; expiryDate: string | null; documentNumber: string | null }>(rows: readonly Row[], today: string, typeLabel: (type: string) => string) {
  return newestLicensePerType(rows).filter(row => row.documentId && (row.state === "Expired" || row.state === "ExpiringSoon"))
    .map(row => ({ key: row.documentId!, expired: row.state === "Expired", text: `${typeLabel(row.documentType)}${row.documentNumber ? ` ${row.documentNumber}` : ""}: ${expiryText(row.expiryDate, today).toLowerCase()}` }));
}
