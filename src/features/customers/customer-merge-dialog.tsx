"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { ErrorNotice, Money, Skeleton, useRemote } from "@/features/operations/ui";
import type { CustomerDetail, CustomerRow, MergePreview } from "./contracts";
import { customerRepository, errorText } from "./repository";
import styles from "./customers.module.css";

function Party({ title, party }: { title: string; party: MergePreview["kept"] }) {
  return <div className={styles.mergeCard}><h4>{title}</h4><strong>{party.name}</strong>
    <p className={styles.muted}>{[party.code, party.phoneNumber].filter(Boolean).join(" · ")}</p>
    <p>Nợ hiện tại: <Money value={party.currentDebt} /></p>
    <p>{party.hasTraderAccount ? <span className={`${styles.badge} ${styles.badgeWarn}`}>Có tài khoản thương lái</span> : <span className={styles.muted}>Không có tài khoản thương lái</span>}</p></div>;
}

/** Finds the profile to merge in: by name, code or phone, among the profiles in use other than the kept one. */
function Candidates({ keptId, onPick }: { keptId: string; onPick(row: CustomerRow): void }) {
  const [text, setText] = useState(""), [term, setTerm] = useState("");
  useEffect(() => { const timer = setTimeout(() => setTerm(text.trim()), 250); return () => clearTimeout(timer); }, [text]);
  const found = useRemote(useCallback((signal: AbortSignal) => customerRepository.list({ search: term, pageSize: "8", status: "InUse" }, signal), [term]));
  const rows = (found.data?.items ?? []).filter((row) => row.id !== keptId);
  return <div>
    <label className="block text-xs font-medium text-text-muted">Hồ sơ cần gộp vào
      <input type="search" autoFocus className="mt-1.5 h-9 w-full rounded-control border border-border-strong px-3 text-sm" placeholder="Tìm theo tên, mã hoặc số điện thoại" maxLength={200} value={text} onChange={(event) => setText(event.target.value)} /></label>
    <div className={styles.pickList} role="listbox" aria-label="Khách hàng có thể gộp">
      {found.loading ? <p className={styles.hint}>Đang tìm…</p> : found.error ? <p role="alert" className="text-sm text-danger">{found.error}</p>
        : rows.length ? rows.map((row) => <button key={row.id} type="button" role="option" aria-selected={false} onClick={() => onPick(row)}><strong>{row.name}</strong><small>{[row.code, row.phoneNumber].filter(Boolean).join(" · ")}{row.hasTraderAccount ? " · Có tài khoản thương lái" : ""}</small></button>)
        : <p className={styles.hint}>Không tìm thấy khách hàng phù hợp.</p>}
    </div>
  </div>;
}

/**
 * "Gộp hồ sơ": the chosen profile is merged into this one, which stays. Its invoices, payments and requests move here and the merge
 * cannot be undone. When both profiles have a trader account, the merged one is locked and the Zone Manager confirms the Owner's approval.
 */
export function CustomerMergeDialog({ kept, onClose, onMerged }: { kept: CustomerDetail; onClose(): void; onMerged(saved: CustomerDetail, mergedCode: string | null | undefined): void }) {
  const { notify } = useToast();
  const [picked, setPicked] = useState<CustomerRow>(), [approved, setApproved] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const preview = useRemote(useCallback((signal: AbortSignal) => picked ? customerRepository.mergePreview(kept.id, picked.id, signal) : Promise.resolve({ status: "error" as const, httpStatus: 0, uncertain: false }), [kept.id, picked]));
  const data = picked ? preview.data : undefined;

  async function merge() {
    if (!data || pending) return;
    setPending(true); setError(undefined);
    const result = await customerRepository.merge(kept.id, { mergedCustomerId: data.merged.id, keptRowVersion: data.kept.rowVersion, mergedRowVersion: data.merged.rowVersion, ownerApproved: data.requiresOwnerApproval && approved });
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã gộp ${data.merged.code ?? data.merged.name} vào ${kept.code}.` }); onMerged(result.data, data.merged.code); return; }
    setError(`${errorText(result)}${result.problem?.canKeepMergedInstead ? ` Hãy mở hồ sơ ${data.merged.name} và gộp ${kept.name} vào đó.` : ""}`);
  }

  return <Dialog open size="lg" title={`Gộp hồ sơ vào ${kept.name}`} dismissible={!pending} onOpenChange={(open) => { if (!open && !pending) onClose(); }}><div className={`${managementStyles.theme} space-y-4`}>
    {!picked && <Candidates keptId={kept.id} onPick={(row) => { setPicked(row); setApproved(false); setError(undefined); }} />}
    {picked && (preview.loading ? <Skeleton /> : preview.error || !data ? <div role="alert" className="text-sm text-danger"><p>{preview.error ?? "Không tải được thông tin gộp."}</p><button type="button" className={managementStyles.linkButton} onClick={() => setPicked(undefined)}>Chọn hồ sơ khác</button></div> : <>
      <div className={styles.mergeGrid}><Party title="Hồ sơ giữ lại" party={data.kept} /><Party title="Hồ sơ bị gộp" party={data.merged} /></div>
      {!!data.countedWithKept?.length && <p className="text-sm">Sẽ chuyển sang hồ sơ giữ lại: {data.countedWithKept.map((item) => `${item.name}: ${item.count}`).join(", ")}.</p>}
      {data.locksMergedAccount && <p role="alert" className={styles.warn}>Cả hai hồ sơ đều có tài khoản thương lái. Tài khoản của {data.merged.name} sẽ bị khóa và không đăng nhập được nữa; {data.kept.name} giữ tài khoản của mình.</p>}
      <p className="text-sm">Gộp hồ sơ không thể hoàn tác. Nợ và giao dịch của hồ sơ bị gộp được cộng vào hồ sơ giữ lại.</p>
      {data.requiresOwnerApproval && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
        <span>Chủ hợp tác xã đã đồng ý gộp {data.merged.name} ({data.merged.phoneNumber ?? "không có số điện thoại"}, nợ <Money value={data.merged.currentDebt} />) vào {data.kept.name} ({data.kept.phoneNumber ?? "không có số điện thoại"}, nợ <Money value={data.kept.currentDebt} />).</span></label>}
      <ErrorNotice error={error} />
      <div className="flex justify-between gap-3">
        <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => { setPicked(undefined); setError(undefined); }}>Chọn hồ sơ khác</Button>
        <div className="flex gap-3"><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button>
          <Button className="w-auto" isPending={pending} disabled={data.requiresOwnerApproval && !approved} onClick={() => void merge()}>Gộp hồ sơ</Button></div>
      </div>
    </>)}
    {!picked && <div className="flex justify-end"><Button className="w-auto" variant="secondary" onClick={onClose}>Bỏ qua</Button></div>}
  </div></Dialog>;
}
