"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import {
  ManagementHeading,
  ManagementSummary,
} from "@/components/ui/management-page";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/features/auth/state/auth-provider";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import type { ZoneMutationResult, ZoneWorkspace } from "../domain/farming-zone";
import { getFarmingZoneService } from "../services/farming-zone-service.instance";
import { ZoneDialog } from "./zone-dialog";
import { ZoneDirectory } from "./zone-directory";

export function FarmingZoneExperience() {
  const { state } = useAuth();
  if (state.status !== "authenticated") return null;
  if (!hasEffectivePermission(state.account.access, "farming.zones.view"))
    return <Denied />;
  return (
    <Workspace
      key={state.account.accountId}
      accountId={state.account.accountId}
      canViewRafts={hasEffectivePermission(
        state.account.access,
        "farming.rafts.view",
      )}
    />
  );
}
function Denied() {
  return (
    <section className="mx-auto max-w-lg rounded-card border border-border bg-surface p-6">
      <h1 className="text-xl font-semibold">Không có quyền xem vùng nuôi</h1>
      <p className="mt-3 text-text-muted">
        Bạn không có quyền thực hiện chức năng này. Vui lòng liên hệ Chủ hợp tác
        xã để kiểm tra phân công.
      </p>
    </section>
  );
}
function Workspace({
  accountId,
  canViewRafts,
}: {
  accountId: string;
  canViewRafts: boolean;
}) {
  const service = getFarmingZoneService(accountId);
  const { notify } = useToast();
  const [workspace, setWorkspace] = useState<ZoneWorkspace>();
  const [failure, setFailure] = useState<"forbidden" | "load">();
  const [reload, setReload] = useState(0);
  const [selection, setSelection] = useState<string>();
  useEffect(() => {
    let active = true;
    void service
      .load()
      .then((result) => {
        if (!active) return;
        if (result.status === "loaded") setWorkspace(result.workspace);
        else setFailure(result.status === "forbidden" ? "forbidden" : "load");
      })
      .catch(() => {
        if (active) setFailure("load");
      });
    return () => {
      active = false;
    };
  }, [service, reload]);
  function saved(result: Extract<ZoneMutationResult, { status: "saved" }>) {
    setWorkspace(result.workspace);
    if (selection === "new") setSelection(result.savedId);
    notify({
      title: "Đã lưu",
      description: "Hồ sơ vùng đã được cập nhật.",
      tone: "success",
    });
  }
  if (failure === "forbidden") return <Denied />;
  if (failure)
    return (
      <section className="rounded-card border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Chưa tải được vùng nuôi</h1>
        <p className="my-4">Hãy kiểm tra kết nối rồi thử lại.</p>
        <Button
          onClick={() => {
            setFailure(undefined);
            setReload((value) => value + 1);
          }}
        >
          Thử lại
        </Button>
      </section>
    );
  if (!workspace)
    return (
      <section
        aria-label="Đang tải vùng nuôi"
        aria-busy="true"
        className="space-y-5"
      >
        <div className="h-28 rounded-card bg-surface-subtle motion-safe:animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((id) => (
            <div
              key={id}
              className="h-64 rounded-card bg-surface-subtle motion-safe:animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  const selected = workspace.zones.find((zone) => zone.id === selection);
  return (
    <div className="space-y-6">
      <ManagementHeading
        title="Vùng nuôi"
        description={
          workspace.canWrite
            ? "Quản lý vị trí, diện tích, điểm đo nước và hồ sơ pháp lý của từng vùng."
            : "Theo dõi thông tin và giấy phép của các vùng được phân công."
        }
        icon="zone"
      >
        <Button
          variant="secondary"
          className="sm:w-auto"
          onClick={() => {
            setWorkspace(undefined);
            setReload((value) => value + 1);
          }}
        >
          <InterfaceIcon name="refresh" />
          Tải lại
        </Button>
        {workspace.canWrite && (
          <Button onClick={() => setSelection("new")} className="sm:w-auto">
            <InterfaceIcon name="add" />
            Thêm vùng nuôi
          </Button>
        )}
      </ManagementHeading>
      <ManagementSummary
        items={[
          {
            label: "Tổng số vùng",
            value: workspace.zones.length,
            icon: "zone",
          },
          {
            label: "Đang sử dụng",
            value: workspace.zones.filter((zone) => zone.status === "in-use")
              .length,
            icon: "waves",
          },
          {
            label: "Đã ngừng sử dụng",
            value: workspace.zones.filter(
              (zone) => zone.status === "discontinued",
            ).length,
            icon: "lock",
          },
        ]}
      />
      <ZoneDirectory workspace={workspace} onSelect={setSelection} />
      {(selection === "new" || selected) && (
        <ZoneDialog
          key={selection}
          zone={selected}
          workspace={workspace}
          canViewRafts={canViewRafts}
          service={service}
          onSaved={saved}
          onClose={() => setSelection(undefined)}
        />
      )}
    </div>
  );
}
