import { BrandMark } from "@/components/brand/brand-mark";

// Khung tải: giữ bố cục để trang không nhảy khi dữ liệu về. Không dùng hiệu ứng chuyển động.
export default function OriginLoading() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: "100vh", background: "#eef6f4", color: "#0c2b33" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #d5e4e1", padding: "0.75rem 1rem" }}><BrandMark compact /></div>
      <div style={{ background: "#fff", padding: "2rem 1rem" }}>
        <p style={{ margin: 0, color: "#4a626a" }}>Đang tải thông tin nguồn gốc</p>
      </div>
      <div style={{ margin: "2rem auto 0", width: "min(100% - 2rem, 70rem)", height: "9rem", background: "#fff", border: "1px solid #d5e4e1", borderRadius: "1rem" }} aria-hidden="true" />
    </div>
  );
}
