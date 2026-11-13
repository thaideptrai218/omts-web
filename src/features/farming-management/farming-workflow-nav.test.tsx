// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/operations/harvest", query: "zoneId=z1&raftId=r1&cycleId=c1" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useSearchParams: () => new URLSearchParams(nav.query) }));
vi.mock("@/features/operations/permissions", async importOriginal => ({ ...(await importOriginal<typeof import("@/features/operations/permissions")>()), operationAllowed: (area: string) => area !== "water" }));
import { FarmingWorkflowNav } from "./farming-workflow-nav";

const props = { identity: {} as never, permissions: { functionPermissions: [] } as never };
afterEach(cleanup);

describe("farming bar", () => {
  it("keeps Hành trình (0) outside the flow and numbers the flow steps 1-4 with the current raft in every link", () => {
    render(<FarmingWorkflowNav {...props} />);
    const bar = screen.getByRole("navigation", { name: "Hành trình nuôi trồng" });
    const overview = within(bar).getByRole("link", { name: /Hành trình/ });
    expect(overview.getAttribute("href")).toBe("/farming/cycles?zoneId=z1&raftId=r1&cycleId=c1&tab=journey");
    expect(overview.textContent).toContain("0");
    const flow = within(bar).getByRole("list", { name: "Các bước nuôi trồng" });
    expect(within(flow).queryByRole("link", { name: /Hành trình/ })).toBeNull();
    expect(within(flow).getAllByRole("link").map(link => link.textContent)).toEqual([
      "1Ươm giốngƯơm giống con trong vùng", "2Thả giốngĐưa giống xuống từng làn", "3Thu hoạchThu theo đơn mua", "4Sử dụng vật tư (tùy chọn)Cho ăn, thuốc, sửa chữa"]);
    expect(within(flow).getByRole("link", { name: /Thả giống/ }).getAttribute("href")).toBe("/operations/seeding?zoneId=z1&raftId=r1&cycleId=c1");
    expect(within(flow).getByRole("link", { name: /Thu hoạch/ }).getAttribute("aria-current")).toBe("page");
  });
  it("opens the overview without a raft when none is chosen, and hides the bar on other screens", () => {
    nav.query = "";
    const { container, rerender } = render(<FarmingWorkflowNav {...props} />);
    expect(screen.getByRole("link", { name: /Hành trình/ }).getAttribute("href")).toBe("/farming/cycles");
    nav.pathname = "/dashboard";
    rerender(<FarmingWorkflowNav {...props} />);
    expect(container.querySelector("nav")).toBeNull();
    nav.pathname = "/operations/harvest";
  });
});
