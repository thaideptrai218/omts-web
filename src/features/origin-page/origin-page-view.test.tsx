import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { provenancePageSchema } from "@/server/public/origin-page-schema";
import { originCopy } from "./origin-copy";
import { formatOriginDate, mapHref, safeWebHref, telHref } from "./origin-format";
import { OriginPageView } from "./origin-page-view";
import { OriginStatePanel } from "./origin-state-panel";

const langHrefs = { vi: "/origin/T", en: "/origin/T?lang=en" };
const cooperative = { fullName: "HTX Nuôi trồng Thủy sản Trung Nam", shortName: "HTX Trung Nam", phoneNumber: "0258 3812 345", website: "javascript:alert(1)", certifications: [{ name: "VietGAP", state: "Valid", expiryDate: "2027-01-31" }] };
const published = {
  lotCode: "B03-20261026", products: ["Hàu sữa"], originState: "Published",
  origin: {
    harvestDate: "2026-10-26", raftCode: "B03", zoneName: "Vùng nuôi 1", map: { latitude: 21.05, longitude: 107.45, source: "Raft" },
    seedings: [{ seedingDate: "2026-05-20", seedItemName: "Giống hàu sữa" }], daysOfFarming: 159,
    harvestPhotoUrls: ["/origin/photo?k=a%2Fb%2Fc.jpg&e=1&s=" + "a".repeat(64), "https://blob.example/x.jpg"], raftPhotoUrls: [],
  },
};
const withdrawn = { lotCode: "B05-20261024", products: ["Hàu múp"], originState: "Withdrawn", withdrawalDate: "2026-10-27", message: "HTX Trung Nam đã thu hồi thông tin nguồn gốc của lô B05-20261024 vào ngày 27/10/2026.", origin: null };
const page = (over: Record<string, unknown> = {}) => provenancePageSchema.parse({
  language: "vi", status: "Ok", invoice: { code: "HD000124", date: "2026-10-28" }, cooperative, lots: [published, withdrawn], ...over,
});
const html = (p = page()) => renderToStaticMarkup(<OriginPageView page={p} langHrefs={langHrefs} />);

describe("OriginPageView", () => {
  it("shows invoice, lots, state as text and journey from the API data only", () => {
    const out = html();
    expect(out).toContain("Hóa đơn HD000124");
    expect(out).toContain("28/10/2026");
    expect(out).toContain("Lô B03-20261026");
    expect(out).toContain("Đang hiệu lực");
    expect(out).toContain("Đã thu hồi");
    expect(out).toContain("159 ngày");
    expect(out).toContain("Giống hàu sữa");
    expect(out).toContain("Hành trình của lô");
    expect(out).toContain("HTX Trung Nam đã thu hồi thông tin nguồn gốc của lô B05-20261024");
    expect(out).not.toMatch(/lý do|reason/iu);
  });

  it("gives photos meaningful alt text and lazy loading, and landmarks", () => {
    const out = html();
    expect(out).toContain('alt="Ảnh thu hoạch của lô B03-20261026, ảnh 1 trên 2"');
    expect(out.match(/<img[^>]*alt="Ảnh[^>]*loading="lazy"/gu)?.length).toBe(2);
    expect(out).toContain('id="noi-dung"');
    expect(out).toContain('href="#noi-dung"');
    expect(out).toContain("<main");
    expect(out).toContain('aria-current="true"');
  });

  it("drops unsafe website links but keeps the phone as a tel link", () => {
    const out = html();
    expect(out).not.toContain("javascript:");
    expect(out).toContain('href="tel:02583812345"');
  });

  it("renders a cancelled invoice as cooperative block plus the API message only", () => {
    const out = html(page({ status: "Cancelled", invoice: null, lots: [], message: "Hóa đơn này đã bị hủy nên không hiển thị thông tin nguồn gốc." }));
    expect(out).toContain("Hóa đơn đã hủy");
    expect(out).toContain("đã bị hủy nên không hiển thị");
    expect(out).not.toContain("Lô B03");
  });

  it("renders NoLots with the API message", () => {
    const out = html(page({ status: "NoLots", lots: [], message: "Hóa đơn này không có thông tin nguồn gốc để hiển thị." }));
    expect(out).toContain("Chưa có thông tin nguồn gốc để hiển thị");
  });

  it("renders English labels when the API answers in English", () => {
    const out = html(page({ language: "en" }));
    expect(out).toContain("Harvest lots on this invoice");
    expect(out).toContain("Withdrawn");
  });
});

describe("OriginStatePanel", () => {
  const panel = (problem: Parameters<typeof OriginStatePanel>[0]["problem"], extra = {}) =>
    renderToStaticMarkup(<OriginStatePanel problem={problem} language="vi" copy={originCopy("vi")} retryHref="/origin/T" {...extra} />);
  it("offers retry for transient problems only", () => {
    expect(panel("unavailable")).toContain("Thử lại");
    expect(panel("rate-limited")).toContain("Thử lại");
    expect(panel("invalid-token")).not.toContain("Thử lại");
    expect(panel("not-found")).not.toContain("Thử lại");
  });
  it("uses the backend message for not-found and never leaks the backend origin", () => {
    const out = panel("not-found", { backendMessage: "Không tìm thấy hóa đơn của mã QR này." });
    expect(out).toContain("Không tìm thấy hóa đơn của mã QR này.");
    expect(panel("unavailable")).not.toMatch(/127\.0\.0\.1|localhost/u);
  });
});

describe("format helpers", () => {
  it("formats dates and links safely", () => {
    expect(formatOriginDate("2026-11-01")).toBe("01/11/2026");
    expect(formatOriginDate("weird")).toBe("weird");
    expect(telHref("0258 3812 345")).toBe("tel:02583812345");
    expect(telHref("abc")).toBeNull();
    expect(safeWebHref("javascript:alert(1)")).toBeNull();
    expect(safeWebHref("https://htx.example.vn")).toBe("https://htx.example.vn/");
    expect(mapHref(21.05, 107.45)).toBe("https://www.google.com/maps?q=21.050000,107.450000");
  });
});
