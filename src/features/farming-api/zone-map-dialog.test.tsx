// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
const request = vi.hoisted(() => vi.fn());
vi.mock("./zone-map-repository", () => ({ readZoneMap: request }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div> }));
import { ZoneMapDialog } from "./zone-map-dialog";
afterEach(() => { cleanup(); request.mockReset(); });
it("searches raft codes and never creates a link for a missing coordinate", async () => {
  request.mockResolvedValue({ status: "success", data: [{ id: "zone", code: "Z1", name: "Vùng 1", latitude: 0, longitude: 0, statusId: 101, status: "In Use",
    rafts: [{ id: "r1", code: "BE-01", latitude: null, longitude: 100 }, { id: "r2", code: "BE-02", latitude: 20, longitude: 100 }] }] });
  render(<ZoneMapDialog onClose={vi.fn()} />); await screen.findByText("BE-01");
  expect(screen.getAllByRole("link")).toHaveLength(2); expect(screen.getByText("Chưa đủ tọa độ")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "BE-02" } }); expect(screen.queryByText("BE-01")).toBeNull(); expect(screen.getByText("BE-02")).toBeTruthy();
});
it("reloads the discontinued filter and replaces old rows", async () => {
  request.mockResolvedValue({ status: "success", data: [] }); render(<ZoneMapDialog onClose={vi.fn()} />);
  await screen.findByText("Không có vị trí phù hợp."); fireEvent.click(screen.getByRole("checkbox"));
  await vi.waitFor(() => expect(request).toHaveBeenLastCalledWith(true, expect.any(AbortSignal)));
});
