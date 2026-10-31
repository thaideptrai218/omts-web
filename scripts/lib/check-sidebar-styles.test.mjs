import { expect, it } from "vitest";
import { checkSidebarStyles } from "./check-sidebar-styles.mjs";

it("rejects the production failure where a loader turns a CSS Module into global CSS", () => {
  expect(() =>
    checkSidebarStyles(
      ".shell[data-sidebar-expanded=false]{display:grid}",
      "styles={}",
    ),
  ).toThrow("lost its scoped root class");
});
it("rejects missing sidebar styles instead of treating an empty asset as valid", () => {
  expect(() => checkSidebarStyles("", "styles={}")).toThrow(
    "lost its scoped root class",
  );
});
it("rejects a scoped CSS rule with no matching class export in the client", () => {
  expect(() =>
    checkSidebarStyles(
      ".hash_shell[data-sidebar-expanded=false]{display:grid}",
      "styles={}",
    ),
  ).toThrow("not exported to the browser bundle");
});
it.each(["false", '"true"'])(
  "checks emitted CSS and JavaScript together for selector %s",
  (attribute) => {
    expect(
      checkSidebarStyles(
        `.nextHash_shell[data-sidebar-expanded=${attribute}]{display:grid}`,
        'styles={shell:"nextHash_shell"}',
      ),
    ).toBe(2);
  },
);
