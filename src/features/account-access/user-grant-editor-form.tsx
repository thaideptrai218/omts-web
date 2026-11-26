"use client";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/features/operations/ui";
import { applyGrantPlan, type PlanResult } from "./user-grant-apply";
import { heldToDesired, planGrantChanges, planSentence, type DesiredGrants, type HeldGrant } from "./user-grant-diff";
import type { UserZone } from "./use-user-accounts";
import { ZONE_MANAGER_ROLE } from "./user-account-model";

const chipBase = "inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
/** One chip, three states told by an icon AND a word (never colour alone); every chip stays clickable. */
function Chip({ label, held, selected, onToggle }: { label: string; held: boolean; selected: boolean; onToggle(): void }) {
  const state = held && selected ? { icon: "✓", word: "Đang phụ trách", tone: "border-primary bg-primary text-white font-semibold" }
    : selected ? { icon: "+", word: "Thêm", tone: "border-primary bg-surface text-primary font-semibold" }
    : held ? { icon: "−", word: "Bỏ", tone: "border-danger bg-surface text-danger font-semibold" } : undefined;
  return <button type="button" aria-pressed={selected} className={`${chipBase} ${state?.tone ?? "border-border-strong bg-surface text-text hover:bg-surface-subtle"}`} onClick={onToggle}>
    {state && <span aria-hidden="true" className="font-bold">{state.icon}</span>}<span className={held && !selected ? "line-through" : ""}>{label}</span>{state && <span className="text-xs font-semibold">· {state.word}</span>}
  </button>;
}

/** Current state of a whole-cooperative role in words, with the one action that changes it. */
function AccountantBlock({ held, wanted, disabled, onChange }: { held: boolean; wanted: boolean; disabled: boolean; onChange(next: boolean): void }) {
  const [text, action] = held && wanted ? ["✓ Là Kế toán của cả hợp tác xã", "Bỏ vai trò Kế toán"] : wanted ? ["+ Thêm: Kế toán của cả hợp tác xã", "Không thêm nữa"] : held ? ["− Bỏ: Kế toán của cả hợp tác xã", "Giữ lại vai trò Kế toán"] : ["Chưa là Kế toán", "Cho làm Kế toán"];
  const tone = held && wanted ? "text-primary" : wanted ? "text-primary" : held ? "text-danger" : "text-text";
  return <div className="flex flex-wrap items-center justify-between gap-3"><p className={`font-semibold ${tone}`}>{text}</p><Button type="button" className="w-auto" variant="secondary" disabled={disabled} onClick={() => onChange(!wanted)}>{action}</Button></div>;
}

/**
 * One editor for everything an account holds. Quản lý vùng has two modes ("Một số vùng" with a chip per zone, or "Tất cả vùng");
 * the zones held now are filled chips ("Đang phụ trách") that can be clicked off ("Bỏ"). One "Lưu thay đổi" applies only the difference and removing asks one reason.
 * Choosing "Tất cả vùng" replaces the zone grants (add all-zones, revoke the single zones) so no redundant grant remains.
 */
