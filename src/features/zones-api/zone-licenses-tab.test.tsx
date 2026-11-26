// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const state = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: state.read }) }));
vi.mock("@/features/farming-api/license-editor", () => ({ LicenseEditor: ({ mode }: { mode: string }) => <p>Biểu mẫu {mode}</p> }));
vi.mock("./zone-license-detail", () => ({ ZoneLicenseDetail: ({ id }: { id: string }) => <p>Chi tiết {id}</p> }));
import { ZoneLicensesTab } from "./zone-licenses-tab";

const ZONE = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63";
const doc = (over: object) => ({ documentType: "AQUACULTURE_LICENSE", documentTypeName: "Giấy phép", state: "Valid", documentId: "doc", documentNumber: "GP-1", effectiveDate: "2026-01-01", expiryDate: "2027-01-01", isReplaced: false, ...over });
const overview = (licenses: object[]) => ({ status: "success", data: { zoneId: ZONE, asOf: "2026-11-26", licenses } });

beforeEach(() => {
  state.read.mockResolvedValue(overview([
    doc({ documentId: "old", documentNumber: "GP-OLD", isReplaced: true, state: "Replaced", effectiveDate: "2024-01-01" }),
    doc({ documentId: "new", documentNumber: "GP-NEW", effectiveDate: "2026-01-01", expiryDate: "2026-12-10", state: "ExpiringSoon" }),
    doc({ documentType: "FOOD_SAFETY_COMMITMENT", documentId: null, documentNumber: null, effectiveDate: null, expiryDate: null, state: "Missing" }),
  ]));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const renderTab = () => render(<ZoneLicensesTab zoneId={ZONE} zones={[]} />);

it("has neither the as-of date field nor the replaced-documents switch, and always reads the state as of today", async () => {
  renderTab();
  await screen.findByText("GP-NEW");
  expect(screen.queryByLabelText(/Ngày xem tình trạng/)).toBeNull();
  expect(screen.queryByRole("switch")).toBeNull();
  const query = state.read.mock.calls[0][1] as { zoneId: string; asOf: string };
  expect(query.zoneId).toBe(ZONE);
  expect(query.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

it("lists every document: in force first, then missing types, then replaced ones marked Đã thay thế", async () => {
  renderTab();
  await screen.findByText("GP-NEW");
  const rows = screen.getAllByRole("row").slice(1);
  expect(rows).toHaveLength(3);
  expect(within(rows[0]).getByText("GP-NEW")).toBeTruthy();
  expect(within(rows[0]).getByText("Sắp hết hạn")).toBeTruthy();
  expect(within(rows[1]).getByText("Thiếu hồ sơ")).toBeTruthy();
  expect(within(rows[2]).getByText("GP-OLD")).toBeTruthy();
  expect(within(rows[2]).getByText("Đã thay thế")).toBeTruthy();
  expect(screen.getAllByText("Đã thay thế")).toHaveLength(1);
});

it("keeps the expiry reminder, the inline details and the add button", async () => {
  renderTab();
  expect(await screen.findByLabelText("Nhắc hạn giấy phép")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "GP-OLD" }));
  expect(await screen.findByText("Chi tiết old")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Thêm giấy tờ/ }));
  expect(await screen.findByText("Biểu mẫu create")).toBeTruthy();
});
