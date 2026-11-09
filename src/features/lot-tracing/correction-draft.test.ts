import { describe, expect, it } from "vitest";
import { buildLog, buildLot, buildSeeding, lotDraftOf, seedingDraftOf, type LogDraft, type SeedingDraft } from "./correction-draft";
import { describeGap, formatDay, formatValue, parseDecimal, parseNumberList } from "./trace-format";
import { logRows } from "./log-correction-dialog";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const seeding: SeedingDraft = { seedingDate: "2026-04-20", seedLotId: id(1), lanes: "1, 2, 3", quantity: "9.000", reason: "Nhập nhầm lô giống" };
const lotItem = { id: id(2), lotCode: "B03-1", harvestedAt: "2026-10-26T05:40:00+07:00", harvestDate: "2026-10-26", laneNumbers: [3, 4], finishedLaneNumbers: [3, 4], cageCount: 60, kgPerCage: 20, estimatedKg: 1200, status: "Closed", originState: "NotPublished" as const, rowVersion: "AAA" };
const pngFile = (size = 10, type = "image/png") => new File([new Uint8Array(size)], "a.png", { type });

describe("đọc số nhập tay", () => {
  it("danh sách luống nhận dấu phẩy, chấm phẩy, khoảng trắng và từ chối chữ, số 0", () => {
    expect(parseNumberList("1, 2;3  4")).toEqual([1, 2, 3, 4]); expect(parseNumberList("")).toEqual([]);
    expect(parseNumberList("1, a")).toBeUndefined(); expect(parseNumberList("0")).toBeUndefined(); expect(parseNumberList("1.5")).toBeUndefined();
  });
  it("số thập phân hiểu cả kiểu Việt Nam lẫn quốc tế và không nhầm nghìn", () => {
    expect(parseDecimal("1.200,5")).toBe(1200.5); expect(parseDecimal("1200.5")).toBe(1200.5); expect(parseDecimal("9.000")).toBe(9000);
    expect(parseDecimal("12,5")).toBe(12.5); expect(parseDecimal("")).toBeNaN(); expect(parseDecimal("abc")).toBeNaN(); expect(parseDecimal("-3")).toBeNaN();
  });
});

describe("bản nháp phiên thả giống", () => {
  it("hợp lệ cho ra thân yêu cầu đã chuẩn hóa", () => {
    const built = buildSeeding(seeding);
    expect(built).toEqual({ ok: true, value: { seedingDate: "2026-04-20", seedLotId: id(1), laneNumbers: [1, 2, 3], quantity: 9000, reason: "Nhập nhầm lô giống" } });
  });
  it("nêu lỗi tiếng Việt khi thiếu lý do, luống sai, trùng luống hoặc số lượng không dương", () => {
    expect(buildSeeding({ ...seeding, reason: "  " })).toEqual({ ok: false, problem: "Hãy nhập lý do sửa." });
    expect(buildSeeding({ ...seeding, lanes: "a" }).ok).toBe(false);
    expect(buildSeeding({ ...seeding, lanes: "1, 1" }).ok).toBe(false);
    expect(buildSeeding({ ...seeding, quantity: "0" }).ok).toBe(false);
    expect(buildSeeding({ ...seeding, seedLotId: "" }).ok).toBe(false);
  });
  it("khởi tạo từ bản ghi giữ nguyên giá trị hiện có", () => {
    const draft = seedingDraftOf({ id: id(3), seedingDate: "2026-04-20", seedLot: { id: id(1), code: "PN1-1", receiptCode: "PN1", itemName: null, supplierName: "A" }, quantity: 1500.5, laneNumbers: [4], lotCodes: [], rowVersion: "v" });
    expect(draft).toMatchObject({ lanes: "4", quantity: "1500,5", reason: "" });
  });
});

