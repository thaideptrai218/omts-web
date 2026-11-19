"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice } from "@/features/operations/ui";
import { employeeViewSchema, type Employee } from "./contracts";
import { linkableAccountsSchema, linkEmployeeAccountRequestSchema, type LinkableAccount } from "./employee-account-contract";
import { employeeAccountError } from "./employee-account-error";

type Loaded = { status: "loading" } | { status: "error" } | { status: "ready"; items: LinkableAccount[] };

/** Chủ hợp tác xã chọn một tài khoản nhân viên đang hoạt động, chưa gắn với nhân viên nào, để liên kết với hồ sơ này. */
export function EmployeeAccountLinkDialog({ employee, onClose, onSaved }: { employee: Employee; onClose(): void; onSaved(employee: Employee): void }) {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [selected, setSelected] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  const legend = useId();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    // Gõ tìm kiếm chờ 300 ms để không gọi máy chủ sau từng phím.
    const timer = setTimeout(async () => {
      setLoaded({ status: "loading" });
      const result = await repository.read("linkable-accounts", { search: search.trim() || undefined }, linkableAccountsSchema, controller.signal);
      if (controller.signal.aborted) return;
      setLoaded(result.status === "success" ? { status: "ready", items: result.data.items } : { status: "error" });
    }, search ? 300 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [repository, search]);
  async function link() {
    const checked = linkEmployeeAccountRequestSchema.safeParse({ accountId: selected });
    if (!checked.success || pending) { setError("Hãy chọn một tài khoản để liên kết."); return; }
    setPending(true); setError(undefined);
    // The BFF answers with the bare employee, as it does for an update.
    const result = await repository.write("link-account", checked.data, employeeViewSchema, employee.id);
    if (!mounted.current) return;
    setPending(false);
    if (result.status === "success") { onClose(); onSaved(result.data); return; }
    setError(linkError(result));
  }
  const items = loaded.status === "ready" ? loaded.items : [];
  // Rendered on <body>: the tab sits inside the profile <form>, where Enter in the search box would submit that form.
  return createPortal(<Dialog open title="Liên kết tài khoản có sẵn" dismissible={!pending} onOpenChange={open => { if (!open && !pending) onClose(); }}>
    <p className="mb-4">Chọn tài khoản đăng nhập chưa liên kết với nhân viên nào để gắn cho {employee.fullName}. Quyền truy cập của tài khoản giữ nguyên.</p>
    <label className="mb-3 block text-sm font-medium">Tìm theo tên, tên đăng nhập hoặc số điện thoại
      <input className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2" type="search" value={search} maxLength={100} disabled={pending} onChange={event => setSearch(event.target.value)} />
    </label>
    <fieldset className="mb-4 max-h-64 space-y-2 overflow-auto" disabled={pending}>
      <legend id={legend} className="sr-only">Tài khoản chưa liên kết</legend>
      {loaded.status === "loading" && <p role="status" className="text-sm text-text-muted">Đang tải danh sách tài khoản...</p>}
      {loaded.status === "error" && <p role="alert" className="text-sm">Không tải được danh sách tài khoản. Vui lòng thử lại.</p>}
      {loaded.status === "ready" && !items.length && <p className="text-sm text-text-muted">Không có tài khoản nào phù hợp. Hãy cấp tài khoản mới cho nhân viên.</p>}
      {items.map(account => <label key={account.id} className="flex cursor-pointer items-start gap-3 rounded-control border border-border p-3 has-[:checked]:border-primary">
        <input type="radio" name="account" className="mt-1" checked={selected === account.id} onChange={() => setSelected(account.id)} />
        <span className="min-w-0"><span className="block break-words font-semibold">{account.displayName}</span><span className="block break-all text-sm text-text-muted">@{account.username}{account.phoneNumber ? ` · ${account.phoneNumber}` : ""}</span></span>
      </label>)}
    </fieldset>
    <ErrorNotice error={error} />
    <div className="flex flex-wrap gap-3">
      <Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Đóng</Button>
      <Button className="w-auto" isPending={pending} disabled={!selected} onClick={() => void link()}>Liên kết tài khoản</Button>
    </div>
  </Dialog>, document.body);
}

function linkError(result: Parameters<typeof employeeAccountError>[0]): string {
  if (result.uncertain) return "Chưa xác định được kết quả liên kết. Đóng hộp thoại và tải lại hồ sơ để đối chiếu.";
  if (result.httpStatus === 403 || result.code === "MSG-GEN-08") return "Chỉ Chủ hợp tác xã được liên kết tài khoản đăng nhập.";
  if (result.httpStatus === 404) return "Không tìm thấy hồ sơ hoặc tài khoản. Hãy tải lại danh sách.";
  if (["MSG-GEN-01", "MSG01", "MSG-GEN-09", "MSG06", "MSG-GEN-06", "MSG24"].includes(result.code ?? "")) return "Tài khoản này không còn dùng được: đã liên kết với nhân viên khác, đã bị khóa hoặc không phải tài khoản nhân viên. Hãy chọn tài khoản khác.";
  return employeeAccountError(result);
}
