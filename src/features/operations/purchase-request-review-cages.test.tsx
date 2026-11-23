// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: vi.fn(), write: vi.fn() }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" } }) }));
import { PurchaseRequestReviewDetails } from "./purchase-request-review-details";
import { reviewResponseSummary } from "./purchase-request-review-presentation";
import { backendRequest } from "./__tests__/purchase-request-fixture";
import { businessToday } from "./ui";

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
afterEach(cleanup);

describe("purchase request quantities", () => {
  it("accepted cages in the response summary carry an estimated kg only when the ratio is known", () => {
    const request = backendRequest({ statusId: 3202, response: { acceptedCages: 10, pickupDate: "2026-11-13", payLaterAgreed: false, note: null, respondedAt: "2026-11-09T09:00:00+07:00" } });
    expect(reviewResponseSummary(request, 50).headline).toBe("10 lồng · ≈ 500 kg (ước tính) · lấy ngày 13/11/2026 · không trả sau");
    expect(reviewResponseSummary(request).headline).toBe("10 lồng · lấy ngày 13/11/2026 · không trả sau");
  });
  it("dialog shows cages with an estimate and converts kg typed into cages live", () => {
    render(<PurchaseRequestReviewDetails record={backendRequest({ pickupDate: businessToday() })} kgPerCage={50} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText("12 lồng · ≈ 600 kg (ước tính)")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Kg"));
    fireEvent.change(screen.getByLabelText("Số lượng chấp nhận *"), { target: { value: "520" } });
    expect(screen.getByText("= 10 lồng (≈ 500 kg, ước tính)")).toBeTruthy();
  });
  it("shows cages only and no kg choice when the ratio is unreadable", () => {
    render(<PurchaseRequestReviewDetails record={backendRequest({ pickupDate: businessToday() })} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByLabelText("Kg")).toBeNull();
    fireEvent.change(screen.getByLabelText("Số lượng chấp nhận *"), { target: { value: "10" } });
    expect(screen.getAllByText("12 lồng").length).toBeGreaterThan(0); expect(screen.queryByText(/ước tính/)).toBeNull();
  });
});
