"use client";
export const dynamic = "force-dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { useAuth } from "@/src/lib/useAuth";

type PlanCardConfig = {
  name: string;
  days: 7 | 14 | 30;
  label: string;
  price: number;
  currency: string;
  cadence: string;
  bullets: string[];
};

const plans: PlanCardConfig[] = [
  {
    name: "Starter",
    days: 7,
    label: "7 Days",
    price: 500,
    currency: "LKR",
    cadence: "billed every week",
    bullets: ["Quick launch", "Simple actions", "Fast results"],
  },
  {
    name: "Pro",
    days: 14,
    label: "14 Days",
    price: 900,
    currency: "LKR",
    cadence: "billed every 2 weeks",
    bullets: ["More reach", "Steady growth", "Better rhythm"],
  },
  {
    name: "Premium",
    days: 30,
    label: "30 Days",
    price: 1500,
    currency: "LKR",
    cadence: "billed every month",
    bullets: ["Full month", "Deeper planning", "Strong momentum"],
  },
];

type PayHerePopupConfig = {
  sandbox: boolean;
  merchant_id: string;
  return_url?: string | null;
  cancel_url?: string | null;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
  currency: string;
  hash: string;
  recurrence?: string;
  duration?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  custom_1?: string;
  custom_2?: string;
};

type PayHereSDK = {
  startPayment: (config: PayHerePopupConfig) => void;
  onCompleted?: (orderId: string) => void;
  onDismissed?: () => void;
  onError?: (error: string) => void;
};

declare global {
  interface Window {
    payhere?: PayHereSDK;
  }
}

type InitiateResponse = {
  ok: boolean;
  error?: string;
  data?: {
    orderId: string;
    popupConfig: PayHerePopupConfig;
    plan: {
      name: string;
      price: number;
      currency: string;
      recurrence: string;
      duration: string;
      planDays: number;
    };
  };
};

type SubscriptionData = {
  status?: string;
  planDays?: number | null;
  planName?: string | null;
  amount?: number | null;
  currency?: string | null;
  nextRenewalAt?: string | null;
  lastPaidAt?: string | null;
};

type SubscriptionResponse = {
  ok: boolean;
  data?: SubscriptionData;
};

type ProfileData = {
  businessName?: string;
  ownerOrManagerName?: string;
  contactEmail?: string;
  city?: string;
  country?: string;
};

type CheckoutStage =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "opening" }
  | { kind: "activating"; orderId: string }
  | { kind: "success"; data: SubscriptionData; orderId: string }
  | { kind: "pending_notify"; orderId: string }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

const IS_DEV = process.env.NODE_ENV !== "production";

