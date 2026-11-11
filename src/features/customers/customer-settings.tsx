"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast-provider";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { ErrorNotice, Skeleton } from "@/features/operations/ui";
import { requiredFieldKeys, type CustomerSettings, type RequiredFieldKey } from "./contracts";
import { customerRepository, errorText, type SettingsBody } from "./repository";
import { useCustomerSettings } from "./use-customer-settings";
import s from "./customer-settings.module.css";

const MAX_AMOUNT = 999_999_999_999, MAX_DAYS = 3650;
const group = (digits: string) => digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";
const bodyOf = (settings: CustomerSettings, patch: Partial<SettingsBody> = {}): SettingsBody => ({
  debtWarningEnabled: settings.debtWarningEnabled, maxDebtAmount: settings.maxDebtAmount ?? null, maxDebtDays: settings.maxDebtDays ?? null, allowMoreDebtOverLimit: settings.allowMoreDebtOverLimit,
  noDebtForWalkIn: settings.noDebtForWalkIn, requiredFields: settings.requiredFields, rowVersion: settings.rowVersion, ...patch,
});

/** Thiết lập → Khách hàng: the debt warning and the fields a customer profile must have. Everyone who views customers reads it; only the Cooperative Owner changes it. */
export function CustomerSettingsPanel() {
  const owner = useApiWorkspace().identity.subjectType === "CooperativeOwner", { notify } = useToast();
  const remote = useCustomerSettings();
  const [settings, setSettings] = useState<CustomerSettings>(), [pending, setPending] = useState(false), [error, setError] = useState<string>(), [dialog, setDialog] = useState(false);
  const [seen, setSeen] = useState<CustomerSettings>();
  // Takes each freshly read copy of the settings during render (no effect), and keeps the last one on screen while a reload is under way.
  if (remote.data !== seen) { setSeen(remote.data); if (remote.data) setSettings(remote.data); }

  /** Saves every value with `patch` applied; a stale or failed save reads the settings again so the page shows what is stored. */
  async function save(patch: Partial<SettingsBody>, done: string) {
    if (!settings || pending) return false;
    setPending(true); setError(undefined);
    const result = await customerRepository.saveSettings(bodyOf(settings, patch));
    setPending(false);
    if (result.status === "success") { setSettings(result.data); notify({ tone: "success", title: done }); return true; }
    setError(errorText(result)); remote.reload();
    return false;
  }

  // A reload after a failed save keeps the settings on screen (and the error), instead of flashing the skeleton.
  if (!settings) return remote.error ? <ErrorNotice error={remote.error} /> : <Skeleton />;
  const required = settings.requiredFields;
  const toggleRequired = (key: RequiredFieldKey) => (checked: boolean) => void save({ requiredFields: { ...required, [key]: checked } }, "Đã lưu thông tin bắt buộc của khách hàng.");
  const lockedRows = ["Tên khách hàng", "Số điện thoại 1"] as const;
  const column = (rows: readonly (readonly [RequiredFieldKey, string])[]) => rows.map(([key, label]) => <Toggle key={key} label={label} checked={required[key]} disabled={!owner || pending} onChange={toggleRequired(key)} />);
  return <div className={managementStyles.theme}>
    <ErrorNotice error={error} />
    {!owner && <p className={s.hint} role="note">Chỉ Chủ hợp tác xã được thay đổi các thiết lập này.</p>}
    <section className={s.block} aria-labelledby="customer-debt-warning">
      <div className={s.head}>
        <div><h3 id="customer-debt-warning">Cảnh báo công nợ khách hàng</h3><p>Hiển thị cảnh báo khi khách hàng nợ vượt hạn mức hoặc nợ quá số ngày cho phép.</p></div>
        <Switch aria-labelledby="customer-debt-warning" checked={settings.debtWarningEnabled} disabled={!owner || pending}
          onChange={(event) => { if (event.target.checked) setDialog(true); else void save({ debtWarningEnabled: false }, "Đã tắt cảnh báo công nợ khách hàng."); }} />
      </div>
      {settings.debtWarningEnabled && <div className={s.summaryRow}>
        <span>{debtSummary(settings)}</span>
        <Button className="w-auto" variant="secondary" onClick={() => setDialog(true)}>Xem chi tiết</Button>
      </div>}
    </section>
    <section className={s.block} aria-labelledby="customer-required">
      <div className={s.head}><div><h3 id="customer-required">Thiết lập thông tin bắt buộc</h3><p>Thiết lập tính bắt buộc cho các trường thông tin khách hàng.</p></div></div>
      <div className={s.grid}>
        <div>
          {lockedRows.map((label) => <Toggle key={label} label={label} checked disabled locked onChange={() => undefined} />)}
          {column(requiredFieldKeys.slice(0, 3))}
        </div>
        <div>{column(requiredFieldKeys.slice(3))}</div>
      </div>
      <p className={s.hint}>Tên khách hàng và số điện thoại 1 luôn bắt buộc. Áp dụng khi thêm, sửa và import khách hàng.</p>
    </section>
    {dialog && <DebtWarningDialog settings={settings} onClose={() => setDialog(false)} onSave={async (patch) => { if (await save({ ...patch, debtWarningEnabled: true }, "Đã lưu cảnh báo công nợ khách hàng.")) setDialog(false); }} pending={pending} owner={owner} error={error} />}
  </div>;
}

