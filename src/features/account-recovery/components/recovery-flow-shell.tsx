"use client";

import { useEffect, useRef, type ReactNode } from "react";

import {
  getRecoveryStepIndex,
  recoverySteps,
  type RecoveryStep,
} from "@/features/account-recovery/domain/recovery-step";

type RecoveryFlowShellProps = Readonly<{
  activeStep: RecoveryStep;
  children: ReactNode;
  description: string;
  title: string;
}>;

export function RecoveryFlowShell({
  activeStep,
  children,
  description,
  title,
}: RecoveryFlowShellProps) {
  const activeIndex = getRecoveryStepIndex(activeStep);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [activeStep]);

  return (
    <section
      aria-labelledby="recovery-step-title"
      className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-8"
    >
      <nav aria-label="Tiến trình khôi phục tài khoản">
        <ol className="grid grid-cols-3 gap-2">
          {recoverySteps.map((step, index) => {
            const isActive = step.id === activeStep;
            const isComplete = index < activeIndex;

            return (
              <li className="min-w-0" key={step.id}>
                <div
                  aria-current={isActive ? "step" : undefined}
                  className={`border-t-4 pt-2 ${
                    isActive || isComplete
                      ? "border-primary text-primary"
                      : "border-border text-text-muted"
                  }`}
                >
                  <span className="block text-xs font-semibold sm:text-sm">
                    Bước {index + 1}
                  </span>
                  <span className="mt-0.5 block truncate text-xs sm:text-sm">
                    {step.label}
                  </span>
                  <span className="sr-only">
                    {isActive
                      ? " — bước hiện tại"
                      : isComplete
                        ? " — đã hoàn thành"
                        : " — chưa thực hiện"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-7 border-t border-border pt-6">
        <h1
          className="text-2xl font-semibold tracking-tight text-text outline-none sm:text-3xl"
          id="recovery-step-title"
          ref={headingRef}
          tabIndex={-1}
        >
          {title}
        </h1>
        <p className="mt-2 text-base leading-7 text-text-muted">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}
