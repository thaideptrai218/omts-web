// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Field } from "./ui";
afterEach(cleanup);
it("keeps ISO form values while choosing dates through the shared floating calendar", () => {
  const submit = vi.fn();
  function Form() { const [value, setValue] = useState("2026-11-11"); return <form onSubmit={event => { event.preventDefault(); submit(); }}><Field label="Ngày ghi" type="date" required name="recordedOn" min="2026-11-01" max="2026-11-30" value={value} onChange={event => setValue(event.target.value)} /></form>; }
  render(<Form />);
  fireEvent.click(screen.getByRole("button", { name: /Ngày ghi:/ }));
  const chosen = document.querySelector<HTMLButtonElement>('[data-day="2026-11-12"] button')!;
  fireEvent.click(chosen);
  expect((screen.getByLabelText("Ngày ghi") as HTMLInputElement).value).toBe("12/11/2026");
  expect(document.querySelector<HTMLInputElement>('input[name="recordedOn"]')?.value).toBe("2026-11-12");
  expect(screen.getByRole("button", { name: /12\/11\/2026/ })).toBeTruthy();
  expect(submit).not.toHaveBeenCalled();
});
