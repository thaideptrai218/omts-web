import { describe, expect, it } from "vitest";
import { mockEmployeeProfiles } from "../mocks/employee-management-fixtures";
import { selectEmployeePage, type EmployeeDirectoryFilters } from "./select-employee-page";

const filters: EmployeeDirectoryFilters = { query: "", status: "all", link: "all", zoneId: "" };
const employees = Array.from({ length: 45 }, (_, index) => ({
  ...mockEmployeeProfiles[0], id: `person-${index}`, fullName: `Nhân viên ${index}`,
}));

describe("employee directory selection", () => {
  it("pages after filtering the full workspace, keeping the original order", () => {
    const result = selectEmployeePage(employees, { ...filters, query: "44" }, 1);
    expect(result.rows.map((row) => row.id)).toEqual(["person-44"]);
    expect(result).toMatchObject({ total: 1, first: 1, last: 1, pageCount: 1 });
    expect(employees[0].id).toBe("person-0");
  });

  it("combines zone, employment, link and trimmed case-insensitive name filters", () => {
    const result = selectEmployeePage(mockEmployeeProfiles,
      { query: "  NGUYỄN  ", status: "employed", link: "linked", zoneId: "zone-east" }, 1);
    expect(result.rows.map((row) => row.id)).toEqual(["employee-nguyen-an"]);
    expect(selectEmployeePage(mockEmployeeProfiles, { ...filters, link: "unlinked", zoneId: "zone-east" }, 1).total).toBe(0);
  });

  it("finds phone numbers and counts a multi-zone employee only once", () => {
    const record = { ...mockEmployeeProfiles[0], workingZoneIds: ["zone-east", "zone-south"] };
    expect(selectEmployeePage([record], { ...filters, query: "090123", zoneId: "zone-south" }, 1).rows).toEqual([record]);
  });

  it("keeps historical and unknown zone IDs searchable without a catalog lookup", () => {
    const records = [{ ...mockEmployeeProfiles[0], workingZoneIds: ["old-zone"] }];
    expect(selectEmployeePage(records, { ...filters, zoneId: "old-zone" }, 1).total).toBe(1);
  });

  it("shows twenty rows and the remaining five on the final page", () => {
    expect(selectEmployeePage(employees, filters, 1)).toMatchObject({ first: 1, last: 20, pageCount: 3 });
    const last = selectEmployeePage(employees, filters, 3);
    expect(last.rows.map((row) => row.id)).toEqual(["person-40", "person-41", "person-42", "person-43", "person-44"]);
    expect(last).toMatchObject({ first: 41, last: 45, total: 45 });
  });

  it("clamps the page after the dataset shrinks and handles an empty workspace", () => {
    expect(selectEmployeePage(employees.slice(0, 4), filters, 3)).toMatchObject({ page: 1, first: 1, last: 4 });
    expect(selectEmployeePage([], filters, 3)).toEqual({ rows: [], page: 1, pageCount: 1, first: 0, last: 0, total: 0 });
  });
});
