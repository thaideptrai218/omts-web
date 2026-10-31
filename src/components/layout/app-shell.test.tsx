// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { AppShell } from "./app-shell";
import { Dialog } from "@/components/ui/dialog";
import type { ComponentProps } from "react";
import { effectivePermissionKeys } from "@/features/access/domain/access-types";
import {
  SIDEBAR_OPEN_DELAY,
  SIDEBAR_CLOSE_DELAY,
} from "./use-sidebar-expansion";

const route = vi.hoisted(() => ({ pathname: "/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("next/link", () => ({
  default: ({ onClick, children, ...props }: ComponentProps<"a">) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));
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
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  route.pathname = "/dashboard";
});

describe("desktop sidebar layout", () => {
  function setup() {
    const access = {
      permissions: effectivePermissionKeys.map((key) => ({
        key,
        scope: { kind: "global" as const },
      })),
    };
    const view = render(
      <AppShell access={access} onLogout={vi.fn()}>
        <button>Bên ngoài menu</button>
      </AppShell>,
    );
    return {
      ...view,
      sidebar: view.container.querySelector("aside")!,
      shell: view.container.firstElementChild!,
    };
  }
  it("starts expanded with readable navigation and supports explicit collapse/reopen", () => {
    const view = setup();
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("true");
    fireEvent.click(
      within(view.sidebar).getByRole("button", { name: "Thu gọn menu" }),
    );
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("false");
    const reopen = within(view.sidebar).getByRole("button", {
      name: "Mở rộng menu",
    });
    expect(reopen.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(reopen);
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("true");
    expect(view.shell.getAttribute("data-sidebar-pinned")).toBe("true");
  });
  it("stays expanded for keyboard focus even after the pointer leaves", () => {
    vi.useFakeTimers();
    const view = setup();
    const link = view.sidebar.querySelector("a")!;
    fireEvent.click(
      within(view.sidebar).getByRole("button", { name: "Thu gọn menu" }),
    );
    fireEvent.focus(link);
    fireEvent.mouseLeave(view.sidebar);
    act(() => vi.advanceTimersByTime(SIDEBAR_CLOSE_DELAY));
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("true");
    fireEvent.blur(link, {
      relatedTarget: screen.getByRole("button", { name: "Bên ngoài menu" }),
    });
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("false");
  });
  it("does not expand on a quick pointer crossing; opens and closes with hover intent", () => {
    vi.useFakeTimers();
    const view = setup();
    fireEvent.click(
      within(view.sidebar).getByRole("button", { name: "Thu gọn menu" }),
    );
    fireEvent.mouseEnter(view.sidebar);
    act(() => vi.advanceTimersByTime(SIDEBAR_OPEN_DELAY - 1));
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("false");
    fireEvent.mouseLeave(view.sidebar);
    act(() => vi.advanceTimersByTime(SIDEBAR_CLOSE_DELAY));
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("false");
    fireEvent.mouseEnter(view.sidebar);
    act(() => vi.advanceTimersByTime(SIDEBAR_OPEN_DELAY));
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("true");
    fireEvent.mouseLeave(view.sidebar);
    act(() => vi.advanceTimersByTime(SIDEBAR_CLOSE_DELAY - 1));
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("true");
    act(() => vi.advanceTimersByTime(1));
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("false");
  });
  it("cancels delayed closing when the pointer returns and can pin an automatic preview", () => {
    vi.useFakeTimers();
    const view = setup();
    fireEvent.click(
      within(view.sidebar).getByRole("button", { name: "Thu gọn menu" }),
    );
    fireEvent.mouseEnter(view.sidebar);
    act(() => vi.advanceTimersByTime(SIDEBAR_OPEN_DELAY));
    fireEvent.mouseLeave(view.sidebar);
    act(() => vi.advanceTimersByTime(100));
    fireEvent.mouseEnter(view.sidebar);
    act(() => vi.advanceTimersByTime(SIDEBAR_CLOSE_DELAY));
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("true");
    fireEvent.click(
      within(view.sidebar).getByRole("button", { name: "Giữ menu mở" }),
    );
    fireEvent.mouseLeave(view.sidebar);
    act(() => vi.advanceTimersByTime(SIDEBAR_CLOSE_DELAY));
    expect(view.shell.getAttribute("data-sidebar-pinned")).toBe("true");
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("true");
  });
  it("clears delayed hover work on unmount", () => {
    vi.useFakeTimers();
    const view = setup();
    fireEvent.click(
      within(view.sidebar).getByRole("button", { name: "Thu gọn menu" }),
    );
    fireEvent.mouseEnter(view.sidebar);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("keeps names and the current page accessible in compact mode", () => {
    const view = setup();
    fireEvent.click(
      within(view.sidebar).getByRole("button", { name: "Thu gọn menu" }),
    );
    const dashboard = within(view.sidebar).getByRole("link", {
      name: "Bảng điều hành",
    });
    expect(dashboard.getAttribute("aria-current")).toBe("page");
    expect(dashboard.getAttribute("title")).toBe("Bảng điều hành");
  });
  it("filters menu entries by capability and does not infer authority from a role label", () => {
    render(
      <AppShell
        accountRole="Chủ hợp tác xã"
        onLogout={vi.fn()}
        access={{
          permissions: [
            {
              key: "farming.rafts.view",
              scope: { kind: "zones", zoneIds: ["east"] },
            },
          ],
        }}
      >
        Nội dung
      </AppShell>,
    );
    const sidebar = screen.getByRole("complementary", {
      name: "Thanh điều hướng",
    });
    expect(within(sidebar).getByRole("link", { name: "Bè nuôi" })).toBeTruthy();
    expect(
      within(sidebar).queryByRole("link", { name: "Nhân viên" }),
    ).toBeNull();
    expect(
      within(sidebar).queryByRole("link", {
        name: "Vai trò & quyền",
      }),
    ).toBeNull();
  });
  it("marks a nested destination without marking a sibling route active", () => {
    route.pathname = "/access/accounts/example";
    const view = setup();
    expect(
      within(view.sidebar)
        .getByRole("link", { name: "Tài khoản nội bộ" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      within(view.sidebar)
        .getByRole("link", { name: "Vai trò & quyền" })
        .hasAttribute("aria-current"),
    ).toBe(false);
  });
  it("uses distinguishable icons for employees, login accounts and roles", () => {
    const view = setup();
    const paths = ["/employees", "/access/accounts", "/access/roles"].map(
      (href) =>
        view.sidebar.querySelector(`a[href="${href}"] path`)?.getAttribute("d"),
    );
    expect(paths.every(Boolean)).toBe(true);
    expect(new Set(paths).size).toBe(3);
  });
});

describe("mobile menu account navigation", () => {
  it("closes the drawer and releases scrolling when resizing to desktop", () => {
    let resized: ((event: MediaQueryListEvent) => void) | undefined;
    const remove = vi.fn();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        addEventListener: (_: string, listener: typeof resized) => {
          resized = listener;
        },
        removeEventListener: remove,
      })),
    );
    const view = render(<AppShell onLogout={vi.fn()}>Nội dung</AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const drawer = screen.getByRole("dialog", {
      name: "Menu trên thiết bị di động",
    });
    expect(
      document.documentElement.hasAttribute("data-omts-scroll-locked"),
    ).toBe(true);
    expect(resized).toBeTypeOf("function");
    act(() => resized!({ matches: true } as MediaQueryListEvent));
    expect(drawer.hasAttribute("open")).toBe(false);
    expect(
      document.documentElement.hasAttribute("data-omts-scroll-locked"),
    ).toBe(false);
    view.unmount();
    expect(remove).toHaveBeenCalledOnce();
  });
  it("retains the account identity and prevents another logout while pending", () => {
    const logout = vi.fn();
    render(
      <AppShell
        accountLabel="Nguyễn Văn An"
        accountRole="Quản lý vùng"
        accountScope="Vùng A"
        isLoggingOut
        onLogout={logout}
      >
        Nội dung
      </AppShell>,
    );
    const sidebar = screen.getByRole("complementary", {
      name: "Thanh điều hướng",
    });
    expect(
      within(sidebar).getByRole("link", {
        name: "Nguyễn Văn An, Quản lý vùng, Vùng A",
      }),
    ).toBeTruthy();
    const button = within(sidebar).getByRole("button", {
      name: "Đang đăng xuất...",
    });
    fireEvent.click(button);
    expect(logout).not.toHaveBeenCalled();
    expect(button.getAttribute("aria-busy")).toBe("true");
  });
  it("shares the scroll lock with a popup and releases it only after both close", () => {
    function Shell({ popup = true }) {
      return (
        <AppShell onLogout={() => {}}>
          <Dialog title="Hồ sơ thử" open={popup} onOpenChange={() => {}}>
            Hồ sơ
          </Dialog>
        </AppShell>
      );
    }
    const view = render(<Shell />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: "Menu trên thiết bị di động" }),
      ).getByRole("button", { name: "Đóng" }),
    );
    expect(
      document.documentElement.hasAttribute("data-omts-scroll-locked"),
    ).toBe(true);
    view.rerender(<Shell popup={false} />);
    expect(
      document.documentElement.hasAttribute("data-omts-scroll-locked"),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(
      document.documentElement.hasAttribute("data-omts-scroll-locked"),
    ).toBe(true);
    view.unmount();
    expect(
      document.documentElement.hasAttribute("data-omts-scroll-locked"),
    ).toBe(false);
  });

  it("closes the menu after selecting the personal account link", () => {
    render(
      <AppShell onLogout={() => {}} accountLabel="Người kiểm thử">
        <p>Nội dung</p>
      </AppShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const dialog = screen.getByRole("dialog", {
      name: "Menu trên thiết bị di động",
    });
    fireEvent.click(
      within(dialog).getByRole("link", { name: /Người kiểm thử/ }),
    );
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(
      screen
        .getByRole("button", { name: "Menu" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });
});
