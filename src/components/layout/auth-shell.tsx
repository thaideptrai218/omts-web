import { BrandMark } from "@/components/brand/brand-mark";
import styles from "./auth-shell.module.css";

export function AuthShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className={styles.shell}>
    <div className={styles.entry}>
      <header className={styles.brand}><BrandMark compact /><span>Hợp tác xã Nuôi trồng Thủy sản Trung Nam</span></header>
      <div className={styles.form}>{children}</div>
      <footer className={styles.footer}><span>HTX Trung Nam · Quản lý nuôi hàu</span><span>Đồng hành cùng vùng nuôi.</span></footer>
    </div>
    <aside className={styles.story} aria-label="Giới thiệu Hợp tác xã Nuôi trồng Thủy sản Trung Nam">
      <div className={styles.storyLabel}><span className={styles.dot} /> HỢP TÁC XÃ NUÔI TRỒNG THỦY SẢN TRUNG NAM</div>
      <div className={styles.art} aria-hidden="true">
        <svg viewBox="0 0 640 650" fill="none">
          <defs>
            <linearGradient id="coast-shell" x1="180" y1="120" x2="480" y2="560" gradientUnits="userSpaceOnUse"><stop stopColor="#d8efdf"/><stop offset=".5" stopColor="#72b5ad"/><stop offset="1" stopColor="#2f6e70"/></linearGradient>
            <radialGradient id="coast-pearl" cx=".34" cy=".25" r=".8"><stop stopColor="#fffef5"/><stop offset=".48" stopColor="#eff3df"/><stop offset=".8" stopColor="#a6bfb0"/><stop offset="1" stopColor="#507b76"/></radialGradient>
            <linearGradient id="coast-line"><stop stopColor="#fff" stopOpacity=".75"/><stop offset="1" stopColor="#fff" stopOpacity=".08"/></linearGradient>
          </defs>
          <g stroke="#457d78" strokeOpacity=".16">{Array.from({length:9},(_,i)=><ellipse key={i} cx="330" cy="365" rx={180+i*27} ry={95+i*23} transform="rotate(-30 330 365)"/>)}</g>
          <g transform="rotate(-24 320 330)">
            <path d="M158 340C105 262 145 141 229 109c26-10 45 9 65-6 35-27 58 10 82 8 43-5 49 36 73 44 39 13 19 52 42 77 29 32-7 60-1 89 8 41-36 45-44 75-10 36-49 23-72 43-26 23-53 0-84 7-39 9-54-23-86-26-32-4-44-47-46-80Z" fill="url(#coast-shell)" stroke="#d5e9d9" strokeWidth="2"/>
            {Array.from({length:8},(_,i)=><path key={i} d={`M${178+i*12} ${324+i*7}C${140+i*15} ${235-i*4} ${211+i*22} ${123+i*7} ${250+i*24} ${129+i*15}`} stroke="url(#coast-line)" strokeWidth="1.5"/>)}
            <path d="M161 340c60-49 112-8 152-46 37-34 64-1 94-20 33-21 45 0 78 6-3 47-33 62-46 91-15 34-51 28-76 47-32 25-69-2-98 4-48 9-89-33-104-82Z" fill="#d8ebe0" stroke="#edf4e9" strokeWidth="2"/>
            <path d="M177 347c61-27 108 2 147-28 33-24 64-4 96-20 23-11 35-1 46 0-13 30-39 44-45 61-13 29-49 28-67 40-23 15-65-8-91-2-32 7-65-25-86-51Z" fill="#4f8c83"/>
            <circle cx="321" cy="346" r="49" fill="#214f4d" opacity=".2"/><circle cx="316" cy="333" r="47" fill="url(#coast-pearl)"/>
          </g>
          <g stroke="#507f77" strokeWidth="1" opacity=".5"><path d="M105 492h52m-26-26v52M503 143h24m-12-12v24"/></g>
        </svg>
      </div>
      <div className={styles.storyCopy}><span className={styles.index}>NUÔI HÀU · THU MUA · TRUY XUẤT</span><h2>Từ vùng nuôi,<br/>đến từng lô hàu.</h2><p>Quản lý vùng nuôi, mùa vụ và hoạt động của hợp tác xã; theo dõi hành trình mỗi lô hàu từ mặt nước đến nơi giao nhận.</p></div>
      <div className={styles.storyFooter}><span>HỢP TÁC XÃ NUÔI TRỒNG THỦY SẢN TRUNG NAM</span><span>HTX TRUNG NAM</span></div>
    </aside>
  </main>;
}
