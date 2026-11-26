// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DetailRow } from "./detail-pane";
import { ManagementLayout, type DetailLayout } from "./management-layout";

afterEach(() => { cleanup(); window.localStorage.clear(); });

function renderOpenRow(detailLayout?: DetailLayout) {
  return render(<ManagementLayout storageKey="test" icon="search" title="Danh sách" actions={null} filters={null} detailLayout={detailLayout}>
    <table><tbody>
      <tr><td>Dòng 1</td></tr>
      <DetailRow colSpan={3}><p>Chi tiết dòng 1</p></DetailRow>
    </tbody></table>
  </ManagementLayout>);
}

it("puts the open row's detail in the pane beside the list when the screen chooses split", () => {
  const { container } = renderOpenRow("split");
  const pane = screen.getByRole("complementary", { name: "Chi tiết" });
  expect(pane.textContent).toContain("Chi tiết dòng 1");
  expect(container.querySelector("tbody")?.textContent).not.toContain("Chi tiết dòng 1");
  expect(container.querySelector("[data-management-screen]")?.hasAttribute("data-detail-open")).toBe(true);
});

it("keeps the detail as the row under the clicked one by default", () => {
  const { container } = renderOpenRow();
  expect(screen.queryByRole("complementary", { name: "Chi tiết" })).toBeNull();
  const detailCell = screen.getByText("Chi tiết dòng 1").closest("td");
  expect(detailCell?.getAttribute("colspan")).toBe("3");
  expect(container.querySelector("[data-management-screen]")?.hasAttribute("data-detail-open")).toBe(false);
});

it("lets the user switch the layout from the toolbar and remembers it for that screen in this browser", () => {
  renderOpenRow();
  const toggle = screen.getByRole("button", { name: "Chia đôi màn hình khi mở chi tiết" });
  expect(toggle.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(toggle);
  expect(screen.getByRole("complementary", { name: "Chi tiết" }).textContent).toContain("Chi tiết dòng 1");
  expect(window.localStorage.getItem("omts-detail-layout-test")).toBe("split");
  cleanup();
  renderOpenRow();
  expect(screen.getByRole("button", { name: "Chia đôi màn hình khi mở chi tiết" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Chia đôi màn hình khi mở chi tiết" }));
  expect(screen.queryByRole("complementary", { name: "Chi tiết" })).toBeNull();
  expect(screen.getByText("Chi tiết dòng 1").closest("td")).toBeTruthy();
});
