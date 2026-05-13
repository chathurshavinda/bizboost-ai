"use client";

import Link from "next/link";

export default function PayHereCancelPage() {
  return (
    <div className="cancelPage">
      <div className="card">
        <div className="badge">Payment cancelled</div>
        <h1>You cancelled the payment</h1>
        <p>
          No worries — you haven&apos;t been charged. You can pick a different plan or try
          subscribing again whenever you&apos;re ready.
        </p>

        <div className="actions">
          <Link href="/select-plan" className="cta primary">
            Back to plans
          </Link>
          <Link href="/dashboard/profile" className="cta">
            Go to dashboard
          </Link>
        </div>
      </div>

      <style jsx>{`
        .cancelPage {
          min-height: 100vh;
          padding: 32px 16px;
          background: var(--page-bg, #f8fafc);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card {
          width: 100%;
          max-width: 520px;
          padding: 30px 26px;
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.1);
          text-align: center;
        }

        .badge {
          display: inline-flex;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.18);
          color: #475569;
          font-size: 11px;
          letter-spacing: 0.14em;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        h1 {
          margin: 0 0 8px;
          font-size: 22px;
          color: #0f172a;
        }

        p {
          margin: 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.6;
        }

        .actions {
          margin-top: 22px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 12px 22px;
          font-size: 14px;
          font-weight: 700;
          border: 1px solid rgba(148, 163, 184, 0.45);
          background: #ffffff;
          color: #0f172a;
          text-decoration: none;
        }

        .cta.primary {
          background: #111111;
          color: #ffffff;
          border-color: #111111;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.22);
        }
      `}</style>
    </div>
  );
}
