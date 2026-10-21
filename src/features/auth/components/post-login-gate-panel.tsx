"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { PostLoginGate } from "@/features/auth/domain/auth-types";
import { formatMessage } from "@/shared/messages/message-catalog";

type PostLoginGatePanelProps = Readonly<{
  gate: PostLoginGate;
  onUseAnotherAccount(): void;
}>;

function getGateContent(gate: PostLoginGate) {
  if (gate.status === "staff-onboarding-required") {
    if (gate.nextStep === "verify-contact") {
      const availableChannels = gate.availableContactChannels
        .map((channel) => (channel === "email" ? "email" : "số điện thoại"))
        .join(" hoặc ");

      return {
        description: `Mật khẩu mới đã được lưu. Tiếp theo, hãy xác minh ${availableChannels} mà Chủ hợp tác xã đã khai báo.`,
        title: "Xác minh thông tin liên hệ",
      };
    }

    return {
      description:
        "Mật khẩu tạm thời đã được chấp nhận. Bạn cần đặt mật khẩu mới trước khi xác minh thông tin liên hệ.",
      title: "Đổi mật khẩu tạm thời",
    };
  }

  return {
    description: formatMessage(gate.message),
    title: "Xác minh số điện thoại",
  };
}

export function PostLoginGatePanel({
  gate,
  onUseAnotherAccount,
}: PostLoginGatePanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const content = getGateContent(gate);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby="post-login-gate-title"
      className="mt-7 rounded-card border border-primary/20 bg-primary-soft/50 p-5 sm:p-6"
    >
      <div
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full bg-primary text-white shadow-sm"
      >
        <svg
          className="size-6"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 3 5.5 5.5v5.9c0 4.2 2.6 7.9 6.5 9.6 3.9-1.7 6.5-5.4 6.5-9.6V5.5L12 3Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="m9.3 12.1 1.8 1.8 3.8-4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </div>

      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-primary">
        Bước bảo mật bắt buộc
      </p>
      <h2
        className="mt-2 text-2xl font-semibold tracking-tight text-text outline-none"
        id="post-login-gate-title"
        ref={titleRef}
        tabIndex={-1}
      >
        {content.title}
      </h2>
      <p className="mt-3 text-base leading-7 text-text-muted">
        {content.description}
      </p>

      <div className="mt-5 rounded-control border border-border bg-surface p-4">
        <p className="font-semibold text-text">Trạng thái truy cập</p>
        <ul className="mt-2 space-y-2 text-sm leading-6 text-text-muted">
          <li>Thông tin đăng nhập đã được chấp nhận.</li>
          <li>Các chức năng nghiệp vụ vẫn được khóa cho tới khi hoàn tất bước này.</li>
        </ul>
      </div>

      <Button
        className="mt-5"
        onClick={onUseAnotherAccount}
        variant="secondary"
      >
        Đăng nhập bằng tài khoản khác
      </Button>
    </section>
  );
}
