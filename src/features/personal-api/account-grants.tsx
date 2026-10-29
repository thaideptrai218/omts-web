"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Note, Skeleton, displayTime, useRemote, useMutation } from "@/features/operations/ui";
import { readAccountGrants, revokeAccountGrant } from "./account-grants-repository";
import type { z } from "zod";
import type { grantHistorySchema, grantRowSchema } from "./grant-contract";
import { semanticMessageCode } from "@/shared/messages/backend-message-code";
const stateLabels = { Effective: "Hiệu lực", Expired: "Hết hạn", NotYetEffective: "Chưa đến hạn", Revoked: "Đã thu hồi" };
const date = (value: string) => value.split("-").reverse().join("/");
export function AccountGrantHistory({ accountId, canRevoke = false }: { accountId: string; canRevoke?: boolean }) {
  const load = useCallback((signal: AbortSignal) => readAccountGrants(accountId, signal), [accountId]);
  const remote = useRemote(load), mutation = useMutation(), [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<z.infer<typeof grantRowSchema>>(), [reason, setReason] = useState(""), [notice, setNotice] = useState<string>();
  const [reviewedRows, setReviewedRows] = useState<z.infer<typeof grantHistorySchema>>(), [reviewing, setReviewing] = useState(false);
  const data = reviewedRows ?? remote.data, blocked = mutation.blocked || reviewing || semanticMessageCode(mutation.failure?.code) === "MSG61";
  const rows = data?.filter((row) => !filter || row.state === filter);
  return <section aria-label="Lịch sử phân quyền vùng" className="mt-5 space-y-4 border-t border-border pt-4"><h2 className="text-xl font-semibold">Lịch sử phân quyền vùng</h2>
    {remote.loading && <Skeleton />}<ErrorNotice error={(!reviewedRows ? remote.error : undefined) || mutation.error} />{notice && <p role="status">{notice}</p>}
    {!remote.loading && <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => { setReviewing(blocked); setReviewedRows(undefined); const next = await mutation.run(() => readAccountGrants(accountId), true); if (next) setReviewedRows(next); }}>Tải lại phân quyền</Button>}
    {blocked && <div className="space-y-3"><p>Hãy đối chiếu lịch sử hiện tại trước khi thực hiện lượt mới. Lệnh thu hồi không được gửi lại tự động.</p>{reviewedRows && !mutation.uncertain && <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => { setReviewing(false); mutation.reviewed(); }}>Đã đối chiếu lịch sử</Button>}</div>}
    {data && <><label className="block text-sm font-semibold">Tình trạng phân quyền<select className="mt-2 min-h-12 w-full rounded-control border border-border bg-surface px-3" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Tất cả</option>{Object.entries(stateLabels).map(([state, label]) => <option key={state} value={state}>{label}</option>)}</select></label>
      {!rows?.length && <p>Không có cặp vùng – vai trò phù hợp.</p>}
      <ul className="space-y-3">{rows?.map((row) => <li key={row.id} className="space-y-2 rounded-control border border-border p-3 break-words"><p className="font-semibold">{row.roleName} · {stateLabels[row.state]}</p><p>{row.allZones ? "Tất cả vùng" : row.zoneName || "Vùng chưa có tên trong danh mục"}</p><p className="text-sm">Từ {date(row.effectiveFrom)} · Đến {row.effectiveTo ? date(row.effectiveTo) : "Không giới hạn"}</p>
        {row.revokedAt && <p className="text-sm">Thu hồi: {displayTime(row.revokedAt)}</p>}{row.revokeReason && <p className="text-sm">Lý do: {row.revokeReason}</p>}
        {canRevoke && row.state !== "Revoked" && <Button className="w-auto" variant="secondary" disabled={mutation.pending || blocked} onClick={() => { setSelected(row); setReason(""); setNotice(undefined); }}>Thu hồi · {row.roleName}</Button>}
      </li>)}</ul>
    </>}
    {selected && <Dialog open title="Thu hồi phân quyền?" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open && !mutation.busy()) setSelected(undefined); }}><form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault(); if (mutation.busy() || blocked || !reason.trim() || reason.trim().length > 1000) return;
      const next = await mutation.run(() => revokeAccountGrant(accountId, selected.id, reason.trim()));
      if (next) { setReviewedRows((data ?? []).map((row) => row.id === next.id ? next : row)); setSelected(undefined); setNotice("Đã thu hồi phân quyền."); }
    }}><p>{selected.roleName} · {selected.allZones ? "Tất cả vùng" : selected.zoneName || "Vùng chưa có tên"}. Việc thu hồi được ghi nhật ký và giữ lại lịch sử.</p><Note label="Lý do thu hồi" required maxLength={1000} value={reason} disabled={mutation.pending} onChange={(event) => setReason(event.target.value)} /><ErrorNotice error={mutation.error} /><div className="flex flex-wrap gap-3"><Button type="submit" className="w-auto" isPending={mutation.pending} disabled={blocked || !reason.trim()}>Xác nhận thu hồi</Button><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => setSelected(undefined)}>Để sau</Button></div></form></Dialog>}
  </section>;
}
