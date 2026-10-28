"use client";

import { useEffect, useRef, useState } from "react";
import { RestrictedAccessIcon } from "@/components/feedback/restricted-access-icon";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import {
  ManagementHeading,
  ManagementSummary,
} from "@/components/ui/management-page";
import { useToast } from "@/components/ui/toast-provider";
import { AccountFollowUpDialog } from "@/features/employee-management/components/account-follow-up-dialog";
import { EmployeeEditor } from "@/features/employee-management/components/employee-editor";
import { EmployeeList } from "@/features/employee-management/components/employee-list";
import { EmployeeManagementPageSkeleton } from "@/features/employee-management/components/employee-management-page-skeleton";
import type {
  AccountFollowUp,
  EmployeeManagementWorkspace,
  EmployeeProfile,
} from "@/features/employee-management/domain/employee-management";
import { employeeManagementService } from "@/features/employee-management/services/employee-management-service.instance";
import { updateEmployeeWorkspace } from "@/features/employee-management/state/update-employee-workspace";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import { useAuth } from "@/features/auth/state/auth-provider";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

function PermissionDenied() {
  return (
    <section className="mx-auto mt-10 max-w-lg rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-8">
      <div
        aria-hidden="true"
        className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft"
      >
        <RestrictedAccessIcon />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text">
        Không có quyền quản lý nhân viên
      </h1>
      <p className="mt-3 leading-7 text-text-muted">
        {formatMessage({ code: "MSG02" })}
      </p>
    </section>
  );
}

export function EmployeeManagementExperience() {
  const { state } = useAuth();
  if (state.status !== "authenticated") return null;
  if (!hasEffectivePermission(state.account.access, "cooperative.employees.manage")) {
    return <PermissionDenied />;
  }
  return <EmployeeWorkspace key={state.account.accountId} />;
}

function EmployeeWorkspace() {
  const { notify } = useToast();
  const [workspace, setWorkspace] = useState<EmployeeManagementWorkspace>();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>();
  const [isCreating, setIsCreating] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const mutatingRef = useRef(false);
  const [followUp, setFollowUp] = useState<AccountFollowUp>();
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const selectedEmployee = workspace?.employees.find(
    (employee) => employee.id === selectedEmployeeId,
  );
  function changePending(pending: boolean) {
    mutatingRef.current = pending;
    setIsMutating(pending);
  }

  function loadWorkspace() {
    setHasLoadError(false);
    setIsForbidden(false);
    setIsLoading(true);
    setReload((current) => current + 1);
  }

  useEffect(() => {
    let isActive = true;
    async function readWorkspace() {
      try {
        const result = await employeeManagementService.load();
        if (!isActive) return;
        if (result.status === "session-expired") {
          sessionExpiryChannel.publish(result.message);
          return;
        }
        if (result.status === "forbidden") {
          setIsForbidden(true);
          return;
        }
        setWorkspace(result.workspace);
        setSelectedEmployeeId(undefined);
      } catch {
        if (isActive) setHasLoadError(true);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }
    void readWorkspace();

    return () => {
      isActive = false;
    };
  }, [reload]);

  function openEmployee(employeeId: string) {
    if (!workspace?.employees.some((employee) => employee.id === employeeId)) return false;
    setSelectedEmployeeId(employeeId);
    setIsCreating(false);
    return true;
  }

  function updateEmployee(
    employee: EmployeeProfile,
    nextFollowUp?: AccountFollowUp,
  ) {
    setWorkspace((current) =>
      current ? updateEmployeeWorkspace(current, employee) : current,
    );
    setIsCreating(false);
    setFollowUp(nextFollowUp);
    notify({
      description: formatMessage({
        code: "MSG10",
        params: { object_name: "Hồ sơ nhân viên" },
      }),
      title: "Đã lưu hồ sơ",
      tone: "success",
    });
    setSelectedEmployeeId(undefined);
  }

  function accountUnlinked(employee: EmployeeProfile) {
    setWorkspace((current) =>
      current ? updateEmployeeWorkspace(current, employee) : current,
    );
    notify({
      title: "Đã bỏ liên kết",
      description: "Tài khoản đăng nhập vẫn được giữ lại.",
      tone: "success",
    });
  }

  if (isForbidden) return <PermissionDenied />;
  if (isLoading) return <EmployeeManagementPageSkeleton />;

  if (hasLoadError || !workspace) {
    return (
      <section className="mx-auto mt-10 max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <h1 className="text-2xl font-semibold text-text">
          Chưa tải được danh sách nhân viên
        </h1>
        <p className="mt-3 leading-7 text-text-muted">
          Kết nối có thể đang gián đoạn. Dữ liệu chưa bị thay đổi.
        </p>
        <Button className="mt-6" onClick={() => void loadWorkspace()}>
          Tải lại
        </Button>
      </section>
    );
  }

  const employedCount = workspace.employees.filter(
    (employee) => employee.status === "employed",
  ).length;

  return (
    <div className="space-y-6">
      <ManagementHeading
        title="Nhân viên"
        description="Tra cứu nhân sự, cập nhật hồ sơ và quản lý liên kết tài khoản đăng nhập."
        icon="users"
      >
        <Button
          className="lg:w-auto"
          onClick={() => {
            setIsCreating(true);
            setSelectedEmployeeId(undefined);
          }}
        >
          <InterfaceIcon name="add" /> Thêm nhân viên
        </Button>
      </ManagementHeading>
      <ManagementSummary
        items={[
          {
            label: "Tổng hồ sơ",
            value: workspace.employees.length,
            icon: "users",
          },
          { label: "Đang làm việc", value: employedCount, icon: "check" },
          {
            label: "Đã liên kết tài khoản",
            value: workspace.employees.filter((employee) => employee.account)
              .length,
            icon: "link",
          },
        ]}
      />

      <EmployeeList
        employees={workspace.employees}
        zones={workspace.zones}
        onSelect={openEmployee}
        selectedEmployeeId={selectedEmployeeId}
      />

      <Dialog
        description="Cập nhật thông tin nhân sự. Hồ sơ nhân viên và tài khoản đăng nhập là hai dữ liệu riêng."
        dismissible={!isMutating}
        onOpenChange={(open) => {
          if (!open && !mutatingRef.current) {
            setIsCreating(false);
            setSelectedEmployeeId(undefined);
          }
        }}
        open={isCreating || Boolean(selectedEmployee)}
        size="lg"
        title={
          isCreating
            ? "Thêm nhân viên"
            : (selectedEmployee?.fullName ?? "Hồ sơ nhân viên")
        }
      >
        {(isCreating || selectedEmployee) && (
          <EmployeeEditor
            zones={workspace.zones}
            availableAccounts={workspace.availableAccounts}
            embedded
            employee={isCreating ? undefined : selectedEmployee}
            key={isCreating ? "create" : (selectedEmployee?.id ?? "empty")}
            onOpenExisting={openEmployee}
            onPendingChange={changePending}
            onSaved={updateEmployee}
            onUnlinked={accountUnlinked}
          />
        )}
      </Dialog>

      {followUp && (
        <AccountFollowUpDialog
          followUp={followUp}
          onClose={() => setFollowUp(undefined)}
        />
      )}
    </div>
  );
}
