"use client";
// FRAME ONLY: no data source yet. Wire to the trader quality-claim endpoints (load the trader's invoice, submit claim with description + photos) once available.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Note, OperationHeading } from "@/features/operations/ui";
import { FrameCard, FrameTable, KeyValues } from "./frame-kit";
import s from "./frame-kit.module.css";

const LINE_HEADINGS = ["Sản phẩm", "Lô thu hoạch", "kg", "Đơn giá", "Thành tiền"] as const;
const PHOTO_SLOTS = ["Ảnh 1", "Ảnh 2"] as const;

/** SCR-CLAIM-01 Báo vấn đề chất lượng: thương lái mô tả vấn đề và đính kèm ảnh cho một hóa đơn của mình. */
export function ClaimReportScreen() {
  // Local UI state only: nothing is sent anywhere.
  const [description, setDescription] = useState("");
  return (
    <section>
      <OperationHeading title="Báo vấn đề chất lượng" description="Mô tả vấn đề và đính kèm ảnh cho hóa đơn của bạn để hợp tác xã xem xét." icon="request" />
      <div className={s.twoCol}>
        <FrameCard title="Hóa đơn">
          {/* TODO(api): load the selected invoice (code, time, product lines) for this trader. */}
          <KeyValues items={["Mã hóa đơn", "Thời gian"]} />
          <FrameTable label="Dòng hàng của hóa đơn" headings={LINE_HEADINGS} numeric={[2, 3, 4]} />
          <p className={s.hint}>Khiếu nại áp dụng cho cả hóa đơn, không ghi số kg riêng từng dòng.</p>
        </FrameCard>
        <FrameCard title="Nội dung báo cáo">
          <form className={s.form} onSubmit={(event) => event.preventDefault()}>
            <Note label="Mô tả vấn đề *" required aria-required="true" value={description} onChange={(event) => setDescription(event.target.value)} />
            <fieldset className={s.group}>
              <legend>Ảnh chụp (ít nhất một ảnh) *</legend>
              {/* TODO(api): upload claim photos and attach them to the claim. */}
              <div className={s.photos}>
                {PHOTO_SLOTS.map((slot) => <div key={slot} className={s.photo}>{slot}</div>)}
                <Button variant="secondary" disabled aria-disabled="true" className="min-h-[5.5rem]">+ Thêm ảnh</Button>
              </div>
            </fieldset>
            {/* TODO(api): submit the claim; show validation messages MSG-GEN-01 when description or photo is missing. */}
            <Button type="submit" disabled aria-disabled="true">Gửi</Button>
          </form>
        </FrameCard>
      </div>
    </section>
  );
}
