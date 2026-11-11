import { stockShortageText, type FarmingProblem } from "./farming-problem";

type FailedResult = { httpStatus: number; code?: string; problem?: FarmingProblem };
/**
 * Vietnamese sentence for the refusals the Nuôi trồng forms understand (stock check, coordinates, harvest numbers, issue owned by a record).
 * Undefined means "use the generic wording of the status".
 */
export function farmingErrorText(result: FailedResult, unit?: string): string | undefined {
  const problem = result.problem;
  if (!problem) return undefined;
  // A question the backend asks (over plan, empty seeding, owner approval) is answered in the form; it is not an error to show.
  if (result.httpStatus === 409 && problem.confirmFlag) return "";
  if (result.code === "MSG-INPUT-01" || problem.code === "MSG-INPUT-01") return `Không đủ hàng trong kho để ghi nhận. ${stockShortageText(problem, unit)}`;
  if (problem.code === "MSG-GEN-09" && problem.sourceKind && problem.sourceKind !== "None")
    return `Phiếu xuất này do ${problem.sourceKind === "Seeding" ? "lần thả giống" : "lần sử dụng vật tư"} tạo ra. Hãy sửa hoặc gỡ trên bản ghi đó, không sửa ở màn Xuất dùng.`;
  if (result.httpStatus !== 400) return undefined;
  if (problem.field === "Latitude" || problem.field === "Longitude") return "Tọa độ không hợp lệ: không được là (0, 0) và vĩ độ, kinh độ không được bị đảo chỗ. Hãy chọn lại vị trí trên bản đồ.";
  if (problem.field === "Number of cages") return "Số lồng phải lớn hơn 0 và tối đa 100.000, có tối đa 2 chữ số thập phân (0,5 là nửa lồng).";
  if (problem.field === "Estimated kg") return "Kg ước tính không hợp lệ: quá lớn so với số lồng, hoặc làm chu kỳ vượt quá 150% mục tiêu nên không thể xác nhận.";
  if (problem.field === "Over plan reason") return "Nhập lý do khi xác nhận thu vượt kế hoạch (tối đa 1.000 ký tự).";
  return undefined;
}
