import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RegistrationMethodSelector } from "@/features/registration/components/registration-method-selector";

describe("RegistrationMethodSelector", () => {
  it("renders two mutually exclusive native radio choices", () => {
    const markup = renderToStaticMarkup(
      <RegistrationMethodSelector onChange={vi.fn()} value="email" />,
    );

    expect(markup.match(/type="radio"/g)).toHaveLength(2);
    expect(markup.match(/name="registration-method"/g)).toHaveLength(2);
    expect(markup).toContain("Email");
    expect(markup).toContain("Số điện thoại");
    expect(markup.match(/checked=""/g)).toHaveLength(1);
  });

  it("disables the complete choice group while its parent is pending", () => {
    const markup = renderToStaticMarkup(
      <RegistrationMethodSelector disabled onChange={vi.fn()} />,
    );

    expect(markup).toContain("<fieldset disabled=\"\"");
  });
});
