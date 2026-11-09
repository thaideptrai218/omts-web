"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, OperationHeading, Paging, Skeleton, useRemote } from "@/features/operations/ui";
import { CLAIM_STATUS, claimsPage, type ClaimsPage } from "./claim-contracts";
import { claimStatus } from "./claim-labels";
import { claimRepository } from "./claim-repositories";
import { QualityClaimsTable } from "./quality-claims-table";
import f from "./frame-kit.module.css";
import s from "./claims.module.css";

const PAGE_SIZE = 20;
const STATUS_CHOICES = [{ value: "", label: "Tất cả" }, ...Object.values(CLAIM_STATUS).map((id) => ({ value: String(id), label: claimStatus(id) }))] as const;
const heading = <OperationHeading title="Khiếu nại chất lượng" description="Khiếu nại thương lái gửi từ ứng dụng; khiếu nại chờ phản hồi xếp trước. Chọn một khiếu nại để xem ảnh, hóa đơn và phản hồi." icon="inbox" />;

/**
 * SCR-CLAIM-02 Khiếu nại chất lượng (CLAIM-02): Chủ HTX xem danh sách, mở chi tiết dưới dòng rồi chấp nhận (có đề nghị) hoặc từ chối (có lý do).
 * Quản lý vùng chỉ xem khiếu nại của hóa đơn trong vùng của mình; backend lọc theo vùng và là nơi quyết định quyền.
 */
export function QualityClaimsScreen() {
  const { identity, permissions } = useApiWorkspace();
  if (!operationAllowed("quality-claims", identity, permissions.functionPermissions, "View")) {
    return <section>{heading}<div className={s.state} role="alert"><h2>Bạn chưa có quyền xem khiếu nại chất lượng</h2><p>Hãy liên hệ Chủ hợp tác xã để được cấp quyền xem khiếu nại của vùng nuôi.</p></div></section>;
  }
  return <ClaimsWorkspace canRespond={identity.subjectType === "CooperativeOwner"} />;
}

function ClaimsWorkspace({ canRespond }: { canRespond: boolean }) {
  const [status, setStatus] = useState(""), [page, setPage] = useState(1), [expanded, setExpanded] = useState<string>(), [kept, setKept] = useState<ClaimsPage>();
  const list = useRemote(useCallback((signal: AbortSignal) => claimRepository.read("list", { page: String(page), pageSize: String(PAGE_SIZE), statusId: status || undefined }, claimsPage, signal), [page, status]));
  // Giữ dữ liệu trước đó trong lúc tải lại (sau khi phản hồi) để dòng chi tiết đang mở không bị đóng.
  if (list.data && list.data !== kept) setKept(list.data);
  const data = list.error ? undefined : list.data ?? kept, rows = data?.items ?? [];
  const choose = (value: string) => { setExpanded(undefined); setPage(1); setStatus(value); };

  return (
    <section>
      {heading}
      <FilterWorkspace label="Bộ lọc khiếu nại" filters={
        <fieldset className={f.group} disabled={list.loading}><legend>Trạng thái</legend>
          {STATUS_CHOICES.map((choice) => <label key={choice.value} className={f.option}><input type="radio" name="claim-status" checked={status === choice.value} onChange={() => choose(choice.value)} />{choice.label}</label>)}
        </fieldset>}>
        <div aria-live="polite" aria-busy={list.loading}>
          {list.loading && !data && <Skeleton />}
          {list.error && <div className={s.state} role="alert"><h2>Chưa tải được danh sách khiếu nại</h2><ErrorNotice error={list.error} /><Button className="w-auto" variant="secondary" onClick={list.reload}>Thử lại</Button></div>}
          {data && (
            <>
              <dl className={f.stats} aria-label="Tổng hợp khiếu nại"><div><dt>Số khiếu nại khớp bộ lọc</dt><dd>{data.total.toLocaleString("vi-VN")}</dd></div></dl>
              {!rows.length ? (
                <div className={s.state}><h2>Không có khiếu nại nào</h2><p>{status ? "Không có khiếu nại nào ở trạng thái đã chọn. Hãy chọn trạng thái khác." : "Chưa có thương lái nào gửi khiếu nại chất lượng."}</p></div>
              ) : (
                <>
                  <QualityClaimsTable rows={rows} expandedId={expanded} canRespond={canRespond} onToggle={(id) => setExpanded((current) => (current === id ? undefined : id))} onChanged={list.reload} />
                  <div className={s.paging}><Paging page={page} total={data.total} pageSize={PAGE_SIZE} disabled={list.loading} onChange={(next) => { setExpanded(undefined); setPage(next); }} /></div>
                </>
              )}
            </>
          )}
        </div>
      </FilterWorkspace>
    </section>
  );
}
