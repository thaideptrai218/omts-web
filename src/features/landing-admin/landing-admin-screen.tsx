"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useOptionalToast } from "@/components/ui/toast-provider";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import type { LandingSectionName, LandingSettings } from "./contracts";
import { LandingPhotoSection } from "./landing-photo-section";
import { landingRequest } from "./repository";

const SECTIONS: readonly { section: LandingSectionName; title: string; hint: string; captionLabel?: string }[] = [
  { section: "Background", title: "Ảnh nền đầu trang", hint: "Một ảnh ngang, chụp vùng nuôi. Thêm ảnh mới sẽ thay ảnh đang dùng." },
  { section: "Gallery", title: "Hình ảnh vùng nuôi", hint: "Tối đa 12 ảnh. Từ 3 ảnh trở lên, ảnh đầu tiên được hiện lớn.", captionLabel: "Chú thích" },
  { section: "Press", title: "Báo chí và truyền hình", hint: "Tối đa 8 ảnh bài báo hoặc bản tin nói về hợp tác xã.", captionLabel: "Chú thích (tên đài, tên báo)" },
];

/** Cài đặt, Trang giới thiệu: chủ hợp tác xã đổi ảnh và chọn hóa đơn làm mẫu truy xuất. */
export function LandingAdminScreen() {
  const [settings, setSettings] = useState<LandingSettings>();
  const [failed, setFailed] = useState(false);
  const [code, setCode] = useState("");
  const mutation = useMutation(), toast = useOptionalToast();

  const apply = (value: LandingSettings) => { setSettings(value); setCode(value.featuredInvoiceCode ?? ""); };
  const load = async () => {
    setFailed(false);
    const result = await landingRequest("get");
    if (result.status === "success") apply(result.data); else setFailed(true);
  };
  useEffect(() => {
    let alive = true;
    void landingRequest("get").then((result) => { if (!alive) return; if (result.status === "success") apply(result.data); else setFailed(true); });
    return () => { alive = false; };
  }, []);

  const change = async (action: "add" | "remove" | "example", input: unknown, done: string, photo?: File) => {
    const value = await mutation.run(() => landingRequest(action, input, photo));
    if (!value) return false;
    apply(value);
    toast?.notify({ tone: "success", title: done });
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Trang giới thiệu</h1>
        <Link href="/" target="_blank" className="text-sm font-semibold text-primary underline underline-offset-4">Xem trang giới thiệu</Link>
      </div>
      <p className="text-sm text-text-muted">Ảnh và hóa đơn chọn ở đây hiện công khai, ai cũng xem được. Phần giới thiệu sản phẩm lấy từ Sản phẩm (mô tả, ảnh), giấy chứng nhận lấy từ Chứng nhận hợp tác xã.</p>
      {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
      {mutation.blocked ? <Button className="w-auto" variant="secondary" onClick={() => { mutation.reviewed(); void load(); }}>Tải lại dữ liệu</Button> : null}
      {failed ? <div className="space-y-2"><ErrorNotice error="Chưa tải được thiết lập trang giới thiệu." /><Button className="w-auto" variant="secondary" onClick={() => void load()}>Thử lại</Button></div> : null}
      {!settings && !failed ? <p role="status" className="text-sm text-text-muted">Đang tải…</p> : null}
      {settings ? (
        <>
          <form
            className="space-y-3 rounded-card border border-border bg-surface p-4 sm:p-6" aria-label="Hóa đơn làm mẫu truy xuất"
            onSubmit={(event) => { event.preventDefault(); void change("example", { invoiceCode: code.trim() }, code.trim() ? "Đã chọn hóa đơn mẫu." : "Đã bỏ hóa đơn mẫu."); }}
          >
            <h2 className="text-lg font-semibold">Lô hàu thật cho khách xem</h2>
            <p className="text-sm text-text-muted">Nhập mã một hóa đơn đã công bố nguồn gốc. Khách bấm vào thẻ ở đầu trang sẽ xem được trang truy xuất của hóa đơn đó (không có giá, số lượng, người mua). Để trống thì hiện thẻ minh họa.</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-sm font-medium">
                Mã hóa đơn
                <input className="min-h-11 w-60 max-w-full rounded-control border border-border-strong bg-surface px-3 text-base uppercase" maxLength={30} placeholder="HD000001" value={code} onChange={(event) => setCode(event.target.value)} />
              </label>
              <Button className="w-auto" type="submit" disabled={mutation.pending || mutation.blocked}>Lưu</Button>
            </div>
          </form>
          {SECTIONS.map((item) => (
            <LandingPhotoSection
              key={item.section} {...item} pending={mutation.pending || mutation.blocked}
              photos={settings.photos.filter((photo) => photo.section === item.section)}
              onAdd={(caption, file) => change("add", { section: item.section, ...(caption ? { caption } : {}) }, "Đã thêm ảnh.", file)}
              onRemove={(id) => void change("remove", { id }, "Đã xóa ảnh.")}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}
