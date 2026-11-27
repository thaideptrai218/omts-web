import type { ReactNode } from "react";
import type { OriginCopy } from "./origin-copy";
import { AlertIcon, QrIcon } from "./origin-icons";
import { OriginPageShell } from "./origin-page-shell";
import { encodeQrMatrix } from "@/features/sales-invoices/qr-code-matrix";
import { qrSvgPath } from "@/features/sales-invoices/qr-code-image";
import site from "@/features/public-site/public-site.module.css";
import s from "./origin-base.module.css";

export type OriginProblem = "invalid-token" | "not-found" | "rate-limited" | "unavailable";

type Props = { problem: OriginProblem; copy: OriginCopy; retryHref?: string; backendMessage?: string | null; pageUrl?: string | null; children?: ReactNode };

function textOf(problem: OriginProblem, copy: OriginCopy, backendMessage?: string | null) {
  switch (problem) {
    case "invalid-token": return { title: copy.invalidTitle, body: copy.invalidBody, retry: false };
    case "not-found": return { title: copy.notFoundTitle, body: backendMessage ?? copy.notFoundBody, retry: false };
    case "rate-limited": return { title: copy.rateTitle, body: copy.rateBody, retry: true };
    default: return { title: copy.downTitle, body: copy.downBody, retry: true };
  }
}

/** Trạng thái lỗi toàn trang: mã không hợp lệ, không tìm thấy, quá tải, backend không sẵn sàng. */
/** Mã QR của chính trang này (SVG nội tuyến, không JS): khi mạng hiện tại bị chặn vì mở quá nhiều (MSG-ORIGIN-05), người mua quét bằng điện thoại để mở bằng mạng khác. */
function PhoneQr({ url, copy }: { url: string; copy: OriginCopy }) {
  const matrix = encodeQrMatrix(url);
  if (!matrix) return null;
  const size = matrix.length + 8;
  return (
    <details className={s.phoneQr}>
      <summary className={site.button}>{copy.phoneQrAction}</summary>
      <svg role="img" aria-label={copy.phoneQrLabel} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" width={220} height={220} xmlns="http://www.w3.org/2000/svg">
        <rect width={size} height={size} fill="#fff" /><path d={qrSvgPath(matrix)} fill="#000" />
      </svg>
      <p className={s.stateBody}>{copy.phoneQrHint}</p>
    </details>
  );
}

export function OriginStatePanel({ problem, copy, retryHref, backendMessage, pageUrl }: Props) {
  const text = textOf(problem, copy, backendMessage);
  const Icon = problem === "invalid-token" || problem === "not-found" ? QrIcon : AlertIcon;
  return (
    <OriginPageShell copy={copy}>
      <section className={s.statePanel} aria-labelledby="origin-state-title">
        <span className={s.stateIcon}><Icon size={28} /></span>
        <h1 id="origin-state-title" className={s.stateTitle}>{text.title}</h1>
        <p className={s.stateBody} role={text.retry ? "alert" : undefined}>{text.body}</p>
        {text.retry && retryHref ? <a className={site.button} href={retryHref}>{copy.retry}</a> : null}
        {problem === "rate-limited" && pageUrl ? <PhoneQr url={pageUrl} copy={copy} /> : null}
      </section>
    </OriginPageShell>
  );
}
