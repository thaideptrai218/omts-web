import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập | OMTS",
};

export default function LoginPage() {
  return (
    <section
      aria-labelledby="login-title"
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <p className="text-sm font-semibold tracking-wide text-sky-700">OMTS</p>
      <h1 id="login-title" className="mt-2 text-2xl font-semibold text-zinc-950">
        Đăng nhập
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Khung xác thực đã sẵn sàng. Biểu mẫu đăng nhập sẽ được triển khai sau khi đối chiếu SRS và Figma.
      </p>
    </section>
  );
}
