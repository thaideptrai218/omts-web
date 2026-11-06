import { expect, it } from "vitest";
import { projectCatalogueProblem } from "./catalogue-problem";
const id = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62";
it("projects bounded duplicate field and ID without raw detail or hint", () => {
  expect(projectCatalogueProblem(409, "MSG-GEN-02", { field: "Name", existingId: id, hint: "private", detail: "private" })).toEqual({ field: "name", existingId: id });
});
it("does not attach IDs to validation or unrelated errors", () => {
  expect(projectCatalogueProblem(400, "MSG01", { field: "Unit", existingId: id })).toEqual({ field: "unit" });
  expect(projectCatalogueProblem(403, "MSG02", { field: "Name", existingId: id })).toBeUndefined();
  expect(projectCatalogueProblem(409, "MSG06", { field: "Name", existingId: id })).toBeUndefined();
  expect(projectCatalogueProblem(409, "MSG03", { field: "Password", existingId: id })).toBeUndefined();
});
