import type { ZoneAccess, ZoneMutationResult } from "../domain/farming-zone";
import type { FarmingZoneRepository } from "./farming-zone-repository";
import type { MockZoneState } from "./mock-zone-state";
import { projectZones, stampZone, zoneConflict } from "./mock-zone-state";
import { zoneDocumentSchema } from "../schemas/farming-zone-schema";
import { isZoneDocumentFile } from "../schemas/zone-file";

export function mockZoneDocuments(
  state: MockZoneState,
  access: () => Promise<ZoneAccess | null>,
  currentAccess: () => ZoneAccess | null,
): Pick<FarmingZoneRepository, "saveDocument" | "readAttachment"> {
  return {
    async saveDocument(input): Promise<ZoneMutationResult> {
      const actor = await access();
      if (!actor?.canWrite) return { status: "forbidden" };
      const parsed = zoneDocumentSchema.safeParse(input);
      if (!parsed.success)
        return {
          status: "invalid",
          fields: parsed.error.issues.map((issue) => String(issue.path[0])),
        };
      if (input.id && input.replacesId)
        return { status: "invalid", fields: ["replacesId"] };
      if (
        parsed.data.zoneIds.some(
          (id) => !state.zones.some((zone) => zone.id === id),
        )
      )
        return { status: "invalid", fields: ["zoneIds"] };
      const existingId = input.id ?? input.replacesId;
      if (!input.id || input.file) {
        try {
          if (!(await isZoneDocumentFile(input.file)))
            return { status: "invalid", fields: ["file"] };
        } catch {
          return { status: "file-failed" };
        }
      }
      // File inspection awaited: recheck authorization and versions before publishing.
      const latestActor = currentAccess();
      if (!latestActor?.canWrite) return { status: "forbidden" };
      const existing = state.documents.find(
        (document) => document.id === existingId,
      );
      if (existingId && !existing) return { status: "not-found" };
      if (existing) {
        const replacement = state.documents.find(
          (document) => document.replacesId === existing.id,
        );
        if (replacement)
          return { status: "replaced", replacementId: replacement.id };
        const expectedVersion = input.id
          ? input.recordVersion
          : input.replacesVersion;
        if (existing.recordVersion !== expectedVersion)
          return zoneConflict(state, existing.id);
      }
      const id = input.id ?? crypto.randomUUID();
      const document = {
        ...parsed.data,
        id,
        zoneIds: [...parsed.data.zoneIds],
        replacesId: input.id ? existing!.replacesId : input.replacesId,
        fileName: input.file?.name ?? existing!.fileName,
        recordVersion: crypto.randomUUID(),
      };
      state.documents = input.id
        ? state.documents.map((item) => (item.id === id ? document : item))
        : [...state.documents, document];
      if (input.file) state.files.set(id, input.file);
      stampZone(state, id, latestActor);
      return {
        status: "saved",
        savedId: id,
        workspace: projectZones(state, latestActor),
      };
    },
    async readAttachment(id) {
      const actor = await access();
      if (!actor) return null;
      const visible = projectZones(state, actor).documents.some(
        (document) => document.id === id,
      );
      return visible ? (state.files.get(id) ?? null) : null;
    },
  };
}
