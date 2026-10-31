export const zoneDocumentTypes = {
  SEA_AREA_ALLOCATION: "Quyết định giao khu vực biển",
  AQUACULTURE_LICENSE: "Giấy phép nuôi trồng thủy sản",
  FOOD_SAFETY_COMMITMENT: "Cam kết an toàn thực phẩm",
  OTHER: "Giấy tờ khác",
} as const;
export type ZoneDocumentType = keyof typeof zoneDocumentTypes;
export type ZoneUsageStatus = "in-use" | "discontinued";
export type ZoneDocumentState =
  | "valid"
  | "expiring"
  | "expired"
  | "not-effective"
  | "superseded";
export type FarmingZone = Readonly<{
  id: string;
  code: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  area: number;
  waterMeasurementPoint: string;
  status: ZoneUsageStatus;
  recordVersion: string;
  inUseRaftCodes: readonly string[];
}>;
export type ZoneDocument = Readonly<{
  id: string;
  type: ZoneDocumentType;
  number: string;
  effectiveDate: string;
  expiryDate: string;
  issuingAuthority: string;
  holder: string;
  legalScope: string;
  zoneIds: readonly string[];
  replacesId: string | null;
  fileName: string;
  recordVersion: string;
  replacementEffectiveDate?: string;
}>;
export type ZoneAccess = Readonly<{
  canWrite: boolean;
  visibleZoneIds: readonly string[] | null;
  actorName: string;
}>;
export type ZoneWorkspace = Readonly<{
  zones: readonly FarmingZone[];
  documents: readonly ZoneDocument[];
  canWrite: boolean;
}>;
export type ZoneValues = Readonly<{
  code: string;
  name: string;
  location: string;
  latitude: string;
  longitude: string;
  area: string;
  waterMeasurementPoint: string;
}>;
export type SaveZoneInput = ZoneValues &
  Readonly<{ id: string | null; recordVersion: string | null }>;
export type ZoneDocumentValues = Readonly<{
  type: ZoneDocumentType;
  number: string;
  effectiveDate: string;
  expiryDate: string;
  issuingAuthority: string;
  holder: string;
  legalScope: string;
  zoneIds: readonly string[];
}>;
export type SaveZoneDocumentInput = ZoneDocumentValues &
  Readonly<{
    id: string | null;
    recordVersion: string | null;
    replacesId: string | null;
    replacesVersion: string | null;
    file: File | null;
  }>;
export type ZoneFailure = Readonly<
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "file-failed" }
  | { status: "replaced"; replacementId: string }
  | { status: "conflict"; updatedBy: string; updatedAt: string }
  | { status: "invalid"; fields: readonly string[] }
  | { status: "duplicate"; existingId: string }
  | { status: "blocked"; raftCodes: readonly string[] }
>;
export type ZoneLoadResult =
  | Readonly<{ status: "loaded"; workspace: ZoneWorkspace }>
  | ZoneFailure;
export type ZoneMutationResult =
  | Readonly<{ status: "saved"; workspace: ZoneWorkspace; savedId: string }>
  | ZoneFailure;
