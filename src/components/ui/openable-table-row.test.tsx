// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {OpenableTableRow} from "./openable-table-row";
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it("opens from a data cell, while actions and selections remain independent",()=>{
 const open=vi.fn(),edit=vi.fn();render(<table><tbody><OpenableTableRow onOpen={open}><td>Vật tư QA</td><td><button onClick={edit}>Sửa</button><label><input type="checkbox"/>Chọn</label><a href="#detail">Liên kết</a></td></OpenableTableRow></tbody></table>);
 fireEvent.click(screen.getByText("Vật tư QA"));expect(open).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole("button",{name:"Sửa"}));fireEvent.click(screen.getByRole("checkbox"));fireEvent.click(screen.getByRole("link"));expect(open).toHaveBeenCalledTimes(1);expect(edit).toHaveBeenCalledTimes(1);
 vi.spyOn(window,"getSelection").mockReturnValue({type:"Range",anchorNode:screen.getByText("Vật tư QA").firstChild} as Selection);
 fireEvent.click(screen.getByText("Vật tư QA"));expect(open).toHaveBeenCalledTimes(1);
});
it("does not open a disabled row",()=>{const open=vi.fn();render(<table><tbody><OpenableTableRow disabled onOpen={open}><td>Đang tải hồ sơ</td></OpenableTableRow></tbody></table>);fireEvent.click(screen.getByText("Đang tải hồ sơ"));expect(open).not.toHaveBeenCalled();});
