"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import cashStyles from "@/features/cash-book/cash-book.module.css";
import { ErrorNotice, Field, Select, Skeleton, useRemote } from "@/features/operations/ui";
import { messageCatalog } from "@/shared/messages/message-catalog";
import type { InventorySettings } from "./contracts";
import { groupTree } from "./item-helpers";
import { errorText, inputRepository, type Result } from "./repository";
import styles from "./inventory-settings.module.css";

type Tab = "units" | "groups" | "types" | "cost";
type Row = { id: string; name: string; rowVersion: string; count?: number; locked?: boolean; parentId?: string | null; depth?: 0 | 1; hasChildren?: boolean };

/** The ids in the order a row moved one step among its siblings gives, or undefined at the end of the line. A top-level row moves together with its children; a child moves within its parent. */
function movedOrder(rows: readonly Row[], index: number, delta: -1 | 1): string[] | undefined {
  const row = rows[index];
  if (row.depth) {
    const siblings = rows.map((value, at) => ({ value, at })).filter((entry) => entry.value.parentId === row.parentId);
    const next = siblings[siblings.findIndex((entry) => entry.value.id === row.id) + delta];
    if (!next) return undefined;
    const ids = rows.map((value) => value.id);
    [ids[index], ids[next.at]] = [ids[next.at], ids[index]];
    return ids;
  }
  const blocks: Row[][] = [];
  for (const value of rows) { if (value.depth) blocks.at(-1)?.push(value); else blocks.push([value]); }
  const at = blocks.findIndex((block) => block[0].id === row.id), to = at + delta;
  if (to < 0 || to >= blocks.length) return undefined;
  [blocks[at], blocks[to]] = [blocks[to], blocks[at]];
  return blocks.flat().map((value) => value.id);
}
const readers = ["PURCHASE_RECEIPTS", "SUPPLIER_PAYMENTS", "CULTIVATION_CYCLES", "INPUT_ISSUES"];
const usedText = messageCatalog["MSG-GEN-06"];

/** Thiết lập → Vật tư & Giống: the units, item groups and issue types the catalogue draws on, and how cost is worked out. Only the Owner changes them. */
export function InputInventorySettings() {
  const { identity, permissions } = useApiWorkspace();
  const owner = identity.subjectType === "CooperativeOwner";
  const canRead = owner || permissions.functionPermissions.some((p) => readers.includes(p.functionCode) && p.action === "View");
  const [tab, setTab] = useState<Tab>("units");
  const units = useRemote(useCallback((signal: AbortSignal) => canRead ? inputRepository.units(signal) : Promise.resolve({ status: "success" as const, data: [] }), [canRead]));
  const groups = useRemote(useCallback((signal: AbortSignal) => canRead ? inputRepository.groups(signal) : Promise.resolve({ status: "success" as const, data: [] }), [canRead]));
  const types = useRemote(useCallback((signal: AbortSignal) => canRead ? inputRepository.issueTypes(signal) : Promise.resolve({ status: "success" as const, data: [] }), [canRead]));
  if (!canRead) return <p role="alert">Bạn không có quyền xem thiết lập này.</p>;
  const unitRows: Row[] | undefined = units.data?.map((row) => ({ id: row.id, name: row.name, rowVersion: row.rowVersion, count: row.itemCount }));
  const groupData = groups.data;
  const groupRows: Row[] | undefined = groupData && groupTree(groupData).map((row) => ({
    id: row.id, name: row.name, rowVersion: row.rowVersion, count: row.itemCount, parentId: row.parentId, depth: row.depth, hasChildren: groupData.some((child) => child.parentId === row.id),
  }));
  const typeRows: Row[] | undefined = types.data?.map((row) => ({ id: row.id, name: row.name, rowVersion: row.rowVersion, locked: row.isSystem }));
  const tabButton = (key: Tab, label: string, count?: number) =>
    <button type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}{count !== undefined && <em>{count}</em>}</button>;
  return <div className={managementStyles.theme}>
    <div className={cashStyles.tabs} role="tablist" aria-label="Thiết lập vật tư và giống">
      {tabButton("units", "Đơn vị tính", unitRows?.length)}{tabButton("groups", "Nhóm hàng", groupRows?.length)}{tabButton("types", "Loại xuất", typeRows?.length)}{tabButton("cost", "Tính giá vốn")}
    </div>
    {tab === "units" && <NameTab key="units" noun="đơn vị tính" maxLength={30} rows={unitRows} loading={units.loading} error={units.error} reload={units.reload} canManage={owner} countLabel="Số vật tư dùng"
      save={(name, row) => inputRepository.saveUnit(name, row?.id, row?.rowVersion)} remove={(row) => inputRepository.removeUnit(row.id)} />}
    {tab === "groups" && <NameTab key="groups" noun="nhóm hàng" maxLength={100} rows={groupRows} loading={groups.loading} error={groups.error} reload={groups.reload} canManage={owner} countLabel="Số vật tư"
      tree save={(name, row, parentId) => inputRepository.saveGroup(name, row?.id, row?.rowVersion, parentId)} remove={(row) => inputRepository.removeGroup(row.id)} reorder={(ids) => inputRepository.reorderGroups(ids)} />}
    {tab === "types" && <NameTab key="types" noun="loại xuất" maxLength={100} rows={typeRows} loading={types.loading} error={types.error} reload={types.reload} canManage={owner}
      save={(name, row) => inputRepository.saveIssueType(name, row?.id, row?.rowVersion)} remove={(row) => inputRepository.removeIssueType(row.id)} />}
    {tab === "cost" && <CostTab canManage={owner} />}
  </div>;
}

