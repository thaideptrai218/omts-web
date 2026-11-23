// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { HelpLink } from "./management-layout";

afterEach(cleanup);

it("renders nothing when there is no guide, instead of a disabled button saying it does not exist", () => {
  const { container } = render(<HelpLink />);
  expect(container.firstChild).toBeNull();
  expect(screen.queryByText(/chưa có/)).toBeNull();
});

it("links to the guide when one exists", () => {
  render(<HelpLink helpHref="/guides/chu-ky" />);
  expect(screen.getByRole("link", { name: "Hướng dẫn" }).getAttribute("href")).toBe("/guides/chu-ky");
});
