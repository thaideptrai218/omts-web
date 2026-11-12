// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { JourneyStepCard } from "./farming-journey-step-card";

afterEach(cleanup);
const card = (props: Partial<Parameters<typeof JourneyStepCard>[0]> = {}) => render(<ol><JourneyStepCard href="/operations/seeding?raftId=r1" index={3} title="Thả giống" current={false} loading={false} {...props} /></ol>);

describe("journey step card", () => {
  it("states the step state in words, shows the figure and the plan percentage without relying on colour", () => {
    card({ item: { mark: "active", markLabel: "Đang thực hiện", figure: "400/900 mảnh · 44,4%", percent: 44.4, over: false } });
    const link = screen.getByRole("link");
    expect(link.textContent).toBe("3Thả giống●Đang thực hiện.400/900 mảnh · 44,4%Đạt 44,4% kế hoạch.");
    expect(link.getAttribute("href")).toBe("/operations/seeding?raftId=r1");
  });
  it("marks the current page and reserves the figure line while loading", () => {
    card({ current: true, loading: true });
    expect(screen.getByRole("link").getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("status", { name: "Đang tải tiến độ" })).toBeTruthy();
  });
  it("shows only the title for a step without a figure and no mark for a neutral step", () => {
    card({ item: undefined, caption: "Đưa giống xuống từng làn" });
    expect(screen.getByRole("link").textContent).toBe("3Thả giốngĐưa giống xuống từng làn");
    expect(screen.getByRole("link").getAttribute("title")).toBe("Đưa giống xuống từng làn");
    cleanup();
    card({ item: { mark: "neutral", markLabel: "", figure: "Không qua ươm" } });
    expect(screen.getByRole("link").textContent).toBe("3Thả giốngKhông qua ươm");
    expect(screen.getByRole("link").getAttribute("title")).toBe("Không qua ươm");
  });
});

