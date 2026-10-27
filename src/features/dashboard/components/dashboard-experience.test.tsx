// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthState } from "@/features/auth/state/auth-provider";
import type { DashboardView } from "../domain/dashboard";
import { DashboardExperience } from "./dashboard-experience";
import { dashboardService } from "../services/dashboard-service.instance";

const auth = vi.hoisted(() => ({
  state: { status: "anonymous" } as AuthState,
}));
vi.mock("@/features/auth/state/auth-provider", () => ({ useAuth: () => auth }));
vi.mock("../services/dashboard-service.instance", () => ({
  dashboardService: { load: vi.fn() },
}));
const service = vi.mocked(dashboardService);
const snapshot = {
  workforce: { employedCount: 2, leftCount: 1 },
  access: {
    activeInternalAccountCount: 2,
    lockedInternalAccountCount: 1,
    roleInUseCount: 3,
    zoneInUseCount: 2,
  },
};
const owner: AuthState = {
  status: "authenticated",
  account: {
    accountId: "owner-fixture",
    username: "owner",
    displayName: "Người kiểm thử",
    organizationName: null,
    primaryRoleLabel: "Chủ HTX",
    scopeLabel: "Toàn HTX",
    access: {
      permissions: [
        "workspace.overview.view",
        "cooperative.employees.manage",
        "access.accounts.manage",
        "access.roles.manage",
      ].map((key) => ({ key, scope: { kind: "all-zones" } })) as Extract<
        AuthState,
        { status: "authenticated" }
      >["account"]["access"]["permissions"],
    },
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  auth.state = owner;
  service.load.mockResolvedValue(snapshot);
});
afterEach(cleanup);

describe("dashboard shell and data boundaries", () => {
  it("shows the heading and permitted shortcuts before the data request resolves", () => {
    service.load.mockReturnValue(new Promise(() => {}));
    render(<DashboardExperience />);
    expect(
      screen.getByRole("heading", { name: "Bảng điều hành" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "Lối tắt quản trị" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("status", { name: "Đang tải số liệu bảng điều hành" }),
    ).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });
  it("renders actual counts and charts, then refreshes them in place", async () => {
    render(<DashboardExperience />);
    await screen.findByRole("img", {
      name: "2 nhân viên đang làm việc, 1 đã nghỉ",
    });
    expect(
      screen.getByRole("img", {
        name: "2 tài khoản hoạt động, 1 tài khoản đã khóa",
      }),
    ).toBeTruthy();
    service.load.mockResolvedValueOnce({
      ...snapshot,
      workforce: { employedCount: 4, leftCount: 1 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Làm mới số liệu" }));
    await screen.findByRole("img", {
      name: "4 nhân viên đang làm việc, 1 đã nghỉ",
    });
  });
  it("keeps shortcuts usable on error and supports retry", async () => {
    service.load.mockRejectedValueOnce(new Error("fixture unavailable"));
    render(<DashboardExperience />);
    await screen.findByRole("alert");
    expect(screen.getByRole("link", { name: /Nhân viên/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByRole("img", {
      name: "2 tài khoản hoạt động, 1 tài khoản đã khóa",
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("does not request data or show shortcuts without overview permission", () => {
    auth.state = {
      ...owner,
      account: { ...owner.account, access: { permissions: [] } },
    };
    render(<DashboardExperience />);
    expect(
      screen.getByRole("heading", { name: "Chưa được cấp quyền" }),
    ).toBeTruthy();
    expect(service.load).not.toHaveBeenCalled();
  });
  it("does not expose management shortcuts or old counts after changing account", async () => {
    let resolveOld!: (data: DashboardView) => void;
    service.load.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    );
    const page = render(<DashboardExperience />);
    auth.state = {
      ...owner,
      account: {
        ...owner.account,
        accountId: "staff-fixture",
        access: {
          permissions: [
            {
              key: "workspace.overview.view",
              scope: { kind: "zones", zoneIds: ["zone-east"] },
            },
          ],
        },
      },
    };
    service.load.mockResolvedValueOnce({});
    page.rerender(<DashboardExperience />);
    await screen.findByRole("heading", {
      name: "Chưa có số liệu phù hợp với quyền hiện tại",
    });
    await act(async () => {
      resolveOld(snapshot);
    });
    expect(
      screen.queryByRole("navigation", { name: "Lối tắt quản trị" }),
    ).toBeNull();
    expect(screen.queryByText("Tổng nhân viên")).toBeNull();
    await waitFor(() => expect(service.load).toHaveBeenCalledTimes(2));
  });
});
