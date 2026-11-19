import { z } from "zod";
import { formatMessage, messageCatalog, type MessageCode, type MessageParams } from "./message-catalog";

/**
 * The allow-listed part of a failed payroll / attendance answer that the screens act on (the BFF passes on nothing else of the
 * backend problem). Every key is optional and a malformed one is dropped, so an older or newer backend never breaks a screen.
 * - parameters: values of the message (snake_case, see hr-backend-contracts.md), used to fill the Vietnamese template.
 * - items: why a sheet cannot be finalized, as data (kind PeriodNotEnded / IncompleteAttendance / NoRate / NoHours).
 * - reasonCode TOTALS_CHANGED with currentTotal, currentSlips, expectedTotal, expectedSlips: the sheet changed since it was viewed.
 */
const scalar = z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]);
export const hrProblemItem = z.object({
  kind: z.string().max(40), employeeId: z.guid().nullish().catch(undefined), employeeName: z.string().max(200).nullish().catch(undefined),
  dates: z.array(z.iso.date()).max(62).optional().catch(undefined), jobName: z.string().max(200).nullish().catch(undefined),
});
export const hrProblem = z.object({
  reasonCode: z.string().max(60).optional().catch(undefined), field: z.string().max(60).optional().catch(undefined), hint: z.string().max(500).optional().catch(undefined),
  existingId: z.guid().optional().catch(undefined),
  parameters: z.record(z.string().max(60), z.union([scalar, z.array(z.string().max(500)).max(100)])).optional().catch(undefined),
  items: z.array(hrProblemItem).max(200).optional().catch(undefined),
  currentTotal: z.number().optional().catch(undefined), currentSlips: z.number().optional().catch(undefined),
  expectedTotal: z.number().optional().catch(undefined), expectedSlips: z.number().optional().catch(undefined),
});
export type HrProblem = z.infer<typeof hrProblem>;
export type HrProblemItem = z.infer<typeof hrProblemItem>;

/** Parses an untrusted problem object (the backend body on the server, `hrProblem` of the BFF answer in the browser). */
export function projectHrProblem(value: unknown): HrProblem | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const parsed = hrProblem.safeParse(value);
  if (!parsed.success) return undefined;
  const entries = Object.entries(parsed.data).filter(([, entry]) => entry !== undefined && !(Array.isArray(entry) && !entry.length));
  return entries.length ? (Object.fromEntries(entries) as HrProblem) : undefined;
}

const vnd = (value: unknown) => typeof value === "number" ? new Intl.NumberFormat("vi-VN").format(value) : String(value ?? "");
/** yyyy-MM-dd -> dd/MM/yyyy; anything else unchanged. */
const day = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(8)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : String(value ?? "");

/** Fills the placeholders of a catalogue message from the backend `parameters`: money and dates are formatted, lists are joined. */
function fillParams(parameters: NonNullable<HrProblem["parameters"]>): MessageParams {
  const out: MessageParams = {};
  for (const [key, value] of Object.entries(parameters)) {
    if (value === null || typeof value === "boolean") continue;
    out[key] = Array.isArray(value) ? value.join("; ")
      : /(^|_)(total|amount|owed)(_|$)|total_|_amount/.test(key) ? vnd(value) : /^(date|locked_until|finalized_on)$/.test(key) ? day(value) : value;
  }
  const bool = (key: string) => parameters[key] === true;
  out.send_back_note = bool("can_be_sent_back") ? " Chủ hợp tác xã có thể trả bảng lương về trạng thái tạm tính trước." : "";
  out.automatic_note = bool("automatic") ? "Hệ thống sẽ tự tạo bảng lương theo kỳ." : "Bảng lương không tự tạo, bạn tạo thủ công.";
  return out;
}

/**
 * The Vietnamese text of an HR/payroll failure, or undefined when the problem has nothing specific (the generic copy applies).
 * Needs the problem `parameters`; the message code alone is not enough to fill a template.
 */
export function hrProblemMessage(code: string | undefined, problem: HrProblem | undefined): string | undefined {
  if (!problem) return undefined;
  const parameters = problem.parameters;
  if (problem.reasonCode === "TOTALS_CHANGED" && parameters) return formatMessage({ code: "PAYROLL_TOTALS_CHANGED", params: fillParams(parameters) });
  if (code === "MSG-GEN-09" && problem.field === "Paid at" && parameters) return `Ngày chi không được trước ngày chốt bảng lương ${parameters.payroll_code ?? ""} (${day(parameters.finalized_on)}).`;
  if (code === "MSG-GEN-09" && problem.reasonCode === "PAYROLL_VOUCHER") return "Phiếu chi lương và tạm ứng do bảng lương tạo ra nên không hủy từ Sổ quỹ.";
  if (code === "MSG-GEN-09" && problem.field === "Working zones" && parameters) return `${parameters.employee_name ?? "Nhân viên"} còn phân công ở vùng ${parameters.zone_code ?? ""} vào ngày ${Array.isArray(parameters.dates) ? parameters.dates.map(day).join(", ") : ""}. Hãy gỡ phân công trước khi bỏ vùng này.`;
  if (!parameters || !code || !Object.hasOwn(messageCatalog, code) || !code.startsWith("MSG-LABOR-")) return undefined;
  return formatMessage({ code: code as MessageCode, params: fillParams(parameters) });
}
