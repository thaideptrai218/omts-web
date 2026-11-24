// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
import { NotFoundActions } from "./not-found-actions";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("offers the overview and a way back", () => {
  render(<NotFoundActions />);
  expect(screen.getByRole("link", { name: "Về tổng quan" }).getAttribute("href")).toBe("/dashboard");
  vi.spyOn(window.history, "length", "get").mockReturnValue(3);
  fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
  expect(router.back).toHaveBeenCalledOnce();
});

it("goes to the overview when there is no page to go back to", () => {
  render(<NotFoundActions />);
  vi.spyOn(window.history, "length", "get").mockReturnValue(1);
  fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
  expect(router.push).toHaveBeenCalledWith("/dashboard");
});
