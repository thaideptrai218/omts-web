"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RaftMutationResult, RaftProfile } from "../domain/raft";
import type { RaftService } from "../services/raft-service";

export function RaftPhoto({
  raft,
  service,
  canWrite,
  pending,
  run,
}: {
  raft: RaftProfile;
  service: RaftService;
  canWrite: boolean;
  pending: boolean;
  run(operation: () => Promise<RaftMutationResult>): Promise<void>;
}) {
  const [image, setImage] = useState<{ version: string; url: string }>();
  const [file, setFile] = useState<File>();
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!raft.photoFileName) return;
    let active = true;
    let url: string | undefined;
    void service
      .getPhoto(raft.id)
      .then((blob) => {
        if (!active) return;
        if (!blob) {
          setLoadError(true);
          return;
        }
        url = URL.createObjectURL(blob);
        setImage({ version: raft.recordVersion, url });
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [raft.id, raft.photoFileName, raft.recordVersion, retry, service]);
  return (
    <section
      className="mt-6 border-t border-border pt-5"
      aria-label="Ảnh bè nuôi"
    >
      <h3 className="text-lg font-semibold">Ảnh bè</h3>
      {image?.version === raft.recordVersion && (
        // Blob URLs are local, permission-checked files; Next image optimization does not handle them.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={`Ảnh bè ${raft.code}`}
          className="mt-3 max-h-72 w-full rounded-control object-contain bg-surface-subtle"
        />
      )}
      {!raft.photoFileName && (
        <p className="mt-2 text-sm text-text-muted">Chưa có ảnh bè.</p>
      )}
      {raft.photoFileName && (
        <p className="mt-2 break-all text-sm text-text-muted">
          {raft.photoFileName}
        </p>
      )}
      {loadError && (
        <div className="mt-2">
          <p role="alert" className="text-sm text-danger">
            Chưa mở được ảnh bè.
          </p>
          <Button
            variant="secondary"
            className="mt-2 sm:w-auto"
            onClick={() => setRetry((value) => value + 1)}
          >
            Tải lại ảnh
          </Button>
        </div>
      )}
      {canWrite && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold">
            {raft.photoFileName ? "Thay ảnh bè" : "Chọn ảnh bè"}
            <input
              type="file"
              accept="image/jpeg,image/png"
              disabled={pending}
              className="mt-2 block min-h-11 w-full min-w-0 text-sm file:mr-3 file:min-h-11 file:rounded-control file:border file:border-border file:bg-surface file:px-3 file:text-text"
              onChange={(event) => setFile(event.currentTarget.files?.[0])}
            />
          </label>
          <p className="text-sm text-text-muted">
            JPEG hoặc PNG, tối đa 10 MB. Ảnh được lưu riêng với thông tin bè.
          </p>
          {file && (
            <Button
              className="sm:w-auto"
              disabled={pending}
              onClick={() => {
                void run(() => service.savePhoto({ id: raft.id, file }));
              }}
            >
              Lưu ảnh
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
