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
