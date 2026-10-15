"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { VerificationDialog } from "@/features/verification/components/verification-dialog";
import type {
  StartVerificationInput,
  VerificationChallenge,
  VerificationPurpose,
} from "@/features/verification/domain/verification-types";
import { createMockVerificationRepository } from "@/features/verification/repositories/mock-verification-repository";
import { createVerificationService } from "@/features/verification/services/verification-service";

type ShowcaseContext = Readonly<{
  description: string;
  label: string;
  purpose: VerificationPurpose;
  recipient: StartVerificationInput["recipient"];
  useCase: "UC01" | "UC02" | "UC03" | "UC05";
}>;

const showcaseContexts: readonly ShowcaseContext[] = [
  {
    description: "Xác minh email trước khi tạo tài khoản Trader.",
    label: "Đăng ký bằng email",
    purpose: "registration",
    recipient: {
      channel: "email",
      maskedValue: "du***@example.com",
      value: "duythai@example.com",
    },
    useCase: "UC01",
  },
  {
    description: "Gate bắt buộc trước khi mở các chức năng sau đăng nhập.",
    label: "Xác minh sau đăng nhập",
    purpose: "phone-after-login",
    recipient: {
      channel: "sms",
      maskedValue: "091 *** 218",
      value: "0912345218",
    },
    useCase: "UC02",
  },
  {
    description: "Màn gọi vẫn chịu trách nhiệm giữ phản hồi MSG15 ở bước bắt đầu.",
    label: "Khôi phục tài khoản",
    purpose: "recovery",
    recipient: {
      channel: "email",
      maskedValue: "du***@example.com",
      value: "duythai@example.com",
    },
    useCase: "UC03",
  },
  {
    description: "Email cũ chỉ được thay sau khi token xác minh hợp lệ.",
    label: "Đổi email",
    purpose: "email-change",
    recipient: {
      channel: "email",
      maskedValue: "mo***@example.com",
      value: "moi@example.com",
    },
    useCase: "UC05",
  },
];

export function VerificationShowcase() {
  const service = useMemo(
    () => createVerificationService(createMockVerificationRepository()),
    [],
  );
  const [challenge, setChallenge] = useState<VerificationChallenge>();
  const [isStarting, setIsStarting] = useState(false);
  const [open, setOpen] = useState(false);
  const [verifiedUseCase, setVerifiedUseCase] = useState<ShowcaseContext["useCase"]>();

  async function openContext(context: ShowcaseContext) {
    setIsStarting(true);
    setVerifiedUseCase(undefined);
    const result = await service.start({
      purpose: context.purpose,
      recipient: context.recipient,
    });
    setIsStarting(false);

    if (result.status === "started") {
      setChallenge(result.challenge);
      setOpen(true);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-4 py-10 sm:p-8">
      <div className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Development showcase
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-text sm:text-3xl">
          SCR-02 · Xác minh dùng chung
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-text-muted">
          Chọn một use case để kiểm tra cùng component với purpose và người nhận khác nhau.
          Mã mock lần lượt là <code>123456</code>, <code>654321</code> và <code>112233</code>
          sau mỗi lần gửi.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {showcaseContexts.map((context) => (
            <button
              className="min-h-32 rounded-card border border-border bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card focus-visible:border-primary motion-reduce:transform-none"
              disabled={isStarting}
              key={context.useCase}
              onClick={() => openContext(context)}
              type="button"
            >
              <span className="text-sm font-semibold text-primary">{context.useCase}</span>
              <span className="mt-1 block text-lg font-semibold text-text">{context.label}</span>
              <span className="mt-2 block text-sm leading-6 text-text-muted">
                {context.description}
              </span>
            </button>
          ))}
        </div>

        {isStarting && <p className="mt-5 text-sm text-text-muted">Đang tạo yêu cầu xác minh...</p>}
        {verifiedUseCase && (
          <div
            className="mt-5 rounded-control border border-success/30 bg-success/10 p-4 text-success"
            role="status"
          >
            {verifiedUseCase} đã nhận bằng chứng xác minh. Token không được hiển thị hoặc lưu lại.
          </div>
        )}

        <div className="mt-7 border-t border-border pt-5">
          <Button className="sm:w-auto" onClick={() => history.back()} variant="secondary">
            Quay lại
          </Button>
        </div>
      </div>

      {challenge && (
        <VerificationDialog
          challenge={challenge}
          deliveryFailureMessage={
            challenge.purpose === "recovery" ? { code: "MSG15" } : undefined
          }
          onChallengeChange={setChallenge}
          onOpenChange={setOpen}
          onVerified={() => {
            const context = showcaseContexts.find(
              (item) => item.purpose === challenge.purpose,
            );
            setVerifiedUseCase(context?.useCase);
            setOpen(false);
          }}
          open={open}
          service={service}
        />
      )}
    </div>
  );
}