type NameTabProps = {
  noun: string; maxLength: number; rows: Row[] | undefined; loading: boolean; error?: string; reload(): void; canManage: boolean; countLabel?: string; tree?: boolean;
  save(name: string, row?: Row, parentId?: string | null): Promise<Result<unknown>>; remove(row: Row): Promise<Result<unknown>>; reorder?(ids: string[]): Promise<Result<unknown>>;
};

function NameTab({ noun, maxLength, rows, loading, error, reload, canManage, countLabel, tree, save, remove, reorder }: NameTabProps) {
  const [editing, setEditing] = useState<Row | "new">(), [failure, setFailure] = useState<string>(), [busy, setBusy] = useState(false);
  const confirmation = useActionDialog(), { notify } = useToast();
  const cap = noun.charAt(0).toUpperCase() + noun.slice(1);
  if (loading) return <Skeleton />;
  if (error || !rows) return <ListStateMessage error={error ?? "Không tải được danh sách."} onRetry={reload} />;

  async function removeRow(row: Row) {
    setFailure(undefined);
    if (row.hasChildren) { setFailure(`${row.name} còn nhóm con. Hãy xóa hoặc chuyển nhóm con sang nhóm khác trước.`); return; }
    if (row.count) { setFailure(`${row.name}: ${usedText}`); return; }
    if (!(await confirmation.confirm(`Xóa ${noun} ${row.name}?`))) return;
    setBusy(true);
    const result = await remove(row);
    setBusy(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã xóa ${noun} ${row.name}.` }); reload(); } else setFailure(result.code === "MSG-GEN-06" ? `${row.name}: ${usedText}` : errorText(result));
  }
  async function move(index: number, delta: number) {
    if (!reorder || !rows) return;
    const ids = movedOrder(rows, index, delta === -1 ? -1 : 1);
    if (!ids) return;
    setFailure(undefined); setBusy(true);
    const result = await reorder(ids);
    setBusy(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã đổi thứ tự ${noun}.` }); reload(); } else setFailure(errorText(result));
  }
  const showCount = countLabel !== undefined;
  return <>{confirmation.dialog}
    {canManage && <div className={cashStyles.toolbar}><Button className="w-auto" variant="secondary" onClick={() => setEditing("new")}><InterfaceIcon name="add" className="mr-1 size-4" />Tạo {noun}</Button></div>}
    <ErrorNotice error={failure} />
    <div className={cashStyles.tableWrap}><table className={cashStyles.table}>
      <thead><tr><th>{cap}</th>{showCount && <th>{countLabel}</th>}{canManage && <th className={cashStyles.actions}>Thao tác</th>}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.id}>
        <td className={row.depth ? styles.child : undefined}>{row.depth ? <span aria-hidden="true">└ </span> : null}{row.name}{row.locked && <span className={cashStyles.badge}>Hệ thống</span>}</td>
        {showCount && <td>{row.count ?? 0}</td>}
        {canManage && <td className={cashStyles.actions}>
          {reorder && <span className={styles.order}>
            <button type="button" className={cashStyles.iconButton} aria-label={`Đưa ${row.name} lên`} title="Lên" disabled={busy || !movedOrder(rows, index, -1)} onClick={() => void move(index, -1)}><InterfaceIcon name="chevron-up" /></button>
            <button type="button" className={cashStyles.iconButton} aria-label={`Đưa ${row.name} xuống`} title="Xuống" disabled={busy || !movedOrder(rows, index, 1)} onClick={() => void move(index, 1)}><InterfaceIcon name="chevron-down" /></button>
          </span>}
          {!row.locked && <>
            <button type="button" className={cashStyles.iconButton} aria-label={`Sửa ${row.name}`} title="Sửa" onClick={() => { setFailure(undefined); setEditing(row); }}><InterfaceIcon name="pencil" /></button>
            <button type="button" className={cashStyles.iconButton} aria-label={`Xóa ${row.name}`} title="Xóa" disabled={busy} onClick={() => void removeRow(row)}><InterfaceIcon name="trash" /></button>
          </>}
        </td>}
      </tr>)}
        {!rows.length && <tr><td colSpan={1 + (showCount ? 1 : 0) + (canManage ? 1 : 0)} className={cashStyles.muted}>Chưa có {noun} nào.</td></tr>}</tbody>
    </table></div>
    {canManage && rows.some((row) => row.locked) && <p className={`${cashStyles.muted} ${cashStyles.after}`}>Mục có nhãn Hệ thống do hệ thống cấp nên không sửa hoặc xóa được.</p>}
    {editing && <NameDialog noun={noun} maxLength={maxLength} row={editing === "new" ? undefined : editing} save={save} parents={tree ? rows.filter((row) => !row.depth) : undefined}
      onClose={(saved) => { setEditing(undefined); if (saved) { notify({ tone: "success", title: `Đã lưu ${noun} ${saved}.` }); reload(); } }} />}
  </>;
}

