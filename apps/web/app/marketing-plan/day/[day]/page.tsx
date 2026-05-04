"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";

type DayPlan = {
  dayNumber: number;
  dateISO?: string;
  dateLabel?: string;
  mainActionTitle?: string;
  businessGrowthAction?: string;
  executionSteps?: string[];
  postIdea?: string;
  caption?: string;
  marketingActivation?: {
    channel?: "instagram" | "facebook" | "both";
    formatPlan?: Array<"Reel" | "Story" | "FeedPost" | "Carousel">;
    contentBrief?: string;
    visualGuide?: string;
    postIdea?: string;
    caption?: string;
    hashtags?: string[];
    postingTime?: string;
    cta?: string;
    storyFrames?: string[];
    reelScript?: {
      hook?: string;
      beats?: string[];
      cta?: string;
    };
    posterHint?: string;
  };
  hashtags?: string[];
  successMetric?: string;
  posterHint?: string;
  notes?: string;
  completed?: boolean;
};

type LatestPlanResponse = {
  ok: boolean;
  plan?: {
    _id?: string;
    durationDays?: number;
    planDays?: DayPlan[];
    businessSnapshot?: {
      businessName?: string;
      businessType?: string;
    };
  };
  error?: string;
};

type ModalType = "missingBusiness" | "missingPlan" | "noPlan" | "serverError" | null;

type SuccessScoreData = {
  successPercent: number;
  reasons: string[];
  improvements: string[];
};

const cleanDayTitle = (title: string) => title.replace(/^Week\s*\d+\s*/i, "").replace(/^Day\s*\d+\s*/i, "").trim();


