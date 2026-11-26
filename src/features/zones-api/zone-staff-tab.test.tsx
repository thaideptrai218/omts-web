// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: state.read }) }));
import { ZoneStaffTab } from "./zone-staff-tab";

const ZONE = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const employee = (n: number) => ({ id: `e${n}`, fullName: `Nhân viên ${n}`, phoneNumber: "0900000001", employeeType: "Permanent", jobTypes: [{ id: "j", name: "Chăm bè" }], status: "Employed" });

it("pages on the server, keeps one table and puts the screen link at the footer's left", async () => {
  state.read.mockImplementation(async (_action: string, query: Record<string, string>) => ({ status: "success", data: { items: [employee(Number(query.page))], page: Number(query.page), pageSize: Number(query.pageSize), total: 25 } }));
  render(<ZoneStaffTab zoneId={ZONE} />);
  await screen.findByText("Nhân viên 1");
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Họ và tên", "Số điện thoại", "Loại nhân viên", "Công việc", "Tình trạng"]);
  expect(state.read.mock.calls[0][1]).toEqual({ zoneId: ZONE, statusId: "401", page: "1", pageSize: "10" });
  fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  await screen.findByText("Nhân viên 2");
  expect(state.read.mock.calls.at(-1)?.[1]).toEqual({ zoneId: ZONE, statusId: "401", page: "2", pageSize: "10" });
  const footer = screen.getByRole("link", { name: /Mở danh sách nhân viên/ });
  expect(footer.getAttribute("href")).toBe(`/employees?zoneId=${ZONE}`);
  expect(footer.closest("footer")?.firstElementChild?.contains(footer)).toBe(true);
});
