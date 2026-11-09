import type { ReactNode } from "react";
import type { OriginCopy } from "./origin-copy";
import { AlertIcon, QrIcon } from "./origin-icons";
import { OriginPageShell } from "./origin-page-shell";
import type { OriginLanguage } from "@/server/public/origin-qr-token";
import s from "./origin-base.module.css";

export type OriginProblem = "invalid-token" | "not-found" | "rate-limited" | "unavailable";

type Props = { problem: OriginProblem; language: OriginLanguage; copy: OriginCopy; retryHref?: string; backendMessage?: string | null; children?: ReactNode };

function textOf(problem: OriginProblem, copy: OriginCopy, backendMessage?: string | null) {
  switch (problem) {
    case "invalid-token": return { title: copy.invalidTitle, body: copy.invalidBody, retry: false };
    case "not-found": return { title: copy.notFoundTitle, body: backendMessage ?? copy.notFoundBody, retry: false };
    case "rate-limited": return { title: copy.rateTitle, body: copy.rateBody, retry: true };
    default: return { title: copy.downTitle, body: copy.downBody, retry: true };
  }
}

/** Trạng thái lỗi toàn trang: mã không hợp lệ, không tìm thấy, quá tải, backend không sẵn sàng. */
export function OriginStatePanel({ problem, language, copy, retryHref, backendMessage }: Props) {
  const text = textOf(problem, copy, backendMessage);
  const Icon = problem === "invalid-token" || problem === "not-found" ? QrIcon : AlertIcon;
  return (
    <OriginPageShell language={language} copy={copy} langHrefs={null}>
      <section className={s.statePanel} aria-labelledby="origin-state-title">
        <span className={s.stateIcon}><Icon size={28} /></span>
        <h1 id="origin-state-title" className={s.stateTitle}>{text.title}</h1>
        <p className={s.stateBody} role={text.retry ? "alert" : undefined}>{text.body}</p>
        {text.retry && retryHref ? <a className={s.retry} href={retryHref}>{copy.retry}</a> : null}
      </section>
    </OriginPageShell>
  );
}