function debtSummary(settings: CustomerSettings) {
  const parts = [settings.maxDebtAmount != null && `nợ trên ${group(String(settings.maxDebtAmount))} ₫`, settings.maxDebtDays != null && `nợ quá ${settings.maxDebtDays} ngày`].filter(Boolean);
  return `Đã bật cảnh báo công nợ khách hàng${parts.length ? `: ${parts.join(", ")}` : ""}.`;
}

function Toggle({ label, checked, disabled, locked, onChange }: { label: string; checked: boolean; disabled: boolean; locked?: boolean; onChange(checked: boolean): void }) {
  return <label className={s.row} data-locked={locked ? "true" : undefined}><span>{label}</span>
    <Switch checked={checked} disabled={disabled} aria-label={label} title={locked ? "Luôn bắt buộc" : undefined} onChange={(event) => onChange(event.target.checked)} /></label>;
}

/** "Xem chi tiết": the limits and the two options, as KiotViet's "Thiết lập cảnh báo công nợ khách hàng". */
function DebtWarningDialog({ settings, owner, pending, error, onClose, onSave }: {
  settings: CustomerSettings; owner: boolean; pending: boolean; error?: string; onClose(): void; onSave(patch: Partial<SettingsBody>): Promise<void>;
}) {
  const [useAmount, setUseAmount] = useState(settings.maxDebtAmount != null || (settings.maxDebtDays == null && !settings.debtWarningEnabled));
  const [amount, setAmount] = useState(settings.maxDebtAmount != null ? String(settings.maxDebtAmount) : "");
  const [useDays, setUseDays] = useState(settings.maxDebtDays != null), [days, setDays] = useState(settings.maxDebtDays != null ? String(settings.maxDebtDays) : "");
  const [allowMore, setAllowMore] = useState(settings.allowMoreDebtOverLimit), [problem, setProblem] = useState<string>();
  const readOnly = !owner || pending;

  function submit() {
    const money = Number(amount), dayCount = Number(days);
    if (useAmount && !(Number.isInteger(money) && money > 0 && money <= MAX_AMOUNT)) { setProblem("Nhập số tiền nợ tối đa lớn hơn 0."); return; }
    if (useDays && !(Number.isInteger(dayCount) && dayCount >= 1 && dayCount <= MAX_DAYS)) { setProblem(`Nhập số ngày nợ từ 1 đến ${MAX_DAYS}.`); return; }
    if (!useAmount && !useDays) { setProblem("Chọn ít nhất một hạn mức: số tiền nợ hoặc số ngày nợ."); return; }
    setProblem(undefined);
    void onSave({ maxDebtAmount: useAmount ? money : null, maxDebtDays: useDays ? dayCount : null, allowMoreDebtOverLimit: allowMore });
  }
  return <Dialog open size="md" dismissible={!pending} title="Thiết lập cảnh báo công nợ khách hàng" onOpenChange={(open) => { if (!open && !pending) onClose(); }}><div className={managementStyles.theme}>
    <p className={s.section}>Hiển thị cảnh báo nếu vượt quá hạn mức</p>
    <div className={s.limits}>
      <div className={s.limitRow}>
        <label><input type="checkbox" className="omts-check" checked={useAmount} disabled={readOnly} onChange={(event) => setUseAmount(event.target.checked)} />Số tiền nợ</label>
        <input className={`omts-control ${s.amount}`} inputMode="numeric" aria-label="Số tiền nợ tối đa" disabled={readOnly || !useAmount} value={group(amount)} onChange={(event) => setAmount(event.target.value.replace(/\D/g, "").slice(0, 12))} />
        <span>₫</span>
      </div>
      <div className={s.limitRow}>
        <label><input type="checkbox" className="omts-check" checked={useDays} disabled={readOnly} onChange={(event) => setUseDays(event.target.checked)} />Số ngày nợ</label>
        <input className={`omts-control ${s.days}`} inputMode="numeric" aria-label="Số ngày nợ tối đa" disabled={readOnly || !useDays} value={days} onChange={(event) => setDays(event.target.value.replace(/\D/g, "").slice(0, 4))} />
        <span>ngày, tính từ hóa đơn nợ cũ nhất chưa trả</span>
      </div>
    </div>
    <p className={s.section}>Tùy chọn khác</p>
    <div className={s.limits}>
      <label className={s.option}><input type="checkbox" className="omts-check" checked={allowMore} disabled={readOnly} onChange={(event) => setAllowMore(event.target.checked)} />
        <span>Cho phép khách hàng nợ thêm khi vượt quá hạn mức<small>Bỏ chọn: hóa đơn để lại công nợ cho khách đã vượt hạn mức sẽ bị từ chối.</small></span></label>
      <label className={s.option}><input type="checkbox" className="omts-check" checked disabled readOnly aria-label="Không ghi nhận công nợ cho khách lẻ" />
        <span>Không ghi nhận công nợ cho khách lẻ<small>Luôn áp dụng: khách lẻ không có hồ sơ để ghi nợ nên hóa đơn khách lẻ phải thu đủ tiền.</small></span></label>
    </div>
    <ErrorNotice error={problem ?? error} />
    <footer className={s.foot}>
      <Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button>
      {owner && <Button className="w-auto" isPending={pending} onClick={submit}>Lưu</Button>}
    </footer>
  </div></Dialog>;
}
