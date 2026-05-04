"use client";

import Link from "next/link";
import { useAuth } from "../lib/useAuth";

const getInitial = (email?: string | null) =>
  email && email.length > 0 ? email.charAt(0).toUpperCase() : "U";

export default function Navbar() {
  const { user, loading } = useAuth();

  const initial = getInitial(user?.email ?? undefined);

  return (
    <nav className="navbar">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="logo">B</div>
        <div className="brand">BizBoost AI</div>
      </div>

      <div className="nav" style={{ flex: 1, justifyContent: "center" }}>
        <Link href="/">Home</Link>
        <Link href="#features">Features</Link>
      </div>

      <div className="right">
        {!loading && !user && (
          <Link className="btn primary" href="/login">
            Login
          </Link>
        )}

        {!loading && user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 9999,
              background: "rgba(15,23,42,0.78)",
              border: "1px solid rgba(148,163,184,0.45)",
              boxShadow: "0 14px 35px rgba(15,23,42,0.55)",
              backdropFilter: "blur(18px)",
              cursor: "default",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(15,23,42,0.9)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {initial}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
