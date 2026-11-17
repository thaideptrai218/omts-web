import { expect } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

/** Lanes are picked in the horizontal column overview's selection mode, which does not open the lane detail popover. */
export async function selectLane(laneNumber: number) {
  // Entering selection mode closes any open lane first, so the switch is asynchronous.
  if (!screen.queryByRole("button", { name: "Thoát chế độ chọn" })) fireEvent.click(screen.getByRole("button", { name: "Chọn" }));
  fireEvent.click(await screen.findByRole("checkbox", { name: new RegExp(`^Làn ${laneNumber}:`) }));
}

/** Attaches one JPEG through the shared PhotoPicker; the test file must mock compressPhoto because jsdom cannot decode images. */
export async function attachPhoto() {
  fireEvent.change(screen.getByLabelText(/^Chọn ảnh/), { target: { files: [new File(["jpeg"], "site.jpg", { type: "image/jpeg" })] } });
  await screen.findByAltText("Ảnh mới 1");
}

export const harvestTestProduct = { id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", code: "SP000001", name: "Hàu sữa", unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v", unit: "kg", createdAt: "x", units: [] };

/** Fills the first product line of a harvest form: the test product and the cages. The test file must mock the product repository to list harvestTestProduct. */
export async function fillProductLine(cages: string) {
  const select = await screen.findByLabelText("Sản phẩm dòng 1");
  // The product list arrives after the form opens.
  await waitFor(() => expect(select.querySelector(`option[value="${harvestTestProduct.id}"]`)).toBeTruthy());
  fireEvent.change(select, { target: { value: harvestTestProduct.id } });
  fireEvent.change(screen.getByLabelText("Số lồng dòng 1"), { target: { value: cages } });
}
