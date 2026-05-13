"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../src/lib/useAuth";
import { logout } from "../../src/lib/auth";
export default function Navbar() {
    const { user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const onLogout = async () => {
        await logout();
    };
    return (<nav className="navbar">
      <div className="brand">BizBoost</div>
      <button className="btn" style={{ padding: 8 }} onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </button>
      <div className="nav" style={{ display: menuOpen ? "flex" : undefined }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="#" aria-disabled>Strategy Generator</Link>
        <Link href="#" aria-disabled>Plans</Link>
      </div>
      <div className="right">
        {!user ? (<>
            <Link className="btn" href="/login">Log In</Link>
            <Link className="btn primary" href="/signup">Sign Up</Link>
          </>) : (<div className="userChip">
            <span style={{ fontSize: 13 }}>{user.email}</span>
            <button className="btn" onClick={onLogout}>Logout</button>
          </div>)}
      </div>
    </nav>);
}
