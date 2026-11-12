import { describe, expect, it } from "vitest";
import { projectFarmingProblem, stockShortageText } from "./farming-problem";
import { farmingErrorText } from "./farming-error-text";
import { projectCoordinateWarnings, coordinateWarningTexts } from "@/features/farming-api/coordinate-warnings";

const item = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62";

describe("farming problem projection", () => {
  it("keeps the confirmation flag and drops everything else", () => {
    const problem = projectFarmingProblem({ code: "MSG-GEN-04", confirmFlag: "confirmOverPlan", reasonField: "overPlanReason", plannedSeedQuantity: 100, detail: "x", token: "secret" });
    expect(problem).toEqual({ code: "MSG-GEN-04", confirmFlag: "confirmOverPlan" });
  });
  it("keeps the stock check numbers of MSG-INPUT-01", () => {
    expect(projectFarmingProblem({ code: "MSG-INPUT-01", field: "Quantity", itemId: item, seedLotLineId: item, onHand: 100, balanceAfter: -1 })).toMatchObject({ onHand: 100, balanceAfter: -1, itemId: item });
  });
  it("drops malformed members instead of rejecting the whole problem", () => {
    expect(projectFarmingProblem({ code: "not a code", confirmFlag: "rm -rf", onHand: "100", balanceAfter: -2, itemId: "x" })).toEqual({ balanceAfter: -2 });
  });
  it.each([undefined, null, "text", 3, [], {}])("gives nothing for %j", value => expect(projectFarmingProblem(value)).toBeUndefined());
});

describe("farming error wording", () => {
  it("explains the stock shortage with on hand and balance in the item's unit", () => {
    const text = farmingErrorText({ httpStatus: 409, code: "MSG-INPUT-01", problem: { code: "MSG-INPUT-01", onHand: 100, balanceAfter: -1 } }, "con");
    expect(text).toContain("Còn trong kho 100 con"); expect(text).toContain("-1 con");
  });
  it("tells the issue is owned by the seeding session", () => {
    expect(farmingErrorText({ httpStatus: 409, problem: { code: "MSG-GEN-09", sourceKind: "Seeding", sourceRecordId: item } })).toContain("lần thả giống");
  });
  it("words the coordinate and harvest refusals only for 400", () => {
    expect(farmingErrorText({ httpStatus: 400, problem: { field: "Latitude" } })).toContain("(0, 0)");
    expect(farmingErrorText({ httpStatus: 400, problem: { field: "Number of cages" } })).toContain("0,5");
    expect(farmingErrorText({ httpStatus: 409, problem: { field: "Latitude" } })).toBeUndefined();
    expect(farmingErrorText({ httpStatus: 400 })).toBeUndefined();
  });
  it("names the harvest field the backend refused", () => {
    expect(farmingErrorText({ httpStatus: 400, code: "MSG-GEN-01", problem: { code: "MSG-GEN-01", field: "Purchase request", fields: ["Purchase request"] } })).toContain("yêu cầu mua");
    expect(farmingErrorText({ httpStatus: 400, problem: { field: "Lanes" } })).toContain("Làn thu hoạch");
    expect(farmingErrorText({ httpStatus: 400, problem: { field: "Estimated kg" } })).not.toContain("150%");
  });
  it("formats a shortage without a unit", () => expect(stockShortageText({ onHand: 5 })).toContain("Còn trong kho 5."));
});

describe("coordinate warnings of a saved zone or raft", () => {
  it("keeps known codes with their details", () => {
    const warnings = projectCoordinateWarnings({ zone: {}, warnings: [{ code: "RAFT_FAR_FROM_ZONE", message: "x", details: { distanceKm: 6.67, limitKm: 5 } }, { code: "COORDINATES_OUTSIDE_VIETNAM", details: null }, { code: "OTHER" }, "bad"] });
    expect(warnings).toHaveLength(2);
    expect(coordinateWarningTexts({ warnings })[0]).toContain("6,7 km");
    expect(coordinateWarningTexts({ warnings })[1]).toContain("ngoài Việt Nam");
  });
  it("is empty for an older backend", () => {
    expect(projectCoordinateWarnings({ raft: {} })).toEqual([]);
    expect(projectCoordinateWarnings(undefined)).toEqual([]);
    expect(coordinateWarningTexts({ id: "x" })).toEqual([]);
  });
});
