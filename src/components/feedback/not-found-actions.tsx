"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const action = "inline-flex min-h-11 items-center justify-center rounded-control border px-4 py-2 text-[13px] font-medium transition-[background-color,border-color] duration-150 ease-out lg:min-h-0 lg:py-1";

/** Two ways out of a missing page: the overview, or the page the user came from. */
export function NotFoundActions() {
  const router = useRouter();
  return <div className="flex flex-wrap justify-center gap-3">
    <Link href="/dashboard" className={`${action} border-primary bg-primary text-white hover:border-primary-hover hover:bg-primary-hover`}>Về tổng quan</Link>
    <button type="button" className={`${action} border-border-strong/50 bg-surface text-text hover:border-primary/50 hover:bg-surface-subtle`} onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}>Quay lại</button>
  </div>;
}