export function UserGrantEditorForm({ accountId, held, zones, beforeGrant, onApplied }: {
  accountId: string; held: readonly HeldGrant[]; zones: readonly UserZone[]; beforeGrant?(role: string): Promise<boolean>; onApplied(results: PlanResult[]): void;
}) {
  const [draft, setDraft] = useState<DesiredGrants>(() => heldToDesired(held));
  const [reason, setReason] = useState(""), [pending, setPending] = useState(false);
  const busy = useRef(false), modeName = useId();
  // A held zone that is no longer In Use is still shown (so it can be revoked) next to the zones that can be granted.
  const known = new Map(zones.map((zone) => [zone.id, zone.name]));
  for (const grant of held) if (grant.role === ZONE_MANAGER_ROLE && grant.zoneId && !known.has(grant.zoneId)) known.set(grant.zoneId, grant.zoneName ?? "Vùng đã ngừng sử dụng");
  const chips = [...known].map(([id, name]) => ({ id, name }));
  const manager = held.filter((grant) => grant.role === ZONE_MANAGER_ROLE);
  const heldAll = manager.some((grant) => grant.allZones), heldZoneIds = manager.flatMap((grant) => grant.zoneId ? [grant.zoneId] : []);
  const plan = planGrantChanges(held, draft, (id) => known.get(id) ?? "Vùng đã chọn");
  const removing = plan.some((item) => item.kind === "remove"), sentence = planSentence(plan);
  const leavesNothing = plan.length > 0 && !draft.allZones && draft.zoneIds.length === 0 && !draft.accountant;
  const reasonProblem = removing && !reason.trim() ? "Hãy nhập lý do bỏ." : undefined;
  const disabledReason = !plan.length ? "Chưa có thay đổi." : reasonProblem;
  const toggleZone = (id: string) => setDraft((now) => ({ ...now, zoneIds: now.zoneIds.includes(id) ? now.zoneIds.filter((zoneId) => zoneId !== id) : [...now.zoneIds, id] }));
  // The warning for a second Accountant comes with the action itself, so the Owner decides before it joins the summary.
  async function setAccountant(next: boolean) {
    if (next && !held.some((grant) => grant.role === "ACCOUNTANT") && beforeGrant && !(await beforeGrant("ACCOUNTANT"))) return;
    setDraft((now) => ({ ...now, accountant: next }));
  }
  async function save() {
    if (busy.current || !plan.length || reasonProblem) return;
    busy.current = true; setPending(true);
    try {
      const results = await applyGrantPlan(accountId, plan, reason);
      if (results.every((result) => result.ok)) setReason("");
      onApplied(results);
    } finally { busy.current = false; setPending(false); }
  }
  const modeLabel = "flex min-h-9 cursor-pointer items-center rounded-full px-4 text-sm font-semibold has-[:checked]:bg-primary has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary";
  return <form aria-label="Vai trò và vùng phụ trách" className="space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <fieldset className="space-y-3 rounded-card border border-border p-3" disabled={pending}>
      <legend className="px-1 font-semibold">Quản lý vùng</legend>
      <div className="inline-flex gap-1 rounded-full border border-border-strong bg-surface p-1" role="radiogroup" aria-label="Phạm vi vùng">
        {([[false, "Một số vùng"], [true, "Tất cả vùng"]] as const).map(([all, label]) => <label key={label} className={modeLabel}>
          <input type="radio" className="sr-only" name={modeName} checked={draft.allZones === all} onChange={() => setDraft((now) => ({ ...now, allZones: all }))} />{label}
        </label>)}
      </div>
      {draft.allZones ? <p className="text-sm">
        <span className="font-semibold text-primary">{heldAll ? "✓ Đang phụ trách tất cả vùng." : "+ Thêm: tất cả vùng."}</span> Gồm cả vùng tạo sau này.
      </p> : <>
        {heldAll && <p className="text-sm font-semibold text-danger">− Bỏ phụ trách tất cả vùng. Chọn các vùng muốn giữ ở dưới.</p>}
        <div className="flex flex-wrap gap-2">{chips.map((chip) => <Chip key={chip.id} label={chip.name} held={heldZoneIds.includes(chip.id)} selected={draft.zoneIds.includes(chip.id)} onToggle={() => toggleZone(chip.id)} />)}</div>
        <p className="text-xs text-text-muted">{chips.length ? "Bấm vào vùng để thêm hoặc bỏ." : "Chưa có vùng nào đang sử dụng."}</p>
      </>}
    </fieldset>
    <fieldset className="space-y-2 rounded-card border border-border p-3" disabled={pending}>
      <legend className="px-1 font-semibold">Kế toán</legend>
      <AccountantBlock held={held.some((grant) => grant.role === "ACCOUNTANT")} wanted={draft.accountant} disabled={pending} onChange={(next) => void setAccountant(next)} />
    </fieldset>
    {sentence && <div className="space-y-1 rounded-control border border-border bg-surface-subtle p-3 text-sm" aria-live="polite">
      <p>{sentence}</p>
      {leavesNothing && <p role="alert" className="font-semibold text-danger">Lưu xong, tài khoản này không còn vai trò hay vùng nào nên sẽ không đăng nhập được.</p>}
    </div>}
    {removing && <Field label="Lý do bỏ *" maxLength={1000} autoComplete="off" value={reason} disabled={pending} onChange={(event) => setReason(event.target.value)} />}
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" className="w-auto" isPending={pending} disabled={!!disabledReason} aria-describedby={disabledReason ? "grant-editor-reason" : undefined}>Lưu thay đổi</Button>
      <Button type="button" className="w-auto" variant="secondary" disabled={pending} onClick={() => { setDraft(heldToDesired(held)); setReason(""); }}>Hoàn tác</Button>
      {disabledReason && <p id="grant-editor-reason" className="text-xs text-text-muted">{disabledReason}</p>}
    </div>
  </form>;
}
