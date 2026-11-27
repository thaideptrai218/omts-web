import type { ReactNode } from "react";
import { JourneyIcon, type JourneyIconName } from "./journey-icons";
import s from "./journey-line.module.css";

export type JourneyStep = {
  key: string;
  icon: JourneyIconName;
  title: string;
  /** Nhãn ngày trong hành trình, ví dụ "Ngày 31". */
  badge?: string;
  date?: { iso: string; text: string };
  detail?: ReactNode;
};

/**
 * Đường hành trình của lô hàu, cuộn tới đâu đường nối và mốc sáng tới đó (chỉ bằng CSS; trình duyệt không hỗ trợ thì
 * hiện đủ ngay). Trang giới thiệu kể các chặng, trang truy xuất điền ngày thật vào đúng đường này.
 */
export function JourneyLine({ steps, label }: { steps: readonly JourneyStep[]; label: string }) {
  return (
    <ol className={s.line} aria-label={label}>
      {steps.map((step) => (
        <li key={step.key} className={s.step}>
          <span className={s.mark}><JourneyIcon name={step.icon} /></span>
          <div className={s.body}>
            <div className={s.head}>
              <strong className={s.title}>{step.title}</strong>
              {step.badge ? <span className={s.badge}>{step.badge}</span> : null}
            </div>
            {step.date ? <time className={s.date} dateTime={step.date.iso}>{step.date.text}</time> : null}
            {step.detail ? <span className={s.detail}>{step.detail}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