export default function MarketingPlanDayPage() {
  const params = useParams<{ day: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const dayNumber = Number(params?.day ?? 0);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [planDays, setPlanDays] = useState<number>(0);
  const [businessName, setBusinessName] = useState<string>("");
  const [businessProfile, setBusinessProfile] = useState<Record<string, unknown>>({});
  const [currentDay, setCurrentDay] = useState<DayPlan | null>(null);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [planId, setPlanId] = useState<string>("");
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [successScore, setSuccessScore] = useState<SuccessScoreData | null>(null);

  useEffect(() => {
    // Keep Day Detail pinned to top on initial load and day-id changes.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [dayNumber]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      router.replace("/login");
      return;
    }

    if (!Number.isFinite(dayNumber) || dayNumber <= 0) {
      router.push("/marketing-plan");
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setModalType(null);
      try {
        const businessRes = await fetch(`/api/business-profile?firebase_uid=${encodeURIComponent(user.uid)}`, { cache: "no-store" });
        const businessJson = await businessRes.json();
        if (businessRes.status === 404 || businessJson?.error === "business_profile_not_found") {
          setModalType("missingBusiness");
          return;
        }

        const selectedRes = await fetch(`/api/select-plan?firebase_uid=${encodeURIComponent(user.uid)}`, { cache: "no-store" });
        const selectedJson = await selectedRes.json();
        if (selectedRes.status === 404 || selectedJson?.error === "No plan selected" || selectedJson?.error === "plan_not_selected") {
          setModalType("missingPlan");
          return;
        }

        const latestRes = await fetch(`/api/marketing-plan/latest?firebase_uid=${encodeURIComponent(user.uid)}`, { cache: "no-store" });
        const latestJson = (await latestRes.json()) as LatestPlanResponse;

        if (latestRes.status === 404 || latestJson?.error === "no_plan_found") {
          setModalType("noPlan");
          return;
        }
        if (!latestRes.ok || !latestJson.ok) {
          setModalType("serverError");
          return;
        }

        const data = latestJson.plan ?? {};
        const safePlan = Array.isArray(data.planDays) ? data.planDays : [];
        const found = safePlan.find((item) => Number(item.dayNumber) === dayNumber) ?? null;

        if (!found) {
          router.push("/marketing-plan");
          return;
        }

        setCurrentDay({
          ...found,
          executionSteps: Array.isArray(found.executionSteps) ? found.executionSteps : [],
          hashtags: Array.isArray(found.hashtags) ? found.hashtags : [],
        });
        setBusinessProfile(
          businessJson?.data && typeof businessJson.data === "object" ? (businessJson.data as Record<string, unknown>) : {},
        );
        setBusinessName(data.businessSnapshot?.businessName ?? businessJson?.data?.businessName ?? "Business");
        setPlanDays(Number(data.durationDays ?? safePlan.length ?? 0));
        setCompletedDays(safePlan.filter((day) => day.completed).map((day) => day.dayNumber));
        setPlanId(typeof data._id === "string" ? data._id : "");
      } catch {
        setModalType("serverError");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [authLoading, user?.uid, router, dayNumber]);

  useEffect(() => {
    if (!user?.uid || !currentDay || !planId) return;
    let cancelled = false;

    const fetchScore = async (recalculate = false) => {
      if (cancelled) return;
      setScoreLoading(true);
      setScoreError("");
      try {
        const response = await fetch("/api/ai/success-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firebase_uid: user.uid,
            recalculate,
            businessProfile,
            dayPlan: {
              dayNumber: currentDay.dayNumber,
              dateLabel: currentDay.dateLabel,
              mainActionTitle: currentDay.mainActionTitle,
              businessGrowthAction: currentDay.businessGrowthAction,
              executionSteps: currentDay.executionSteps,
              postIdea: currentDay.marketingActivation?.postIdea ?? currentDay.postIdea,
              caption: currentDay.marketingActivation?.caption ?? currentDay.caption,
              successMetric: currentDay.successMetric,
            },
            planContext: {
              planId,
              dayNumber: currentDay.dayNumber,
              dateLabel: currentDay.dateLabel,
              totalDays: planDays,
            },
          }),
        });
        const json = await response.json();
        if (cancelled) return;
        if (!response.ok || !json?.ok || !json?.data) {
          setScoreError("Unable to load success probability.");
          return;
        }
        setSuccessScore({
          successPercent: Number(json.data.successPercent ?? 0),
          reasons: Array.isArray(json.data.reasons) ? json.data.reasons.map((item: unknown) => String(item)) : [],
          improvements: Array.isArray(json.data.improvements)
            ? json.data.improvements.map((item: unknown) => String(item))
            : [],
        });
      } catch {
        if (!cancelled) setScoreError("Unable to load success probability.");
      } finally {
        if (!cancelled) setScoreLoading(false);
      }
    };

    void fetchScore(false);
    return () => {
      cancelled = true;
    };
  }, [user?.uid, currentDay, planId, planDays, businessProfile]);

  const handleRecalculateScore = async () => {
    if (!user?.uid || !currentDay || !planId) return;
    setScoreLoading(true);
    setScoreError("");
    try {
      const response = await fetch("/api/ai/success-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebase_uid: user.uid,
          recalculate: true,
          businessProfile,
          dayPlan: {
            dayNumber: currentDay.dayNumber,
            dateLabel: currentDay.dateLabel,
            mainActionTitle: currentDay.mainActionTitle,
            businessGrowthAction: currentDay.businessGrowthAction,
            executionSteps: currentDay.executionSteps,
            postIdea: currentDay.marketingActivation?.postIdea ?? currentDay.postIdea,
            caption: currentDay.marketingActivation?.caption ?? currentDay.caption,
            successMetric: currentDay.successMetric,
          },
          planContext: {
            planId,
            dayNumber: currentDay.dayNumber,
            dateLabel: currentDay.dateLabel,
            totalDays: planDays,
          },
        }),
      });
      const json = await response.json();
      if (!response.ok || !json?.ok || !json?.data) {
        setScoreError("Unable to recalculate success probability.");
        return;
      }
      setSuccessScore({
        successPercent: Number(json.data.successPercent ?? 0),
        reasons: Array.isArray(json.data.reasons) ? json.data.reasons.map((item: unknown) => String(item)) : [],
        improvements: Array.isArray(json.data.improvements)
          ? json.data.improvements.map((item: unknown) => String(item))
          : [],
      });
    } catch {
      setScoreError("Unable to recalculate success probability.");
    } finally {
      setScoreLoading(false);
    }
  };

  const modalContent = useMemo(() => {
    if (modalType === "missingBusiness") {
      return {
        title: "Fill business details first",
        text: "Please complete your business details before viewing day plans.",
        primaryText: "Go to Business Details",
        primaryAction: () => router.push("/onboarding/business-details"),
      };
    }
    if (modalType === "missingPlan") {
      return {
        title: "Select a plan first",
        text: "Please choose a plan to continue.",
        primaryText: "Go to Select Plan",
        primaryAction: () => router.push("/select-plan"),
      };
    }
    if (modalType === "noPlan") {
      return {
        title: "No generated plan yet",
        text: "Generate your marketing plan first.",
        primaryText: "Go to Marketing Plan",
        primaryAction: () => router.push("/marketing-plan"),
      };
    }
    if (modalType === "serverError") {
      return {
        title: "Something went wrong",
        text: "Please try again.",
        primaryText: "Back to Marketing Plan",
        primaryAction: () => router.push("/marketing-plan"),
      };
    }
    return null;
  }, [modalType, router]);

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(currentDay?.marketingActivation?.caption ?? currentDay?.caption ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  async function toggleDayCompleted() {
    if (!user?.uid) return;

    setIsCompleting(true);
    try {
      const response = await fetch("/api/marketing-plan/day-complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebase_uid: user.uid, planId, dayNumber, completed: !isCompleted }),
      });
      const result = await response.json();

      if (!response.ok || !result?.ok) {
        setModalType("serverError");
        return;
      }

      const nextPlanDays = Array.isArray(result?.plan?.planDays) ? result.plan.planDays : [];
      const nextCompletedDays = nextPlanDays.filter((day: DayPlan & { completed?: boolean }) => day.completed).map((day: DayPlan) => day.dayNumber);
      setCompletedDays(nextCompletedDays);
    } catch {
      setModalType("serverError");
    } finally {
      setIsCompleting(false);
    }
  }

  const isCompleted = completedDays.includes(dayNumber);
  const dayDateLabel = currentDay?.dateLabel
    ? `${currentDay.dateLabel} • Day ${dayNumber}${planDays > 0 ? ` of ${planDays}` : ""}`
    : `Day ${dayNumber}`;
  const growthTitle = currentDay?.mainActionTitle
    ? cleanDayTitle(currentDay.mainActionTitle) || currentDay.mainActionTitle
    : `Day ${dayNumber}`;

  return (
    <div className="dayPage">
      <div className="dayShell">
        <section className="dayHero">
          <div>
            <p className="eyebrow">Growth plan · Day detail</p>
            <h1>{isLoading ? "Loading..." : growthTitle}</h1>
            {!isLoading && currentDay && <p className="dateMeta">{dayDateLabel}</p>}
            <p className="sub">
              {businessName} {planDays > 0 ? `· ${planDays} Day Plan` : ""}
            </p>
          </div>
          <div className="heroActions">
            {isCompleted && <span className="completedBadge">Completed ✅</span>}
            <button
              type="button"
              onClick={() => void toggleDayCompleted()}
              className="completeBtn"
              disabled={isLoading || !currentDay || isCompleting || isCompleted}
            >
              {isCompleting ? "Saving..." : isCompleted ? "Completed ✅" : "Mark Day Completed"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/marketing-plan")}
              className="backBtn"
            >
              Back to Plan
            </button>
          </div>
        </section>

        {!isLoading && currentDay && (
          <>
            <section className="card sectionGrowth">
              <div className="sectionTitleRow">
                <span className="pill pillGrowth">1 · Business growth</span>
                <h2 className="sectionH">Business growth task</h2>
              </div>
              <p className="lede">{currentDay.businessGrowthAction || ""}</p>
              <h3 className="miniH">Focus</h3>
              <p className="focusTitle">{growthTitle}</p>
              <h3 className="miniH">Execution steps</h3>
              <ul className="checkList">
                {(currentDay.executionSteps ?? []).map((step, index) => (
                  <li key={`${index}-${step}`}>
                    <span className="stepBadge">Step {index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ul>
              <div className="kpiRow">
                <span className="pill pillKpi">KPI</span>
                <p className="kpiText">{currentDay.successMetric || ""}</p>
              </div>
            </section>

            <section className="card sectionActivation">
              <div className="sectionTitleRow activationHeader">
                <span className="pill pillActivation">2 · Marketing activation</span>
                <h2 className="sectionH">Support your task in-market</h2>
                <button
                  type="button"
                  onClick={() => {
                    const backTo = `/marketing-plan/day/${dayNumber}`;
                    const postIdea = currentDay?.marketingActivation?.postIdea ?? currentDay?.postIdea ?? "";
                    const cap = currentDay?.marketingActivation?.caption ?? currentDay?.caption ?? "";
                    const title = currentDay?.mainActionTitle ?? "";
                    const posterHint = currentDay?.marketingActivation?.posterHint ?? currentDay?.posterHint ?? "";
                    const reelScript = currentDay?.marketingActivation?.reelScript
                      ? JSON.stringify(currentDay.marketingActivation.reelScript)
                      : "";
                    const storyFrames = Array.isArray(currentDay?.marketingActivation?.storyFrames)
                      ? JSON.stringify(currentDay.marketingActivation.storyFrames)
                      : "";
                    const businessGrowthAction = currentDay?.businessGrowthAction ?? "";
                    const hashtags = (currentDay?.marketingActivation?.hashtags ?? currentDay?.hashtags ?? []) as string[];
                    try {
                      sessionStorage.setItem(
                        "bizboost:editorDayContext",
                        JSON.stringify({
                          dayNumber,
                          backTo,
                          caption: cap,
                          postIdea,
                          mainActionTitle: title,
                          posterHint,
                          reelScript,
                          storyFrames,
                          businessGrowthAction,
                          hashtags,
                          savedAt: Date.now(),
                        }),
                      );
                    } catch {
                    }
                    router.push(
                      `/biz-editor?day=${dayNumber}&backTo=${encodeURIComponent(backTo)}&caption=${encodeURIComponent(cap)}&postIdea=${encodeURIComponent(postIdea)}&mainActionTitle=${encodeURIComponent(title)}&posterHint=${encodeURIComponent(posterHint)}&reelScript=${encodeURIComponent(reelScript)}&storyFrames=${encodeURIComponent(storyFrames)}`,
                    );
                  }}
                  className="editorBtn"
                  aria-label="Open Biz Editor"
                  title="Open Biz Editor"
                >
                  <span className="editorBtnIcon">↗</span>
                  <span className="editorBtnText">Go to Biz Editor</span>
                </button>
              </div>
              <p className="hintLine">
                Social media only: publish this plan on Instagram/Facebook today.
              </p>
              <div className="activationBlock">
                <h3 className="miniH">Channel</h3>
                <div className="formatChips">
                  <span className="formatChip channel">{(currentDay.marketingActivation?.channel || "both").toUpperCase()}</span>
                </div>
                <h3 className="miniH">Format plan</h3>
                <div className="formatChips">
                  {(currentDay.marketingActivation?.formatPlan ?? ["FeedPost"]).map((format) => (
                    <span key={format} className="formatChip">
                      {format}
                    </span>
                  ))}
                </div>
                <h3 className="miniH">Content brief</h3>
                <p className="bodyP">{currentDay.marketingActivation?.contentBrief || currentDay.marketingActivation?.postIdea || currentDay.postIdea || ""}</p>
                <h3 className="miniH">Visual guide</h3>
                <p className="bodyP">{currentDay.marketingActivation?.visualGuide || "Use a clear product visual with one strong headline."}</p>
                <h3 className="miniH">Content idea</h3>
                <p className="bodyP">{currentDay.marketingActivation?.postIdea || currentDay.postIdea || ""}</p>
                {(currentDay.marketingActivation?.posterHint || currentDay.posterHint) ? (
                  <>
                    <h3 className="miniH">Poster headline hint</h3>
                    <p className="posterHint">{currentDay.marketingActivation?.posterHint || currentDay.posterHint}</p>
                  </>
                ) : null}
              </div>

              <div className="capTop">
                <h3 className="miniH">Caption</h3>
                <button type="button" className="copyBtn" onClick={() => void copyCaption()}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="caption">{currentDay.marketingActivation?.caption || currentDay.caption || ""}</pre>
              <h3 className="miniH">Posting time</h3>
              <p className="bodyP">{currentDay.marketingActivation?.postingTime || "7:30 PM"}</p>
              <h3 className="miniH">CTA</h3>
              <p className="bodyP">{currentDay.marketingActivation?.cta || "DM us now to order/book."}</p>

              {(currentDay.marketingActivation?.storyFrames ?? []).length > 0 ? (
                <>
                  <h3 className="miniH">Story frames</h3>
                  <ul className="plainList">
                    {(currentDay.marketingActivation?.storyFrames ?? []).map((frame, index) => (
                      <li key={`${index}-${frame}`}>{frame}</li>
                    ))}
                  </ul>
                </>
              ) : null}

              {currentDay.marketingActivation?.reelScript ? (
                <>
                  <h3 className="miniH">Reel script</h3>
                  <div className="reelScriptBox">
                    <p>
                      <strong>Hook:</strong> {currentDay.marketingActivation.reelScript.hook || ""}
                    </p>
                    <p><strong>Beats:</strong></p>
                    <ul className="plainList">
                      {(currentDay.marketingActivation.reelScript.beats ?? []).map((beat, index) => (
                        <li key={`${index}-${beat}`}>{beat}</li>
                      ))}
                    </ul>
                    <p>
                      <strong>CTA:</strong> {currentDay.marketingActivation.reelScript.cta || ""}
                    </p>
                  </div>
                </>
              ) : null}

              <h3 className="miniH">Hashtags</h3>
              <div className="tags">
                {(currentDay.marketingActivation?.hashtags ?? currentDay.hashtags ?? []).length > 0 ? (
                  (currentDay.marketingActivation?.hashtags ?? currentDay.hashtags ?? []).map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="noTag">No hashtags</span>
                )}
              </div>
            </section>

            <section className="card scoreCard">
              <div className="scoreHead">
                <div>
                  <span className="pill pillKpi">4 · AI estimate</span>
                  <h2 className="sectionH">Estimated Success Probability</h2>
                </div>
                <button type="button" className="recalculateBtn" onClick={() => void handleRecalculateScore()} disabled={scoreLoading}>
                  {scoreLoading ? "Calculating..." : "Recalculate"}
                </button>
              </div>
              {scoreError ? <p className="scoreError">{scoreError}</p> : null}
              {!scoreError && successScore ? (
                <>
                  <div className="percentRow">
                    <p className="percentValue">{Math.max(0, Math.min(100, Math.round(successScore.successPercent)))}%</p>
                    <div className="barTrack" aria-hidden>
                      <div
                        className="barFill"
                        style={{ width: `${Math.max(0, Math.min(100, Math.round(successScore.successPercent)))}%` }}
                      />
                    </div>
                  </div>
                  <div className="scoreColumns">
                    <div className="scoreColumn">
                      <h3 className="miniH">Why this score</h3>
                      <ul className="plainList">
                        {successScore.reasons.map((reason, index) => (
                          <li key={`${index}-${reason}`}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="scoreColumn">
                      <h3 className="miniH">How to improve</h3>
                      <ul className="plainList">
                        {successScore.improvements.map((tip, index) => (
                          <li key={`${index}-${tip}`}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              ) : scoreLoading ? (
                <p className="kpiText">Calculating success probability...</p>
              ) : (
                <p className="kpiText">No estimate yet. Click Recalculate.</p>
              )}
            </section>
          </>
        )}
      </div>

      {modalContent && (
        <div className="modalOverlay">
          <div className="modalCard">
            <h3>{modalContent.title}</h3>
            <p>{modalContent.text}</p>
            <button type="button" className="modalPrimary" onClick={modalContent.primaryAction}>
              {modalContent.primaryText}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .dayPage {
          min-height: 100vh;
          padding: 24px 16px 14px;
          background: var(--page-bg);
        }
        .dayShell {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          gap: 24px;
        }
        .dayHero,
        .card {
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(12px);
          padding: 30px;
        }
        .dayHero {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          flex-wrap: nowrap;
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
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.1;
        }
        .sub {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
        }
        .dateMeta {
          margin: 10px 0 0;
          color: #0f766e;
          font-size: 15px;
          font-weight: 800;
        }
        .backBtn,
        .completeBtn,
        .copyBtn,
        .modalPrimary {
          border: 1px solid rgba(16, 185, 129, 0.3);
          background: linear-gradient(145deg, #10b981, #059669);
          color: #fff;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .completeBtn:disabled {
          cursor: not-allowed;
          opacity: 0.68;
        }
        .heroActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
          flex-shrink: 0;
        }
        .completedBadge {
          border-radius: 999px;
          border: 1px solid rgba(16, 185, 129, 0.32);
          background: rgba(209, 250, 229, 0.86);
          color: #047857;
          font-size: 13px;
          font-weight: 800;
          padding: 8px 11px;
        }
        .editorBtn {
          min-height: 42px;
          padding: 8px 14px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.36);
          background: rgba(255, 255, 255, 0.82);
          color: #0f172a;
          font-size: 14px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(8px);
          transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .editorBtn:hover {
          transform: translateY(-1px);
          background: #ffffff;
          border-color: rgba(16, 185, 129, 0.45);
          box-shadow: 0 14px 26px rgba(16, 185, 129, 0.16);
        }
        .editorBtn:focus-visible {
          outline: 2px solid rgba(16, 185, 129, 0.42);
          outline-offset: 2px;
        }
        .editorBtnIcon {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(15, 23, 42, 0.06);
          font-size: 14px;
          line-height: 1;
        }
        .editorBtnText {
          white-space: nowrap;
        }
        .sectionTitleRow {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 10px;
        }
        .activationHeader .editorBtn {
          align-self: flex-start;
        }
        .sectionH {
          margin: 0;
          color: #0f172a;
          font-size: 20px;
          font-weight: 800;
        }
        .pill {
          display: inline-block;
          align-self: flex-start;
          border-radius: 999px;
          padding: 5px 11px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .pillGrowth {
          background: rgba(16, 185, 129, 0.14);
          color: #047857;
          border: 1px solid rgba(16, 185, 129, 0.35);
        }
        .pillActivation {
          background: rgba(59, 130, 246, 0.12);
          color: #1d4ed8;
          border: 1px solid rgba(59, 130, 246, 0.35);
        }
        .pillKpi {
          background: rgba(245, 158, 11, 0.14);
          color: #b45309;
          border: 1px solid rgba(245, 158, 11, 0.35);
          text-transform: none;
          letter-spacing: 0;
        }
        .lede {
          color: #475569;
          line-height: 1.65;
          margin: 0 0 14px;
          font-size: 15px;
        }
        .miniH {
          margin: 16px 0 6px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #64748b;
        }
        .miniH:first-of-type {
          margin-top: 0;
        }
        .focusTitle {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.45;
        }
        .kpiRow {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(148, 163, 184, 0.28);
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .kpiText {
          margin: 0;
          flex: 1;
          color: #334155;
          line-height: 1.55;
          font-size: 14px;
        }
        .sectionGrowth {
          border-color: rgba(16, 185, 129, 0.22);
        }
        .sectionActivation {
          border-color: rgba(59, 130, 246, 0.2);
        }
        .scoreCard {
          border-color: rgba(14, 165, 233, 0.28);
          background: rgba(239, 246, 255, 0.72);
        }
        .scoreHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .recalculateBtn {
          border: 1px solid rgba(14, 165, 233, 0.35);
          background: linear-gradient(145deg, #0ea5e9, #0284c7);
          color: #fff;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .recalculateBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .percentRow {
          display: grid;
          gap: 10px;
          margin-bottom: 12px;
        }
        .percentValue {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 900;
          color: #0369a1;
          line-height: 1;
        }
        .barTrack {
          height: 12px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.24);
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }
        .barFill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #0ea5e9, #22c55e);
          transition: width 0.28s ease;
        }
        .scoreColumns {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .scoreColumn {
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(255, 255, 255, 0.72);
          padding: 10px 12px;
        }
        .plainList {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
          color: #334155;
          line-height: 1.45;
        }
        .scoreError {
          margin: 0;
          color: #b91c1c;
          font-weight: 700;
          font-size: 14px;
        }
        .hintLine {
          margin: 0 0 14px;
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
        }
        .activationBlock {
          margin-bottom: 6px;
        }
        .bodyP {
          margin: 0;
          color: #334155;
          line-height: 1.6;
        }
        .posterHint {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #0f172a;
          line-height: 1.4;
        }
        h2 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: 18px;
        }
        p {
          margin: 0;
          color: #334155;
          line-height: 1.6;
        }
        .checkList {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 8px;
        }
        .checkList li {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: flex-start;
          gap: 10px;
          color: #334155;
          line-height: 1.55;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(248, 250, 252, 0.72);
        }
        .checkList li p {
          margin: 0;
          color: #334155;
          line-height: 1.55;
        }
        .stepBadge {
          margin-top: 1px;
          border-radius: 999px;
          border: 1px solid rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 4px 8px;
          white-space: nowrap;
        }
        .grid2 {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .capTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }
        .caption {
          margin: 0;
          white-space: pre-wrap;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(248, 250, 252, 0.9);
          padding: 12px;
          font-family: inherit;
          color: #334155;
          line-height: 1.6;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .formatChips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 4px;
        }
        .formatChip {
          border-radius: 999px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          background: rgba(219, 234, 254, 0.6);
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 10px;
        }
        .formatChip.channel {
          border-color: rgba(16, 185, 129, 0.35);
          background: rgba(209, 250, 229, 0.66);
          color: #047857;
        }
        .reelScriptBox {
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(248, 250, 252, 0.85);
          padding: 10px 12px;
        }
        .tag {
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.34);
          background: #fff;
          color: #475569;
          font-size: 12px;
          padding: 5px 10px;
        }
        .noTag {
          font-size: 12px;
          color: #94a3b8;
        }
        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(15, 23, 42, 0.26);
          backdrop-filter: blur(2px);
        }
        .modalCard {
          width: 100%;
          max-width: 460px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.34);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
          padding: 18px;
        }
        .modalCard h3 {
          margin: 0;
          color: #0f172a;
        }
        .modalCard p {
          margin: 10px 0 14px;
          color: #64748b;
        }
        @media (max-width: 900px) {
          .dayPage {
            padding-top: 20px;
          }
          .dayHero,
          .card {
            padding: 24px;
          }
          .dayHero {
            flex-wrap: wrap;
          }
          .grid2 {
            grid-template-columns: 1fr;
          }
          .scoreColumns {
            grid-template-columns: 1fr;
          }
          .heroActions {
            justify-content: flex-start;
          }
          .heroActions > :global(button),
          .heroActions > :global(span) {
            min-height: 42px;
          }
          .activationHeader .editorBtn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
