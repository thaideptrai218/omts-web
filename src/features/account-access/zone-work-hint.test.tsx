// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ZoneWorkHint } from "./zone-work-hint";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
afterEach(cleanup);

describe("ZoneWorkHint", () => {
  it("names the missing zones and links to the employee", () => {
    render(<ZoneWorkHint zoneNames={["Minh Châu"]} employeeId="e1" employeeName="An" />);
    expect(screen.getByRole("note").textContent).toContain("Người này chưa được ghi làm việc ở vùng Minh Châu. Nên thêm vùng đó vào hồ sơ nhân viên.");
    expect(screen.getByRole("link", { name: "Mở hồ sơ nhân viên" }).getAttribute("href")).toBe("/workspace/employees?recordId=e1&search=An");
  });
  it("renders nothing without a missing zone", () => {
    const { container } = render(<ZoneWorkHint zoneNames={[]} employeeId="e1" employeeName="An" />);
    expect(container.textContent).toBe("");
  });
});
