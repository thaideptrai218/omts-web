import { expect, it } from "vitest";
import { workspaceError } from "./workspace-error";

it("distinguishes a missing raft from an API contract mismatch", () => {
  expect(workspaceError({ status: "error", httpStatus: 404, uncertain: false })).toContain("Không tìm thấy hồ sơ");
  expect(workspaceError({ status: "error", httpStatus: 502, uncertain: false })).toContain("chưa khớp phiên bản Web");
});

it("keeps an uncertain save outcome ahead of connection diagnostics", () => {
  expect(workspaceError({ status: "error", httpStatus: 503, uncertain: true })).toContain("Chưa xác nhận được kết quả");
});
