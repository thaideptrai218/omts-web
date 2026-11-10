import { BrandMark } from "@/components/brand/brand-mark";

// Khung tải: giữ bố cục để trang không nhảy khi dữ liệu về. Không dùng hiệu ứng chuyển động.
export default function OriginLoading() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: "100vh", background: "#f4f1ea", color: "#10243a" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #d9d4c6", padding: "0.75rem 1rem" }}><BrandMark compact /></div>
      <div style={{ background: "#04222a", padding: "2rem 1rem 4.5rem" }}>
        <p style={{ margin: 0, color: "#c3dddd" }}>Đang tải thông tin nguồn gốc</p>
      </div>
      <div style={{ margin: "-2.75rem auto 0", width: "min(100% - 2rem, 62rem)", height: "9rem", background: "#fff", border: "1px solid #d9d4c6", borderRadius: "1rem" }} aria-hidden="true" />
    </div>
  );
}
