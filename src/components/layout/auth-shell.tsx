import { BrandMark } from "@/components/brand/brand-mark";

type AuthShellProps = Readonly<{
  children: React.ReactNode;
}>;

const productBenefits = [
  "Theo dõi vùng nuôi và công việc tập trung",
  "Phân quyền theo vai trò và phạm vi vùng",
  "Truy xuất nguồn gốc minh bạch qua mã QR",
];

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="flex min-h-dvh flex-1 bg-canvas">
      <div className="mx-auto grid w-full max-w-[90rem] lg:grid-cols-[minmax(22rem,0.85fr)_minmax(30rem,1.15fr)]">
        <aside
          aria-label="Giới thiệu hệ thống OMTS"
          className="relative hidden overflow-hidden bg-primary px-10 py-12 text-white lg:flex lg:flex-col xl:px-16 xl:py-14"
        >
          <div
            aria-hidden="true"
            className="absolute -right-28 top-24 size-72 rounded-full border border-white/15"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-36 -left-28 size-96 rounded-full border border-white/10"
          />

          <div className="relative z-10 flex flex-1 flex-col motion-safe:animate-[omts-reveal-from-left_420ms_cubic-bezier(0.22,1,0.36,1)_both]">
            <BrandMark tone="inverse" />

            <div className="my-auto max-w-lg py-16">
              <p className="text-sm font-semibold text-sky-100">
                Hệ thống quản lý hợp tác xã
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
                Công việc rõ ràng, dữ liệu dễ kiểm soát.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-sky-50 xl:text-lg">
                OMTS giúp các thành viên làm đúng phần việc của mình mà không cần làm quen với giao diện phức tạp.
              </p>

              <ul className="mt-8 space-y-4" aria-label="Lợi ích chính">
                {productBenefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 text-sm leading-6 text-white"
                  >
                    <svg
                      aria-hidden="true"
                      className="mt-1 size-5 shrink-0 text-sky-100"
                      fill="none"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="m5 10 3 3 7-7"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-sm text-sky-100">
              Hợp tác xã Thủy sản Trung Nam
            </p>
          </div>

        </aside>

        <div className="flex min-w-0 flex-col px-4 py-5 sm:px-8 sm:py-8 lg:px-12 lg:py-10 xl:px-20">
          <header className="motion-safe:animate-[omts-reveal-from-bottom_420ms_cubic-bezier(0.22,1,0.36,1)_both] lg:hidden">
            <BrandMark />
          </header>

          <div className="flex flex-1 items-center justify-center py-8 sm:py-12">
            <div className="w-full max-w-[29rem] motion-safe:animate-[omts-reveal-from-bottom_420ms_cubic-bezier(0.22,1,0.36,1)_both] motion-safe:[animation-delay:80ms]">
              {children}
            </div>
          </div>

          <p className="text-center text-sm leading-6 text-text-muted">
            Hệ thống quản lý và truy xuất nguồn gốc hàu
          </p>
        </div>
      </div>
    </main>
  );
}
