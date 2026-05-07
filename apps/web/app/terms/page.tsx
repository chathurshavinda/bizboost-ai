import Link from "next/link";
export const metadata = {
    title: "Terms of Service | BizBoost AI",
    description: "Terms and conditions for using BizBoost AI.",
};
export default function TermsPage() {
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
    return (<main style={pageStyle}>
      <section style={cardStyle}>
        <p style={eyebrowStyle}>Legal</p>
        <h1 style={h1Style}>Terms of Service</h1>
        <p style={updatedStyle}>Last updated: May 4, 2026</p>

        <h2 style={h2Style}>1. Acceptance of Terms</h2>
        <p style={pStyle}>
          By accessing or using BizBoost AI, you agree to these Terms of Service.
          If you do not agree, please do not use the service.
        </p>

        <h2 style={h2Style}>2. Service Overview</h2>
        <p style={pStyle}>
          BizBoost AI helps businesses create planning content, marketing support
          assets, and workflow guidance. You are responsible for reviewing all
          outputs before publishing or acting on them.
        </p>

        <h2 style={h2Style}>3. Account Responsibilities</h2>
        <p style={pStyle}>
          You are responsible for account activity, login security, and the
          accuracy of information you provide in your business profile.
        </p>

        <h2 style={h2Style}>4. Acceptable Use</h2>
        <p style={pStyle}>
          You agree not to misuse the platform, attempt unauthorized access, or use
          BizBoost AI for unlawful, harmful, or deceptive content.
        </p>

        <h2 style={h2Style}>5. Generated Content</h2>
        <p style={pStyle}>
          AI-generated suggestions may be incomplete or incorrect. BizBoost AI does
          not guarantee business results, legal compliance, or platform approval for
          generated content.
        </p>

        <h2 style={h2Style}>6. Intellectual Property</h2>
        <p style={pStyle}>
          The BizBoost AI product, branding, and software remain our intellectual
          property. You retain rights to your original business inputs and media
          uploads, subject to applicable law.
        </p>

        <h2 style={h2Style}>7. Limitation of Liability</h2>
        <p style={pStyle}>
          To the fullest extent allowed by law, BizBoost AI is provided &quot;as
          is&quot; without warranties. We are not liable for indirect, incidental,
          or consequential damages resulting from your use of the platform.
        </p>

        <h2 style={h2Style}>8. Updates to Terms</h2>
        <p style={pStyle}>
          We may update these terms from time to time. Continued use of the service
          after updates means you accept the revised terms.
        </p>

        <h2 style={h2Style}>9. Contact</h2>
        <p style={pStyle}>
          For legal or support requests, contact us through your standard BizBoost
          AI support channel.
        </p>

        <div style={actionsStyle}>
          <Link href="/privacy" style={actionLinkStyle}>
            Read Privacy Policy
          </Link>
          <Link href="/" style={actionLinkStyle}>
            Back to Home
          </Link>
        </div>
      </section>
    </main>);
}
