"use client";
// FRAME ONLY: no data source yet. Wire to the sales-invoice list endpoint (filters: period, zone, customer, harvest lot, status, unconfirmed cash) once available.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { Field, OperationHeading, Select } from "@/features/operations/ui";
import { FrameCard, FrameTable, OptionGroup, SummaryTiles } from "@/features/quality-claims/frame-kit";
import s from "@/features/quality-claims/frame-kit.module.css";
import { InvoiceDetailTabs } from "./invoice-detail-tabs";

const HEADINGS = ["Mã hóa đơn", "Thời gian", "Vùng", "Khách hàng", "Tổng tiền (đ)", "Trạng thái", "Hình thức thanh toán", "Thanh toán", "Gửi hóa đơn"] as const;
const STATUSES = ["Hoàn thành", "Đã hủy"] as const;

/** Bộ lọc dạng nhập liệu cục bộ: không gửi yêu cầu nào. */
function InvoiceFilters() {
  return (
    <>
      {/* TODO(api): send these filters with the list request; options for zone / customer / lot come from lookups. */}
      <OptionGroup legend="Thời gian" type="radio" options={["Hôm nay", "Tuần này", "Tháng này", "Tùy chỉnh"]} defaultChecked={["Tùy chỉnh"]} />
      <Field label="Từ ngày" type="date" value="" onChange={() => undefined} />
      <Field label="Đến ngày" type="date" value="" onChange={() => undefined} />
      <Select label="Vùng nuôi" defaultValue=""><option value="">Tất cả vùng của tôi</option></Select>
      <Select label="Khách hàng" defaultValue=""><option value="">Tất cả khách hàng</option></Select>
      <Select label="Lô thu hoạch" defaultValue=""><option value="">Tất cả lô</option></Select>
      <OptionGroup legend="Trạng thái" type="checkbox" options={STATUSES} defaultChecked={STATUSES} />
      <OptionGroup legend="Tiền mặt" type="checkbox" options={["Tiền mặt tôi đã thu chưa được xác nhận"]} />
    </>
  );
}

/** SCR-SALE-05 Hóa đơn bán: danh sách hóa đơn theo vùng, lọc, xem chi tiết theo tab và thao tác trả hàng / gửi lại / in. */
export function SalesInvoiceListScreen() {
  const [search, setSearch] = useState("");
  return (
    <section>
      <OperationHeading title="Hóa đơn bán" description="Các hóa đơn của vùng nuôi bạn phụ trách, mới nhất trước; chọn một hóa đơn để xem và thao tác." icon="receipt" />
      <FilterWorkspace label="Bộ lọc" filters={<InvoiceFilters />}>
        <div className={s.toolbar}>
          <Field label="Tìm theo mã hóa đơn, khách hàng" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
          {/* TODO(api): print the filtered list. */}
          <Button variant="secondary" className="w-auto" disabled aria-disabled="true">In danh sách</Button>
        </div>
        <SummaryTiles label="Tổng hợp hóa đơn" items={["Tổng hóa đơn hoàn thành", "Tổng tiền (đ)"]} />
        <FrameTable label="Danh sách hóa đơn bán" headings={HEADINGS} numeric={[4]} />
        <FrameCard title="Chi tiết hóa đơn"><InvoiceDetailTabs /></FrameCard>
      </FilterWorkspace>
    </section>
  );
}
