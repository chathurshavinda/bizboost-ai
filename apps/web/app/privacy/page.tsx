import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | BizBoost AI",
  description: "How BizBoost AI collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  const pageStyle = {
    minHeight: "calc(100vh - 72px)",
    padding: "24px 16px 40px",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "center",
  } as const;
  const cardStyle = {
    width: "min(920px, 100%)",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.88)",
    boxShadow: "0 14px 36px rgba(15, 23, 42, 0.08)",
    padding: "clamp(18px, 3vw, 30px)",
  } as const;
  const eyebrowStyle = {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  } as const;
  const h1Style = {
    margin: "8px 0 0",
    color: "#0f172a",
    fontSize: "clamp(26px, 4vw, 38px)",
  } as const;
  const updatedStyle = {
    margin: "8px 0 18px",
    color: "#64748b",
    fontSize: "13px",
  } as const;
  const h2Style = {
    margin: "20px 0 8px",
    color: "#0f172a",
    fontSize: "18px",
  } as const;
  const pStyle = {
    margin: 0,
    color: "#334155",
    lineHeight: 1.65,
    fontSize: "15px",
  } as const;
  const actionsStyle = {
    marginTop: "24px",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
  } as const;
  const actionLinkStyle = {
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
    color: "#0f172a",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    borderRadius: "999px",
    padding: "9px 14px",
    background: "#ffffff",
  } as const;

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <p style={eyebrowStyle}>Legal</p>
        <h1 style={h1Style}>Privacy Policy</h1>
        <p style={updatedStyle}>Last updated: May 4, 2026</p>

        <h2 style={h2Style}>1. Information We Collect</h2>
        <p style={pStyle}>
          We collect account information, business profile details, planning data,
          and content you create or upload in order to provide the BizBoost AI
          service.
        </p>

        <h2 style={h2Style}>2. How We Use Information</h2>
        <p style={pStyle}>
          We use your data to authenticate users, generate plans, save progress,
          improve product experience, and maintain platform reliability and
          security.
        </p>

        <h2 style={h2Style}>3. Data Storage</h2>
        <p style={pStyle}>
          BizBoost AI uses third-party infrastructure including Firebase and
          MongoDB for authentication and data storage. Your data may be processed on
          secure cloud infrastructure used by these services.
        </p>

        <h2 style={h2Style}>4. AI Processing</h2>
        <p style={pStyle}>
          Plan generation features may process your business inputs through AI model
          providers. Avoid entering sensitive personal data unless required for your
          business use case.
        </p>

        <h2 style={h2Style}>5. Data Sharing</h2>
        <p style={pStyle}>
          We do not sell your personal data. We only share data with service
          providers needed to operate BizBoost AI, and when legally required.
        </p>

        <h2 style={h2Style}>6. Data Retention</h2>
        <p style={pStyle}>
          We retain data as long as needed to provide services, meet legal
          obligations, resolve disputes, and enforce agreements.
        </p>

        <h2 style={h2Style}>7. Your Choices</h2>
        <p style={pStyle}>
          You can update your profile information and business details in the app.
          You may request account-related support through official BizBoost AI
          support channels.
        </p>

        <h2 style={h2Style}>8. Security</h2>
        <p style={pStyle}>
          We apply reasonable technical and organizational safeguards, but no method
          of transmission or storage is completely secure.
        </p>

        <h2 style={h2Style}>9. Policy Updates</h2>
        <p style={pStyle}>
          We may update this policy periodically. Continued use of the platform
          after updates indicates acceptance of the revised policy.
        </p>

        <div style={actionsStyle}>
          <Link href="/terms" style={actionLinkStyle}>
            Read Terms of Service
          </Link>
          <Link href="/" style={actionLinkStyle}>
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
