"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Field, useMutation } from "@/features/operations/ui";
import type { VerificationView } from "@/features/verification-api/contracts";
import { createVerificationRepository } from "@/features/verification-api/repository";
import { VerificationPanel, verificationError } from "@/features/verification-api/verification-panel";
import { subjectLabel } from "@/shared/presentation/actor-label";
import { updateProfileRequestSchema, type ProfileViewDto } from "./contracts";
import { NotificationApiDialog } from "./notification-dialog";
import {
  ProfileContactsSection,
  ProfileGrantsSection,
  type ContactDialogRequest,
} from "./profile-contact-and-grant-sections";
import { contactFailureMessage, contactSavedNotice, retryableContactCodes } from "./profile-contact-messages";
import styles from "./profile-layout.module.css";
import { BlockedProfileReview, ContactReviewPanel } from "./profile-review-panels";
import { createPersonalRepository } from "./repository";

/**
 * Personal profile editor. The display name is saved directly; a new email/phone is verified first
 * (VerificationPanel) and only committed by "Lưu thay đổi", together with any name change.
 */
export function PersonalApiEditor({
  initial,
  onShowNotifications,
  onShowSecurity,
}: {
  initial: ProfileViewDto;
  onShowNotifications?(): void;
  onShowSecurity?(): void;
}) {
  const repository = useMemo(() => createPersonalRepository(), []);
  const mutation = useMutation();
  const [record, setRecord] = useState(initial);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [fieldError, setFieldError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [latest, setLatest] = useState<ProfileViewDto>();
  const [discard, setDiscard] = useState(false);
  const [notifications, setNotifications] = useState(false);
  // Verified (or failed) contact change waiting for "Lưu thay đổi".
  const [contactFlow, setContactFlow] = useState<VerificationView>();
  const [contactDialog, setContactDialog] = useState<ContactDialogRequest>();
  const [contactBusy, setContactBusy] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string>();
  // The contact save result is unknown; saving stays disabled until the profile is reloaded and compared.
  const [contactUncertain, setContactUncertain] = useState(false);
  // The contact was saved but no profile came back; reload before editing again.
  const [profileRefreshRequired, setProfileRefreshRequired] = useState(false);
  // Synchronous guard against overlapping save/discard runs.
  const saveLock = useRef(false);
  // False after unmount, so late async results are ignored.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const input = useRef<HTMLInputElement>(null);
  const nameDirty = displayName !== record.displayName;
  const dirty = nameDirty || !!contactFlow;
  const pending = mutation.pending || contactSaving || contactBusy;

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  /** Accepts a reviewed server profile, optionally keeping the display name being typed. */
  function adopt(next: ProfileViewDto, preserve: boolean) {
    setRecord(next);
    if (!preserve) setDisplayName(next.displayName);
    setLatest(undefined);
    setFieldError(undefined);
    setNotice(undefined);
    mutation.reviewed();
  }

  /** Saves the name (if changed), then completes the verified contact change (if any). */
  async function saveChanges() {
    if (
      saveLock.current ||
      pending ||
      mutation.busy() ||
      mutation.blocked ||
      contactUncertain ||
      profileRefreshRequired ||
      !dirty
    )
      return;
    if (contactFlow && (contactFlow.phase !== "verified" || Date.parse(contactFlow.expiresAt) <= Date.now())) {
      setContactError("Liên hệ cần được xác minh lại trước khi lưu. Bản nháp vẫn được giữ.");
      return;
    }
    const values = updateProfileRequestSchema.safeParse({
      displayName: displayName.trim(),
      rowVersion: record.rowVersion,
    });
    if (!values.success) {
      setFieldError("Tên hiển thị là bắt buộc, tối đa 200 ký tự.");
      input.current?.focus();
      return;
    }
    setFieldError(undefined);
    setNotice(undefined);
    setContactError(undefined);
    saveLock.current = true;
    let nameSaved = false;
    try {
      if (nameDirty) {
        const next = await mutation.run(() => repository.saveProfile(values.data.displayName, values.data.rowVersion));
        if (!next || !alive.current) return;
        setRecord(next);
        setDisplayName(next.displayName);
        nameSaved = true;
        setNotice("Đã lưu tên hiển thị.");
      }
      if (contactFlow && alive.current) {
        setContactSaving(true);
        const result = await createVerificationRepository().execute({
          op: "complete",
          purpose: "contact",
          id: contactFlow.id,
        });
        if (!alive.current) return;
        if (result.status === "completed") {
          setContactFlow(undefined);
          if (result.profile) setRecord(result.profile);
          else setProfileRefreshRequired(true);
          setNotice(contactSavedNotice(nameSaved, result));
        } else {
          setContactError(contactFailureMessage(nameSaved, result));
          if (result.uncertain) setContactUncertain(true);
          else if (!retryableContactCodes.includes(result.code ?? ""))
            setContactFlow({ ...contactFlow, phase: "failed" });
        }
      }
    } finally {
      saveLock.current = false;
      if (alive.current) setContactSaving(false);
    }
  }

  /** Cancels a pending contact verification (expired ones may fail to cancel) and restores the saved name. */
  async function discardChanges() {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      if (contactFlow) {
        setContactSaving(true);
        const result = await createVerificationRepository().execute({
          op: "cancel",
          purpose: "contact",
          id: contactFlow.id,
        });
        if (!alive.current) return;
        if (result.status !== "cancelled" && !(Date.parse(contactFlow.expiresAt) <= Date.now() && !result.uncertain)) {
          setContactError(verificationError(result));
          return;
        }
      }
      setContactFlow(undefined);
      setDisplayName(record.displayName);
      setFieldError(undefined);
      setDiscard(false);
      setContactError(undefined);
      setNotice(undefined);
    } finally {
      saveLock.current = false;
      if (alive.current) setContactSaving(false);
    }
  }

  return (
    <div className={styles.profile}>
      <ErrorNotice error={mutation.error || contactError} />
      {notice && (
        <p role="status" className="rounded-control bg-primary-soft p-3">
          {notice}
        </p>
      )}
      <section className={styles.readOnly} aria-label="Thông tin tài khoản">
        <h2 className="mb-4 text-base font-semibold">Thông tin chỉ xem</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-muted">Tên đăng nhập</dt>
            <dd className="mt-1 break-words font-semibold">{record.username}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Loại tài khoản</dt>
            <dd className="mt-1">{subjectLabel(record.subjectType)}</dd>
          </div>
        </dl>
      </section>
      <form
        noValidate
        className={`${styles.edit} space-y-4`}
        onSubmit={async (event) => {
          event.preventDefault();
          await saveChanges();
        }}
      >
        <Field
          ref={input}
          label="Tên hiển thị"
          required
          autoComplete="name"
          disabled={pending || profileRefreshRequired}
          value={displayName}
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? "personal-name-error" : undefined}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        {fieldError && (
          <p className="text-sm text-danger" id="personal-name-error">
            {fieldError}
          </p>
        )}
        {contactFlow && (
          <p className="break-words rounded-control border border-border p-3">
            {contactFlow.channel === "Email" ? "Email" : "Số điện thoại"}: {contactFlow.maskedTarget} ·{" "}
            {contactFlow.phase === "verified" ? "Đã xác minh, chờ Lưu thay đổi" : "Cần xác minh lại, bản nháp được giữ"}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            className="w-auto"
            isPending={pending}
            disabled={
              !dirty ||
              mutation.blocked ||
              contactUncertain ||
              profileRefreshRequired ||
              (!!contactFlow && contactFlow.phase !== "verified")
            }
          >
            Lưu thay đổi
          </Button>
          <Button className="w-auto" variant="secondary" disabled={pending || !dirty} onClick={() => setDiscard(true)}>
            Hủy thay đổi
          </Button>
        </div>
      </form>
      <ProfileContactsSection
        record={record}
        disabled={pending || contactUncertain || profileRefreshRequired}
        onRequestContact={setContactDialog}
      />
      <ProfileGrantsSection record={record} />
      <div className={styles.actions}>
        {onShowSecurity ? (
          <Button className="w-auto" variant="secondary" onClick={onShowSecurity}>
            Đổi mật khẩu
          </Button>
        ) : (
          <Link
            className="rounded-control border border-border px-4 py-3 font-semibold text-primary"
            href="/account/security"
          >
            Đổi mật khẩu
          </Link>
        )}
        <Button
          className="w-auto"
          variant="secondary"
          disabled={pending}
          onClick={() => (onShowNotifications ? onShowNotifications() : setNotifications(true))}
        >
          Tùy chọn thông báo
        </Button>
      </div>
      {(contactUncertain || profileRefreshRequired) && (
        <ContactReviewPanel
          latest={latest}
          disabled={pending}
          canAcceptLatest={!contactUncertain}
          onLoad={async () => {
            const next = await mutation.run(() => repository.profile(), true);
            if (next && alive.current) setLatest(next);
          }}
          onAcceptLatest={(reviewed) => {
            setRecord(reviewed);
            setLatest(undefined);
            setProfileRefreshRequired(false);
          }}
        />
      )}
      {mutation.blocked && (
        <BlockedProfileReview
          latest={latest}
          pending={mutation.pending}
          uncertain={mutation.uncertain}
          onLoad={async () => {
            const next = await mutation.run(() => repository.profile(), true);
            if (next) setLatest(next);
          }}
          onAdopt={adopt}
        />
      )}
      {discard && (
        <Dialog
          open
          title="Bỏ thay đổi hồ sơ?"
          dismissible={!pending}
          onOpenChange={(open) => {
            if (!open && !pending) setDiscard(false);
          }}
        >
          <p>Tên hiển thị và liên hệ chưa lưu sẽ bị bỏ. Thông tin đã lưu trên hệ thống được giữ.</p>
          <ErrorNotice error={contactError} />
          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="w-auto" isPending={contactSaving} disabled={pending} onClick={discardChanges}>
              Bỏ thay đổi
            </Button>
            <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => setDiscard(false)}>
              Tiếp tục sửa
            </Button>
          </div>
        </Dialog>
      )}
      {contactDialog && (
        <Dialog
          open
          title="Xác minh liên hệ"
          dismissible={!contactBusy}
          onOpenChange={(open) => {
            if (!open && !contactBusy) setContactDialog(undefined);
          }}
        >
          <VerificationPanel
            purpose="contact"
            initialContact={contactDialog}
            onBusyChange={setContactBusy}
            onClose={() => setContactDialog(undefined)}
            onReady={(flow) => {
              setContactFlow(flow);
              setContactDialog(undefined);
              setContactError(undefined);
              setNotice("Liên hệ đã xác minh, chờ Lưu thay đổi.");
            }}
          />
        </Dialog>
      )}
      {notifications && <NotificationApiDialog onClose={() => setNotifications(false)} />}
    </div>
  );
}
