"use client";
import { useRouter } from "next/navigation";
export default function WelcomePage() {
    const router = useRouter();
    return (<div className="authWrap" style={{ padding: 24 }}>
      <div style={{
            width: "100%",
            maxWidth: 760,
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.4)",
            background: "radial-gradient(circle at top left, rgba(34,211,238,0.2), transparent 45%), radial-gradient(circle at bottom right, rgba(34,197,94,0.22), transparent 45%), rgba(15,23,42,0.86)",
            boxShadow: "0 28px 90px rgba(2,6,23,0.65)",
            padding: 28,
            color: "var(--text-heading)",
        }}>
        <div style={{
            display: "inline-flex",
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid rgba(34,211,238,0.5)",
            color: "var(--accent-teal)",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 14,
        }}>
          BizBoost AI
        </div>

        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.12 }}>Welcome to BizBoost AI 🎉</h1>
        <p style={{ margin: "10px 0 0", color: "var(--text-body)", fontSize: 16 }}>
          You can complete your business profile now to unlock tailored strategy and content generation.
        </p>
        <p style={{ margin: "10px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
          You can complete it now or later.
        </p>

        <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn primary" onClick={() => router.push("/business-details")}>
            Go to Business Details
          </button>
          <button type="button" className="btn" onClick={() => router.push("/dashboard")}>
            Skip for now
          </button>
        </div>
      </div>
    </div>);
}
