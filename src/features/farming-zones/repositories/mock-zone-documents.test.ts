import { expect, it, vi } from "vitest";
import { createMockFarmingZoneStore } from "./mock-farming-zone-store";
import { initialFarmingZones } from "../mocks/farming-zone-fixtures";
import type { SaveZoneDocumentInput, ZoneAccess } from "../domain/farming-zone";
import {
  missingZoneDocuments,
  zoneDocumentState,
} from "../domain/zone-document-state";

const owner: ZoneAccess = {
  canWrite: true,
  visibleZoneIds: null,
  actorName: "Chủ HTX thử nghiệm",
};
function input(
  overrides: Partial<SaveZoneDocumentInput> = {},
): SaveZoneDocumentInput {
  return {
    id: null,
    recordVersion: null,
    replacesId: null,
    replacesVersion: null,
    type: "AQUACULTURE_LICENSE",
    number: "GP-01",
    effectiveDate: "2026-01-01",
    expiryDate: "2026-12-31",
    issuingAuthority: "Cơ quan cấp thử nghiệm",
    holder: "HTX thử nghiệm",
    legalScope: "",
    zoneIds: ["zone-east", "zone-south"],
    file: new File(["%PDF-1.7\nfixture"], "giay-phep.pdf", {
      type: "application/pdf",
    }),
    ...overrides,
  };
}
function setup() {
  const store = createMockFarmingZoneStore({
    initialZones: initialFarmingZones,
    latencyMs: 0,
  });
  return { store, repository: store.forAccess(() => owner) };
}
it("shares one document across zones without duplicating it or its file", async () => {
  const { store, repository } = setup();
  const file = input().file!;
  const saved = await repository.saveDocument(input({ file }));
  if (saved.status !== "saved") throw new Error("Expected document");
  expect(saved.workspace.documents).toHaveLength(1);
  const reader = store.forAccess(() => ({
    ...owner,
    canWrite: false,
    visibleZoneIds: ["zone-south"],
  }));
  const loaded = await reader.load();
  expect(loaded).toMatchObject({
    workspace: { documents: [{ zoneIds: ["zone-south"] }] },
  });
  expect(await reader.readAttachment(saved.savedId)).toBe(file);
  expect(await reader.saveDocument(input())).toEqual({ status: "forbidden" });
  const outsider = store.forAccess(() => ({
    ...owner,
    canWrite: false,
    visibleZoneIds: ["zone-west"],
  }));
  expect(await outsider.readAttachment(saved.savedId)).toBeNull();
});
it("retains the original file and dates on renewal and changes status only on the effective date", async () => {
  const { repository } = setup();
  const before = await repository.saveDocument(input());
  if (before.status !== "saved") throw new Error("Expected document");
  const original = before.workspace.documents[0];
  const originalFile = await repository.readAttachment(original.id);
  const renewed = await repository.saveDocument(
    input({
      number: "GP-02",
      effectiveDate: "2027-01-01",
      expiryDate: "2028-01-01",
      replacesId: original.id,
      replacesVersion: original.recordVersion,
    }),
  );
  if (renewed.status !== "saved") throw new Error("Expected renewal");
  const old = renewed.workspace.documents.find(
    (item) => item.id === original.id,
  )!;
  expect(old).toMatchObject({
    ...original,
    replacementEffectiveDate: "2027-01-01",
  });
  expect(await repository.readAttachment(original.id)).toBe(originalFile);
  expect(
    zoneDocumentState(old, renewed.workspace.documents, "2026-12-31"),
  ).toBe("expiring");
  expect(
    zoneDocumentState(old, renewed.workspace.documents, "2027-01-01"),
  ).toBe("superseded");
  expect(
    await repository.saveDocument(
      input({ id: old.id, recordVersion: old.recordVersion, file: null }),
    ),
  ).toMatchObject({ status: "replaced" });
  expect(
    await repository.saveDocument(
      input({ replacesId: old.id, replacesVersion: old.recordVersion }),
    ),
  ).toMatchObject({ status: "replaced" });
});
it("does not mislabel a superseded document when its replacement covers only another zone", async () => {
  const { store, repository } = setup();
  const first = await repository.saveDocument(input());
  if (first.status !== "saved") throw new Error("Expected document");
  const old = first.workspace.documents[0];
  await repository.saveDocument(
    input({
      replacesId: old.id,
      replacesVersion: old.recordVersion,
      zoneIds: ["zone-south"],
      effectiveDate: "2026-10-01",
    }),
  );
  const loaded = await store
    .forAccess(() => ({
      ...owner,
      canWrite: false,
      visibleZoneIds: ["zone-east"],
    }))
    .load();
  if (loaded.status !== "loaded") throw new Error("Expected workspace");
  expect(loaded.workspace.documents).toHaveLength(1);
  expect(loaded.workspace.documents[0].zoneIds).toEqual(["zone-east"]);
  expect(
    zoneDocumentState(
      loaded.workspace.documents[0],
      loaded.workspace.documents,
      "2026-10-28",
    ),
  ).toBe("superseded");
  expect(
    missingZoneDocuments("zone-east", loaded.workspace.documents, "2026-10-28"),
  ).toContain("AQUACULTURE_LICENSE");
});
it.each([
  null,
  new File(["not a PDF"], "fake.pdf", { type: "application/pdf" }),
  new File(["%PDF-1"], "bad.svg", { type: "image/svg+xml" }),
])("rejects missing or invalid file before publishing", async (file) => {
  const { repository } = setup();
  expect(await repository.saveDocument(input({ file }))).toEqual({
    status: "invalid",
    fields: ["file"],
  });
  expect(await repository.load()).toMatchObject({
    workspace: { documents: [] },
  });
});
it("keeps the existing attachment on edit and rejects a stale next edit", async () => {
  const { repository } = setup();
  const first = await repository.saveDocument(input());
  if (first.status !== "saved") throw new Error("Expected document");
  const document = first.workspace.documents[0];
  const edited = await repository.saveDocument(
    input({
      id: document.id,
      recordVersion: document.recordVersion,
      file: null,
      number: "GP-EDIT",
    }),
  );
  expect(edited.status).toBe("saved");
  expect(
    await repository.saveDocument(
      input({
        id: document.id,
        recordVersion: document.recordVersion,
        file: null,
      }),
    ),
  ).toMatchObject({ status: "conflict", updatedBy: owner.actorName });
});
it("rechecks access after file inspection awaits instead of publishing a revoked write", async () => {
  const { store } = setup();
  let access: ZoneAccess | null = owner;
  const repository = store.forAccess(() => access);
  const file = input().file!;
  let finish!: (value: ArrayBuffer) => void;
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer;
  vi.spyOn(file, "slice").mockReturnValue({
    arrayBuffer: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  } as Blob);
  const result = repository.saveDocument(input({ file }));
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  access = null;
  finish(bytes);
  expect(await result).toEqual({ status: "forbidden" });
  expect(await store.forAccess(() => owner).load()).toMatchObject({
    workspace: { documents: [] },
  });
});
