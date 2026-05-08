"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
const plans = [
    {
        name: "Starter",
        days: 7,
        label: "7 Days",
        bullets: ["Quick launch", "Simple actions", "Fast results"],
    },
    {
        name: "Pro",
        days: 14,
        label: "14 Days",
        bullets: ["More reach", "Steady growth", "Better rhythm"],
    },
    {
        name: "Premium",
        days: 30,
        label: "30 Days",
        bullets: ["Full month", "Deeper planning", "Strong momentum"],
    },
];
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
                const res = await fetch(`/api/select-plan?firebase_uid=${encodeURIComponent(user.uid)}`, {
                    cache: "no-store",
                });
                const data = await res.json();
                if (cancelled)
                    return;
                if (res.ok && data?.ok && data.data) {
                    const days = Number(data.data.plan_days ?? data.data.planDays ?? 0);
                    if ([7, 14, 30].includes(days)) {
                        setSelected(days);
                    }
                }
            }
            catch {
            }
            finally {
                if (!cancelled)
                    setPlanHydrated(true);
            }
        };
        void loadSelected();
        return () => {
            cancelled = true;
        };
    }, [authLoading, user?.uid, isNewMode]);
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
        }
        catch (error: unknown) {
            const text = error instanceof Error ? error.message : "Something went wrong";
            setErrorText(text);
            setSavingNotice(null);
        }
        finally {
            setSavingPlanDays(null);
            setTimeout(() => setSavingNotice(null), 800);
        }
    }
    return (<div className="selectPlanPage">
      <div className="selectPlanShell">
        <section className="selectPlanHeader">
          <div className="selectPlanHeaderInner">
            <p className="eyebrow">Plan Selection</p>
            <h1>Select Plan</h1>
            <p className="subtitle">
              {isNewMode
            ? "Pick a new duration for your next fresh plan."
            : "Pick the right duration for your marketing plan. You can update this later anytime."}
            </p>
          </div>
        </section>

        {savingNotice && (<section className="notice noticeInfo">
            <p>{savingNotice}</p>
            <span className="spinner"/>
          </section>)}

        {errorText && (<section className="notice noticeError">
            <div className="noticeRow">
              <p>{errorText}</p>
              <button type="button" onClick={() => selected !== null && void persistPlan(selected)} className="retryBtn">
                Try again
              </button>
            </div>
          </section>)}

        <section className="planGrid">
          {plans.map((plan) => {
            const isSelected = selected === plan.days;
            return (<button key={plan.days} type="button" onClick={() => {
                    setSelected(plan.days);
                    void persistPlan(plan.days);
                }} disabled={savingPlanDays !== null || authLoading || !planHydrated} className={`planCard ${isSelected ? "isSelected" : ""} ${savingPlanDays !== null || authLoading || !planHydrated ? "isDisabled" : ""}`}>
                <div className="planCardGlow"/>
                <div className="planTop">
                  <div>
                    {plan.name === "Pro" && <span className="popularTag">Popular</span>}
                    <div className="planLabel">{plan.label}</div>
                    <h3>{plan.name}</h3>
                    <p className="planDays">{plan.days} day plan</p>
                  </div>
                  <div className={`checkCircle ${isSelected ? "active" : ""}`}>{isSelected ? "✓" : "○"}</div>
                </div>

                <div className={`cardCta ${isSelected ? "active" : ""}`}>Get Started</div>
                <p className="included">What&apos;s included:</p>

                <ul>
                  {plan.bullets.map((bullet) => (<li key={bullet}>
                      <span>✓</span>
                      {bullet}
                    </li>))}
                </ul>
              </button>);
        })}
        </section>

        <div className="actions">
          <button type="button" onClick={() => router.push("/dashboard/profile")} className="backBtn">
            Back
          </button>

          <button type="button" disabled={selected === null || savingPlanDays !== null || authLoading || !planHydrated} onClick={() => isNewMode
            ? router.push(`/plan-builder?mode=new&days=${selected ?? 7}`)
            : router.push("/marketing-plan")} className="nextBtn">
            {isNewMode ? "Continue" : "Next"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .selectPlanPage {
          min-height: 100vh;
          padding: 30px 16px 16px;
          background: var(--page-bg);
        }

        .selectPlanShell {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .selectPlanHeader {
          border-radius: 30px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.76);
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(14px);
          padding: 30px 22px;
        }

        .selectPlanHeaderInner {
          max-width: 700px;
          margin: 0 auto;
          text-align: center;
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
          margin: 10px 0 0;
          color: #0f172a;
          font-size: clamp(32px, 5vw, 52px);
          line-height: 1.06;
          letter-spacing: -0.02em;
        }

        .subtitle {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 15px;
          line-height: 1.6;
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
          gap: 14px;
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
          min-height: 286px;
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
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid #e5e5e5;
          background: #f5f5f5;
          color: #111111;
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
          margin-top: 16px;
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
          gap: 10px;
          flex-wrap: wrap;
        }

        .backBtn,
        .nextBtn {
          border-radius: 12px;
          padding: 12px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.14s ease, filter 0.14s ease, box-shadow 0.14s ease;
        }

        .backBtn {
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.85);
          color: #334155;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
        }

        .nextBtn {
          border: 1px solid #111111;
          background: #111111;
          color: #ffffff;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.2);
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
        }
      `}</style>
    </div>);
}
