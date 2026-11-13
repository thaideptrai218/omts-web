import { fireEvent, screen } from "@testing-library/react";

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
