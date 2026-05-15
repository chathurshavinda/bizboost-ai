import Link from "next/link";
import BizBoostWordmark from "./brand/BizBoostWordmark";
export default function Footer() {
    return (<footer className="footer">
      <div className="footerLeft">
        <Link href="/#about">About</Link>
        <Link href="/#showcase">Showcase</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </div>
      <div className="footerRight">
        © {new Date().getFullYear()}{" "}
        <BizBoostWordmark size="compact"/> AI
      </div>
    </footer>);
}
