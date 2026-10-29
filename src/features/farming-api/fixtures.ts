import type { License, Raft, Condition } from "./contracts";
export const farmingIds = { zone: "5a92b32d-2901-4560-9237-350be750cb10", otherZone: "5a92b32d-2901-4560-9237-350be750cb11", license: "5a92b32d-2901-4560-9237-350be750cb12", raft: "5a92b32d-2901-4560-9237-350be750cb13", lane: "5a92b32d-2901-4560-9237-350be750cb14" };
const zone = { id: farmingIds.zone, code: "QA01", name: "Vùng QA" };
export function licenseFixture(patch: Partial<License> = {}): License {
  return { id: farmingIds.license, documentType: "AQUACULTURE_LICENSE", documentTypeName: "Marine aquaculture license", documentNumber: "QA-GP-01", effectiveDate: "2026-01-01", expiryDate: "2027-01-01", issuingAuthority: "Cơ quan QA", holder: "HTX QA", legalScope: "Phạm vi QA",
    asOf: "2026-10-29", state: "Valid", zones: [zone], replacesDocumentId: null, replacedByDocumentId: null, fileUrl: null, rowVersion: "AQID", ...patch };
}
export function raftFixture(patch: Partial<Raft> = {}): Raft {
  return { id: farmingIds.raft, zone, code: "QA-RAFT", latitude: 21, longitude: 107, location: null, size: "20 x 10 m", conditionNotes: null, photoUrl: null, statusId: 101, status: "In Use", layoutVersion: 1,
    lanes: [{ id: farmingIds.lane, laneNumber: 1, length: 30, markerA: "A", markerB: "B" }], layoutDrawing: null, layoutVersions: [{ versionNumber: 1, laneCount: 1, validFrom: "2026-10-01", validTo: null }], materialCost: null, rowVersion: "AQID", ...patch };
}
export function conditionFixture(patch: Partial<Condition> = {}): Condition {
  return { raftId: farmingIds.raft, raftCode: "QA-RAFT", date: "2026-10-29", cycleId: null, layoutVersion: 1,
    lanes: [{ laneNumber: 1, length: 30, summary: "NotSeeded", portions: [{ from: 0, to: 30, condition: "NotSeeded", segments: [] }], plannedHarvests: [] }], ...patch };
}
