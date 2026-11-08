// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {NavigationGroup} from "./navigation-group";
vi.mock("next/navigation",()=>({usePathname:()=>"/dashboard"}));
afterEach(cleanup);
it("opens a topnav group and closes it on Escape, outside pointer and destination selection",()=>{render(<><NavigationGroup label="Nuôi trồng"><a href="/farming/rafts" onClick={e=>e.preventDefault()}>Bè nuôi</a></NavigationGroup><button>Bên ngoài</button></>);const summary=screen.getByText("Nuôi trồng"),details=summary.closest("details")!;fireEvent.click(summary);expect(details.open).toBe(true);fireEvent.keyDown(summary,{key:"Escape"});expect(details.open).toBe(false);fireEvent.click(summary);fireEvent.pointerDown(screen.getByRole("button",{name:"Bên ngoài"}));expect(details.open).toBe(false);fireEvent.click(summary);fireEvent.click(screen.getByRole("link",{name:"Bè nuôi"}));expect(details.open).toBe(false);});
