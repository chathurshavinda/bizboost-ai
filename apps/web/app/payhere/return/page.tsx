"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";

type SubscriptionResponse = {
  ok: boolean;
  data?: {
    status?: string;
    planName?: string | null;
    planDays?: number | null;
    amount?: number | null;
    currency?: string | null;
    lastPaidAt?: string | null;
    nextRenewalAt?: string | null;
  };
  lastOrder?: {
    orderId?: string;
    status?: string;
    statusMessage?: string | null;
  } | null;
  error?: string;
};

type ViewState =
  | { kind: "loading" }
  | { kind: "active"; payload: NonNullable<SubscriptionResponse["data"]> }
  | { kind: "pending"; orderStatus: string | null; orderMessage: string | null }
  | { kind: "failed"; orderStatus: string | null; orderMessage: string | null };

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 60_000;

export default function PayHereReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const orderId = searchParams.get("order_id") ?? "";
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const url = new URL("/api/subscription", window.location.origin);
        url.searchParams.set("firebase_uid", user.uid);
        if (orderId) url.searchParams.set("order_id", orderId);

        const res = await fetch(url.toString(), { cache: "no-store" });
        const data = (await res.json()) as SubscriptionResponse;
        if (cancelled) return;

        if (res.ok && data.ok && data.data?.status === "active") {
          setView({ kind: "active", payload: data.data });
          return;
        }

        const orderStatus = data.lastOrder?.status ?? null;
        const orderMessage = data.lastOrder?.statusMessage ?? null;

        if (
          orderStatus === "failed" ||
          orderStatus === "cancelled" ||
          orderStatus === "chargedback"
        ) {
          setView({ kind: "failed", orderStatus, orderMessage });
          return;
        }

        const elapsed = Date.now() - startedAtRef.current;
        if (elapsed >= POLL_MAX_MS) {
          setView({ kind: "pending", orderStatus, orderMessage });
          return;
        }

        setView({ kind: "pending", orderStatus, orderMessage });
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        const elapsed = Date.now() - startedAtRef.current;
        if (elapsed < POLL_MAX_MS) {
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setView({ kind: "pending", orderStatus: null, orderMessage: null });
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.uid, orderId, router]);

  return (
    <div className="returnPage">
      <div className="returnShell">
        {view.kind === "loading" || view.kind === "pending" ? (
          <PendingCard
            orderStatus={view.kind === "pending" ? view.orderStatus : null}
            orderMessage={view.kind === "pending" ? view.orderMessage : null}
          />
        ) : null}

        {view.kind === "active" ? <SuccessCard data={view.payload} /> : null}

        {view.kind === "failed" ? (
          <FailedCard orderStatus={view.orderStatus} orderMessage={view.orderMessage} />
        ) : null}
      </div>

      <style jsx>{`
        .returnPage {
          min-height: 100vh;
          padding: 32px 16px;
          background: var(--page-bg, #f8fafc);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .returnShell {
          width: 100%;
          max-width: 520px;
        }
      `}</style>
    </div>
  );
}

function PendingCard({
  orderStatus,
  orderMessage,
}: {
  orderStatus: string | null;
  orderMessage: string | null;
}) {
  return (
    <div className="card">
      <div className="spinner" aria-hidden="true" />
      <h1>Confirming your payment...</h1>
      <p>
        We are securely verifying your subscription with PayHere. This usually takes a few
        seconds.
      </p>
      {orderStatus ? (
        <p className="hint">
          Current status: <strong>{orderStatus}</strong>
          {orderMessage ? ` — ${orderMessage}` : null}
        </p>
      ) : null}

      <style jsx>{`
        .card {
          padding: 28px 24px;
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.1);
          text-align: center;
        }

        .spinner {
          width: 36px;
          height: 36px;
          margin: 0 auto 16px;
          border-radius: 999px;
          border: 3px solid #cbd5e1;
          border-top-color: #0f172a;
          animation: spin 1s linear infinite;
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
          line-height: 1.55;
        }

        .hint {
          margin-top: 14px;
          font-size: 13px;
          color: #64748b;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function SuccessCard({
  data,
}: {
  data: NonNullable<SubscriptionResponse["data"]>;
}) {
  const nextRenewal = data.nextRenewalAt ? new Date(data.nextRenewalAt) : null;
  return (
    <div className="card">
      <div className="successBadge">Payment successful</div>
      <h1>Welcome to {data.planName ?? "BizBoost"}!</h1>
      <p>
        Your <strong>{data.planDays ?? ""}-day</strong> recurring subscription is now active.
        We&apos;ll charge {data.currency ?? "LKR"} {data.amount?.toFixed(2) ?? ""} automatically
        every cycle.
      </p>

      {nextRenewal ? (
        <p className="hint">Next renewal: {nextRenewal.toLocaleString()}</p>
      ) : null}

      <div className="actions">
        <Link href="/marketing-plan" className="cta primary">
          Open Marketing Plan
        </Link>
        <Link href="/settings" className="cta">
          Manage Subscription
        </Link>
      </div>

      <style jsx>{`
        .card {
          padding: 30px 26px;
          border-radius: 22px;
          border: 1px solid rgba(34, 197, 94, 0.28);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(240, 253, 244, 0.96));
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12);
          text-align: center;
        }

        .successBadge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.14);
          color: #166534;
          font-size: 11px;
          letter-spacing: 0.14em;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        h1 {
          margin: 0 0 8px;
          font-size: 26px;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        p {
          margin: 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.6;
        }

        .hint {
          margin-top: 12px;
          color: #64748b;
          font-size: 13px;
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

function FailedCard({
  orderStatus,
  orderMessage,
}: {
  orderStatus: string | null;
  orderMessage: string | null;
}) {
  return (
    <div className="card">
      <div className="errorBadge">Payment unsuccessful</div>
      <h1>We couldn&apos;t activate your subscription</h1>
      <p>
        Your payment was {orderStatus ?? "not completed"}
        {orderMessage ? ` (${orderMessage})` : "."} You haven&apos;t been charged for a
        recurring cycle.
      </p>
      <div className="actions">
        <Link href="/select-plan" className="cta primary">
          Try a different plan
        </Link>
        <Link href="/dashboard/profile" className="cta">
          Back to dashboard
        </Link>
      </div>

      <style jsx>{`
        .card {
          padding: 30px 26px;
          border-radius: 22px;
          border: 1px solid rgba(248, 113, 113, 0.32);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(254, 242, 242, 0.94));
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12);
          text-align: center;
        }

        .errorBadge {
          display: inline-flex;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(239, 68, 68, 0.14);
          color: #991b1b;
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