export default function SelectPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const isNewMode = searchParams.get("mode") === "new";

  const [selected, setSelected] = useState<number | null>(null);
  const [planHydrated, setPlanHydrated] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stage, setStage] = useState<CheckoutStage>({ kind: "idle" });
  const [sdkReady, setSdkReady] = useState(false);
  const [devConfirming, setDevConfirming] = useState(false);
  const [devConfirmError, setDevConfirmError] = useState<string | null>(null);

  const handlersBoundRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || !user?.uid || isNewMode) {
      setPlanHydrated(true);
      return;
    }
    let cancelled = false;
    const loadSelected = async () => {
      try {
        const res = await fetch(
          `/api/select-plan?firebase_uid=${encodeURIComponent(user.uid)}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data?.ok && data.data) {
          const days = Number(data.data.plan_days ?? data.data.planDays ?? 0);
          if ([7, 14, 30].includes(days)) {
            setSelected(days);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setPlanHydrated(true);
      }
    };
    void loadSelected();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.uid, isNewMode]);

  const fetchSubscription = useCallback(
    async (uid: string): Promise<SubscriptionData | null> => {
      try {
        const res = await fetch(
          `/api/subscription?firebase_uid=${encodeURIComponent(uid)}`,
          { cache: "no-store" },
        );
        if (res.status === 404) return null;
        const data = (await res.json()) as SubscriptionResponse;
        if (res.ok && data.ok && data.data) return data.data;
        return null;
      } catch {
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    void (async () => {
      const data = await fetchSubscription(user.uid);
      if (!cancelled) setSubscription(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, fetchSubscription]);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const res = await fetch(
          `/api/business-profile?firebase_uid=${encodeURIComponent(user.uid)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.ok && data.data) {
          setProfile(data.data as ProfileData);
        }
      } catch {
        // ignore
      }
    };
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const hasActiveSubscription = subscription?.status === "active";

  const subscribedPlanLabel = useMemo(() => {
    if (!subscription) return null;
    const days = subscription.planDays;
    const matched = plans.find((p) => p.days === days);
    return matched ? `${matched.name} (${matched.label})` : null;
  }, [subscription]);

  const handleCompleted = useCallback(
    async (orderId: string) => {
      if (!user?.uid) return;
      setStage({ kind: "activating", orderId });
      // The popup signals success on the client; the real server-side state
      // change happens via PayHere's `notify_url` webhook. We give the webhook
      // a brief window to land, then check the subscription exactly once.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const sub = await fetchSubscription(user.uid);
      if (sub?.status === "active") {
        setSubscription(sub);
        setStage({ kind: "success", data: sub, orderId });
      } else {
        setStage({ kind: "pending_notify", orderId });
      }
    },
    [user?.uid, fetchSubscription],
  );

  const bindPayHereHandlers = useCallback(() => {
    if (typeof window === "undefined" || !window.payhere) return;
    if (handlersBoundRef.current) return;
    handlersBoundRef.current = true;

    window.payhere.onCompleted = (orderId: string) => {
      void handleCompleted(orderId);
    };
    window.payhere.onDismissed = () => {
      setStage((current) =>
        current.kind === "opening" || current.kind === "preparing"
          ? { kind: "cancelled" }
          : current,
      );
    };
    window.payhere.onError = (error: string) => {
      setStage({ kind: "error", message: error || "PayHere reported an error." });
    };
  }, [handleCompleted]);

  useEffect(() => {
    if (sdkReady) bindPayHereHandlers();
  }, [sdkReady, bindPayHereHandlers]);

  const startCheckout = useCallback(async () => {
    if (!user?.uid || selected === null) return;
    if (stage.kind === "preparing" || stage.kind === "opening" || stage.kind === "activating") {
      return;
    }
    if (!sdkReady || typeof window === "undefined" || !window.payhere) {
      setStage({
        kind: "error",
        message: "PayHere is still loading. Please try again in a moment.",
      });
      return;
    }

    setStage({ kind: "preparing" });
    bindPayHereHandlers();

    try {
      const displayName = user.displayName ?? "";
      const [firstName, ...rest] = displayName.split(" ").filter(Boolean);
      const lastName = rest.join(" ");
      const profileFirstName = profile?.ownerOrManagerName?.split(" ")[0];
      const profileLastName = profile?.ownerOrManagerName?.split(" ").slice(1).join(" ");

      const customerPayload = {
        first_name: firstName || profileFirstName || "Customer",
        last_name: lastName || profileLastName || "User",
        email: user.email || profile?.contactEmail || "",
        phone: "0770000000",
        address: profile?.businessName || "Address",
        city: profile?.city || "Colombo",
        country: profile?.country || "Sri Lanka",
      };

      const res = await fetch("/api/payhere/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebase_uid: user.uid,
          planDays: selected,
          customer: customerPayload,
        }),
      });
      const data = (await res.json()) as InitiateResponse;
      if (!res.ok || !data.ok || !data.data) {
        throw new Error(data.error || "Failed to start PayHere checkout");
      }

      setStage({ kind: "opening" });
      window.payhere.startPayment(data.data.popupConfig);
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : "Failed to start checkout";
      setStage({ kind: "error", message: text });
    }
  }, [user, selected, profile, sdkReady, bindPayHereHandlers, stage.kind]);

  const handleDevConfirm = useCallback(async () => {
    if (stage.kind !== "pending_notify" || !user?.uid) return;
    setDevConfirming(true);
    setDevConfirmError(null);
    try {
      const res = await fetch("/api/payhere/dev-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebase_uid: user.uid, order_id: stage.orderId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Dev confirm failed (${res.status}).`);
      }
      const sub = await fetchSubscription(user.uid);
      if (sub?.status !== "active") {
        throw new Error("Confirmed, but subscription is still not active.");
      }
      setSubscription(sub);
      setStage({ kind: "success", data: sub, orderId: stage.orderId });
    } catch (err) {
      setDevConfirmError(err instanceof Error ? err.message : "Could not confirm payment.");
    } finally {
      setDevConfirming(false);
    }
  }, [stage, user?.uid, fetchSubscription]);

  const checkoutBusy =
    stage.kind === "preparing" || stage.kind === "opening" || stage.kind === "activating";

  const checkoutButtonLabel = (() => {
    if (stage.kind === "preparing") return "Preparing checkout…";
    if (stage.kind === "opening") return "Opening PayHere…";
    if (stage.kind === "activating") return "Confirming payment…";
    if (hasActiveSubscription) return "Switch plan & Pay";
    return "Subscribe & Pay";
  })();

  return (
    <div className="bb-page">
      <Script
        src="https://www.payhere.lk/lib/payhere.js"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
        onReady={() => setSdkReady(true)}
      />

      <section className="bb-hero-dark">
        <div className="bb-hero-dark-inner bb-hero-centered bb-hero-selectPlan mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
          <p className="bb-eyebrow-dark">Plan Selection</p>
          <h1 className="bb-title-dark">Select Plan</h1>
          <p className="bb-lead-dark">
            {isNewMode
              ? "Pick a new duration for your next fresh plan."
              : "Pick the right duration for your marketing plan. Each plan is a recurring subscription that you can manage anytime."}
          </p>
        </div>
      </section>

      <section className="bb-band-light">
        <div className="bb-shell">
          <div className="selectPlanContent">
            {hasActiveSubscription && stage.kind !== "success" && (
              <section className="notice noticeSuccess">
                <p>
                  You already have an active subscription
                  {subscribedPlanLabel ? `: ${subscribedPlanLabel}` : ""}. Choosing a new plan
                  will start a new recurring subscription via PayHere.
                </p>
              </section>
            )}

            {stage.kind === "error" && (
              <section className="notice noticeError">
                <div className="noticeRow">
                  <p>{stage.message}</p>
                  <button
                    type="button"
                    onClick={() => setStage({ kind: "idle" })}
                    className="retryBtn"
                  >
                    Dismiss
                  </button>
                </div>
              </section>
            )}

            {stage.kind === "cancelled" && (
              <section className="notice noticeWarn">
                <div className="noticeRow">
                  <p>Checkout was closed before payment was completed. You can try again.</p>
                  <button
                    type="button"
                    onClick={() => setStage({ kind: "idle" })}
                    className="retryBtn"
                  >
                    Dismiss
                  </button>
                </div>
              </section>
            )}

            {stage.kind === "success" && (
              <section className="successCard">
                <div className="successBadge">Subscription active</div>
                <h2>You&apos;re on Pro</h2>
                <p>
                  PayHere confirmed your payment.{" "}
                  <strong>
                    {stage.data.planName ?? `${stage.data.planDays ?? ""}-day plan`}
                  </strong>{" "}
                  is now active. Pro features are unlocked.
                </p>
                {stage.data.nextRenewalAt ? (
                  <p className="hint">
                    Next renewal: {new Date(stage.data.nextRenewalAt).toLocaleString()}
                  </p>
                ) : null}
                <div className="successActions">
                  <Link href="/marketing-plan" className="primaryBtn">
                    Open marketing plan
                  </Link>
                  <Link href="/settings" className="ghostBtn">
                    Subscription &amp; settings
                  </Link>
                </div>
              </section>
            )}

            {stage.kind === "pending_notify" && (
              <section className="notice noticePending">
                <p>
                  <strong>Payment received in PayHere.</strong> Activation happens on our server
                  via PayHere&apos;s callback (<code>notify_url</code>). If your machine isn&apos;t
                  publicly reachable (e.g. localhost), the callback won&apos;t land here. Open{" "}
                  <Link href="/settings">Settings</Link> shortly to confirm Pro is active.
                </p>
                {IS_DEV ? (
                  <div className="devBox">
                    <p className="devLabel">Local dev shortcut</p>
                    <p className="devHint">
                      Mark this exact order as paid for local testing only. Disabled in production.
                    </p>
                    <button
                      type="button"
                      className="devBtn"
                      onClick={() => void handleDevConfirm()}
                      disabled={devConfirming}
                    >
                      {devConfirming
                        ? "Confirming…"
                        : "Mark this order as paid (dev only)"}
                    </button>
                    {devConfirmError ? (
                      <p className="devError">{devConfirmError}</p>
                    ) : null}
                  </div>
                ) : null}
              </section>
            )}

            {stage.kind !== "success" && (
              <>
                <section className="planGrid">
                  {plans.map((plan) => {
                    const isSelected = selected === plan.days;
                    const isFeatured = plan.days === 14;
                    const isBusy = authLoading || !planHydrated || checkoutBusy;
                    return (
                      <button
                        key={plan.days}
                        type="button"
                        onClick={() => {
                          setStage((current) =>
                            current.kind === "error" || current.kind === "cancelled"
                              ? { kind: "idle" }
                              : current,
                          );
                          setSelected(plan.days);
                        }}
                        disabled={isBusy}
                        className={`planCard ${isFeatured ? "planCardFeatured" : ""} ${
                          isSelected ? "isSelected" : ""
                        } ${isBusy ? "isDisabled" : ""}`}
                      >
                        <div className="planCardGlow" />
                        <div className="planTop">
                          <div>
                            {isFeatured ? (
                              <span className="popularTag">Recommended</span>
                            ) : null}
                            <div className="planLabel">{plan.label}</div>
                            <h3>{plan.name}</h3>
                            <p className="planDays">{plan.days} day plan</p>
                          </div>
                          <div className={`checkCircle ${isSelected ? "active" : ""}`}>
                            {isSelected ? "✓" : "○"}
                          </div>
                        </div>

                        <div className="priceRow">
                          <span className="priceAmount">
                            {plan.currency} {plan.price.toLocaleString()}
                          </span>
                          <span className="priceCadence">{plan.cadence}</span>
                        </div>

                        <div className={`cardCta ${isSelected ? "active" : ""}`}>
                          {isSelected ? "Selected" : "Choose this plan"}
                        </div>
                        <p className="included">What&apos;s included:</p>

                        <ul>
                          {plan.bullets.map((bullet) => (
                            <li key={bullet}>
                              <span>✓</span>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </section>

                <div className="actions">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/profile")}
                    className="backBtn"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    disabled={
                      selected === null ||
                      authLoading ||
                      !planHydrated ||
                      !sdkReady ||
                      checkoutBusy
                    }
                    onClick={() => void startCheckout()}
                    className="nextBtn"
                  >
                    {checkoutButtonLabel}
                  </button>
                </div>

                <p className="secureNote">
                  Payments open in a secure PayHere popup. You can cancel or change your plan
                  anytime.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <style jsx>{`
        .selectPlanContent {
          display: grid;
          gap: clamp(18px, 3vw, 26px);
        }

        .notice {
          max-width: 680px;
          margin: 0 auto;
          border-radius: 16px;
          padding: 12px 14px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(255, 255, 255, 0.75);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(12px);
        }

        .notice p {
          margin: 0;
          font-size: 14px;
          color: #334155;
          line-height: 1.55;
        }

        .notice code {
          background: rgba(0, 0, 0, 0.06);
          padding: 1px 6px;
          border-radius: 6px;
          font-size: 12.5px;
        }

        .notice a {
          color: #0f172a;
          text-decoration: underline;
        }

        .noticeError {
          border-color: rgba(251, 113, 133, 0.42);
        }

        .noticeWarn {
          border-color: rgba(234, 179, 8, 0.42);
          background: rgba(254, 252, 232, 0.85);
        }

        .noticeSuccess {
          border-color: rgba(34, 197, 94, 0.42);
          background: rgba(240, 253, 244, 0.85);
        }

        .noticePending {
          border-color: rgba(99, 102, 241, 0.42);
          background: rgba(238, 242, 255, 0.85);
        }

        .noticeRow {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .retryBtn {
          border: 1px solid rgba(148, 163, 184, 0.52);
          background: #ffffff;
          color: #0f172a;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .devBox {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px dashed rgba(234, 179, 8, 0.55);
          background: rgba(254, 252, 232, 0.85);
        }

        .devLabel {
          margin: 0 0 6px;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          color: #854d0e;
        }

        .devHint {
          margin: 0 0 10px !important;
          font-size: 12.5px !important;
          color: #713f12 !important;
        }

        .devBtn {
          width: 100%;
          border-radius: 10px;
          padding: 10px 14px;
          border: 1px solid #f59e0b;
          background: #f59e0b;
          color: #1f2937;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .devBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .devError {
          margin: 10px 0 0 !important;
          font-size: 12.5px !important;
          color: #991b1b !important;
        }

        .successCard {
          max-width: 680px;
          margin: 0 auto;
          padding: 28px 24px;
          border-radius: 20px;
          border: 1px solid rgba(34, 197, 94, 0.32);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(240, 253, 244, 0.95));
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
          text-align: center;
        }

        .successBadge {
          display: inline-flex;
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

        .successCard h2 {
          margin: 0 0 8px;
          font-size: 24px;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .successCard p {
          margin: 0;
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
        }

        .successCard .hint {
          margin-top: 8px;
          font-size: 13px;
          color: #64748b;
        }

        .successActions {
          margin-top: 18px;
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .primaryBtn,
        .ghostBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 12px 22px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .primaryBtn {
          background: #111111;
          color: #ffffff;
          border: 1px solid #111111;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.22);
        }

        .ghostBtn {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.45);
        }

        .planGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(14px, 2.5vw, 22px);
          align-items: stretch;
        }

        .planCard {
          position: relative;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(12px);
          padding: 22px;
          text-align: left;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          cursor: pointer;
          overflow: hidden;
          min-height: 320px;
        }

        .planCard:hover {
          transform: none;
          border-color: rgba(148, 163, 184, 0.5);
          box-shadow: 0 24px 54px rgba(15, 23, 42, 0.14);
        }

        .planCard.isSelected {
          transform: none;
          border-color: #111111;
          box-shadow: 0 0 0 2px rgba(17, 17, 17, 0.18), 0 18px 40px rgba(15, 23, 42, 0.12);
        }

        .planCardFeatured {
          border-color: rgba(99, 102, 241, 0.42);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.94) 100%);
          box-shadow:
            0 0 0 2px rgba(99, 102, 241, 0.2),
            0 22px 56px rgba(99, 102, 241, 0.14),
            0 16px 42px rgba(15, 23, 42, 0.08);
        }

        .planCardFeatured:hover {
          border-color: rgba(99, 102, 241, 0.55);
        }

        .planCardFeatured.isSelected {
          border-color: #111111;
          box-shadow:
            0 0 0 2px rgba(17, 17, 17, 0.22),
            0 22px 56px rgba(15, 23, 42, 0.14);
        }

        .planCard.isDisabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .planCardGlow {
          position: absolute;
          inset: 0;
          background: radial-gradient(420px 140px at 12% -12%, rgba(17, 17, 17, 0.08), transparent 70%);
          opacity: 0;
          transition: opacity 0.18s ease;
          pointer-events: none;
        }

        .planCard:hover .planCardGlow,
        .planCard.isSelected .planCardGlow {
          opacity: 1;
        }

        .planTop {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .popularTag {
          display: inline-flex;
          margin-bottom: 10px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(99, 102, 241, 0.35);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(236, 72, 153, 0.1));
          color: #4338ca;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .planLabel {
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-weight: 700;
        }

        h3 {
          margin: 10px 0 0;
          font-size: 28px;
          line-height: 1.1;
          color: #0f172a;
        }

        .planDays {
          margin: 6px 0 0;
          font-size: 14px;
          color: #64748b;
        }

        .priceRow {
          position: relative;
          z-index: 1;
          margin-top: 16px;
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }

        .priceAmount {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .priceCadence {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }

        .checkCircle {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.85);
          color: #94a3b8;
          font-size: 15px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .checkCircle.active {
          border-color: transparent;
          background: #111111;
          color: #ffffff;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
        }

        .cardCta {
          position: relative;
          z-index: 1;
          margin-top: 14px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.38);
          background: rgba(255, 255, 255, 0.72);
          color: #0f172a;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
          padding: 10px 12px;
        }

        .cardCta.active {
          border-color: #e5e5e5;
          background: #f5f5f5;
          color: #111111;
        }

        .included {
          position: relative;
          z-index: 1;
          margin: 14px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        ul {
          position: relative;
          z-index: 1;
          margin: 10px 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 8px;
        }

        li {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #334155;
          font-size: 14px;
        }

        li span {
          color: #111111;
          font-weight: 700;
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 4px;
        }

        .backBtn,
        .nextBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 14px 28px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease;
        }

        .backBtn {
          border: 1px solid rgba(148, 163, 184, 0.45);
          background: #ffffff;
          color: #334155;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
        }

        .nextBtn {
          border: 1px solid #111111;
          background: #111111;
          color: #ffffff;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.22);
        }

        .backBtn:hover,
        .nextBtn:hover {
          transform: translateY(-1px);
          filter: brightness(1.02);
        }

        .nextBtn:disabled {
          cursor: not-allowed;
          filter: none;
          transform: none;
          border-color: rgba(148, 163, 184, 0.45);
          background: #cbd5e1;
          box-shadow: none;
          color: #ffffff;
        }

        .secureNote {
          margin: 0;
          text-align: center;
          color: #64748b;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .planGrid {
            grid-template-columns: 1fr;
          }

          h3 {
            font-size: 24px;
          }

          .actions {
            justify-content: stretch;
          }

          .backBtn,
          .nextBtn {
            flex: 1;
            min-width: 0;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
