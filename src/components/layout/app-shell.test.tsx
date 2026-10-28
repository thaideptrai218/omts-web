// @vitest-environment jsdom
import {
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

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
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
afterEach(cleanup);

describe("desktop sidebar layout", () => {
  function setup() {
    const access = { permissions: effectivePermissionKeys.map((key) => ({ key, scope: { kind: "global" as const } })) };
    const view = render(<AppShell access={access} onLogout={vi.fn()}><button>Bên ngoài menu</button></AppShell>);
    return { ...view, sidebar: view.container.querySelector("aside")!, shell: view.container.firstElementChild! };
  }
  it("shares expanded state with the content grid instead of growing over it", () => {
    const view = setup();
    fireEvent.mouseEnter(view.sidebar);
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("true");
    expect(view.shell.className).toContain("lg:grid-cols-[18rem_minmax(0,1fr)]");
    fireEvent.mouseLeave(view.sidebar);
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("false");
  });
  it("stays expanded for keyboard focus even after the pointer leaves", () => {
    const view = setup(); const link = view.sidebar.querySelector("a")!;
    fireEvent.focus(link); fireEvent.mouseLeave(view.sidebar);
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("true");
    fireEvent.blur(link, { relatedTarget: screen.getByRole("button", { name: "Bên ngoài menu" }) });
    expect(view.shell.getAttribute("data-sidebar-expanded")).toBe("false");
  });
  it("uses distinguishable icons for employees, login accounts and roles", () => {
    const view = setup();
    const paths = ["/employees", "/access/accounts", "/access/roles"].map((href) =>
      view.sidebar.querySelector(`a[href="${href}"] path`)?.getAttribute("d"));
    expect(paths.every(Boolean)).toBe(true);
    expect(new Set(paths).size).toBe(3);
  });
});

describe("mobile menu account navigation", () => {
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
