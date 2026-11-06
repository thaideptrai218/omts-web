"use client";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { ManagementHeading } from "@/components/ui/management-page";
import { Button } from "@/components/ui/button";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Field, Select, Skeleton, displayTime, useRemote } from "@/features/operations/ui";
import { receivingAccountSchema, saveReceivingAccountSchema } from "./contracts";
import { readBanks, readReceivingAccount, saveReceivingAccount } from "./repository";

export function ReceivingAccountScreen() {
  const { identity } = useApiWorkspace();
  if (identity.subjectType !== "CooperativeOwner") return <p role="alert">Bạn không có quyền quản lý tài khoản nhận tiền.</p>;
  return <ReceivingAccountLoader />;
}
function ReceivingAccountLoader() {
  const remote = useRemote(useMemo(() => readReceivingAccount, []));
  return <section><ManagementHeading title="Tài khoản ngân hàng nhận tiền" description="Tài khoản của hợp tác xã dùng để nhận chuyển khoản và tạo mã VietQR." icon="payment" /><ErrorNotice error={remote.error} />{remote.loading ? <Skeleton /> : remote.data && <ReceivingAccountForm key={remote.data.rowVersion} initial={remote.data} onSaved={remote.reload} />}{remote.error && <Button className="mt-4 w-auto" variant="secondary" onClick={remote.reload}>Tải lại tài khoản hiện tại</Button>}</section>;
}
function ReceivingAccountForm({ initial, onSaved }: { initial: z.infer<typeof receivingAccountSchema>; onSaved(): void }) {
  const banks = useRemote(useMemo(() => readBanks, []));
  const [values, setValues] = useState({ bankBin: initial.account?.bankBin ?? "", accountNumber: initial.account?.accountNumber ?? "", accountHolderName: initial.account?.accountHolderName ?? "" });
  const [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState<string>();
  const active = useRef(false), dialog = useActionDialog();
  const [latest, setLatest] = useState<z.infer<typeof receivingAccountSchema>>();
  async function save() {
    if (active.current || blocked) return;
    const payload = saveReceivingAccountSchema.safeParse({ ...values, rowVersion: initial.rowVersion, confirmAccount: false });
    if (!payload.success) { setError("Chọn ngân hàng, nhập số tài khoản gồm 1–19 chữ hoặc số và tên chủ tài khoản tối đa 200 ký tự."); return; }
    active.current = true; setPending(true); setError(undefined);
    try {
      const result = await saveReceivingAccount(payload.data);
      if (result.status === "success") { onSaved(); return; }
      if (result.code === "MSG-DEBT-01" && result.httpStatus === 409) {
        const bank = banks.data?.find(b => b.bin === values.bankBin);
        const confirmed = await dialog.confirm(`Dùng tài khoản ${values.accountNumber} tại ${bank?.shortName ?? values.bankBin}, chủ tài khoản ${values.accountHolderName}? Khi đổi ngân hàng hoặc số tài khoản, các mã VietQR đã gửi cho hóa đơn chưa thanh toán có thể không còn dùng được.`);
        if (!confirmed) return;
        const saved = await saveReceivingAccount({ ...payload.data, confirmAccount: true });
        if (saved.status === "success") { onSaved(); return; }
        setError(workspaceError(saved)); setBlocked(saved.uncertain || saved.httpStatus === 409); return;
      }
      setError(workspaceError(result)); setBlocked(result.uncertain || result.httpStatus === 409);
    } finally { active.current = false; setPending(false); }
  }
  return <div className="mt-5 max-w-3xl">{dialog.dialog}
    {blocked && <section className="mb-5 rounded-control border border-border p-4"><Button className="w-auto" variant="secondary" disabled={pending} onClick={async () => { if (active.current) return; active.current = true; setPending(true); try { const result = await readReceivingAccount(AbortSignal.timeout(30000)); if (result.status === "success") setLatest(result.data); else setError(workspaceError(result)); } finally { active.current = false; setPending(false); } }}>Đọc dữ liệu mới để đối chiếu</Button>{latest && <><p className="mt-3">{latest.account ? `${latest.account.bankName} · ${latest.account.accountNumber} · ${latest.account.accountHolderName}` : "Chưa có tài khoản nhận tiền."}</p><Button className="mt-3 w-auto" variant="secondary" disabled={pending} onClick={async () => { if (await dialog.confirm("Dùng dữ liệu hiện tại và bỏ bản nháp đang mở?")) onSaved(); }}>Dùng dữ liệu hiện tại</Button></>}</section>}
    {initial.account ? <dl className="mb-6 grid gap-4 border-y border-border py-4 sm:grid-cols-2"><div><dt className="text-sm text-text-muted">Ngân hàng nhận tiền</dt><dd className="font-medium">{initial.account.bankName} · {initial.account.accountNumber}</dd></div><div><dt className="text-sm text-text-muted">Chủ tài khoản</dt><dd className="font-medium">{initial.account.accountHolderName}</dd></div><div><dt className="text-sm text-text-muted">Được chấp nhận lúc</dt><dd>{displayTime(initial.account.acceptedAt)}</dd></div></dl> : <p className="mb-5 text-sm text-text-muted">Hợp tác xã chưa thiết lập tài khoản nhận tiền.</p>}
    <ErrorNotice error={error || banks.error} /><form onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={pending || blocked || banks.loading} className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Select label="Ngân hàng *" required value={values.bankBin} onChange={e => setValues({ ...values, bankBin: e.target.value })}><option value="">Chọn ngân hàng</option>{banks.data?.map(bank => <option key={bank.bin} value={bank.bin}>{bank.shortName} · {bank.name}</option>)}</Select></div><Field label="Số tài khoản *" required maxLength={19} pattern="[0-9A-Za-z]{1,19}" value={values.accountNumber} onChange={e => setValues({ ...values, accountNumber: e.target.value })} /><Field label="Tên chủ tài khoản *" required maxLength={200} value={values.accountHolderName} onChange={e => setValues({ ...values, accountHolderName: e.target.value })} /><Button type="submit" className="w-auto sm:col-span-2 sm:justify-self-start" isPending={pending}>Kiểm tra và lưu tài khoản</Button></fieldset></form>{blocked && <p role="alert" className="mt-4 text-sm">Bản nháp vẫn được giữ. Hãy tải lại tài khoản hiện tại để đối chiếu trước khi lập lượt lưu mới.</p>}{banks.error && <Button className="mt-3 w-auto" variant="secondary" onClick={banks.reload}>Tải lại ngân hàng</Button>}</div>;
}
