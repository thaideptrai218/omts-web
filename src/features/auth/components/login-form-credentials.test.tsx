// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";
afterEach(cleanup);
function setup(accepted: boolean) {
  const submit = vi.fn().mockResolvedValue(accepted);
  render(<LoginForm onSubmit={submit} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "owner" } });
  fireEvent.change(screen.getByLabelText(/^Mật khẩu/, { selector: "input" }), { target: { value: ["demo", "123"].join("") } });
  return submit;
}
it("clears accepted credentials even if the login form stays mounted in a cached route", async () => {
  const submit = setup(true);
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
  await waitFor(() => expect(submit).toHaveBeenCalledOnce());
  await waitFor(() => expect((screen.getByLabelText(/^Mật khẩu/, { selector: "input" }) as HTMLInputElement).value).toBe(""));
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
});
it("keeps rejected credentials available for correction", async () => {
  const submit = setup(false);
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
  await waitFor(() => expect(submit).toHaveBeenCalledOnce());
  await waitFor(() => expect((screen.getByRole("button", { name: "Đăng nhập" }) as HTMLButtonElement).disabled).toBe(false));
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("owner");
  expect((screen.getByLabelText(/^Mật khẩu/, { selector: "input" }) as HTMLInputElement).value.length).toBe(7);
});
