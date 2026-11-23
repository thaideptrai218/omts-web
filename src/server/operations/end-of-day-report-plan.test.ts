import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { endOfDayReportPlan as plan } from "./end-of-day-report-plan";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const q = (s = "") => new URLSearchParams(s);
const url = (p: { path: string } | undefined) => new URL(p!.path, "http://x");

describe("kế hoạch BFF cho báo cáo Cuối ngày", () => {
  it("đọc báo cáo: View, chuyển khoảng giờ và mối quan tâm, tách danh sách thành tham số lặp", () => {
    const p = plan("GET", q(`action=report&concern=sales&from=2026-11-19T08:00&to=2026-11-19T17:30&zoneIds=${id(1)},${id(2)}&customerIds=${id(3)}&paymentMethods=Cash,VietQrInvoice&channels=AtPort&paymentTerms=PayLater`));
    expect(p).toMatchObject({ area: "end-of-day-report", action: "report", method: "GET", permission: "View" });
    const u = url(p);
    expect(u.pathname).toBe("/api/reports/end-of-day");
    expect(u.searchParams.get("concern")).toBe("sales");
    expect(u.searchParams.get("from")).toBe("2026-11-19T08:00");
    expect(u.searchParams.get("to")).toBe("2026-11-19T17:30");
    expect(u.searchParams.getAll("zoneIds")).toEqual([id(1), id(2)]);
    expect(u.searchParams.getAll("paymentMethods")).toEqual(["Cash", "VietQrInvoice"]);
    expect(u.searchParams.getAll("channels")).toEqual(["AtPort"]);
    expect(u.searchParams.getAll("paymentTerms")).toEqual(["PayLater"]);
  });
  it("mỗi mối quan tâm có tiêu chí riêng đều được chuyển sang backend", () => {
    const money = url(plan("GET", q(`action=report&concern=money&funds=Cash,Bank&sources=CashVoucher&typeIds=${id(4)}&partyKinds=Customer,Other&createdBy=${id(5)}`)));
    expect(money.searchParams.getAll("funds")).toEqual(["Cash", "Bank"]);
    expect(money.searchParams.getAll("sources")).toEqual(["CashVoucher"]);
    expect(money.searchParams.getAll("typeIds")).toEqual([id(4)]);
    expect(money.searchParams.getAll("partyKinds")).toEqual(["Customer", "Other"]);
    expect(money.searchParams.getAll("createdBy")).toEqual([id(5)]);
    const goods = url(plan("GET", q(`action=report&concern=goods&productIds=${id(6)},${id(7)}&categoryIds=${id(8)}&receivedBy=${id(9)}`)));
    expect(goods.searchParams.getAll("productIds")).toEqual([id(6), id(7)]);
    expect(goods.searchParams.getAll("categoryIds")).toEqual([id(8)]);
    expect(url(plan("GET", q("action=report&concern=summary"))).search).toBe("?concern=summary");
  });
  it("bỏ trùng phần tử trong danh sách và chấp nhận không có tham số nào", () => {
    expect(url(plan("GET", q(`action=report&zoneIds=${id(1)},${id(1)}`))).searchParams.getAll("zoneIds")).toEqual([id(1)]);
    expect(plan("GET", q("action=report"))).toMatchObject({ permission: "View", path: "/api/reports/end-of-day" });
  });
  it("từ chối giá trị sai: concern, giờ, khoảng ngược, GUID, enum, danh sách quá dài hoặc rỗng", () => {
    for (const bad of [
      "action=report&concern=other", "action=report&from=2026-11-19", "action=report&from=2026-11-19T24:00", "action=report&to=2026-02-30T10:00", "action=report&from=2026-11-19T10:00:00",
      "action=report&from=2026-11-20T08:00&to=2026-11-19T08:00", "action=report&zoneIds=abc", "action=report&zoneIds=", `action=report&createdBy=${id(1)},not-a-guid`,
      "action=report&paymentMethods=Credit", "action=report&channels=Cash", "action=report&funds=Bank,Gold", "action=report&partyKinds=Alien", "action=report&sources=Unknown", `action=report&typeIds=${id(1)},`,
      `action=report&productIds=${Array.from({ length: 51 }, (_, n) => id(n + 1)).join(",")}`,
    ]) expect(plan("GET", q(bad)), bad).toBeUndefined();
  });
  it("từ chối tham số lạ, tham số lặp, phương thức khác GET và body", () => {
    expect(plan("GET", q("action=report&method=Cash"))).toBeUndefined();
    expect(plan("GET", q("action=report&date=2026-11-19"))).toBeUndefined();
    expect(plan("GET", q(`action=report&zoneIds=${id(1)}&zoneIds=${id(2)}`))).toBeUndefined();
    expect(plan("POST", q("action=report"))).toBeUndefined();
    expect(plan("GET", q("action=report"), {})).toBeUndefined();
    expect(plan("GET", q("action=delete"))).toBeUndefined();
  });
  it("xuất tệp: Export, định dạng, hướng giấy và mở rộng chi tiết đi theo", () => {
    const pdf = plan("GET", q(`action=export&concern=goods&from=2026-11-01T00:00&to=2026-11-19T23:59&format=pdf&orientation=landscape&expanded=true&productIds=${id(1)}`));
    expect(pdf).toMatchObject({ permission: "Export", file: "export", exportFormat: "pdf" });
    const u = url(pdf);
    expect(u.pathname).toBe("/api/reports/end-of-day/export");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ concern: "goods", format: "pdf", orientation: "landscape", expanded: "true", productIds: id(1) });
    const xlsx = plan("GET", q("action=export&format=xlsx&orientation=portrait&expanded=false"));
    expect(xlsx).toMatchObject({ permission: "Export", file: "export" });
    expect(xlsx).not.toHaveProperty("exportFormat");
    expect(plan("GET", q("action=export"))).toMatchObject({ permission: "Export", path: "/api/reports/end-of-day/export" });
  });
  it("chỉ xuất tệp mới nhận format, orientation, expanded và giá trị phải đúng", () => {
    for (const bad of ["action=report&format=pdf", "action=report&orientation=portrait", "action=report&expanded=true", "action=export&format=docx", "action=export&orientation=square", "action=export&expanded=yes"]) expect(plan("GET", q(bad)), bad).toBeUndefined();
  });
});
