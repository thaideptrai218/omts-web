import type { Ref } from "react";

type RoleMetadataFieldsProps = Readonly<{
  description: string;
  disabled: boolean;
  /** Fixed system roles keep their name; only permissions are editable. */
  fixedName: boolean;
  name: string;
  nameError?: string;
  nameInputRef: Ref<HTMLInputElement>;
  onDescriptionChange(value: string): void;
  onNameChange(value: string): void;
}>;

/** Role name (required) and description inputs. */
export function RoleMetadataFields({
  description,
  disabled,
  fixedName,
  name,
  nameError,
  nameInputRef,
  onDescriptionChange,
  onNameChange,
}: RoleMetadataFieldsProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <label
          className="block text-sm font-semibold text-text"
          htmlFor="role-name"
        >
          Tên vai trò
          <span aria-hidden="true" className="ml-1 text-danger">
            *
          </span>
        </label>
        <input
          aria-describedby={
            nameError
              ? "role-name-error"
              : fixedName
                ? "role-name-hint"
                : undefined
          }
          aria-invalid={nameError ? true : undefined}
          className={`mt-2 min-h-12 w-full rounded-control border bg-surface px-3.5 text-base text-text outline-none transition ${
            nameError
              ? "border-danger focus-visible:border-danger"
              : "border-border-strong focus-visible:border-primary"
          }`}
          disabled={disabled}
          id="role-name"
          readOnly={fixedName}
          maxLength={100}
          onChange={(event) => onNameChange(event.target.value)}
          ref={nameInputRef}
          required
          value={name}
        />
        {fixedName && (
          <p
            id="role-name-hint"
            className="mt-2 text-xs leading-5 text-text-muted"
          >
            Tên vai trò do hệ thống quy định. Bạn có thể điều chỉnh quyền
            bên dưới.
          </p>
        )}
        {nameError && (
          <p
            className="mt-1.5 text-sm font-medium text-danger"
            id="role-name-error"
            role="alert"
          >
            {nameError}
          </p>
        )}
      </div>

      <div>
        <label
          className="block text-sm font-semibold text-text"
          htmlFor="role-description"
        >
          Mô tả
        </label>
        <textarea
          className="mt-2 min-h-24 w-full resize-y rounded-control border border-border-strong bg-surface px-3.5 py-3 text-base text-text outline-none focus-visible:border-primary"
          disabled={disabled}
          id="role-description"
          onChange={(event) => onDescriptionChange(event.target.value)}
          value={description}
        />
      </div>
    </div>
  );
}
