// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import { cell, flipOpen, type EodDocument, type OpenState } from "../end-of-day-model";
import { PaperToolbar, type PaperToolbarProps } from "./paper-toolbar";
import { PaperViewer } from "./paper-viewer";
import { useState } from "react";

afterEach(cleanup);

function toolbar(over: Partial<PaperToolbarProps> = {}) {
  const props: PaperToolbarProps = {
    page: 2, pageCount: 5, onPage: vi.fn(), canBack: true, canForward: false, onBack: vi.fn(), onForward: vi.fn(), onRefresh: vi.fn(), preview: false, onPreview: vi.fn(),
    canDownload: true, onDownload: vi.fn(), onPrint: vi.fn(), zoom: 100, canZoomIn: true, canZoomOut: true, onZoomIn: vi.fn(), onZoomOut: vi.fn(), findOpen: false, onFind: vi.fn(), fullscreen: false, onFullscreen: vi.fn(), ...over,
  };
  render(<PaperToolbar {...props} />);
  return props;
}
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("thanh công cụ trang báo cáo", () => {
  it("mọi nút có tên tiếng Việt", () => {
    toolbar({ expandAll: { open: false, onToggle: vi.fn() } });
    for (const name of ["Quay lại", "Tới", "Làm mới", "Trang đầu", "Trang trước", "Trang sau", "Trang cuối", "Xem trước khi in", "In", "Thu nhỏ", "Phóng to", "Tìm", "Toàn màn hình", "Mở rộng tất cả"]) expect(screen.getByRole("button", { name }), name).toBeTruthy();
    expect(screen.getByRole("button", { name: /Tải xuống/ })).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "Số trang" }) as HTMLInputElement).value).toBe("2");
    expect(screen.getByText("/ 5")).toBeTruthy();
  });
  it("chuyển trang bằng các nút đầu, trước, sau, cuối", () => {
    const props = toolbar();
    click("Trang đầu"); expect(props.onPage).toHaveBeenLastCalledWith(1);
    click("Trang trước"); expect(props.onPage).toHaveBeenLastCalledWith(1);
    click("Trang sau"); expect(props.onPage).toHaveBeenLastCalledWith(3);
    click("Trang cuối"); expect(props.onPage).toHaveBeenLastCalledWith(5);
  });
  it("ở trang đầu khóa Trang đầu/trước, ở trang cuối khóa Trang sau/cuối; Quay lại/Tới theo lịch sử", () => {
    toolbar({ page: 1, canBack: false, canForward: true });
    expect((screen.getByRole("button", { name: "Trang đầu" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Trang trước" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Trang sau" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Quay lại" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Tới" }) as HTMLButtonElement).disabled).toBe(false);
    cleanup();
    toolbar({ page: 5 });
    expect((screen.getByRole("button", { name: "Trang sau" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Trang cuối" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("ô số trang: Enter tới trang gõ, số quá lớn kéo về trang cuối, ô trống hoặc chữ thì bỏ qua", () => {
    const props = toolbar();
    const box = screen.getByRole("textbox", { name: "Số trang" });
    fireEvent.change(box, { target: { value: "4" } }); fireEvent.keyDown(box, { key: "Enter" });
    expect(props.onPage).toHaveBeenLastCalledWith(4);
    fireEvent.change(box, { target: { value: "99" } }); fireEvent.keyDown(box, { key: "Enter" });
    expect(props.onPage).toHaveBeenLastCalledWith(5);
    fireEvent.change(box, { target: { value: "0" } }); fireEvent.blur(box);
    expect(props.onPage).toHaveBeenLastCalledWith(1);
    const calls = vi.mocked(props.onPage).mock.calls.length;
    fireEvent.change(box, { target: { value: "" } }); fireEvent.keyDown(box, { key: "Enter" });
    fireEvent.change(box, { target: { value: "ab" } }); fireEvent.keyDown(box, { key: "Enter" });
    expect(vi.mocked(props.onPage).mock.calls.length).toBe(calls);
  });
  it("tải xuống chọn PDF hoặc Excel; in, làm mới, thu phóng, tìm, xem trước, toàn màn hình gọi đúng hàm", () => {
    const props = toolbar();
    click("Tải xuống"); fireEvent.click(screen.getByRole("menuitem", { name: "PDF" }));
    expect(props.onDownload).toHaveBeenLastCalledWith("pdf");
    click("Tải xuống"); fireEvent.click(screen.getByRole("menuitem", { name: "Excel (.xlsx)" }));
    expect(props.onDownload).toHaveBeenLastCalledWith("xlsx");
    click("In"); click("Làm mới"); click("Phóng to"); click("Thu nhỏ"); click("Tìm"); click("Xem trước khi in"); click("Toàn màn hình"); click("Quay lại");
    for (const fn of [props.onPrint, props.onRefresh, props.onZoomIn, props.onZoomOut, props.onFind, props.onPreview, props.onFullscreen, props.onBack]) expect(fn).toHaveBeenCalledTimes(1);
  });
  it("khóa Phóng to/Thu nhỏ ở giới hạn; Xem trước khi in thể hiện đang bật", () => {
    toolbar({ canZoomIn: false, canZoomOut: false, preview: true });
    expect((screen.getByRole("button", { name: "Phóng to" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Thu nhỏ" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Xem trước khi in" }).getAttribute("aria-pressed")).toBe("true");
  });
});

const doc: EodDocument = {
  tiles: [],
  tables: [{
    id: "t", title: "Bán hàng", emptyText: "Trống", columns: [{ key: "a", header: "Chứng từ", width: 1 }, { key: "b", header: "Khách hàng", width: 2 }],
    rows: [
      { key: "g", role: "group", toggle: { defaultOpen: true }, cells: [cell("Hóa đơn (2)", { strong: true }), cell("")] },
      { key: "g:1", role: "item", parent: "g", cells: [cell("HD000001", { href: "/operations/sales-invoice-list?code=HD000001" }), cell("Thương lái An")] },
      { key: "g:2", role: "item", parent: "g", cells: [cell("HD000002"), cell("Khách lẻ")] },
    ],
    total: [cell("Tổng cộng"), cell("")],
  }],
};
const head = { createdAt: "19/11/2026 10:05", title: "Báo cáo cuối ngày về bán hàng", lines: ["Thời gian: 19/11/2026 00:00 - 19/11/2026 23:59"] };

function Harness({ onDownload = vi.fn() }: Readonly<{ onDownload?(format: string): void }>) {
  const [state, setState] = useState<OpenState>({});
  return (
    <ToastProvider>
      <PaperViewer doc={doc} head={head} orientation="portrait" state={state} onToggle={(key) => setState((current) => flipOpen(doc, current, key))} onToggleAll={() => undefined}
        history={{ canBack: false, canForward: false, back: vi.fn(), forward: vi.fn() }} onRefresh={vi.fn()} canDownload onDownload={onDownload} />
    </ToastProvider>
  );
}
const screenPages = () => screen.getByRole("document", { name: "Các trang báo cáo" });

describe("trang báo cáo dạng giấy", () => {
  it("vẽ đầu báo cáo, bảng có link mã chứng từ và chân trang Trang 1/1", () => {
    render(<Harness />);
    const pages = within(screenPages());
    expect(pages.getByRole("heading", { name: "Báo cáo cuối ngày về bán hàng" })).toBeTruthy();
    expect(pages.getByText("Ngày lập: 19/11/2026 10:05")).toBeTruthy();
    expect(pages.getByRole("link", { name: "HD000001" }).getAttribute("href")).toBe("/operations/sales-invoice-list?code=HD000001");
    expect(pages.getByText("Trang 1/1")).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "Số trang" }) as HTMLInputElement).value).toBe("1");
  });
  it("⊟ đóng nhóm và các dòng biến khỏi trang, ⊞ mở lại", () => {
    render(<Harness />);
    const pages = within(screenPages());
    fireEvent.click(pages.getByRole("button", { name: "Thu gọn Hóa đơn (2)" }));
    expect(pages.queryByText("HD000001")).toBeNull();
    fireEvent.click(pages.getByRole("button", { name: "Mở rộng Hóa đơn (2)" }));
    expect(pages.getByText("HD000001")).toBeTruthy();
  });
  it("tìm tô sáng kết quả, đếm và chuyển kết quả; Esc đóng thanh tìm", () => {
    render(<Harness />);
    click("Tìm");
    const box = screen.getByRole("searchbox", { name: "Tìm trong báo cáo" });
    fireEvent.change(box, { target: { value: "HD00" } });
    const marks = screenPages().querySelectorAll("mark");
    expect(marks).toHaveLength(2);
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(marks[0].hasAttribute("data-active")).toBe(true);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByText("2/2")).toBeTruthy();
    expect(screenPages().querySelectorAll("mark")[1].hasAttribute("data-active")).toBe(true);
    fireEvent.change(box, { target: { value: "không có" } });
    expect(screen.getByText("Không thấy")).toBeTruthy();
    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screenPages().querySelectorAll("mark")).toHaveLength(0);
  });
  it("Phóng to/Thu nhỏ đổi tỉ lệ; Xem trước khi in bật/tắt", () => {
    render(<Harness />);
    expect(screen.getByText("100%")).toBeTruthy();
    click("Phóng to"); expect(screen.getByText("110%")).toBeTruthy();
    click("Thu nhỏ"); click("Thu nhỏ"); expect(screen.getByText("90%")).toBeTruthy();
    click("Xem trước khi in"); expect(screen.getByRole("button", { name: "Xem trước khi in" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(screenPages()).getByText("Trang 1/1")).toBeTruthy();
  });
  it("In gọi window.print và có bản sao các trang để in gắn vào body", () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    render(<Harness />);
    click("In");
    expect(print).toHaveBeenCalledTimes(1);
    const root = document.body.querySelector("[data-eod-print-root]");
    expect(root).toBeTruthy();
    expect(root?.querySelector("style")?.textContent).toContain("@page { size: A4 portrait");
    expect(root?.querySelectorAll("[data-page]")).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
