"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useToast } from "@/components/ui/toast-provider";
import {
  ManagementHeading,
  ManagementSummary,
} from "@/components/ui/management-page";
import { useAuth } from "@/features/auth/state/auth-provider";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import type { RaftWorkspace, RaftMutationResult } from "../domain/raft";
import { getRaftService } from "../services/raft-service.instance";
import { RaftDirectory } from "./raft-directory";
import { RaftDialog } from "./raft-dialog";
import { RaftEditorDialog } from "./raft-editor-dialog";

export function RaftExperience() {
  const { state } = useAuth();
  if (state.status !== "authenticated") return null;
  if (!hasEffectivePermission(state.account.access, "farming.rafts.view"))
    return <RaftDenied />;
  return (
    <Workspace
      key={state.account.accountId}
      accountId={state.account.accountId}
    />
  );
}
export function RaftLoading() {
  return (
    <section
      aria-label="Đang tải bè nuôi"
      aria-busy="true"
      className="space-y-5"
    >
      <div className="h-28 rounded-card bg-surface-subtle motion-safe:animate-pulse" />
      <div className="h-28 rounded-card bg-surface-subtle motion-safe:animate-pulse" />
      <div className="h-64 rounded-card bg-surface-subtle motion-safe:animate-pulse" />
    </section>
  );
}
function RaftDenied() {
  return (
    <section className="mx-auto max-w-lg rounded-card border border-border bg-surface p-6">
      <h1 className="text-xl font-semibold">Không có quyền xem bè nuôi</h1>
      <p className="mt-3 leading-6 text-text-muted">
        Vui lòng liên hệ Chủ hợp tác xã để kiểm tra quyền và vùng được phân
        công.
      </p>
    </section>
  );
}
function Workspace({ accountId }: { accountId: string }) {
  const service = getRaftService(accountId);
  const [workspace, setWorkspace] = useState<RaftWorkspace>();
  const [error, setError] = useState<"forbidden" | "load">();
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [creating, setCreating] = useState(false);
  const { notify } = useToast();
  function saved(result: Extract<RaftMutationResult, { status: "saved" }>) {
    setWorkspace(result.workspace);
    setCreating(false);
    setSelected(result.savedId);
    notify({
      title: "Đã lưu",
      description: "Hồ sơ bè nuôi đã được cập nhật.",
      tone: "success",
    });
  }
  useEffect(() => {
    let active = true;
    void service
      .load()
      .then((result) => {
        if (!active) return;
        if (result.status === "loaded") setWorkspace(result.workspace);
        else setError("forbidden");
      })
      .catch(() => {
        if (active) setError("load");
      });
    return () => {
      active = false;
    };
  }, [service, retry]);
  function reload() {
    setWorkspace(undefined);
    setError(undefined);
    setSelected(undefined);
    setRetry((value) => value + 1);
  }
  if (error === "forbidden") return <RaftDenied />;
  if (error)
    return (
      <section className="rounded-card border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Chưa tải được bè nuôi</h1>
        <p className="my-4 text-text-muted">Kiểm tra kết nối rồi thử lại.</p>
        <Button className="sm:w-auto" onClick={reload}>
          Thử lại
        </Button>
      </section>
    );
  if (!workspace) return <RaftLoading />;
  const raft = workspace.rafts.find((raft) => raft.id === selected);
  return (
    <div className="space-y-6">
      <ManagementHeading
        title="Bè nuôi"
        description="Tra cứu bè theo vùng, xem sơ đồ làn và tình trạng từng đoạn theo ngày."
        icon="raft"
      >
        {workspace.canWrite && (
          <Button className="sm:w-auto" onClick={() => setCreating(true)}>
            <InterfaceIcon name="add" />
            Thêm bè nuôi
          </Button>
        )}
        <Button variant="secondary" className="sm:w-auto" onClick={reload}>
          <InterfaceIcon name="refresh" />
          Tải lại
        </Button>
      </ManagementHeading>
      <ManagementSummary
        items={[
          {
            label: "Bè trong phạm vi",
            value: workspace.rafts.length,
            icon: "raft",
          },
          {
            label: "Đang sử dụng",
            value: workspace.rafts.filter((raft) => raft.status === "in-use")
              .length,
            icon: "waves",
          },
          {
            label: "Có chu kỳ mở",
            value: workspace.rafts.filter((raft) =>
              raft.cycles.some((cycle) => !cycle.closedAt),
            ).length,
            icon: "calendar",
          },
        ]}
      />
      <RaftDirectory workspace={workspace} onSelect={setSelected} />
      {raft && (
        <RaftDialog
          key={raft.id}
          raft={raft}
          zoneName={
            workspace.zones.find((zone) => zone.id === raft.zoneId)?.label ??
            "Chưa có tên vùng"
          }
          service={service}
          workspace={workspace}
          onSaved={saved}
          onClose={() => setSelected(undefined)}
        />
      )}
      {creating && (
        <RaftEditorDialog
          zones={workspace.zones}
          service={service}
          onSaved={saved}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
