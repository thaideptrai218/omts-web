"use client";

import Image from "next/image";
import { useEffect, useId, useState, type ChangeEvent, type DragEvent } from "react";

type EvidenceImagePickerProps = Readonly<{
  disabled?: boolean;
  error?: string;
  files: readonly File[];
  onFilesChange(files: readonly File[]): void;
  validateFile(file: File): string | undefined;
}>;

function fileFingerprint(file: File): string {
  return [file.name, file.size, file.lastModified, file.type].join(":");
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function EvidenceImagePreview({ file }: { file: File }) {
  const [previewUrl] = useState(() => URL.createObjectURL(file));

  useEffect(
    () => () => {
      URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  return (
    <Image
      alt={`Bản xem trước ${file.name}`}
      className="size-20 shrink-0 rounded-control border border-border object-cover"
      height={80}
      src={previewUrl}
      unoptimized
      width={80}
    />
  );
}

export function EvidenceImagePicker({
  disabled = false,
  error,
  files,
  onFilesChange,
  validateFile,
}: EvidenceImagePickerProps) {
  const descriptionId = useId();
  const errorId = useId();
  const [selectionErrors, setSelectionErrors] = useState<readonly string[]>([]);

  function addFiles(incomingFiles: readonly File[]) {
    const knownFiles = new Set(files.map(fileFingerprint));
    const acceptedFiles: File[] = [];
    const rejectedMessages: string[] = [];

    incomingFiles.forEach((file) => {
      const validationMessage = validateFile(file);
      if (validationMessage) {
        rejectedMessages.push(`${file.name}: ${validationMessage}`);
        return;
      }

      const fingerprint = fileFingerprint(file);
      if (knownFiles.has(fingerprint)) return;
      knownFiles.add(fingerprint);
      acceptedFiles.push(file);
    });

    setSelectionErrors(rejectedMessages);
    if (acceptedFiles.length > 0) onFilesChange([...files, ...acceptedFiles]);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled) return;
    addFiles(Array.from(event.dataTransfer.files));
  }

  const describedBy = [descriptionId, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-text">Ảnh giấy tờ xác minh</p>
        <p className="mt-1 text-sm leading-6 text-text-muted" id={descriptionId}>
          Chọn ảnh thể hiện căn cứ xác minh HTX và Chủ hợp tác xã đầu tiên.
        </p>
      </div>

      <div
        className={`rounded-card border-2 border-dashed p-5 text-center transition ${
          error
            ? "border-danger/60 bg-danger/5"
            : "border-border-strong bg-surface-subtle hover:border-primary"
        } ${disabled ? "opacity-60" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <svg
          aria-hidden="true"
          className="mx-auto size-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3.25A2.25 2.25 0 0 0 7.25 20h9.5A2.25 2.25 0 0 0 19 17.75V14.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
        <p className="mt-3 font-semibold text-text">Kéo ảnh vào đây</p>
        <p className="mt-1 text-sm text-text-muted">hoặc chọn từ thiết bị</p>
        <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-control border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:border-primary hover:bg-primary-soft focus-within:outline focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-focus-ring">
          Chọn ảnh
          <input
            accept="image/*"
            aria-describedby={describedBy}
            className="sr-only"
            disabled={disabled}
            multiple
            onChange={handleInputChange}
            type="file"
          />
        </label>
      </div>

      {error && (
        <p className="text-sm font-medium text-danger" id={errorId} role="alert">
          {error}
        </p>
      )}

      {selectionErrors.length > 0 && (
        <ul className="space-y-1 text-sm text-danger" role="alert">
          {selectionErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul aria-label="Ảnh giấy tờ đã chọn" className="space-y-3">
          {files.map((file, index) => (
            <li
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-3"
              key={`${fileFingerprint(file)}:${index}`}
            >
              <EvidenceImagePreview file={file} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{file.name}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                aria-label={`Xóa ảnh ${file.name}`}
                className="min-h-11 shrink-0 rounded-control px-3 text-sm font-semibold text-danger transition hover:bg-danger/10"
                disabled={disabled}
                onClick={() =>
                  onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))
                }
                type="button"
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
