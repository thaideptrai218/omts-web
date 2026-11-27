"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import { createOperationsRepository } from "@/features/operations/repository";
import { operationError, useMutation, useRemote } from "@/features/operations/ui";
import { accountantWarningFor, applyGrantSelection, grantOutcomeNotice, hasAnyRole } from "./employee-account-grants";
import { issueEmployeeAccountResponseSchema, linkableAccountsSchema } from "./employee-account-contract";
import { employeeViewSchema, type Employee } from "./contracts";
import { employeeCreateReceiptSchema } from "./employee-create-contract";
import { fieldLabels } from "./employee-editor-model";
import { employeePhotoMaxBytes, employeePhotoTypes } from "./employee-file-contract";
import { employeeFileRepository } from "./employee-file-repository";
import { cardOfField, formStateOf, parseEmployeeForm, type EmployeeFormCard, type EmployeeFormIssue, type EmployeeFormState } from "./employee-form-model";

export type EmployeeFormProps = {
  /** The profile being updated; null makes a new one. */
  record: Employee | null;
  zones: ApiRecord[];
  lookupsReady: boolean;
  /** The Owner: the login account can be chosen or made in the same save. */
  canAccount: boolean;
  onClose(): void;
  /** The server copy was chosen over the draft: the caller reloads and closes. */
  onAdopt(employee: Employee): void;
  /** `problems`: steps after the profile was saved that did not go through (photo, account link), told in a toast by the caller. */
  onSaved(employee: Employee, problems: string[]): void;
};

type Credential = { username: string; password: string; expiresAt: string };

