import Link from "next/link";
export default function Footer() {
    return (<footer className="footer">
      <div className="footerLeft">
        <Link href="/#about">About</Link>
        <Link href="/#showcase">Showcase</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </div>
      <div className="footerRight">© 2025 BizBoost AI</div>
    </footer>);
}
