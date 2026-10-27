// @vitest-environment jsdom
import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { Dialog } from "./dialog";

const lockAttribute = "data-omts-scroll-locked";
const onOpenChange = vi.fn();

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
  document.documentElement.removeAttribute(lockAttribute);
  document.documentElement.removeAttribute("style");
  document.body.removeAttribute("style");
  vi.clearAllMocks();
});

function Popups({ parent = true, child = false }) {
  return (
    <>
      <Dialog title="Hồ sơ" open={parent} onOpenChange={onOpenChange}>
        <p>Nội dung hồ sơ</p>
        <Dialog title="Xác nhận" open={child} onOpenChange={onOpenChange}>
          <p>Nội dung xác nhận</p>
        </Dialog>
      </Dialog>
    </>
  );
}

it("locks the document only while a dialog is open", () => {
  const view = render(<Popups parent={false} />);
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(false);
  view.rerender(<Popups />);
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(true);
  view.rerender(<Popups parent={false} />);
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(false);
});

it("keeps the background locked after closing a nested confirmation", () => {
  const view = render(<Popups child />);
  view.rerender(<Popups />);
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(true);
  view.rerender(<Popups parent={false} />);
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(false);
});

it("keeps the lock when the first of two independent dialogs unmounts", () => {
  function Siblings({ first = true }) {
    return (
      <>
        {first && (
          <Dialog title="Một" open onOpenChange={onOpenChange}>
            Một
          </Dialog>
        )}
        <Dialog title="Hai" open onOpenChange={onOpenChange}>
          Hai
        </Dialog>
      </>
    );
  }
  const view = render(<Siblings />);
  view.rerender(<Siblings first={false} />);
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(true);
  view.unmount();
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(false);
});

it("cleans up on unmount and balances React Strict Mode effects", () => {
  const view = render(
    <StrictMode>
      <Popups child />
    </StrictMode>,
  );
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(true);
  view.unmount();
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(false);
  const reopened = render(<Popups />);
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(true);
  reopened.unmount();
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(false);
});

it("does not replace existing inline styles or scroll coordinates", () => {
  document.documentElement.style.cssText = "overflow-y: scroll; color: red";
  document.body.style.cssText = "overflow: auto !important; padding-right: 7px";
  document.documentElement.scrollTop = 240;
  const rootStyle = document.documentElement.style.cssText;
  const bodyStyle = document.body.style.cssText;
  const view = render(<Popups />);
  view.unmount();
  expect(document.documentElement.style.cssText).toBe(rootStyle);
  expect(document.body.style.cssText).toBe(bodyStyle);
  expect(document.documentElement.scrollTop).toBe(240);
});

it("restores an existing lock marker instead of removing another owner's state", () => {
  document.documentElement.setAttribute(lockAttribute, "existing-owner");
  const view = render(<Popups child />);
  view.unmount();
  expect(document.documentElement.getAttribute(lockAttribute)).toBe(
    "existing-owner",
  );
});

it("retains the lock until the controlled parent actually closes", () => {
  const view = render(<Popups />);
  const dialog = screen.getByRole("dialog", { name: "Hồ sơ" });
  fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(true);
  view.rerender(<Popups parent={false} />);
  expect(document.documentElement.hasAttribute(lockAttribute)).toBe(false);
});
