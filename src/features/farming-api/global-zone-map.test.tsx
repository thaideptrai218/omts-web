// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const map = vi.hoisted(() => ({ readZoneMap: vi.fn() }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./zone-map-repository", () => map);
import { GlobalZoneMap } from "./global-zone-map";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const ok = { status: "success", data: [] };

it("never reads or offers discontinued zones outside the Vùng nuôi screen", async () => {
  map.readZoneMap.mockResolvedValue(ok);
  render(<GlobalZoneMap />);
  await waitFor(() => expect(map.readZoneMap).toHaveBeenCalledWith(false, expect.anything()));
  expect(screen.queryByLabelText(/Bao gồm vùng ngừng dùng/)).toBeNull();
});

it("lets the Vùng nuôi screen include discontinued zones", async () => {
  map.readZoneMap.mockResolvedValue(ok);
  render(<GlobalZoneMap allowDiscontinued />);
  await waitFor(() => expect(map.readZoneMap).toHaveBeenCalledWith(false, expect.anything()));
  fireEvent.click(screen.getByLabelText(/Bao gồm vùng ngừng dùng/));
  await waitFor(() => expect(map.readZoneMap).toHaveBeenLastCalledWith(true, expect.anything()));
});
