"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type CheckoutResponse = {
  ok: boolean;
  error?: string;
  data?: {
    checkoutUrl: string;
    orderId: string;
    fields: Record<string, string>;
  };
};

type SubscriptionData = {
  status?: string;
  planDays?: number | null;
  planName?: string | null;
  nextRenewalAt?: string | null;
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

export default function SelectPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const isNewMode = searchParams.get("mode") === "new";
  const [selected, setSelected] = useState<number | null>(null);
  const [savingPlanDays, setSavingPlanDays] = useState<number | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [savingNotice, setSavingNotice] = useState<string | null>(null);
  const [planHydrated, setPlanHydrated] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

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

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    const loadSubscription = async () => {
      try {
        const res = await fetch(
          `/api/subscription?firebase_uid=${encodeURIComponent(user.uid)}`,
          { cache: "no-store" },
        );
        if (res.status === 404) {
          if (!cancelled) setSubscription(null);
          return;
        }
        const data = (await res.json()) as SubscriptionResponse;
        if (cancelled) return;
        if (res.ok && data.ok && data.data) {
          setSubscription(data.data);
        }
      } catch {
        // ignore
      }
    };
    void loadSubscription();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

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

  async function persistPlan(days: number) {
    if (!user?.uid) {
      router.replace("/login");
      return;
    }
    try {
      setErrorText(null);
      setSavingNotice("Saving...");
      setSavingPlanDays(days);
      const res = await fetch("/api/select-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebase_uid: user.uid,
          planDays: days,
          nextPlanDays: days,
          mode: isNewMode ? "new" : "default",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save plan");
      }
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : "Something went wrong";
      setErrorText(text);
      setSavingNotice(null);
    } finally {
      setSavingPlanDays(null);
      setTimeout(() => setSavingNotice(null), 800);
    }
  }

  async function startCheckout() {
    if (!user?.uid || selected === null) return;
    if (checkoutLoading) return;

    setErrorText(null);
    setCheckoutLoading(true);
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
      const data = (await res.json()) as CheckoutResponse;
      if (!res.ok || !data.ok || !data.data) {
        throw new Error(data.error || "Failed to start PayHere checkout");
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.data.checkoutUrl;
      form.style.display = "none";

      for (const [name, value] of Object.entries(data.data.fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = String(value ?? "");
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : "Failed to start checkout";
      setErrorText(text);
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="bb-page">
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
            {hasActiveSubscription && (
              <section className="notice noticeSuccess">
                <p>
                  You already have an active subscription
                  {subscribedPlanLabel ? `: ${subscribedPlanLabel}` : ""}. Choosing a new plan
                  will start a new recurring subscription via PayHere.
                </p>
              </section>
            )}

            {savingNotice && (
              <section className="notice noticeInfo">
                <p>{savingNotice}</p>
                <span className="spinner" />
              </section>
            )}

            {errorText && (
              <section className="notice noticeError">
                <div className="noticeRow">
                  <p>{errorText}</p>
                  <button
                    type="button"
                    onClick={() => selected !== null && void persistPlan(selected)}
                    className="retryBtn"
                  >
                    Try again
                  </button>
                </div>
              </section>
            )}

            <section className="planGrid">
              {plans.map((plan) => {
                const isSelected = selected === plan.days;
                const isFeatured = plan.days === 14;
                return (
                  <button
                    key={plan.days}
                    type="button"
                    onClick={() => {
                      setSelected(plan.days);
                      void persistPlan(plan.days);
                    }}
                    disabled={
                      savingPlanDays !== null ||
                      authLoading ||
                      !planHydrated ||
                      checkoutLoading
                    }
                    className={`planCard ${isFeatured ? "planCardFeatured" : ""} ${
                      isSelected ? "isSelected" : ""
                    } ${
                      savingPlanDays !== null || authLoading || !planHydrated || checkoutLoading
                        ? "isDisabled"
                        : ""
                    }`}
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
                  savingPlanDays !== null ||
                  authLoading ||
                  !planHydrated ||
                  checkoutLoading
                }
                onClick={() => void startCheckout()}
                className="nextBtn"
              >
                {checkoutLoading
                  ? "Redirecting to PayHere..."
                  : hasActiveSubscription
                    ? "Switch plan & Pay"
                    : "Subscribe & Pay"}
              </button>
            </div>

            <p className="secureNote">
              Payments are securely processed by PayHere. You can cancel or change your plan
              anytime.
            </p>
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

        .noticeInfo {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .notice p {
          margin: 0;
          font-size: 14px;
          color: #334155;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid #cbd5e1;
          border-top-color: #0f172a;
          animation: spin 1s linear infinite;
        }

        .noticeError {
          border-color: rgba(251, 113, 133, 0.42);
        }

        .noticeSuccess {
          border-color: rgba(34, 197, 94, 0.42);
          background: rgba(240, 253, 244, 0.85);
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

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
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
