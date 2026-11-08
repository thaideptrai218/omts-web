export type RaftStatus = "in-use" | "discontinued";
export type Lane = Readonly<{
  number: number;
  length: number;
  markerA: string;
  markerB: string;
}>;
export type RaftLayout = Readonly<{
  version: number;
  validFrom: string;
  validTo: string | null;
  lanes: readonly Lane[];
}>;
export type RaftCycle = Readonly<{
  id: string;
  code: string;
  openedAt: string;
  closedAt: string | null;
}>;
export type RaftProfile = Readonly<{
  id: string;
  zoneId: string;
  code: string;
  latitude: number;
  longitude: number;
  location: string;
  size: string;
  conditionNotes: string;
  status: RaftStatus;
  createdBy: string;
  recordVersion: string;
  layouts: readonly RaftLayout[];
  cycles: readonly RaftCycle[];
  materialCostVnd: number | null;
  photoFileName?: string | null;
}>;
export type RaftEventKind = "seeded" | "harvested" | "written-off" | "planned";
export type RaftEvent = Readonly<{
  id: string;
  cycleId: string;
  laneNumber: number;
  kind: RaftEventKind;
  from: number;
  to: number;
  date: string;
  recordedBy: string;
  confirmedBy: string | null;
  seedLotCode?: string;
  orderCode?: string;
  reason?: string;
}>;
export type LaneState = "unseeded" | "growing" | "harvested" | "written-off";
export type LanePortion = Readonly<{
  from: number;
  to: number;
  state: LaneState;
  sources: readonly RaftEvent[];
}>;
export type LaneCondition = Lane &
  Readonly<{ portions: readonly LanePortion[]; planned: readonly RaftEvent[] }>;
export type RaftCondition = Readonly<{
  raftId: string;
  date: string;
  layoutVersion: number | null;
  cycle: RaftCycle | null;
  lanes: readonly LaneCondition[];
}>;
export type RaftRecord = Readonly<{
  profile: RaftProfile;
  events: readonly RaftEvent[];
}>;
export type RaftAccess = Readonly<{
  accountId: string;
  isOwner: boolean;
  grants: readonly Readonly<{ zoneId: string | null; ownOnly: boolean }>[];
}>;
export type RaftWorkspace = Readonly<{
  canWrite?: boolean;
  rafts: readonly RaftProfile[];
  zones: readonly Readonly<{ id: string; label: string; status: RaftStatus }>[];
}>;
export type RaftValues = Readonly<{
  zoneId: string;
  code: string;
  latitude: string;
  longitude: string;
  location: string;
  size: string;
  conditionNotes: string;
  lanes: readonly Lane[];
}>;
export type SaveRaftInput = RaftValues &
  Readonly<{
    id: string | null;
    recordVersion: string | null;
  }>;
export type RaftFailure =
  | Readonly<{
      status:
        | "forbidden"
        | "not-found"
        | "conflict"
        | "zone-unavailable"
        | "open-cycle"
        | "invalid-status"
        | "invalid-photo";
    }>
  | Readonly<{ status: "invalid"; fields: readonly string[] }>
  | Readonly<{ status: "duplicate"; existingId: string }>
  | Readonly<{ status: "lanes-in-use"; laneNumbers: readonly number[] }>;
export type RaftMutationResult =
  | Readonly<{ status: "saved"; workspace: RaftWorkspace; savedId: string }>
  | RaftFailure;
export type RaftStatusInput = Readonly<{
  id: string;
  recordVersion: string;
  status: RaftStatus;
}>;
export type RaftLoadResult =
  | Readonly<{ status: "loaded"; workspace: RaftWorkspace }>
  | Readonly<{ status: "forbidden" }>;
export type RaftConditionInput = Readonly<{
  raftId: string;
  date: string;
  cycleId: string | null;
}>;
export type RaftConditionResult =
  | Readonly<{ status: "loaded"; condition: RaftCondition }>
  | Readonly<{
      status: "forbidden" | "not-found" | "invalid-date" | "invalid-cycle";
    }>;
