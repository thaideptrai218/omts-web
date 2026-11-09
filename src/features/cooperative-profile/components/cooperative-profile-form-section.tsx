import type { ReactNode } from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { CooperativeProfileFormValues } from "@/features/cooperative-profile/schemas/cooperative-profile-schema";

/** Shared props for detail-step sections bound to the cooperative profile form. */
export type CooperativeProfileFieldsProps = Readonly<{
  errors: FieldErrors<CooperativeProfileFormValues>;
  register: UseFormRegister<CooperativeProfileFormValues>;
}>;

/** Border classes for native textarea/select controls, matching FormField's error styling. */
export function getControlBorderClassName(hasError: boolean) {
  return hasError
    ? "border-danger focus-visible:border-danger"
    : "border-border-strong hover:border-slate-500 focus-visible:border-primary";
}

type CooperativeProfileFormSectionProps = Readonly<{
  children: ReactNode;
  description: string;
  title: string;
}>;

/** Card section with a heading and description, used by every block of the detail step. */
export function CooperativeProfileFormSection({
  children,
  description,
  title,
}: CooperativeProfileFormSectionProps) {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
      <div className="border-b border-border pb-4">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}
