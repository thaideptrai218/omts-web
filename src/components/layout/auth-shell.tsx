import { AnimatedOyster } from "@/components/brand/animated-oyster";
import { OysterMoodProvider } from "@/components/brand/oyster-mood";
import { BrandMark } from "@/components/brand/brand-mark";
import { CooperativeName } from "@/components/brand/cooperative-name-context";
import Link from "next/link";
import styles from "./auth-shell.module.css";

export function AuthShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <OysterMoodProvider><main className={styles.shell}>
    <div className={styles.entry}>
      <header><Link href="/" className={styles.brand} title="Trang giới thiệu"><BrandMark compact /><span><CooperativeName /></span></Link></header>
      <div className={styles.form}>{children}</div>
      <footer className={styles.footer}><span><CooperativeName /></span><span>Quản lý nuôi hàu & truy xuất nguồn gốc</span></footer>
    </div>
    <aside className={styles.story} aria-label="Giới thiệu hợp tác xã">
      <div className={styles.storyLabel}><span className={styles.dot}/> GẮN KẾT TỪ VÙNG NUÔI</div>
      <div className={styles.art} aria-hidden="true"><span className={styles.orbit}/><AnimatedOyster /></div>
      <div className={styles.storyCopy}><span className={styles.index} style={{ textTransform: "uppercase" }}><CooperativeName /></span><h2>Từ vùng nuôi,<br/>đến từng lô hàu.</h2><p>Một nơi theo dõi hoạt động của hợp tác xã, kết nối thông tin nuôi trồng, mua bán và nguồn gốc sản phẩm.</p></div>
      <div className={styles.storyFooter}><span>Nuôi trồng</span><span>Mua bán</span><span>Truy xuất nguồn gốc</span></div>
    </aside>
  </main></OysterMoodProvider>;
}

