// @vitest-environment jsdom
import { createRef, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PasswordField } from "@/components/form/password-field";
import { OysterMoodProvider, useOysterMood } from "./oyster-mood";

afterEach(cleanup);

function MoodProbe() {
  const { mood, setMood } = useOysterMood();
  return <><output data-testid="mood">{mood}</output><button onClick={() => setMood("open")}>Set mood</button></>;
}

function Fixture({ show = true, value }: { show?: boolean; value?: string }) {
  return <><MoodProbe />{show && <PasswordField id="password" label="Mật khẩu" value={value} onChange={() => {}} />}<input aria-label="Other field" /></>;
}

const mood = () => screen.getByTestId("mood").textContent;

it("provides idle by default and a safe no-op outside the provider", () => {
  const view = render(<MoodProbe />);
  expect(mood()).toBe("idle");
  fireEvent.click(screen.getByText("Set mood"));
  expect(mood()).toBe("idle");
  view.rerender(<OysterMoodProvider><MoodProbe /></OysterMoodProvider>);
  fireEvent.click(screen.getByText("Set mood"));
  expect(mood()).toBe("open");
});

it("closes on hidden focus/typing, opens on reveal, and closes again on hide", () => {
  render(<OysterMoodProvider><Fixture /></OysterMoodProvider>);
  const input = screen.getByLabelText("Mật khẩu");
  fireEvent.focus(input);
  expect(mood()).toBe("closed");
  fireEvent.change(input, { target: { value: "secret" } });
  expect(mood()).toBe("closed");
  fireEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
  expect(mood()).toBe("open");
  expect(input.getAttribute("type")).toBe("text");
  fireEvent.click(screen.getByRole("button", { name: "Ẩn mật khẩu" }));
  expect(mood()).toBe("closed");
  expect(input.getAttribute("type")).toBe("password");
});

it("returns to idle on empty blur, other-field focus, and unmount", () => {
  const view = render(<OysterMoodProvider><Fixture /></OysterMoodProvider>);
  const input = screen.getByLabelText("Mật khẩu");
  fireEvent.focus(input);
  fireEvent.blur(input);
  expect(mood()).toBe("idle");
  fireEvent.focus(input);
  fireEvent.focusIn(screen.getByLabelText("Other field"));
  expect(mood()).toBe("idle");
  fireEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
  expect(mood()).toBe("open");
  view.rerender(<OysterMoodProvider><Fixture show={false} /></OysterMoodProvider>);
  expect(mood()).toBe("idle");
});

it("tracks controlled prefilled values and resets", () => {
  const view = render(<OysterMoodProvider><Fixture value="secret" /></OysterMoodProvider>);
  expect(mood()).toBe("closed");
  view.rerender(<OysterMoodProvider><Fixture value="" /></OysterMoodProvider>);
  expect(mood()).toBe("idle");
});

it("keeps password focus signals when two shared fields use the same provider", () => {
  render(<OysterMoodProvider><MoodProbe />
    <PasswordField id="first" label="First password" />
    <PasswordField id="second" label="Second password" />
  </OysterMoodProvider>);
  fireEvent.focusIn(screen.getByLabelText("First password"));
  expect(mood()).toBe("closed");
  fireEvent.focusIn(screen.getByLabelText("Second password"));
  expect(mood()).toBe("closed");
});

it("keeps callbacks, forwarded refs, semantics and editing without a provider", () => {
  const onFocus = vi.fn(), onBlur = vi.fn(), onChange = vi.fn();
  const ref = createRef<HTMLInputElement>();
  function Standalone() {
    const [value, setValue] = useState("");
    return <PasswordField id="standalone" label="Mật khẩu" ref={ref} value={value}
      onFocus={onFocus} onBlur={onBlur} onChange={(event) => { onChange(event); setValue(event.target.value); }} />;
  }
  render(<Standalone />);
  const input = screen.getByLabelText("Mật khẩu");
  expect(ref.current).toBe(input);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "retained" } });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
  expect(ref.current?.value).toBe("retained");
  expect(onFocus).toHaveBeenCalledOnce();
  expect(onBlur).toHaveBeenCalledOnce();
  expect(onChange).toHaveBeenCalledOnce();
  const toggle = screen.getByRole("button", { name: "Ẩn mật khẩu" });
  expect(toggle.getAttribute("aria-controls")).toBe("standalone");
  expect(toggle.getAttribute("aria-pressed")).toBe("true");
});
