// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DetailRow } from "./detail-pane";
import { ManagementLayout, type DetailLayout } from "./management-layout";

afterEach(cleanup);

function renderOpenRow(detailLayout?: DetailLayout) {
  return render(<ManagementLayout storageKey="test" icon="search" title="Danh sách" actions={null} filters={null} detailLayout={detailLayout}>
    <table><tbody>
      <tr><td>Dòng 1</td></tr>
      <DetailRow colSpan={3}><p>Chi tiết dòng 1</p></DetailRow>
    </tbody></table>
  </ManagementLayout>);
}

it("puts the open row's detail in the pane beside the list by default", () => {
  const { container } = renderOpenRow();
  const pane = screen.getByRole("complementary", { name: "Chi tiết" });
  expect(pane.textContent).toContain("Chi tiết dòng 1");
  expect(container.querySelector("tbody")?.textContent).not.toContain("Chi tiết dòng 1");
  expect(container.querySelector("[data-management-screen]")?.hasAttribute("data-detail-open")).toBe(true);
});

it("keeps the detail as the row under the clicked one when the screen chooses inline", () => {
  const { container } = renderOpenRow("inline");
  expect(screen.queryByRole("complementary", { name: "Chi tiết" })).toBeNull();
  const detailCell = screen.getByText("Chi tiết dòng 1").closest("td");
  expect(detailCell?.getAttribute("colspan")).toBe("3");
  expect(container.querySelector("[data-management-screen]")?.hasAttribute("data-detail-open")).toBe(false);
});
