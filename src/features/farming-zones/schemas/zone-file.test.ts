import { expect, it } from "vitest";
import { isZoneDocumentFile } from "./zone-file";

it.each([
  ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ["image/jpeg", [0xff, 0xd8, 0xff]],
])("accepts the signature of %s", async (type, bytes) => {
  expect(
    await isZoneDocumentFile(
      new File([new Uint8Array(bytes)], "fixture", { type }),
    ),
  ).toBe(true);
});
it("rejects empty, oversized and unsupported attachments", async () => {
  expect(
    await isZoneDocumentFile(
      new File([], "empty.pdf", { type: "application/pdf" }),
    ),
  ).toBe(false);
  expect(
    await isZoneDocumentFile(
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf", {
        type: "application/pdf",
      }),
    ),
  ).toBe(false);
  expect(
    await isZoneDocumentFile(
      new File(["<svg/>"], "image.svg", { type: "image/svg+xml" }),
    ),
  ).toBe(false);
});
