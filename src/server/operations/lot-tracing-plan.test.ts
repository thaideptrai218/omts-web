import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { lotTracingPlan as plan } from "./lot-tracing-plan";
import { lotTracingUpload } from "./lot-tracing-upload-plan";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const q = (s = "") => new URLSearchParams(s);
const seeding = { seedingDate: "2026-04-20", seedLotId: id(5), laneNumbers: [1, 2], quantity: 9000, reason: "Nhập nhầm lô giống" };
const lot = { laneNumbers: [3, 4], finishedLaneNumbers: [3], cageCount: 60, estimatedKg: 1200, keepPhotoKeys: ["a"], reason: "Đếm lại" };

describe("kế hoạch BFF cho truy xuất lô", () => {
  it("tìm lô cần ít nhất một điều kiện và ánh xạ đúng đường dẫn", () => {
    expect(plan("GET", q("action=search&lotCode=B03"))).toMatchObject({ path: "/api/harvest-lots/trace-search?lotCode=B03", permission: "View", area: "lot-tracing" });
    expect(plan("GET", q("action=search&invoiceCode=HD000123"))?.path).toContain("invoiceCode=HD000123");
    expect(plan("GET", q("action=search"))).toBeUndefined();
    expect(plan("GET", q(`action=search&lotCode=B&id=${id(1)}`))).toBeUndefined();
  });
  it("đọc truy xuất, xuất file, kiểm tra công bố với quyền riêng từng hành động", () => {
    expect(plan("GET", q(`action=trace&id=${id(1)}`))).toMatchObject({ path: `/api/harvest-lots/${id(1)}/trace`, permission: "View" });
    expect(plan("GET", q(`action=export&id=${id(1)}`))).toMatchObject({ path: `/api/harvest-lots/${id(1)}/trace/export`, permission: "Export", file: "export" });
    expect(plan("GET", q(`action=publish-check&id=${id(1)}`))).toMatchObject({ permission: "Publish" });
    expect(plan("GET", q("action=trace"))).toBeUndefined();
    expect(plan("GET", q(`action=trace&id=${id(1)}&lotCode=x`))).toBeUndefined();
    expect(plan("GET", q(`action=trace&action=export&id=${id(1)}`))).toBeUndefined();
    expect(plan("GET", q(`action=delete&id=${id(1)}`))).toBeUndefined();
  });
  it("đọc dữ liệu sửa: chu kỳ của bè, bản ghi của chu kỳ, xem trước nhật ký, ảnh lô, lô giống", () => {
    expect(plan("GET", q(`action=cycles&id=${id(2)}`))).toMatchObject({ path: `/api/rafts/${id(2)}/trace-corrections`, permission: "Correct" });
    expect(plan("GET", q(`action=records&id=${id(3)}`))?.path).toBe(`/api/cultivation-cycles/${id(3)}/trace-corrections`);
    expect(plan("GET", q(`action=log-preview&id=${id(4)}`))?.path).toBe(`/api/cultivation-logs/${id(4)}/trace-correction/preview`);
    expect(plan("GET", q(`action=lot-photos&id=${id(4)}`))?.path).toBe(`/api/harvest-lots/${id(4)}`);
    expect(plan("GET", q(`action=seed-lots&id=${id(2)}`))?.path).toBe(`/api/rafts/${id(2)}/seed-lots`);
  });
  it("công bố cần id và thân rỗng", () => {
    expect(plan("POST", q(), { action: "publish", id: id(1), body: {} })).toMatchObject({ method: "POST", path: `/api/harvest-lots/${id(1)}/publish`, permission: "Publish" });
    expect(plan("POST", q(), { action: "publish", body: {} })).toBeUndefined();
    expect(plan("POST", q(), { action: "publish", id: id(1), body: { x: 1 } })).toBeUndefined();
    expect(plan("POST", q("a=1"), { action: "publish", id: id(1) })).toBeUndefined();
  });
  it("thu hồi nguồn gốc: xem trước và đọc thông báo dùng GET Publish, thu hồi cần lý do", () => {
    expect(plan("GET", q(`action=withdraw-preview&id=${id(1)}`))).toMatchObject({ method: "GET", path: `/api/harvest-lots/${id(1)}/withdraw-preview`, permission: "Publish" });
    expect(plan("GET", q(`action=withdrawal-notices&id=${id(1)}`))).toMatchObject({ path: `/api/harvest-lots/${id(1)}/withdrawal-notices`, permission: "Publish" });
    expect(plan("GET", q("action=withdraw-preview"))).toBeUndefined();
    expect(plan("POST", q(), { action: "withdraw", id: id(1), body: { reason: "  Nhầm lô  " } })).toMatchObject({ method: "POST", path: `/api/harvest-lots/${id(1)}/withdraw`, permission: "Publish", body: { reason: "Nhầm lô" } });
    expect(plan("POST", q(), { action: "withdraw", id: id(1), body: {} })).toBeUndefined();
    expect(plan("POST", q(), { action: "withdraw", id: id(1), body: { reason: " " } })).toBeUndefined();
    expect(plan("POST", q(), { action: "withdraw", id: id(1), body: { reason: "x".repeat(1001) } })).toBeUndefined();
    expect(plan("POST", q(), { action: "withdraw", id: id(1), body: { reason: "ok", extra: 1 } })).toBeUndefined();
    expect(plan("POST", q(), { action: "withdraw", body: { reason: "ok" } })).toBeUndefined();
  });
  it("sửa phiên thả giống: xem trước dùng POST, lưu dùng PUT và bắt buộc phiên bản", () => {
    expect(plan("POST", q(), { action: "seeding-preview", id: id(6), body: seeding })).toMatchObject({ method: "POST", path: `/api/seeding-records/${id(6)}/trace-correction/preview`, permission: "Correct" });
    expect(plan("POST", q(), { action: "seeding-correct", id: id(6), body: { ...seeding, rowVersion: "AAA", ownerApproved: true } })).toMatchObject({ method: "PUT", path: `/api/seeding-records/${id(6)}/trace-correction` });
    expect(plan("POST", q(), { action: "seeding-correct", id: id(6), body: seeding })).toBeUndefined();
    expect(plan("POST", q(), { action: "seeding-preview", id: id(6), body: { ...seeding, reason: " " } })).toBeUndefined();
    expect(plan("POST", q(), { action: "seeding-preview", id: id(6), body: { ...seeding, laneNumbers: [1, 1] } })).toBeUndefined();
    expect(plan("POST", q(), { action: "seeding-preview", id: id(6), body: { ...seeding, extra: 1 } })).toBeUndefined();
  });
  it("xem trước lô thu hoạch kiểm tra luồng đã thu xong phải thuộc luồng thu hoạch", () => {
    expect(plan("POST", q(), { action: "lot-preview", id: id(7), body: lot })?.path).toBe(`/api/harvest-lots/${id(7)}/trace-correction/preview`);
    expect(plan("POST", q(), { action: "lot-preview", id: id(7), body: { ...lot, finishedLaneNumbers: [9] } })).toBeUndefined();
  });
});

describe("kế hoạch multipart", () => {
  it("nhật ký và lô thu hoạch dùng PUT multipart, nhật ký cần ít nhất một ảnh", () => {
    const log = lotTracingUpload("log-trace-correct", id(8));
    expect(log?.plan).toMatchObject({ method: "PUT", path: `/api/cultivation-logs/${id(8)}/trace-correction`, permission: "Correct" });
    expect(log?.minPhotos).toBe(1);
    expect(log?.validator.safeParse({ visitDate: "2026-05-01", notes: null, keepPhotoKeys: ["k"], reason: "Sửa ngày", ownerApproved: false }).success).toBe(true);
    const harvest = lotTracingUpload("lot-trace-correct", id(9));
    expect(harvest?.plan.path).toBe(`/api/harvest-lots/${id(9)}/trace-correction`);
    expect(harvest?.validator.safeParse({ ...lot, rowVersion: "AAA", ownerApproved: false }).success).toBe(true);
    expect(harvest?.validator.safeParse({ ...lot, ownerApproved: false }).success).toBe(false);
    expect(lotTracingUpload("other", id(9))).toBeUndefined();
    expect(lotTracingUpload("log-trace-correct", "not-a-guid")).toBeUndefined();
  });
});
