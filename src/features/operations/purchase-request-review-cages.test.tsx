// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: vi.fn(), write: vi.fn() }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" } }) }));
import { PurchaseRequestReviewDetails } from "./purchase-request-review-details";
import { quantityWithCages, reviewResponseSummary } from "./purchase-request-review-presentation";
import { backendRequest } from "./__tests__/purchase-request-fixture";
import { businessToday } from "./ui";

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
afterEach(cleanup);

describe("purchase request quantities", () => {
  it("quantityWithCages is approximate with a ratio and plain kg without", () => {
    expect(quantityWithCages(180, 50)).toBe("≈ 3,6 lồng · 180 kg"); expect(quantityWithCages(120.5)).toBe("120,5 kg");
  });
  it("accepted quantity in the response summary follows the same rule", () => {
    const request = backendRequest({ statusId: 3202, response: { acceptedKg: 100, pickupDate: "2026-11-13", payLaterAgreed: false, note: null, respondedAt: "2026-11-09T09:00:00+07:00" } });
    expect(reviewResponseSummary(request, 50).headline).toBe("≈ 2 lồng · 100 kg · lấy ngày 13/11/2026 · không trả sau");
    expect(reviewResponseSummary(request).headline).toBe("100 kg · lấy ngày 13/11/2026 · không trả sau");
  });
  it("dialog row and the accept input hint are approximate cages while the input stays kg", () => {
    render(<PurchaseRequestReviewDetails record={backendRequest({ pickupDate: businessToday() })} kgPerCage={50} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText("≈ 2,4 lồng · 120,5 kg")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Số kg chấp nhận *"), { target: { value: "100" } });
    expect(screen.getByText(/≈ 2 lồng \(quy đổi gần đúng/)).toBeTruthy();
  });
  it("shows kg only and no hint when the ratio is unreadable", () => {
    render(<PurchaseRequestReviewDetails record={backendRequest({ pickupDate: businessToday() })} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Số kg chấp nhận *"), { target: { value: "100" } });
    expect(screen.getByText("120,5 kg")).toBeTruthy(); expect(screen.queryByText(/lồng/)).toBeNull();
  });
});
