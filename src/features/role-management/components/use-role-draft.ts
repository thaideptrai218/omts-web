"use client";

import { useMemo, useRef, useState } from "react";
import {
  createInitialPermissions,
  initialRoleName,
  type RoleEditorMode,
} from "@/features/role-management/components/role-editor-model";
import type {
  FeatureCatalogItem,
  RoleDetails,
} from "@/features/role-management/domain/role-management";
import { validatePermissionMatrix } from "@/features/role-management/lib/role-permission-rules";
import { roleEditorSchema } from "@/features/role-management/schemas/role-editor-schema";
import { formatMessage } from "@/shared/messages/message-catalog";

/** Focuses the first visible control of a feature row (desktop table or mobile card). */
function focusPermissionFeature(featureCode: string | undefined) {
  requestAnimationFrame(() => {
    const candidates = document.querySelectorAll<HTMLElement>(
      `[data-permission-feature="${featureCode}"]`,
    );
    Array.from(candidates)
      .find((candidate) => candidate.offsetParent !== null)
      ?.focus();
  });
}

type UseRoleDraftInput = Readonly<{
  catalog: readonly FeatureCatalogItem[];
  mode: RoleEditorMode;
  role?: RoleDetails;
}>;

/** Draft name/description/permission matrix, field errors and client-side validation. */
export function useRoleDraft({ catalog, mode, role }: UseRoleDraftInput) {
  const initialPermissions = useMemo(
    () => createInitialPermissions(catalog, role),
    [catalog, role],
  );
  const initialName = initialRoleName(mode, role);
  const initialDescription = role?.description ?? "";
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState(initialDescription);
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState<string>();
  const [permissionErrors, setPermissionErrors] = useState<
    Record<string, string>
  >({});
  const [permissions, setPermissions] = useState(initialPermissions);
  // Create/copy always count as changed; edit compares against the loaded role.
  const hasChanges =
    mode !== "edit" ||
    name !== initialName ||
    description !== initialDescription ||
    JSON.stringify(permissions) !== JSON.stringify(initialPermissions);

  function resetFields() {
    setName(initialName);
    setDescription(initialDescription);
    setPermissions(initialPermissions);
    setNameError(undefined);
    setPermissionErrors({});
  }

  /** Validates before calling the service; focuses the first invalid control. */
  function validateDraft(): boolean {
    const metadata = roleEditorSchema.safeParse({ description, name });
    const matrixErrors = validatePermissionMatrix(permissions, catalog);
    const nextPermissionErrors = Object.fromEntries(
      matrixErrors.map((error) => [error.featureCode, error.message]),
    );

    setPermissionErrors(nextPermissionErrors);
    if (!metadata.success) {
      setNameError(
        metadata.error.issues[0]?.message ?? formatMessage({ code: "MSG01" }),
      );
      nameInputRef.current?.focus();
      return false;
    }

    setNameError(undefined);
    if (matrixErrors.length > 0) {
      focusPermissionFeature(matrixErrors[0]?.featureCode);
      return false;
    }

    return true;
  }

  return {
    description,
    hasChanges,
    name,
    nameError,
    nameInputRef,
    permissionErrors,
    permissions,
    resetFields,
    setDescription,
    setName,
    setNameError,
    setPermissionErrors,
    setPermissions,
    validateDraft,
  };
}
