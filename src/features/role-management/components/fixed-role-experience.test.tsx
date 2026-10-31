// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { RoleManagementExperience } from "./role-management-experience";
import { roleManagementService } from "../services/role-management-service.instance";
import { createMockManagementEnvironment } from "@/shared/mocks/mock-management-environment";

vi.mock("@/features/auth/state/auth-provider", () => ({
  useAuth: () => ({
    state: {
      status: "authenticated",
      account: {
        access: {
          permissions: [
            { key: "access.roles.manage", scope: { kind: "all-zones" } },
          ],
        },
      },
    },
  }),
}));
vi.mock("@/components/ui/toast-provider", () => ({
  useToast: () => ({ notify: vi.fn() }),
}));
vi.mock("../services/role-management-service.instance", () => ({
  roleManagementService: {
    load: vi.fn(),
    save: vi.fn(),
    discontinue: vi.fn(),
    reactivate: vi.fn(),
  },
}));
const service = vi.mocked(roleManagementService);
let environment: ReturnType<typeof createMockManagementEnvironment>;
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
beforeEach(() => {
  vi.clearAllMocks();
  environment = createMockManagementEnvironment(0);
  service.load.mockImplementation(() => environment.roles.load());
  service.save.mockImplementation((input) => environment.roles.save(input));
  service.discontinue.mockImplementation((input) =>
    environment.roles.discontinue(input),
  );
  service.reactivate.mockImplementation((input) =>
    environment.roles.reactivate(input),
  );
});
afterEach(cleanup);

async function openStaff() {
  fireEvent.click(await screen.findByRole("button", { name: /Nhân viên/ }));
  return screen.getByRole("dialog", { name: "Nhân viên" });
}

describe("fixed-role product screen", () => {
  it("closes the confirmation on reactivation failure so the editor error is accessible", async () => {
    const staff = environment.roles
      .snapshotRoles()
      .find((role) => role.id === "role-staff")!;
    await environment.roles.discontinue({
      id: staff.id,
      recordVersion: staff.recordVersion,
    });
    service.reactivate.mockResolvedValueOnce({
      status: "conflict",
      message: {
        code: "MSG06",
        params: { user_name: "Người kiểm thử", time: "vừa xong" },
      },
    });
    render(<RoleManagementExperience />);
    const editor = await openStaff();
    fireEvent.click(
      within(editor).getByRole("button", { name: "Khôi phục sử dụng" }),
    );
    const confirmation = screen.getByRole("dialog", {
      name: "Khôi phục vai trò Nhân viên?",
    });
    fireEvent.click(
      within(confirmation).getByRole("button", { name: "Khôi phục sử dụng" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Khôi phục vai trò Nhân viên?" }),
      ).toBeNull(),
    );
    expect(within(editor).getByRole("alert")).toBeTruthy();
    expect(
      environment.roles.snapshotRoles().find((role) => role.id === staff.id)
        ?.status,
    ).toBe("discontinued");
  });
  it("has no Add/Copy controls, keeps the name readonly, and saves an editable description", async () => {
    render(<RoleManagementExperience />);
    const editor = await openStaff();
    expect(
      screen.queryByRole("button", { name: /Thêm vai trò|Sao chép vai trò/ }),
    ).toBeNull();
    expect(
      within(editor).getByRole<HTMLInputElement>("textbox", {
        name: "Tên vai trò",
      }).readOnly,
    ).toBe(true);
    fireEvent.change(within(editor).getByRole("textbox", { name: "Mô tả" }), {
      target: { value: "Công việc do Owner cấu hình" },
    });
    fireEvent.click(
      within(editor).getByRole("button", { name: "Lưu vai trò" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Nhân viên" }),
      ).toBeNull(),
    );
    expect(
      environment.roles.snapshotRoles().find((role) => role.id === "role-staff")
        ?.description,
    ).toBe("Công việc do Owner cấu hình");
  });
  it("confirms discontinue and reactivate through real product dialogs", async () => {
    render(<RoleManagementExperience />);
    let editor = await openStaff();
    fireEvent.click(
      within(editor).getByRole("button", { name: "Ngừng sử dụng" }),
    );
    const stop = screen.getByRole("dialog", {
      name: "Ngừng sử dụng vai trò Nhân viên?",
    });
    fireEvent.click(
      within(stop).getByRole("button", { name: "Ngừng sử dụng" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Nhân viên" }),
      ).toBeNull(),
    );
    editor = await openStaff();
    fireEvent.click(
      within(editor).getByRole("button", { name: "Khôi phục sử dụng" }),
    );
    const restore = screen.getByRole("dialog", {
      name: "Khôi phục vai trò Nhân viên?",
    });
    fireEvent.click(
      within(restore).getByRole("button", { name: "Khôi phục sử dụng" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Nhân viên" }),
      ).toBeNull(),
    );
    expect(
      environment.roles
        .snapshotRoles()
        .find((role) => role.id === "role-staff"),
    ).toMatchObject({ status: "in-use" });
  });
});
