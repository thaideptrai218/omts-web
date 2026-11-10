import { describe, expect, it } from "vitest";
import { acceptBody, claimsPage, rejectBody, staffClaim, submitPayload, traderClaim } from "./claim-contracts";
import { addPhotos } from "./claim-photo-rules";
import { claimPhotoSrc, claimStatus, claimTone, deliveryStatus, invoiceStatus, offerLabel, sendingChannel } from "./claim-labels";
import { respondErrorText, submitErrorText } from "./claim-errors";
import { page, staff, trader } from "./claim-test-fixtures";

const photo = (name: string, type = "image/jpeg", size = 1000, modified = 1) => new File([new Uint8Array(Math.min(size, 8))], name, { type, lastModified: modified });
const big = (name: string) => Object.defineProperty(photo(name), "size", { value: 10 * 1024 * 1024 + 1 });

describe("addPhotos", () => {
  it("keeps JPEG and PNG, drops other types, empty, oversized and duplicate files with a Vietnamese reason", () => {
    const empty = new File([], "rong.jpg", { type: "image/jpeg" });
    const result = addPhotos([], [photo("a.jpg"), photo("b.png", "image/png"), photo("c.pdf", "application/pdf"), empty, big("to.jpg"), photo("a.jpg")]);
    expect(result.files.map((file) => file.name)).toEqual(["a.jpg", "b.png"]);
    expect(result.problems).toEqual(['"c.pdf" không phải ảnh JPEG hoặc PNG.', '"rong.jpg" là tệp rỗng.', '"to.jpg" lớn hơn 10 MB.', '"a.jpg" đã được chọn.']);
  });
  it("stops at 10 photos", () => {
    const ten = Array.from({ length: 10 }, (_, index) => photo(`p${index}.jpg`, "image/jpeg", 10, index));
    const result = addPhotos(ten, [photo("extra.jpg", "image/jpeg", 10, 99)]);
    expect(result.files).toHaveLength(10);
    expect(result.problems[0]).toContain("tối đa 10 ảnh");
  });
});

describe("contracts", () => {
  it("parse the backend JSON shapes (extra fields ignored, enum offer, nullable response)", () => {
    expect(claimsPage.safeParse(page()).success).toBe(true);
    expect(staffClaim.safeParse(staff()).success).toBe(true);
    expect(traderClaim.safeParse(trader()).success).toBe(true);
    expect(staffClaim.safeParse({ ...staff(), rowVersion: "" }).success).toBe(false);
    expect(claimsPage.safeParse(page([{ ...(page().items[0] as object), offer: "Refund" }])).success).toBe(false);
  });
  it("validate what the user sends", () => {
    expect(submitPayload.safeParse({ description: "  ok " })).toMatchObject({ success: true, data: { description: "ok" } });
    expect(submitPayload.safeParse({ description: " " }).success).toBe(false);
    expect(acceptBody.safeParse({ offer: "ReturnAllGoods", note: null, rowVersion: "x" }).success).toBe(true);
    expect(acceptBody.safeParse({ offer: "ReturnAllGoods", note: null, rowVersion: "" }).success).toBe(false);
    expect(rejectBody.safeParse({ note: "", rowVersion: "x" }).success).toBe(false);
    expect(rejectBody.safeParse({ note: "x".repeat(1001), rowVersion: "x" }).success).toBe(false);
  });
});

describe("Vietnamese labels and error text", () => {
  it("never return backend English for known and unknown values", () => {
    const text = [3701, 3702, 3703, 9999].map(claimStatus).concat(["ReturnAllGoods", "PriceCutWholeInvoice"].map((o) => offerLabel(o as never)), [3501, 3502, 1].map(invoiceStatus),
      [1601, 1602, 1603, null].map(deliveryStatus), ["Sms", "ZaloOa", "Other"].map(sendingChannel)).join("|");
    expect(text).not.toMatch(/Awaiting|Accepted|Rejected|Completed|Cancelled|Sent|Sms|ZaloOa|Return|Price/);
    expect(claimStatus(3701)).toBe("Chờ phản hồi"); expect(claimTone(3703)).toBe("good"); expect(claimTone(3702)).toBe("bad");
  });
  it("builds the BFF photo path by area, id and index", () => {
    expect(claimPhotoSrc("quality-claims", "abc", 2)).toBe("/api/operations/quality-claims?action=photo&id=abc&index=2");
  });
  it("explains 409 differently for submit, accept and a lost race, and never for uncertain writes", () => {
    expect(submitErrorText({ httpStatus: 409, uncertain: false })).toContain("đang có một báo cáo chờ");
    expect(submitErrorText({ httpStatus: 503, uncertain: true })).toContain("đối chiếu");
    expect(respondErrorText({ httpStatus: 409, uncertain: false }, true)).toContain("Bạn vẫn có thể từ chối");
    expect(respondErrorText({ httpStatus: 409, code: "MSG-GEN-09", uncertain: false }, true)).toContain("đã được phản hồi");
    expect(respondErrorText({ httpStatus: 0, uncertain: true }, true)).toBeUndefined();
  });
});
