// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PermissionMatrixEditor } from "./permission-matrix-editor";
import {
  mockFeatureCatalog,
  mockFixedRoles,
} from "../mocks/role-management-fixtures";
afterEach(cleanup);

describe("filtered permission editor", () => {
  it("keeps permissions outside the filter and enforces View through the actual controls", () => {
    const change = vi.fn();
    const initial = mockFixedRoles[1].permissions;
    const page = render(
      <PermissionMatrixEditor
        catalog={mockFeatureCatalog}
        permissions={initial}
        onChange={change}
      />,
    );
    fireEvent.change(screen.getByLabelText("Tìm chức năng"), {
      target: { value: "Bè nuôi" },
    });
    const row = screen
      .getByText("Bè nuôi", { exact: true })
      .closest("details")!;
    fireEvent.click(within(row).getByText("Bè nuôi", { exact: true }));
    fireEvent.click(
      within(row).getByRole("checkbox", { name: "Tạo cho Bè nuôi" }),
    );
    const updated = change.mock.lastCall![0];
    expect(updated).toHaveLength(mockFeatureCatalog.length);
    expect(
      updated.find(
        (permission: { featureCode: string }) =>
          permission.featureCode === "PAYMENT_RECEIPT",
      ),
    ).toEqual(
      initial.find(
        (permission) => permission.featureCode === "PAYMENT_RECEIPT",
      ),
    );
    expect(
      updated.find(
        (permission: { featureCode: string }) =>
          permission.featureCode === "RAFT",
      ).actionKeys,
    ).toEqual(expect.arrayContaining(["CREATE", "VIEW"]));
    page.rerender(
      <PermissionMatrixEditor
        catalog={mockFeatureCatalog}
        permissions={updated}
        onChange={change}
      />,
    );
    expect(
      within(row).getByRole<HTMLInputElement>("checkbox", {
        name: "Xem cho Bè nuôi",
      }).disabled,
    ).toBe(true);
  });
  it("keeps an invalid row visible and opens it even when filtered out", () => {
    render(
      <PermissionMatrixEditor
        catalog={mockFeatureCatalog}
        permissions={mockFixedRoles[2].permissions}
        onChange={vi.fn()}
        errors={{ RAFT: "Hãy chọn phạm vi dữ liệu" }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Nhóm chức năng"), {
      target: { value: "Nhân sự" },
    });
    const error = screen.getByRole("alert");
    expect(error.textContent).toBe("Hãy chọn phạm vi dữ liệu");
    expect(error.closest("details")?.open).toBe(true);
  });
  it("does not invent unsupported actions for a function", () => {
    render(
      <PermissionMatrixEditor
        catalog={mockFeatureCatalog}
        permissions={mockFixedRoles[2].permissions}
        onChange={vi.fn()}
      />,
    );
    const row = screen
      .getByText("Hồ sơ nhân viên", { exact: true })
      .closest("details")!;
    fireEvent.click(within(row).getByText("Hồ sơ nhân viên", { exact: true }));
    expect(
      within(row).queryByRole("checkbox", { name: "Xóa cho Hồ sơ nhân viên" }),
    ).toBeNull();
    expect(within(row).getAllByRole("checkbox")).toHaveLength(3);
  });
});
