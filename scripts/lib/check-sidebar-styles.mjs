import assert from "node:assert/strict";

// A successful Next build alone does not prove CSS Module class exports survive
// custom loaders. Check the actual CSS-to-client binding before serving a review.
export function checkSidebarStyles(css, javascript) {
  const match =
    /\.([_a-zA-Z][\w-]*)\[\s*data-sidebar-expanded\s*=\s*["']?(?:false|true)["']?\s*\]/.exec(
      css,
    );
  const className = match?.[1];
  assert.ok(
    className && className !== "shell",
    "Sidebar CSS Module lost its scoped root class. Check the CSS loader rule.",
  );
  assert.ok(
    javascript.includes(className),
    "Sidebar's compiled CSS class is not exported to the browser bundle.",
  );
  return 2;
}
