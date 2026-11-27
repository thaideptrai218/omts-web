import { bffClient, inputError, type Failure } from "@/features/input-items/repository";
import { emptyVatCatalogue, legacyVatCatalogue, vatRateDeactivated, vatRateList, vatRateRow, type VatCatalogue } from "@/features/input-items/vat-rate";

const { read, json } = bffClient("/api/vat-rates");

export type RateInput = { name: string; percent: number };

/** The VAT rate catalogue (Thuế GTGT): anyone who reads items or receipts may list it, only the Owner writes. */
export const vatRateRepository = {
  list: (signal?: AbortSignal) => read("list", {}, vatRateList, signal),
  create: (body: RateInput) => json("create", { body }, vatRateRow),
  update: (id: string, body: RateInput & { rowVersion: string }) => json("update", { id, body }, vatRateRow),
  setDefault: (id: string) => json("default", { id }, vatRateRow),
  deactivate: (id: string, body: { replacementId?: string; rowVersion: string }) => json("deactivate", { id, body }, vatRateDeactivated),
  activate: (id: string) => json("activate", { id }, vatRateRow),
};

/** The text of a failed write: the API's own sentence for a refusal (the default rate, the system rate), otherwise the message of the code. */
export function vatRateError(result: Failure) {
  if (result.code === "MSG-GEN-02") return "Tên mức thuế này đã có trong danh sách.";
  if (result.code === "MSG06") return "Mức thuế vừa được người khác thay đổi. Hãy tải lại danh sách rồi thử lại.";
  if (result.code === "MSG-GEN-09" && result.problem?.message) return result.problem.message;
  return inputError(result);
}

/**
 * The rates a picker offers. An API without the catalogue (404) is served by the earlier fixed list; any other failure leaves the pickers without
 * choices (a record keeps showing the rate it has).
 */
export async function loadVatCatalogue(signal?: AbortSignal): Promise<VatCatalogue> {
  const result = await vatRateRepository.list(signal);
  if (result.status === "success") return { rates: result.data, legacy: false };
  return result.httpStatus === 404 ? legacyVatCatalogue : emptyVatCatalogue;
}
