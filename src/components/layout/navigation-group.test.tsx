// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NavigationGroup } from "./navigation-group";
afterEach(cleanup);
it("keeps collapsed groups independent and preserves access to icon actions in compact mode", () => {
  const view = render(<><NavigationGroup label="Nuôi trồng"><button>Bè nuôi</button></NavigationGroup><NavigationGroup label="Nhân sự & phân quyền"><button>Phân công và chấm công</button></NavigationGroup></>);
  const toggle = screen.getByRole("button", { name: "Nuôi trồng" });
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByRole("button", { name: "Bè nuôi" })).toBeNull();
  expect(screen.getByRole("button", { name: "Phân công và chấm công" })).toBeTruthy();
  view.rerender(<><NavigationGroup label="Nuôi trồng" compact><button>Bè nuôi</button></NavigationGroup><NavigationGroup label="Nhân sự & phân quyền"><button>Phân công và chấm công</button></NavigationGroup></>);
  expect(screen.getByRole("button", { name: "Bè nuôi" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Nuôi trồng" })).toBeNull();
});
