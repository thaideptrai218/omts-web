// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
vi.mock("./dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { useActionDialog } from "./use-action-dialog";
function Harness({ result }: { result(value: string | boolean | null): void }) {
  const action = useActionDialog();
  return <><button onClick={async () => result(await action.confirm("Bỏ nháp?"))}>Close draft</button><button onClick={async () => result(await action.prompt("Lý do khóa"))}>Reason</button>{action.dialog}</>;
}
afterEach(cleanup);
it("waits for an explicit decision and cancels without accepting", async () => {
  const result = vi.fn(); render(<Harness result={result} />); fireEvent.click(screen.getByText("Close draft")); expect(result).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Quay lại" })); await waitFor(() => expect(result).toHaveBeenCalledWith(false));
  fireEvent.click(screen.getByText("Close draft")); fireEvent.click(screen.getByRole("button", { name: "Đồng ý" })); await waitFor(() => expect(result).toHaveBeenCalledWith(true));
});
it("requires a nonblank reason and trims only at confirmation", async () => {
  const result = vi.fn(); render(<Harness result={result} />); fireEvent.click(screen.getByText("Reason")); const button = screen.getByRole("button", { name: "Đồng ý" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true); fireEvent.change(screen.getByRole("textbox", { name: "Lý do" }), { target: { value: " QA reason " } }); expect(result).not.toHaveBeenCalled();
  fireEvent.click(button); await waitFor(() => expect(result).toHaveBeenCalledWith("QA reason"));
});
it("cancels a pending decision if its editor unmounts", async () => {
  const result = vi.fn(), view = render(<Harness result={result} />); fireEvent.click(screen.getByText("Reason")); view.unmount(); await waitFor(() => expect(result).toHaveBeenCalledWith(null));
});