function NameDialog({ noun, maxLength, row, save, parents, onClose }: { noun: string; maxLength: number; row?: Row; save: NameTabProps["save"]; parents?: Row[]; onClose(saved?: string): void }) {
  const [name, setName] = useState(row?.name ?? ""), [parentId, setParentId] = useState(row?.parentId ?? ""), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  // A group that has children stays at the top; a group is never its own parent.
  const parentChoices = parents?.filter((parent) => parent.id !== row?.id);
  async function submit() {
    const value = name.trim();
    if (!value) { setError("Nhập tên."); return; }
    setPending(true); setError(undefined);
    const result = await save(value, row, parentId || null);
    setPending(false);
    if (result.status === "success") onClose(value);
    else setError(result.code === "MSG-GEN-02" ? "Tên này đã có trong danh sách." : errorText(result));
  }
  return <Dialog open size="md" dismissible={!pending} title={`${row ? "Sửa" : "Tạo"} ${noun}`} onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>
    <form onSubmit={(event) => { event.preventDefault(); if (!pending) void submit(); }}>
      <Field label="Tên *" autoFocus maxLength={maxLength} value={name} onChange={(event) => setName(event.target.value)} />
      {parentChoices && <div className="mt-3"><Select label="Nhóm cha" disabled={row?.hasChildren} title={row?.hasChildren ? "Nhóm đang có nhóm con nên phải giữ ở cấp trên cùng" : undefined} value={parentId} onChange={(event) => setParentId(event.target.value)}>
        <option value="">Không có (nhóm cấp trên cùng)</option>{parentChoices.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</Select></div>}
      <ErrorNotice error={error} />
      <footer className={cashStyles.foot}><div /><div><Button className="w-auto" variant="secondary" disabled={pending} onClick={() => onClose()}>Bỏ qua</Button><Button className="w-auto" type="submit" isPending={pending}>Lưu</Button></div></footer>
    </form>
  </div></Dialog>;
}

function CostTab({ canManage }: { canManage: boolean }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => inputRepository.settings(signal), []));
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được thiết lập."} onRetry={remote.reload} />;
  return <CostForm key={remote.data.rowVersion} settings={remote.data} canManage={canManage} onStale={remote.reload} onSaved={remote.reload} />;
}

function CostForm({ settings, canManage, onStale, onSaved }: { settings: InventorySettings; canManage: boolean; onStale(): void; onSaved(): void }) {
  const [method, setMethod] = useState(settings.costMethod), [allow, setAllow] = useState(settings.allowNegativeQuantity);
  const [pending, setPending] = useState(false), [error, setError] = useState<string>(), { notify } = useToast();
  const dirty = method !== settings.costMethod || allow !== settings.allowNegativeQuantity;
  async function save() {
    setPending(true); setError(undefined);
    const result = await inputRepository.saveSettings({ costMethod: method, allowNegativeQuantity: allow, rowVersion: settings.rowVersion });
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: "Đã lưu thiết lập vật tư và giống." }); onSaved(); return; }
    if (result.code === "MSG06") { setError("Thiết lập vừa được người khác cập nhật. Thay đổi của bạn chưa được lưu; đã tải lại giá trị mới."); onStale(); return; }
    setError(errorText(result));
  }
  const choice = (value: "Fixed" | "Average", title: string, hint: string) =>
    <label className={styles.option}><input type="radio" className="omts-check" name="cost-method" checked={method === value} disabled={!canManage || pending} onChange={() => setMethod(value)} /><strong>{title}</strong><span>{hint}</span></label>;
  return <div>
    <p className={styles.legend}>Phương pháp tính giá vốn</p>
    <div className={styles.options} role="radiogroup" aria-label="Phương pháp tính giá vốn">
      {choice("Fixed", "Cố định", "Giá vốn do bạn nhập, chỉ tự lấy giá của lần nhập đầu tiên khi còn trống.")}
      {choice("Average", "Trung bình", "Giá vốn được tính trung bình sau mỗi lần nhập hoặc trả hàng nhập, theo số còn lại.")}
    </div>
    <label className={styles.allow}><span><strong>Cho phép xuất khi hết</strong><small>Khi tắt, không hoàn thành được phiếu xuất làm số còn lại xuống dưới 0.</small></span>
      <Switch checked={allow} disabled={!canManage || pending} onChange={(event) => setAllow(event.target.checked)} /></label>
    <ErrorNotice error={error} />
    {canManage ? <div className={styles.saveRow}><Button className="w-auto" isPending={pending} disabled={!dirty} onClick={() => void save()}>Lưu</Button></div>
      : <p className={`${cashStyles.muted} ${cashStyles.after}`}>Chỉ Chủ hợp tác xã đổi được thiết lập này.</p>}
  </div>;
}