describe("bản nháp lô thu hoạch", () => {
  const draft = { ...lotDraftOf(lotItem, ["k1", "k2"]), reason: "Đếm lại số lồng" };
  it("giữ ảnh đã có và cho kg ước tính để trống", () => {
    expect(buildLot(draft)).toMatchObject({ ok: true, value: { laneNumbers: [3, 4], finishedLaneNumbers: [3, 4], cageCount: 60, estimatedKg: 1200, keepPhotoKeys: ["k1", "k2"] } });
    expect(buildLot({ ...draft, estimatedKg: "" })).toMatchObject({ ok: true, value: { estimatedKg: null } });
  });
  it("luống thu xong phải thuộc luống thu hoạch, số lồng nguyên dương, ảnh tối đa 10 và đúng loại", () => {
    expect(buildLot({ ...draft, finished: "5" }).ok).toBe(false);
    expect(buildLot({ ...draft, cageCount: "1,5" }).ok).toBe(false);
    expect(buildLot({ ...draft, keep: Array.from({ length: 10 }, (_, i) => `k${i}`), files: [pngFile()] }).ok).toBe(false);
    expect(buildLot({ ...draft, files: [pngFile(10, "application/pdf")] }).ok).toBe(false);
    expect(buildLot({ ...draft, files: [pngFile()] }).ok).toBe(true);
  });
});

describe("bản nháp nhật ký nuôi", () => {
  const draft: LogDraft = { visitDate: "2026-05-01", notes: " Nước trong ", reason: "Sửa ngày", keep: ["k1"], files: [] };
  it("cắt khoảng trắng ghi chú, ghi chú rỗng thành null", () => {
    expect(buildLog(draft)).toMatchObject({ ok: true, value: { notes: "Nước trong", keepPhotoKeys: ["k1"] } });
    expect(buildLog({ ...draft, notes: "  " })).toMatchObject({ value: { notes: null } });
  });
  it("cần ít nhất một ảnh và có lý do", () => {
    expect(buildLog({ ...draft, keep: [] })).toEqual({ ok: false, problem: "Nhật ký cần ít nhất một ảnh." });
    expect(buildLog({ ...draft, keep: [], files: [pngFile()] }).ok).toBe(true);
    expect(buildLog({ ...draft, reason: "" }).ok).toBe(false);
  });
  it("so sánh trước và sau chỉ nêu trường thực sự đổi", () => {
    const item = { id: id(4), visitDate: "2026-05-02", notes: null, photos: [{ key: "k1", sortOrder: 0 }, { key: "k2", sortOrder: 1 }], recordedByName: null, rowVersion: "v" };
    const rows = logRows(item, { ...draft, notes: "" });
    expect(rows.map((r) => r.label)).toEqual(["Ngày ghi nhật ký", "Ảnh"]);
    expect(rows[1].after).toContain("bỏ 1");
    expect(logRows(item, { visitDate: "2026-05-02", notes: "", reason: "x", keep: ["k1", "k2"], files: [] })).toEqual([]);
  });
});

describe("định dạng hiển thị", () => {
  it("ngày cắt chuỗi không lệch múi giờ; giá trị rỗng hiện gạch ngang", () => {
    expect(formatDay("2026-10-26")).toBe("26/10/2026"); expect(formatDay(null)).toBe("—");
    expect(formatValue("lanes", [1, 2])).toBe("1, 2"); expect(formatValue("photos", ["a", "b"])).toBe("2 ảnh"); expect(formatValue("notes", null)).toBe("—");
  });
  it("mô tả chỗ thiếu bằng tiếng Việt từ giá trị nguyên tử, không dùng chuỗi backend", () => {
    expect(describeGap({ kind: "NoSeedingSession", laneNumber: 2, seedLotCodes: [], zoneCode: null })).toContain("Luống 2 chưa có phiên thả giống");
    expect(describeGap({ kind: "SeedLotNotOnCompletedReceipt", laneNumber: 1, seedLotCodes: ["PN1-1", "PN2-1"], zoneCode: null })).toContain("PN1-1, PN2-1");
    expect(describeGap({ kind: "NotPublisherOfZone", laneNumber: null, seedLotCodes: [], zoneCode: "VP01" })).toContain("VP01");
  });
});
