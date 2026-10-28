// @vitest-environment jsdom
import {
  act,
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
  expect,
  it,
  vi,
} from "vitest";
import { AccountManagementExperience } from "./account-management-experience";
import { accountManagementService } from "../services/account-management-service.instance";
import { createMockManagementEnvironment } from "@/shared/mocks/mock-management-environment";
import type { SaveAccountResult } from "../domain/account-management";

vi.mock("@/features/auth/state/auth-provider", () => ({
  useAuth: () => ({
    state: {
      status: "authenticated",
      account: {
        access: {
          permissions: [
            { key: "access.accounts.manage", scope: { kind: "all-zones" } },
          ],
        },
      },
    },
  }),
}));
vi.mock("../services/account-management-service.instance", () => ({
  accountManagementService: {
    load: vi.fn(),
    save: vi.fn(),
    changeStatus: vi.fn(),
    resetPassword: vi.fn(),
    revokeGrant: vi.fn(),
  },
}));
const service = vi.mocked(accountManagementService);
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
  vi.resetAllMocks();
  environment = createMockManagementEnvironment(0);
  service.load.mockImplementation(() => environment.accounts.load());
});
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/access/accounts"); });

it("opens the linked employee account requested by the follow-up URL", async () => {
  window.history.replaceState(null, "", "/access/accounts?accountId=account-tran-binh");
  render(<AccountManagementExperience />);
  await screen.findByRole("dialog", { name: "Trần Thị Bình" });
  expect(screen.queryByRole("dialog", { name: "Nguyễn Văn An" })).toBeNull();
  expect(service.save).not.toHaveBeenCalled();
  expect(service.changeStatus).not.toHaveBeenCalled();
});

it("does not open an unrelated account for an unknown follow-up target", async () => {
  window.history.replaceState(null, "", "/access/accounts?accountId=unknown-account");
  render(<AccountManagementExperience />);
  await screen.findByRole("button", { name: /Nguyễn Văn An/ });
  expect(screen.queryByRole("dialog")).toBeNull();
});

it.each(["saved", "forbidden"] as const)("keeps the account editor open while saving and releases the close guard after %s", async (outcome) => {
  let finish!: (result: SaveAccountResult) => void;
  service.save.mockImplementationOnce(() => {
    // Escape can arrive before a passive pending effect has reached the parent.
    fireEvent(editor, new Event("cancel", { bubbles: true, cancelable: true }));
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  render(<AccountManagementExperience />);
  fireEvent.click(await screen.findByRole("button", { name: /Nguyễn Văn An/ }));
  const editor = screen.getByRole("dialog", {
    name: "Nguyễn Văn An",
  });
  fireEvent.change(
    within(editor).getByRole("textbox", { name: /Họ và tên nhân viên/ }),
    { target: { value: "Nguyễn Văn An kiểm thử" } },
  );
  fireEvent.click(
    within(editor).getByRole("button", { name: "Xem quyền hiệu lực" }),
  );
  fireEvent.click(
    await within(editor).findByRole("button", { name: "Xác nhận và lưu" }),
  );
  await waitFor(() => expect(service.save).toHaveBeenCalledOnce());
  fireEvent(editor, new Event("cancel", { bubbles: true, cancelable: true }));
  expect(screen.getByRole("dialog", { name: "Nguyễn Văn An" })).toBeTruthy();
  await act(async () => {
    finish(outcome === "forbidden" ? { status: "forbidden", message: { code: "MSG02" } } : {
      status: "saved",
      account: {
        ...environment.accounts
          .snapshotAccounts()
          .find((account) => account.username === "nguyen.an")!,
        displayName: "Nguyễn Văn An kiểm thử",
        recordVersion: "saved-version",
      },
    });
  });
  const expectedName = outcome === "saved" ? "Nguyễn Văn An kiểm thử" : "Nguyễn Văn An";
  const savedEditor = screen.getByRole("dialog", {
    name: expectedName,
  });
  fireEvent(
    savedEditor,
    new Event("cancel", { bubbles: true, cancelable: true }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", {
        name: expectedName,
      }),
    ).toBeNull(),
  );
});