/** State and save flow of the "Thêm mới / Cập nhật nhân viên" form: the profile first, then the account, then the photo. */
export function useEmployeeForm({ record, zones, canAccount, lookupsReady, onClose, onAdopt, onSaved }: EmployeeFormProps) {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const mutation = useMutation(), confirmation = useActionDialog(), formRef = useRef<HTMLFormElement>(null);
  const [initial] = useState(() => formStateOf(record));
  const [baseline, setBaseline] = useState(record);
  const [state, setState] = useState<EmployeeFormState>(initial);
  const [issues, setIssues] = useState<EmployeeFormIssue[]>([]);
  const [picked, setPicked] = useState<{ file: File; url: string }>(), [removePhoto, setRemovePhoto] = useState(false), [photoError, setPhotoError] = useState<string>();
  const [open, setOpen] = useState<ReadonlySet<EmployeeFormCard>>(() => new Set());
  const [focusPath, setFocusPath] = useState<string>();
  const [latest, setLatest] = useState<Employee>(), [compared, setCompared] = useState<Employee>(), [reconciledRows, setReconciledRows] = useState<EmployeeListItemDto[]>();
  const [credential, setCredential] = useState<Credential>();
  const [grantNotice, setGrantNotice] = useState<{ text?: string; failed: boolean }>();
  const finished = useRef<{ employee: Employee; problems: string[] } | undefined>(undefined);
  const zoneNames = useRef(new Map<string, string>());
  const left = baseline?.status === "Left";
  const accountOffered = canAccount && (!record || (record.status === "Employed" && record.canMaintain && !record.account && !record.hasStaffAccount));
  const linkable = useRemote(useCallback((signal: AbortSignal) => accountOffered ? repository.read("linkable-accounts", {}, linkableAccountsSchema, signal) : Promise.resolve({ status: "success" as const, data: { items: [] } }), [accountOffered, repository]));
  // The preview address is made when a file is picked (not while rendering) and given back when it is replaced or the form closes.
  const previewUrl = useRef<string | undefined>(undefined);
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);
  function replacePicked(file?: File) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file ? URL.createObjectURL(file) : undefined;
    setPicked(file && previewUrl.current ? { file, url: previewUrl.current } : undefined);
  }
  const photo = picked?.file;
  const shownPhoto = removePhoto ? undefined : picked?.url ?? record?.photoUrl ?? undefined;
  const dirty = JSON.stringify(state) !== JSON.stringify(initial) || !!photo || removePhoto;

  const problem = mutation.failure?.employeeProblem;
  // What the backend refused, shown next to the same inputs as the local checks.
  const serverIssues = useMemo<EmployeeFormIssue[]>(() => {
    const failure = mutation.failure;
    if (problem?.kind === "invalid-fields") return problem.fields.map(field => {
      const key = fieldLabels[field][0];
      return { path: key === "accountId" ? "accountChoice" : key === "area" || key === "wardCommune" ? "address" : key, message: "Kiểm tra lại mục này." };
    });
    if (failure?.code === "MSG-GEN-02") return [{ path: "code", message: "Mã nhân viên đã được dùng cho nhân viên khác." }];
    if (failure?.code === "MSG03" && problem?.kind === "duplicate-employee") return [{ path: "phone", message: "Số điện thoại hoặc hồ sơ này đã có ở nhân viên khác." }];
    if (failure?.code === "MSG-ACCOUNT-09") return [{ path: "username", message: "Tên đăng nhập hoặc số điện thoại đã được sử dụng." }];
    return [];
  }, [mutation.failure, problem]);
  const all = useMemo(() => [...issues, ...serverIssues], [issues, serverIssues]);
  const error = (path: string) => all.find(issue => issue.path === path || (path === "bankAccount.bankName" && issue.path === "bankAccount"))?.message;
  const errorProps = (name: string) => ({ name, "aria-invalid": all.some(issue => issue.path === name || name.startsWith(`${issue.path}.`)), "aria-describedby": error(name) ? `employee-form-error-${name}` : undefined });

  // A refusal opens the folded card that holds its field and moves focus to the first one.
  useEffect(() => {
    if (!serverIssues.length) return;
    const frame = requestAnimationFrame(() => {
      const cards = serverIssues.flatMap(issue => cardOfField(issue.path) ?? []);
      if (cards.length) setOpen(current => new Set([...current, ...cards]));
      setFocusPath(serverIssues[0].path);
    });
    return () => cancelAnimationFrame(frame);
  }, [serverIssues]);
  useEffect(() => {
    if (!focusPath) return;
    const target = focusPath === "bankAccount" ? "bankAccount.bankName" : focusPath;
    Array.from(formRef.current?.querySelectorAll<HTMLElement>("[name]") ?? []).find(node => node.getAttribute("name") === target)?.focus();
  }, [focusPath]);

  function pickPhoto(file: File) {
    if (!employeePhotoTypes.includes(file.type)) { setPhotoError("Ảnh phải là JPEG hoặc PNG."); return; }
    if (file.size > employeePhotoMaxBytes) { setPhotoError("Ảnh tối đa 2 MB."); return; }
    setPhotoError(undefined); replacePicked(file); setRemovePhoto(false);
  }
  function dropPhoto() { replacePicked(); setPhotoError(undefined); setRemovePhoto(!!record?.photoUrl); }
  async function close() {
    if (mutation.busy()) return;
    if (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?")) onClose();
  }
  const finish = () => { const done = finished.current; finished.current = undefined; if (done) onSaved(done.employee, done.problems); };

  /** After the profile is saved: link or issue the account, then the photo. Each step reports its own failure and never undoes the saved profile. */
  async function followUp(saved: Employee, parsed: Extract<ReturnType<typeof parseEmployeeForm>, { ok: true }>, receipt?: Credential) {
    let current = saved;
    const problems: string[] = [];
    if (parsed.linkAccountId) {
      const linked = await repository.write("link-account", { accountId: parsed.linkAccountId }, employeeViewSchema, current.id);
      if (linked.status === "success") current = linked.data; else problems.push(`chưa liên kết được tài khoản (${operationError(linked)})`);
    }
    let issued = receipt;
    if (parsed.newAccount && !receipt) {
      const made = await repository.write("issue-account", parsed.newAccount, issueEmployeeAccountResponseSchema, current.id);
      if (made.status === "success") {
        current = made.data.employee;
        issued = { username: made.data.employee.account?.username ?? parsed.newAccount.username, password: made.data.temporaryPassword, expiresAt: made.data.temporaryPasswordExpiresAt };
        const outcome = state.employeeType === "Staff" && made.data.employee.account && hasAnyRole(state.grants) ? await applyGrantSelection(made.data.employee.account.id, state.grants, zoneNames.current) : undefined;
        setGrantNotice({ text: grantOutcomeNotice(outcome), failed: !!outcome?.failed.length });
      } else problems.push(`chưa tạo được tài khoản (${operationError(made)})`);
    }
    if (photo) {
      const uploaded = await employeeFileRepository.setPhoto(current.id, photo);
      if (uploaded.status === "success") current = uploaded.data; else problems.push(`chưa cập nhật được ảnh (${operationError(uploaded)})`);
    } else if (removePhoto && record?.photoUrl) {
      const removed = await repository.write("remove-photo", {}, employeeViewSchema, current.id);
      if (removed.status === "success") current = removed.data; else problems.push(`chưa xóa được ảnh (${operationError(removed)})`);
    }
    finished.current = { employee: current, problems };
    // The one-time password replaces the form until the user confirms the handover.
    if (issued) setCredential(issued); else finish();
  }

  async function save() {
    if (mutation.busy() || mutation.blocked || !lookupsReady) return;
    const activeZoneIds = new Set([...zones.filter(zone => zone.statusId === 101).map(zone => zone.id), ...(baseline?.workingZones.map(zone => zone.id) ?? [])]);
    const parsed = parseEmployeeForm(state, { baseline, activeZoneIds, accountOffered });
    if (!parsed.ok) {
      setIssues(parsed.issues);
      const cards = parsed.issues.flatMap(issue => cardOfField(issue.path) ?? []);
      if (cards.length) setOpen(current => new Set([...current, ...cards]));
      setFocusPath(parsed.issues[0].path);
      return;
    }
    setIssues([]); setCompared(undefined);
    // A new internal employee with a new account goes in one POST; every other account step follows the saved profile.
    const inline = !record && !!parsed.newAccount && state.employeeType === "Staff";
    if (inline) {
      // A second Accountant only warns; the Owner's OK continues.
      const warning = state.grants.accountant ? await accountantWarningFor(state.grants) : undefined;
      if (warning && !(await confirmation.confirm(warning))) return;
      const receipt = await mutation.run(() => repository.write("create", { ...parsed.body, account: parsed.newAccount }, employeeCreateReceiptSchema));
      if (!receipt) return;
      const accountId = receipt.employee.account?.id;
      const outcome = accountId && hasAnyRole(state.grants) ? await applyGrantSelection(accountId, state.grants, zoneNames.current) : undefined;
      setGrantNotice({ text: grantOutcomeNotice(outcome), failed: !!outcome?.failed.length });
      await followUp(receipt.employee, parsed, { username: receipt.employee.account?.username ?? parsed.newAccount!.username, password: receipt.temporaryPassword, expiresAt: receipt.temporaryPasswordExpiresAt });
      return;
    }
    const saved = await mutation.run(() => record
      ? repository.write("update", parsed.body, employeeViewSchema, record.id)
      : repository.write("create", parsed.body, employeeViewSchema));
    if (saved) await followUp(saved, parsed);
  }

  async function compareDuplicate() {
    if (!problem || problem.kind === "invalid-fields") return;
    const target = await mutation.run(() => repository.read("detail", { id: problem.existingEmployeeId }, employeeViewSchema), true);
    if (target) setCompared(target);
  }

  return {
    repository, mutation, confirmation, formRef, state, setState, baseline, left, issues: all, error, errorProps, open, setCard: (card: EmployeeFormCard, on: boolean) => setOpen(current => { const next = new Set(current); if (on) next.add(card); else next.delete(card); return next; }),
    photo: { shown: shownPhoto, disabled: left || mutation.pending, onPick: pickPhoto, onRemove: dropPhoto, error: photoError },
    accountOffered, linkable, onZones: useCallback((names: Map<string, string>) => { zoneNames.current = names; }, []),
    latest, setLatest, compared, setCompared, reconciledRows, setReconciledRows, problem, compareDuplicate, credential, grantNotice, acknowledgeCredential: () => { setCredential(undefined); setGrantNotice(undefined); finish(); },
    keepDraft: (server: Employee) => { setBaseline(server); setLatest(undefined); mutation.reviewed(); },
    adopt: onAdopt, dirty, close, save,
  };
}
