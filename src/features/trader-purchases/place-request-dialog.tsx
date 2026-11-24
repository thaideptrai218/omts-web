"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { CageQuantityField } from "@/components/form/cage-quantity-field";
import { resolveQuantityInput, type CageQuantityValue } from "@/shared/format/cage-request-quantity";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { product as productSchema } from "@/features/sales-api/contracts";
import { businessToday, ErrorNotice, Field, Note, Select, useMutation, useRemote } from "@/features/operations/ui";
import { MAX_TEXT_LENGTH, placeRequestSchema, requestSavedSchema, type TraderRequest } from "./contracts";
import { productRepository, purchaseRepository } from "./purchase-repository";
import s from "./trader-purchases.module.css";

/** StatusId "Đang dùng" của sản phẩm, như màn gửi yêu cầu cũ đã dùng; chỉ sản phẩm đang dùng mới nhận yêu cầu mua (backend kiểm tra lại). */
const PRODUCT_IN_USE_STATUS = 101;

/** SALE-01: gửi yêu cầu mua (sản phẩm, số lồng nguyên, ngày lấy, ghi chú). Chỉ là thông báo: không giá, không giữ hàng. `kgPerCage` (tùy chọn) bật ô nhập theo kg. */
export function PlaceRequestDialog({ onClose, onSent, kgPerCage }: { onClose(): void; onSent(saved: TraderRequest): void; kgPerCage?: number }) {
  const [values, setValues] = useState({ productId: "", quantity: { unit: "cages", text: "" } as CageQuantityValue, pickupDate: businessToday(), note: "" }), [formError, setFormError] = useState<string>();
  const mutation = useMutation();
  const catalog = useRemote(useMemo(() => (signal: AbortSignal) => productRepository.read("list", {}, z.array(productSchema), signal), []));
  const choices = catalog.data?.filter((p) => p.statusId === PRODUCT_IN_USE_STATUS) ?? [];

  async function send() {
    // Thương lái không đọc được kg/lồng trung bình của HTX nên chỉ nhập theo lồng; ô nhập vẫn hỗ trợ kg khi biết tỷ lệ.
    const { cages } = resolveQuantityInput(kgPerCage ? values.quantity.unit : "cages", values.quantity.text, kgPerCage);
    const payload = placeRequestSchema.safeParse({ productId: values.productId, requestedCages: cages, pickupDate: values.pickupDate, note: values.note.trim() || null });
    if (!payload.success || values.pickupDate < businessToday()) {
      setFormError(`Hãy chọn sản phẩm, nhập số lồng nguyên lớn hơn 0, chọn ngày lấy từ hôm nay; ghi chú tối đa ${MAX_TEXT_LENGTH} ký tự.`);
      return;
    }
    setFormError(undefined);
    const saved = await mutation.run(() => purchaseRepository.write("submit", payload.data, requestSavedSchema));
    if (saved) onSent(saved.request);
  }

  return (
    <Dialog open title="Gửi yêu cầu mua" mobileLayout="fullscreen" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ErrorNotice error={formError ?? mutation.error ?? catalog.error} />
      {mutation.blocked ? (
        <>
          <p className={s.warning} role="status">Chưa chắc yêu cầu đã được gửi hay chưa. Hãy đóng hộp thoại và kiểm tra danh sách &quot;Đơn mua của tôi&quot; trước khi gửi lại; hệ thống không tự gửi lại để tránh trùng đơn.</p>
          <div className={s.footer}><Button className="w-auto" onClick={onClose}>Đóng và kiểm tra danh sách</Button></div>
        </>
      ) : (
        <form className={s.form} onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <Select label="Sản phẩm *" required value={values.productId} disabled={mutation.pending || catalog.loading} onChange={(event) => setValues({ ...values, productId: event.target.value })}>
            <option value="">{catalog.loading ? "Đang tải sản phẩm..." : "Chọn sản phẩm"}</option>
            {choices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          {!catalog.loading && !catalog.error && !choices.length && <p className={s.hint}>Hiện chưa có sản phẩm nào nhận yêu cầu mua.</p>}
          <CageQuantityField label="Số lượng cần mua *" required placeholder="Ví dụ 12" kgPerCage={kgPerCage} value={values.quantity} disabled={mutation.pending} onChange={(quantity) => setValues({ ...values, quantity })} />
          <Field label="Ngày lấy hàng *" type="date" required min={businessToday()} value={values.pickupDate} disabled={mutation.pending} onChange={(event) => setValues({ ...values, pickupDate: event.target.value })} />
          <Note label="Ghi chú" maxLength={MAX_TEXT_LENGTH} value={values.note} disabled={mutation.pending} onChange={(event) => setValues({ ...values, note: event.target.value })} />
          <p className={s.hint}>Yêu cầu chỉ là một thông báo: không có giá và không giữ hàng cho bạn. Hợp tác xã sẽ phản hồi lại.</p>
          <div className={s.footer}>
            <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={onClose}>Hủy</Button>
            <Button className="w-auto" type="submit" isPending={mutation.pending} pendingLabel="Đang gửi..." disabled={catalog.loading}>Gửi yêu cầu</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
