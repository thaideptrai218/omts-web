"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { singletonDefinitions, type SingletonKey } from "./singleton-contract";
import { createSingletonRepository } from "./singleton-repository";
import { workspaceError } from "./api-resource-screen";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "./api-workspace-shell";
import { CooperativeApiScreen } from "@/features/cooperative-api/cooperative-screen";

export function ApiSingletonScreen({ kind }: { kind: SingletonKey }) {
  return kind === "cooperative" ? <CooperativeApiScreen /> : <BasicSingletonScreen kind={kind} />;
}
function BasicSingletonScreen({ kind }: { kind: SingletonKey }) {
  const context = useApiWorkspace();
  const repository = useMemo(() => createSingletonRepository(kind), [kind]);
  const definition = singletonDefinitions[kind];
  const [record, setRecord] = useState<Record<string, unknown>>();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [reload, setReload] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [latest, setLatest] = useState<Record<string, unknown>>();
  const [notice, setNotice] = useState<string>();
  const allowed = kind === "profile" || context.identity.subjectType === "CooperativeOwner";
  useEffect(() => {
    const controller = new AbortController();
    if (!allowed) return () => controller.abort();
    void repository.read(controller.signal).then((result) => {
      if (controller.signal.aborted) return; setLoading(false);
      if (result.status === "success") {
        setRecord(result.data); setValues(Object.fromEntries(definition.fields.map(([field]) => [field, String(result.data[field] ?? "")]))); setError(undefined); setBlocked(false);
      } else setError(workspaceError(result));
    });
    return () => controller.abort();
  }, [repository, definition, reload, allowed]);
  if (!allowed) return <p role="alert">Bạn không có quyền xem hồ sơ này.</p>;
  return <section className="max-w-4xl"><h1 className="text-3xl font-semibold">{definition.title}</h1>
    {loading && <div className="mt-6 h-60 animate-pulse rounded-card bg-slate-200" role="status" aria-label="Đang tải hồ sơ" />}
    {error && <p role="alert" className="my-4 rounded-control border border-danger p-4">{error}</p>}
    {notice && <p role="status" className="my-4 text-primary">{notice}</p>}
    {!record && !loading && <Button className="mt-4 w-auto" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Tải lại</Button>}
    {record && <form className="mt-6 space-y-5 rounded-card border border-border bg-surface p-6" onSubmit={async (event) => {
      event.preventDefault(); if (pendingRef.current || blocked) return; pendingRef.current = true; setPending(true); setNotice(undefined); setError(undefined);
      const result = await repository.save({ ...values, ...(kind === "cooperative" ? { businessLines: record.businessLines } : {}), rowVersion: record.rowVersion });
      pendingRef.current = false; setPending(false);
      if (result.status === "success") { setRecord(result.data); setNotice("Đã lưu hồ sơ."); }
      else { setError(workspaceError(result)); setBlocked(result.uncertain || result.code === "MSG06"); }
    }}>
      <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">{definition.fields.map(([key, label]) => <FormField key={key} id={`api-${key}`} label={label}
        required={key === "displayName" || ["fullName", "taxCode", "officeAddress", "phoneNumber", "legalRepresentative"].includes(key)} value={values[key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} />)}</fieldset>
      {kind === "profile" && <dl className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">{[["username", "Tên đăng nhập"], ["email", "Email"], ["phoneNumber", "Số điện thoại"]].map(([key, label]) => <div key={key}><dt className="text-sm text-text-muted">{label}</dt><dd>{String(record[key] ?? "Chưa có")}</dd></div>)}</dl>}
      {blocked && <div className="space-y-3"><Button className="w-auto" variant="secondary" onClick={async () => {
        const result = await repository.read(); if (result.status === "success") setLatest(result.data); else setError(workspaceError(result));
      }}>Tải dữ liệu mới để đối chiếu</Button>{latest && <div className="rounded-control border border-border p-4">{definition.fields.map(([key, label]) => <p key={key}>{label}: {String(latest[key] ?? "—")}</p>)}
        <Button className="mt-4 w-auto" variant="secondary" onClick={() => {
          if (window.confirm("Dùng dữ liệu mới và bỏ bản nháp đang mở?")) { setRecord(latest); setValues(Object.fromEntries(definition.fields.map(([key]) => [key, String(latest[key] ?? "")]))); setBlocked(false); setError(undefined); setLatest(undefined); }
        }}>Dùng dữ liệu mới</Button></div>}</div>}
      <Button className="w-auto" type="submit" isPending={pending} disabled={blocked}>Lưu thay đổi</Button>
    </form>}
  </section>;
}
