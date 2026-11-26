// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ManagementPagination } from "./management-table";

describe("ManagementPagination", () => {
  it("offers 10 / 30 / 50 rows by default", () => {
    render(<ManagementPagination page={1} pageSize={10} total={95} unit="dòng" onPage={() => undefined} onPageSize={() => undefined} />);
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["10 dòng", "30 dòng", "50 dòng"]);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("10");
  });
});
