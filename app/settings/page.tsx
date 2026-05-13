"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
import { logout } from "@/src/lib/auth";
import ConfirmActionModal from "@/src/components/ui/ConfirmActionModal";
type ThemeMode = "light" | "dark";
type SubscriptionInfo = {
    status?: string;
    planDays?: number | null;
    planName?: string | null;
    amount?: number | null;
    currency?: string | null;
    nextRenewalAt?: string | null;
    lastPaidAt?: string | null;
};
function maskEmail(email: string): string {
    const [name, domain] = email.split("@");
    if (!name || !domain)
        return email || "Not available";
    const prefix = name.slice(0, 1) || "*";
    return `${prefix}***@${domain}`;
}
function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
}
function formatPrice(amount: number | null | undefined, currency: string | null | undefined): string {
    if (amount === null || amount === undefined) return "—";
    return `${currency ?? "LKR"} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export default function SettingsPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [theme, setTheme] = useState<ThemeMode>("light");
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    useEffect(() => {
        const stored = (window.localStorage.getItem("theme") ?? "light") as ThemeMode;
        const nextTheme: ThemeMode = stored === "dark" ? "dark" : "light";
        setTheme(nextTheme);
    }, []);
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark")
            root.classList.add("dark");
        else
            root.classList.remove("dark");
        window.localStorage.setItem("theme", theme);
    }, [theme]);
    useEffect(() => {
        if (!loading && !user?.uid) {
            router.replace("/login");
        }
    }, [loading, user?.uid, router]);
    useEffect(() => {
        if (!user?.uid) return;
        let cancelled = false;
        const loadSubscription = async () => {
            setSubscriptionLoading(true);
            try {
                const res = await fetch(`/api/subscription?firebase_uid=${encodeURIComponent(user.uid)}`, {
                    cache: "no-store",
                });
                if (cancelled) return;
                if (res.status === 404) {
                    setSubscription(null);
                    return;
                }
                const data = await res.json();
                if (cancelled) return;
                if (res.ok && data?.ok && data.data) {
                    setSubscription(data.data as SubscriptionInfo);
                } else {
                    setSubscription(null);
                }
            } catch {
                if (!cancelled) setSubscription(null);
            } finally {
                if (!cancelled) setSubscriptionLoading(false);
            }
        };
        void loadSubscription();
        return () => {
            cancelled = true;
        };
    }, [user?.uid]);
    const maskedEmail = useMemo(() => maskEmail(user?.email ?? ""), [user?.email]);
    async function handleLogout() {
        setLoggingOut(true);
        await logout();
        setLoggingOut(false);
        setLogoutConfirmOpen(false);
        router.push("/login");
    }
    return (<div className="settingsPage">
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
            <button type="button" className={`themeBtn ${theme === "light" ? "themeBtn--active" : ""}`} onClick={() => setTheme("light")}>
              Light
            </button>
            <button type="button" className={`themeBtn ${theme === "dark" ? "themeBtn--active" : ""}`} onClick={() => setTheme("dark")}>
              Dark
            </button>
          </div>
        </section>

        <section className="settingsCard">
          <div className="sectionHead">
            <h2>Subscription</h2>
          </div>
          {subscriptionLoading ? (
            <p className="hint">Loading subscription...</p>
          ) : subscription && subscription.status === "active" ? (
            <div className="subscriptionBlock">
              <div className="subscriptionTopRow">
                <div>
                  <span className="subBadge subBadgeActive">Active</span>
                  <p className="subPlanName">
                    {subscription.planName ?? "Plan"} · {subscription.planDays}-day cycle
                  </p>
                </div>
                <div className="subPrice">
                  {formatPrice(subscription.amount, subscription.currency)}
                </div>
              </div>
              <div className="subMeta">
                <div className="subMetaItem">
                  <span>Last paid</span>
                  <strong>{formatDate(subscription.lastPaidAt)}</strong>
                </div>
                <div className="subMetaItem">
                  <span>Next renewal</span>
                  <strong>{formatDate(subscription.nextRenewalAt)}</strong>
                </div>
              </div>
              <div className="subActions">
                <button type="button" className="subBtn subBtnPrimary" onClick={() => router.push("/select-plan")}>
                  Change plan
                </button>
              </div>
            </div>
          ) : subscription && subscription.status ? (
            <div className="subscriptionBlock">
              <span className={`subBadge subBadge--${subscription.status}`}>{subscription.status}</span>
              <p className="hint">
                Your previous subscription is {subscription.status}. Start a new subscription to keep using BizBoost AI.
              </p>
              <div className="subActions">
                <button type="button" className="subBtn subBtnPrimary" onClick={() => router.push("/select-plan")}>
                  Subscribe again
                </button>
              </div>
            </div>
          ) : (
            <div className="subscriptionBlock">
              <p className="hint">You don&apos;t have an active subscription yet.</p>
              <div className="subActions">
                <button type="button" className="subBtn subBtnPrimary" onClick={() => router.push("/select-plan")}>
                  Choose a plan
                </button>
              </div>
            </div>
          )}
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

      <ConfirmActionModal open={logoutConfirmOpen} title="Confirm Logout" message="Are you sure you want to log out?" cancelText="Cancel" confirmText="Logout" danger confirming={loggingOut} onCancel={() => setLogoutConfirmOpen(false)} onConfirm={() => void handleLogout()}/>

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

        .subscriptionBlock {
          margin-top: 12px;
          display: grid;
          gap: 12px;
        }

        .subscriptionTopRow {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .subBadge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          border: 1px solid rgba(148, 163, 184, 0.32);
          background: rgba(148, 163, 184, 0.14);
          color: #475569;
        }

        .subBadgeActive {
          border-color: rgba(34, 197, 94, 0.4);
          background: rgba(34, 197, 94, 0.14);
          color: #166534;
        }

        .subBadge--cancelled,
        .subBadge--failed,
        .subBadge--chargedback {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(254, 226, 226, 0.85);
          color: #991b1b;
        }

        .subPlanName {
          margin: 8px 0 0;
          font-weight: 700;
          color: #0f172a;
          font-size: 16px;
        }

        .subPrice {
          font-weight: 800;
          font-size: 18px;
          color: #0f172a;
        }

        .subMeta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .subMetaItem {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.26);
          background: rgba(255, 255, 255, 0.8);
        }

        .subMetaItem span {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .subMetaItem strong {
          color: #0f172a;
          font-size: 14px;
        }

        .subActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .subBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid rgba(148, 163, 184, 0.45);
          background: #ffffff;
          color: #0f172a;
        }

        .subBtnPrimary {
          background: #111111;
          color: #ffffff;
          border-color: #111111;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22);
        }

        @media (max-width: 640px) {
          .subMeta {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>);
}
