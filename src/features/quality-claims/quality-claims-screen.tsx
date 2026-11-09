"use client";
// FRAME ONLY: no data source yet. Wire to the quality-claim list/detail and accept/reject endpoints once available.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { Field, OperationHeading } from "@/features/operations/ui";
import { FrameCard, FrameTable, FrameTabs, KeyValues, OptionGroup, SummaryTiles } from "./frame-kit";
import { QualityClaimDialogs, type ClaimDialogKind } from "./quality-claim-dialogs";
import s from "./frame-kit.module.css";

const HEADINGS = ["Mã khiếu nại", "Khách hàng", "Hóa đơn", "Thời gian gửi", "Trạng thái"] as const;
const STATUSES = ["Chờ phản hồi", "Đã chấp nhận", "Đã từ chối"] as const;

function ClaimDetail({ onOpen }: { onOpen(kind: Exclude<ClaimDialogKind, null>): void }) {
  return (
    <>
      {/* TODO(api): fill from the selected claim: content, photos, customer, invoice lines and invoice adjustment history. */}
      <KeyValues items={["Mã khiếu nại", "Trạng thái", "Thời gian gửi", "Khách hàng"]} />
      <h3 className={s.cardTitle}>Nội dung khiếu nại</h3>
      <div className={s.photos} aria-label="Ảnh đính kèm">{["Ảnh 1", "Ảnh 2", "Ảnh 3"].map((p) => <div key={p} className={s.photo}>{p}</div>)}</div>
      <h3 className={s.cardTitle}>Hóa đơn</h3>
      <FrameTable label="Dòng hàng của hóa đơn" headings={["Sản phẩm", "Lô thu hoạch", "kg", "Đơn giá (đ)", "Thành tiền (đ)"]} numeric={[2, 3, 4]} />
      <div className={s.footer}>
        {/* TODO(api): open only for claims awaiting a response; hide for read-only roles (Zone Manager read-only variant). */}
        <Button variant="secondary" className="w-auto" onClick={() => onOpen("reject")}>Từ chối</Button>
        <Button className="w-auto" onClick={() => onOpen("accept")}>Chấp nhận</Button>
      </div>
    </>
  );
}

/** SCR-CLAIM-02 Khiếu nại chất lượng: danh sách khiếu nại thương lái gửi, xem chi tiết rồi chấp nhận hoặc từ chối. */
export function QualityClaimsScreen() {
  // Local UI state only: filters never trigger a request.
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<ClaimDialogKind>(null);
  return (
    <section>
      <OperationHeading title="Khiếu nại chất lượng" description="Khiếu nại thương lái gửi từ ứng dụng; khiếu nại chờ phản hồi xếp trước." icon="inbox" />
      <FilterWorkspace label="Bộ lọc" filters={<OptionGroup legend="Trạng thái" type="checkbox" options={STATUSES} defaultChecked={STATUSES} />}>
        {/* TODO(api): send search + status filters with the list request. */}
        <Field label="Tìm theo mã khiếu nại, khách hàng" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <SummaryTiles label="Tổng hợp khiếu nại" items={["Chờ phản hồi", "Đã trả lời"]} />
        <FrameTable label="Danh sách khiếu nại" headings={HEADINGS} />
        <FrameCard title="Chi tiết khiếu nại">
          <FrameTabs label="Chi tiết khiếu nại" tabs={[{ id: "info", label: "Thông tin", content: <ClaimDetail onOpen={setDialog} /> }]} />
        </FrameCard>
      </FilterWorkspace>
      <QualityClaimDialogs kind={dialog} onClose={() => setDialog(null)} />
    </section>
  );
}
