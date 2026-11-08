// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RaftDirectory } from "./raft-directory";
import { mockRafts } from "../mocks/raft-fixtures";

const harness = vi.hoisted(() => ({ params: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(harness.params),
  usePathname: () => "/farming/rafts",
  useRouter: () => ({ replace: harness.replace }),
}));
afterEach(() => {
  cleanup();
  harness.params = "";
  harness.replace.mockReset();
});
const workspace = {
  rafts: mockRafts.map((record) => record.profile),
  zones: [
    { id: "zone-east", label: "Vùng Ngọc Vừng", status: "in-use" as const },
    { id: "zone-south", label: "Vùng Minh Châu", status: "in-use" as const },
  ],
};
it("applies URL filters together without leaking another zone into the results", () => {
  harness.params = "zoneId=zone-east&status=in-use&q=b1";
  render(<RaftDirectory workspace={workspace} onSelect={vi.fn()} />);
  expect(screen.getAllByRole("button", { name: /^Xem bè/ })).toHaveLength(2);
  expect(screen.queryByRole("button", { name: /B2-/ })).toBeNull();
});
it("opens a selected profile from its stable ID", () => {
  const select = vi.fn();
  render(<RaftDirectory workspace={workspace} onSelect={select} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Xem bè B1-01, Vùng Ngọc Vừng" }),
  );
  expect(select).toHaveBeenCalledWith("raft-1-1");
});
it("does not replace an unauthorized URL zone with all authorized records silently", () => {
  harness.params = "zoneId=unknown";
  render(<RaftDirectory workspace={workspace} onSelect={vi.fn()} />);
  expect(screen.queryByRole("button", { name: /^Xem bè/ })).toBeNull();
  expect(screen.getByText("Không có bè phù hợp")).toBeTruthy();
});
it("serializes the submitted filters once and supports clearing them", () => {
  harness.params = "status=in-use";
  render(<RaftDirectory workspace={workspace} onSelect={vi.fn()} />);
  const query = screen.getByLabelText("Tìm bè nuôi");
  fireEvent.change(query, { target: { value: "B1 + 01" } });
  fireEvent.change(screen.getByLabelText("Vùng nuôi"), {
    target: { value: "zone-east" },
  });
  fireEvent.submit(query.closest("form")!);
  const target = new URL(harness.replace.mock.calls[0][0], "http://localhost");
  expect(target.searchParams.get("q")).toBe("B1 + 01");
  expect(target.searchParams.get("zoneId")).toBe("zone-east");
  expect(target.searchParams.get("status")).toBe("in-use");
  fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
  expect(harness.replace).toHaveBeenLastCalledWith("/farming/rafts", {
    scroll: false,
  });
});
