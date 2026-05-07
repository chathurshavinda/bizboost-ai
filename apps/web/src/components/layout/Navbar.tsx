"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { FaArrowRight } from "react-icons/fa";
import { useAuth } from "../../lib/useAuth";
import { logout } from "../../lib/auth";
import ConfirmActionModal from "../ui/ConfirmActionModal";
import SideMenu from "./SideMenu";
const NAV_LINKS = [
    { href: "/", label: "Home", match: (p: string) => p === "/" },
    { href: "/#features", label: "Features", match: () => false },
    { href: "/#about", label: "About", match: () => false },
    {
        href: "https://docs.google.com/forms/d/e/1FAIpQLSdcpfUEm9IjNt_b8HuKxofOL5L4i0OBwukpgiQSHe7P1fsEEg/viewform?usp=publish-editor",
        label: "Contact",
        match: () => false,
        external: true,
    },
];
const getInitial = (email?: string | null) => email && email.length > 0 ? email.charAt(0).toUpperCase() : "U";
export default function Navbar() {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const isHome = pathname === "/";
    const [profileOpen, setProfileOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [appMenuOpen, setAppMenuOpen] = useState(false);
    const chipRef = useRef<HTMLDivElement | null>(null);
    const mobileRef = useRef<HTMLDivElement | null>(null);
    const isAuthed = !!user;
    const email = user?.email ?? "";
    const initial = getInitial(email);
    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 8);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    useEffect(() => {
        if (!profileOpen && !mobileOpen)
            return;
        const handleClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (chipRef.current && !chipRef.current.contains(target)) {
                setProfileOpen(false);
            }
            if (mobileRef.current && !mobileRef.current.contains(target)) {
                setMobileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [profileOpen, mobileOpen]);
    useEffect(() => {
        setMobileOpen(false);
        setProfileOpen(false);
        setAppMenuOpen(false);
    }, [pathname]);
    useEffect(() => {
        if (typeof document === "undefined")
            return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = appMenuOpen ? "hidden" : previous || "";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [appMenuOpen]);
    const requestLogout = () => {
        setProfileOpen(false);
        setMobileOpen(false);
        setAppMenuOpen(false);
        setLogoutConfirmOpen(true);
    };
    const handleLogout = async () => {
        setLoggingOut(true);
        await logout();
        setLoggingOut(false);
        setLogoutConfirmOpen(false);
        router.push("/login");
    };
    const handleProfile = () => {
        setProfileOpen(false);
        setMobileOpen(false);
        router.push("/dashboard/profile");
    };
    const navClassName = ["navbar", isHome && "navbar--home", scrolled && "navbar--scrolled"]
        .filter(Boolean)
        .join(" ");
    return (<nav className={navClassName}>
      <div className="navbarInner">
        <div className="navbarLeft">
          <button type="button" className={`navMenuTrigger${appMenuOpen ? " navMenuTrigger--open" : ""}`} aria-label={appMenuOpen ? "Close app menu" : "Open app menu"} aria-expanded={appMenuOpen} onClick={() => setAppMenuOpen((open) => !open)}>
            <span className={appMenuOpen ? "navbarToggleBar navbarToggleBar--open" : "navbarToggleBar"}/>
          </button>

          <Link href="/" className="navbarBrand" onClick={() => setMobileOpen(false)}>
            <Image src="/logo.svg" alt="BizBoost" width={205} height={30} priority className="navbarBrandLogo"/>
          </Link>
        </div>

        <div className="navbarRight" ref={mobileRef}>
          <div className="navLinks" aria-label="Primary">
            {NAV_LINKS.map((link) => {
            const isActive = link.match(pathname ?? "");
            if (link.external) {
                return (<a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={`navLink${isActive ? " navLink--active" : ""}`}>
                    {link.label}
                  </a>);
            }
            return (<Link key={link.href} href={link.href} className={`navLink${isActive ? " navLink--active" : ""}`}>
                  {link.label}
                </Link>);
        })}
          </div>

          <span className="navDivider" aria-hidden/>

          {!isAuthed && (<div className="navAuthGroup">
              <Link href="/login" className="navLoginLink">
                Log in
              </Link>
              <Link href="/signup" className="navGetStarted">
                Get Started
                <FaArrowRight size={12} aria-hidden/>
              </Link>
            </div>)}

          {isAuthed && (<div className="navProfileWrap" ref={chipRef}>
              <button type="button" onClick={() => setProfileOpen((open) => !open)} className="userChip" aria-label="Account menu">
                <span className="userChipInitial">{initial}</span>
              </button>

              {profileOpen && (<div className="navProfileMenu" role="menu">
                  <div className="navProfileEmail">{email}</div>
                  <button type="button" onClick={handleProfile} className="navProfileItem">
                    View Profile
                  </button>
                  <button type="button" onClick={requestLogout} className="navProfileItem navProfileItem--danger">
                    Logout
                  </button>
                </div>)}
            </div>)}

          <button type="button" className="navbarToggle" aria-label="Toggle navigation menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>
            <span className={mobileOpen ? "navbarToggleBar navbarToggleBar--open" : "navbarToggleBar"}/>
          </button>

          {mobileOpen && (<div className="navMobileMenu" role="menu">
              {NAV_LINKS.map((link) => link.external ? (<a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="navMobileItem" onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </a>) : (<Link key={link.href} href={link.href} className="navMobileItem" onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </Link>))}

              <span className="navMobileDivider" aria-hidden/>

              {!isAuthed && (<>
                  <Link href="/login" className="navMobileItem" onClick={() => setMobileOpen(false)}>
                    Log in
                  </Link>
                  <Link href="/signup" className="navMobileItem navMobileItem--primary" onClick={() => setMobileOpen(false)}>
                    Get Started
                    <FaArrowRight size={12} aria-hidden/>
                  </Link>
                </>)}
              {isAuthed && (<>
                  <button type="button" onClick={handleProfile} className="navMobileItem">
                    View Profile
                  </button>
                  <button type="button" onClick={requestLogout} className="navMobileItem navMobileItem--danger">
                    Logout
                  </button>
                </>)}
            </div>)}
        </div>
      </div>

      <ConfirmActionModal open={logoutConfirmOpen} title="Confirm Logout" message="Are you sure you want to log out?" cancelText="Cancel" confirmText="Logout" danger confirming={loggingOut} onCancel={() => setLogoutConfirmOpen(false)} onConfirm={() => void handleLogout()}/>

      <SideMenu open={appMenuOpen} onClose={() => setAppMenuOpen(false)} onRequestLogout={requestLogout}/>
    </nav>);
}
