import type {
  FeatureCatalogItem,
  RoleDetails,
  RoleMutationResult,
  SaveRoleInput,
} from "@/features/role-management/domain/role-management";
import { validatePermissionMatrix } from "@/features/role-management/lib/role-permission-rules";
import { roleEditorSchema } from "@/features/role-management/schemas/role-editor-schema";

type MockRoleSaveContext = Readonly<{
  catalog: readonly FeatureCatalogItem[];
  fixedNames?: Readonly<Record<string, string>>;
  roles: readonly RoleDetails[];
}>;

/**
 * Validation phía "server" của mock khi lưu vai trò, theo đúng thứ tự:
 * quyền sửa vai trò cố định -> metadata -> tên cố định -> ma trận quyền -> trùng tên.
 * Trả về `rejection` nếu bị từ chối, ngược lại trả về tên đã chuẩn hóa.
 */
export function validateMockRoleSave(
  input: SaveRoleInput,
  { catalog, fixedNames, roles }: MockRoleSaveContext,
):
  | Readonly<{ rejection: RoleMutationResult }>
  | Readonly<{ name: string; rejection?: undefined }> {
  if (fixedNames && (!input.id || !Object.hasOwn(fixedNames, input.id))) {
    return { rejection: { status: "forbidden", message: { code: "MSG02" } } };
  }

  const metadata = roleEditorSchema.safeParse({
    description: input.description,
    name: input.name,
  });
  if (!metadata.success) {
    return {
      rejection: {
        field: "name",
        message: { code: "MSG01" },
        status: "invalid-input",
      },
    };
  }

  if (fixedNames && input.id && metadata.data.name !== fixedNames[input.id]) {
    return {
      rejection: {
        status: "invalid-input",
        field: "name",
        message: { code: "MSG01" },
      },
    };
  }

  const matrixErrors = validatePermissionMatrix(input.permissions, catalog);
  if (matrixErrors.length > 0) {
    return {
      rejection: {
        field: `permission:${matrixErrors[0].featureCode}` as const,
        message: { code: "MSG01" },
        status: "invalid-input",
      },
    };
  }

  const duplicate = roles.find(
    (role) =>
      role.id !== input.id &&
      role.name.localeCompare(metadata.data.name, "vi", {
        sensitivity: "base",
      }) === 0,
  );
  if (duplicate) {
    return {
      rejection: {
        existingRoleId: duplicate.id,
        message: { code: "MSG03", params: { object_name: "Tên vai trò" } },
        status: "duplicate-name",
      },
    };
  }

  return { name: metadata.data.name };
}
