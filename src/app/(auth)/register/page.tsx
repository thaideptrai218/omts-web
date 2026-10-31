import { Suspense } from "react";
import { connection } from "next/server";
import { getSessionGateway } from "@/server/auth/session-gateway.instance";
import { PublicVerificationEntry } from "@/features/verification-api/public-entry";
import { SessionServiceState } from "@/features/auth/components/session-service-state";
export const metadata = { title: "Đăng ký thương lái | OMTS" };
async function Content() { await connection(); return getSessionGateway().mode === "api" ? <PublicVerificationEntry purpose="registration" /> : <SessionServiceState title="Vui lòng đăng ký từ trang đăng nhập" />; }
export default function Page() { return <Suspense fallback={<p role="status">Đang tải đăng ký...</p>}><Content /></Suspense>; }
