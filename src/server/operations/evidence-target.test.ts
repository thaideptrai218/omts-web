import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { fileStoragePrefix, localFileTarget, storedFileKey } from "./evidence-target";

const ORIGIN = "https://api.omts.example";
const R2 = "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com";
const env = { OMTS_FILE_STORAGE_ORIGIN: `${R2}/omts-files-staging` };
const AMZ = "X-Amz-Expires=3600&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=key%2F20261126%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20261126T105848Z&X-Amz-SignedHeaders=host&X-Amz-Signature=" + "b".repeat(64);
const r2 = (key = "harvest-lot-photos/2026/11/a.jpg", query = AMZ, bucket = "omts-files-staging", host = R2) => `${host}/${bucket}/${key}?${query}`;

describe("fileStoragePrefix", () => {
  it("reads the bucket origin and path", () => expect(fileStoragePrefix(env)).toEqual({ origin: R2, path: "/omts-files-staging/" }));
  it.each([undefined, "", `http://x.r2.cloudflarestorage.com/b`, R2, `${R2}/a/b`, `${R2}/b?x=1`, `https://u@x.test/b`, `${R2}/B`])("ignores %j", (value) => {
    expect(fileStoragePrefix({ OMTS_FILE_STORAGE_ORIGIN: value })).toBeUndefined();
  });
});

describe("localFileTarget", () => {
  it("keeps accepting Local download links on the backend origin", () => {
    expect(localFileTarget("/api/files/local/water/a.png?expires=1&sig=x", ORIGIN, env)?.href).toBe(`${ORIGIN}/api/files/local/water/a.png?expires=1&sig=x`);
  });
  it("accepts a presigned link into the configured R2 bucket and keeps it byte for byte", () => {
    expect(localFileTarget(r2(), ORIGIN, env)?.href).toBe(r2());
    expect(storedFileKey(new URL(r2()), ORIGIN, env)).toBe("harvest-lot-photos/2026/11/a.jpg");
  });
  it("hides R2 links while the bucket is not configured", () => expect(localFileTarget(r2(), ORIGIN, {})).toBeUndefined());
  it.each([
    r2(undefined, undefined, "other-bucket"), r2(undefined, undefined, undefined, "https://fedcba9876543210fedcba9876543210.r2.cloudflarestorage.com"),
    r2(undefined, `${AMZ}&redirect=evil`), r2(undefined, ""), r2("a/../../secret.jpg"), r2(undefined, undefined, undefined, "http://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com"),
    `${r2()}#x`, `${R2}/omts-files-staging/?${AMZ}`,
  ])("rejects %s", (value) => expect(localFileTarget(value, ORIGIN, env)).toBeUndefined());
});
