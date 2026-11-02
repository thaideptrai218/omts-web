// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
const api = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => api }));
vi.mock("@/features/operations/water-screen", () => ({ MeasurementEditor: ({ record }: { record: { id: string } }) => <p>Phép đo {record.id}</p>, WaterScreen: ({ initialZoneId }: { initialZoneId: string }) => <p>Vùng đo {initialZoneId}</p> }));
vi.mock("@/features/farming-api/license-screen", () => ({ LicenseEditor: ({ record }: { record: { id: string } }) => <p>Giấy tờ {record.id}</p> }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div> }));
import { NotificationRecordDialog } from "./record-dialog";
const id = "122bb318-a72e-49aa-a8d7-a6169f889007", zone = "122bb318-a72e-49aa-a8d7-a6169f889008";
const opened = { notificationId: id, recordType: "WaterMeasurement" as const, recordId: id, recordCode: null, zoneId: zone };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("loads the authorized water record and preserves its zone", async () => {
  api.read.mockResolvedValue({ status: "success", data: { id, zoneId: zone } });
  render(<NotificationRecordDialog opened={opened} onClose={vi.fn()} />);
  await screen.findByText(`Phép đo ${id}`); expect(api.read).toHaveBeenCalledWith("detail", { id }, expect.anything(), expect.any(AbortSignal));
});
it.each([{ id: zone, zoneId: zone }, { id, zoneId: id }])("does not display a substituted measurement or zone", async (record) => {
  api.read.mockResolvedValue({ status: "success", data: record }); render(<NotificationRecordDialog opened={opened} onClose={vi.fn()} />);
  await screen.findByRole("alert"); expect(screen.queryByText(/^Phép đo/)).toBeNull();
});
it("opens the measurement workspace with the authorized reminder zone", () => {
  render(<NotificationRecordDialog opened={{ ...opened, recordType: "FarmingZone", recordId: zone }} onClose={vi.fn()} />);
  expect(screen.getByText(`Vùng đo ${zone}`)).toBeTruthy(); expect(api.read).not.toHaveBeenCalled();
});
it("loads a licence by the verified ID using the existing licence repository", async () => {
  api.read.mockResolvedValue({ status: "success", data: { id, zones: [] } }); render(<NotificationRecordDialog opened={{ ...opened, recordType: "ZoneComplianceDocument", zoneId: null }} onClose={vi.fn()} />);
  await screen.findByText(`Giấy tờ ${id}`);
});
