"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
import { logout } from "@/src/lib/auth";
import ConfirmActionModal from "@/src/components/ui/ConfirmActionModal";

type ThemeMode = "light" | "dark";

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email || "Not available";
  const prefix = name.slice(0, 1) || "*";
  return `${prefix}***@${domain}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [theme, setTheme] = useState<ThemeMode>("light");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const stored = (window.localStorage.getItem("theme") ?? "light") as ThemeMode;
    const nextTheme: ThemeMode = stored === "dark" ? "dark" : "light";
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!loading && !user?.uid) {
      router.replace("/login");
    }
  }, [loading, user?.uid, router]);

  const maskedEmail = useMemo(() => maskEmail(user?.email ?? ""), [user?.email]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setLogoutConfirmOpen(false);
    router.push("/login");
  }

  return (
    <div className="settingsPage">
      <div className="settingsShell">
        <section className="settingsCard">
          <p className="eyebrow">Settings</p>
          <h1>Preferences</h1>
          <p className="lead">Customize your experience and manage your account settings.</p>
        </section>

        <section className="settingsCard">
          <div className="sectionHead">
            <h2>Theme</h2>
          </div>
          <p className="hint">Choose your preferred appearance mode.</p>
          <div className="themeToggle">
            <button
              type="button"
              className={`themeBtn ${theme === "light" ? "themeBtn--active" : ""}`}
              onClick={() => setTheme("light")}
            >
              Light
            </button>
            <button
              type="button"
              className={`themeBtn ${theme === "dark" ? "themeBtn--active" : ""}`}
              onClick={() => setTheme("dark")}
            >
              Dark
            </button>
          </div>
        </section>

        <section className="settingsCard">
          <div className="sectionHead">
            <h2>Account</h2>
          </div>
          <p className="hint">Signed in as {maskedEmail}</p>
          <button type="button" className="logoutBtn" onClick={() => setLogoutConfirmOpen(true)}>
            Logout
          </button>
        </section>

        <section className="settingsCard">
          <div className="sectionHead">
            <h2>About</h2>
          </div>
          <div className="aboutList">
            <div className="aboutItem">
              <span>Version</span>
              <strong>v1.0</strong>
            </div>
            <p>BizBoost helps SMEs plan and create marketing actions.</p>
          </div>
        </section>
      </div>

      <ConfirmActionModal
        open={logoutConfirmOpen}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        cancelText="Cancel"
        confirmText="Logout"
        danger
        confirming={loggingOut}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => void handleLogout()}
      />

      <style jsx>{`
        .settingsPage {
          min-height: 100vh;
          padding: 28px 16px 14px;
          background: var(--page-bg);
        }

        .settingsShell {
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .settingsCard {
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(12px);
          padding: 20px;
        }

        .eyebrow {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }

        h1 {
          margin: 8px 0 0;
          color: #0f172a;
          font-size: clamp(30px, 4vw, 40px);
          letter-spacing: -0.02em;
        }

        .lead {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.55;
        }

        .sectionHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        h2 {
          margin: 0;
          color: #0f172a;
          font-size: 20px;
        }

        .hint {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .themeToggle {
          margin-top: 12px;
          width: fit-content;
          display: inline-flex;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.34);
          padding: 6px;
          background: rgba(255, 255, 255, 0.72);
        }

        .themeBtn {
          border: none;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          background: transparent;
          cursor: pointer;
        }

        .themeBtn--active {
          color: #0f172a;
          background: #ffffff;
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.1);
        }

        .logoutBtn {
          margin-top: 12px;
          border: 1px solid rgba(239, 68, 68, 0.3);
          background: rgba(254, 242, 242, 0.9);
          color: #b91c1c;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .aboutList {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .aboutItem {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.26);
          background: rgba(255, 255, 255, 0.8);
          color: #475569;
          font-size: 14px;
        }

        .aboutList p {
          margin: 0;
          color: #64748b;
          line-height: 1.55;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
