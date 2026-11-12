import { nurseryPoolExceededText, stockShortageText, type FarmingProblem } from "./farming-problem";

const harvestFieldText: Record<string, string> = {
  "Purchase request": "Chưa chọn yêu cầu mua cho chuyến thu hoạch này. Hãy chọn một yêu cầu mua đã chấp nhận và còn đang thu hoạch.",
  "Lanes": "Làn thu hoạch chưa hợp lệ: chọn ít nhất một làn đang nuôi hoặc đang thu hoạch, không chọn trùng.",
  "Finished lanes": "Làn đánh dấu thu xong phải nằm trong các làn của chuyến thu này.",
  "Photos": "Ảnh chưa hợp lệ: từ 1 đến 3 ảnh JPEG hoặc PNG, mỗi ảnh tối đa 10 MB.",
  "Reason": "Nhập lý do điều chỉnh (tối đa 1.000 ký tự).",
};
type FailedResult = { httpStatus: number; code?: string; problem?: FarmingProblem };
/**
 * Vietnamese sentence for the refusals the Nuôi trồng forms understand (stock check, coordinates, harvest numbers, issue owned by a record).
 * Undefined means "use the generic wording of the status".
 */
export function farmingErrorText(result: FailedResult, unit?: string): string | undefined {
  const problem = result.problem;
  if ([result.code, problem?.code, problem?.reasonCode].includes("NURSERY_POOL_EXCEEDED")) return nurseryPoolExceededText(problem);
  if (!problem) return undefined;
  if (problem.reasonCode === "SEEDING_COMPLETED") return "Chu kỳ đã đánh dấu hoàn tất thả giống nên không thể ghi nhận, sửa hoặc xóa lần thả. Hãy tải lại để xem trạng thái mới.";
  if (problem.hint && /[À-ỹ]/.test(problem.hint)) return problem.hint;
  // A question the backend asks (over plan, empty seeding, owner approval) is answered in the form; it is not an error to show.
  if (result.httpStatus === 409 && problem.confirmFlag) return "";
  if (result.code === "MSG-INPUT-01" || problem.code === "MSG-INPUT-01") return `Không đủ hàng trong kho để ghi nhận. ${stockShortageText(problem, unit)}`;
  if (problem.code === "MSG-GEN-09" && problem.sourceKind && problem.sourceKind !== "None")
    return `Phiếu xuất này do ${problem.sourceKind === "Seeding" ? "lần thả giống" : "lần sử dụng vật tư"} tạo ra. Hãy sửa hoặc gỡ trên bản ghi đó, không sửa ở màn Xuất dùng.`;
  if (result.httpStatus !== 400) return undefined;
  if (problem.field === "Latitude" || problem.field === "Longitude") return "Tọa độ không hợp lệ: không được là (0, 0) và vĩ độ, kinh độ không được bị đảo chỗ. Hãy chọn lại vị trí trên bản đồ.";
  if (problem.field === "Number of cages") return "Số lồng phải lớn hơn 0 và tối đa 100.000, có tối đa 2 chữ số thập phân (0,5 là nửa lồng).";
  if (problem.field === "Estimated kg") return "Kg ước tính không hợp lệ: phải lớn hơn 0 và không quá 10 lần số lồng nhân kg/lồng. Để trống để hệ thống tự tính theo số lồng.";
  if (problem.field === "Over plan reason") return "Nhập lý do khi xác nhận vượt kế hoạch (tối đa 1.000 ký tự).";
  // Every other harvest field the backend names (MSG-GEN-01): say which one, never only "thông tin chưa hợp lệ".
  const harvest = problem.field ? harvestFieldText[problem.field] : undefined;
  if (harvest) return harvest;
  return undefined;
}
