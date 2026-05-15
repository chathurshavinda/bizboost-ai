"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaChevronRight, FaEdit } from "react-icons/fa";
import { useAuth } from "@/src/lib/useAuth";
type DayPlan = {
    dayNumber: number;
    dateISO?: string;
    dateLabel?: string;
    dayTheme?: string;
    mainActionTitle?: string;
    businessGrowthAction?: string;
    executionSteps?: string[];
    postIdea?: string;
    caption?: string;
    marketingActivation?: {
        platform?: string;
        format?: "Reel" | "Story" | "Feed" | "Carousel";
        bestTime?: string;
        goal?: "DMs" | "Orders" | "Bookings" | "Footfall" | "Leads";
        marketingObjective?: string;
        whatToPost?: string;
        postBrief?: string;
        hook?: string;
        visualGuide?: string[];
        posterHeadlineHint?: string;
        channel?: "instagram" | "facebook" | "both";
        formatPlan?: Array<"Reel" | "Story" | "FeedPost" | "Carousel">;
        contentBrief?: string;
        postIdea?: string;
        caption?: string;
        hashtags?: string[];
        postingTime?: string;
        cta?: string;
        matchNote?: string;
        storyFrames?: string[];
        reelScript?: {
            hook?: string;
            beats?: string[];
            cta?: string;
        };
        posterHint?: string;
        offerDeadlineHint?: string;
        promotionIdea?: string;
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
    const params = useParams<{
        day: string;
    }>();
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
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }
    }, [dayNumber]);
    useEffect(() => {
        if (authLoading)
            return;
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
                if (selectedRes.status === 404 || selectedJson?.active === false || selectedJson?.error === "No plan selected" || selectedJson?.error === "plan_not_selected") {
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
                setBusinessProfile(businessJson?.data && typeof businessJson.data === "object" ? (businessJson.data as Record<string, unknown>) : {});
                setBusinessName(data.businessSnapshot?.businessName ?? businessJson?.data?.businessName ?? "Business");
                setPlanDays(Number(data.durationDays ?? safePlan.length ?? 0));
                setCompletedDays(safePlan.filter((day) => day.completed).map((day) => day.dayNumber));
                setPlanId(typeof data._id === "string" ? data._id : "");
            }
            catch {
                setModalType("serverError");
            }
            finally {
                setIsLoading(false);
            }
        };
        void load();
    }, [authLoading, user?.uid, router, dayNumber]);
    useEffect(() => {
        if (!user?.uid || !currentDay || !planId)
            return;
        let cancelled = false;
        const fetchScore = async (recalculate = false) => {
            if (cancelled)
                return;
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
                if (cancelled)
                    return;
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
            }
            catch {
                if (!cancelled)
                    setScoreError("Unable to load success probability.");
            }
            finally {
                if (!cancelled)
                    setScoreLoading(false);
            }
        };
        void fetchScore(false);
        return () => {
            cancelled = true;
        };
    }, [user?.uid, currentDay, planId, planDays, businessProfile]);
    const handleRecalculateScore = async () => {
        if (!user?.uid || !currentDay || !planId)
            return;
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
        }
        catch {
            setScoreError("Unable to recalculate success probability.");
        }
        finally {
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
    async function toggleDayCompleted() {
        if (!user?.uid)
            return;
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
            const nextCompletedDays = nextPlanDays.filter((day: DayPlan & {
                completed?: boolean;
            }) => day.completed).map((day: DayPlan) => day.dayNumber);
            setCompletedDays(nextCompletedDays);
        }
        catch {
            setModalType("serverError");
        }
        finally {
            setIsCompleting(false);
        }
    }
    const isCompleted = completedDays.includes(dayNumber);
    const activationView = useMemo(() => {
        if (!currentDay)
            return null;
        const ma = currentDay.marketingActivation;
        const resolvePlatform = () => {
            const raw = (ma?.platform || "").trim();
            if (raw && !/^both$/i.test(raw))
                return raw;
            const format = ma?.format || "Feed";
            const formatLabel = format === "Feed" ? "Feed Post" : format;
            if (ma?.channel === "instagram")
                return `Instagram ${formatLabel}`;
            if (ma?.channel === "facebook")
                return `Facebook ${formatLabel}`;
            return `Instagram ${formatLabel} + Facebook ${formatLabel}`;
        };
        const squash = (s: string, max: number) => {
            const t = (s || "").replace(/\s+/g, " ").trim();
            if (!t)
                return "";
            return t.length <= max ? t : `${t.slice(0, max - 1).trim()}…`;
        };
        const platform = resolvePlatform();
        const format = ma?.format ?? "Feed";
        const bestTime = ma?.bestTime || ma?.postingTime || "7:30 PM";
        const goal = ma?.goal ?? "Leads";
        const objective = squash(ma?.marketingObjective ||
            ma?.matchNote ||
            (goal === "Orders"
                ? "Convert this campaign into paid orders today."
                : goal === "Bookings"
                    ? "Drive confirmed bookings from today's social activity."
                    : goal === "Footfall"
                        ? "Increase walk-ins by promoting this exact day offer."
                        : "Generate qualified leads and direct conversations for this offer."), 190);
        const whatToPost = squash(ma?.whatToPost || ma?.contentBrief || ma?.postBrief || "", 220);
        const postIdeaText = squash(ma?.postIdea || currentDay.postIdea || "", 260);
        const hookLine = squash(ma?.hook || "", 160);
        const defaultVisuals = [
            "Show your product or service clearly with good light.",
            "Add one short on-image line with the main benefit.",
            "End the visual with your contact or next step.",
        ];
        const visuals = (ma?.visualGuide?.length ? ma.visualGuide : defaultVisuals)
            .map((line) => squash(String(line), 150))
            .filter(Boolean)
            .slice(0, 3);
        const captionText = (ma?.caption || currentDay.caption || "").trim();
        const cta = squash(ma?.cta || "DM us to book or order.", 140);
        const hashtags = (ma?.hashtags ?? currentDay.hashtags ?? []) as string[];
        const storyFrames = ma?.storyFrames ?? [];
        const reelScript = ma?.reelScript;
        return {
            platform,
            format,
            bestTime,
            objective,
            whatToPost,
            postIdeaText,
            hookLine,
            visuals,
            captionText,
            cta,
            hashtags,
            storyFrames,
            reelScript,
        };
    }, [currentDay]);
    const openBizEditor = useCallback(() => {
        if (!currentDay)
            return;
        const backTo = `/marketing-plan/day/${dayNumber}`;
        const postIdea = currentDay.marketingActivation?.postIdea ?? currentDay.postIdea ?? "";
        const cap = currentDay.marketingActivation?.caption ?? currentDay.caption ?? "";
        const title = currentDay.mainActionTitle ?? "";
        const posterHint = currentDay.marketingActivation?.posterHint ?? currentDay.posterHint ?? "";
        const reelScript = currentDay.marketingActivation?.reelScript
            ? JSON.stringify(currentDay.marketingActivation.reelScript)
            : "";
        const storyFrames = Array.isArray(currentDay.marketingActivation?.storyFrames)
            ? JSON.stringify(currentDay.marketingActivation.storyFrames)
            : "";
        const businessGrowthAction = currentDay.businessGrowthAction ?? "";
        const hashtags = (currentDay.marketingActivation?.hashtags ?? currentDay.hashtags ?? []) as string[];
        const dayTheme = typeof currentDay.dayTheme === "string" ? currentDay.dayTheme.trim() : "";
        const offerDeadlineHint = (currentDay.marketingActivation?.offerDeadlineHint ?? "").trim();
        try {
            sessionStorage.setItem("bizboost:editorDayContext", JSON.stringify({
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
                dayTheme,
                ...(offerDeadlineHint ? { offerDeadlineHint } : {}),
                savedAt: Date.now(),
            }));
        }
        catch {
        }
        const themeParam = dayTheme ? `&dayTheme=${encodeURIComponent(dayTheme)}` : "";
        const deadlineParam = offerDeadlineHint ? `&offerDeadlineHint=${encodeURIComponent(offerDeadlineHint)}` : "";
        router.push(`/biz-editor?day=${dayNumber}&backTo=${encodeURIComponent(backTo)}&caption=${encodeURIComponent(cap)}&postIdea=${encodeURIComponent(postIdea)}&mainActionTitle=${encodeURIComponent(title)}&posterHint=${encodeURIComponent(posterHint)}&reelScript=${encodeURIComponent(reelScript)}&storyFrames=${encodeURIComponent(storyFrames)}${themeParam}${deadlineParam}`);
    }, [currentDay, dayNumber, router]);
    async function copyCaption() {
        try {
            const text = activationView?.captionText ?? currentDay?.marketingActivation?.caption ?? currentDay?.caption ?? "";
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        }
        catch {
            setCopied(false);
        }
    }
    const dayDateLabel = currentDay?.dateLabel
        ? `${currentDay.dateLabel} • Day ${dayNumber}${planDays > 0 ? ` of ${planDays}` : ""}`
        : `Day ${dayNumber}`;
    const growthTitle = currentDay?.mainActionTitle
        ? cleanDayTitle(currentDay.mainActionTitle) || currentDay.mainActionTitle
        : `Day ${dayNumber}`;
    return (<div className="bb-page">
      <section className="bb-hero-dark bb-hero-dark--planHeroBreath">
        <div className="bb-hero-dark-inner dayHeroInner">
          <div className="dayHeroCopy">
            <p className="bb-eyebrow-dark">Growth plan · Day detail</p>
            <h1 className="bb-title-dark">{isLoading ? "Loading..." : growthTitle}</h1>
            {!isLoading && currentDay ? <p className="dayDateMeta">{dayDateLabel}</p> : null}
            <p className="bb-lead-dark dayMetaLead">
              {businessName}
              {planDays > 0 ? ` · ${planDays}-day plan` : ""}
            </p>
          </div>
          <div className="dayHeroActions">
            {isCompleted ? (<span className="completedBadge" role="status" aria-live="polite">
                <span className="completedBadgeCheck" aria-hidden>✓</span>
                Completed
              </span>) : (<button type="button" onClick={() => void toggleDayCompleted()} className="dayCompletePill" disabled={isLoading || !currentDay || isCompleting}>
                {isCompleting ? "Saving..." : "Mark day completed"}
              </button>)}
            <button type="button" onClick={() => router.push("/marketing-plan")} className="dayBackPill">
              Back to plan
            </button>
          </div>
        </div>
      </section>

      <section className="bb-band-light bb-app-canvas">
        <div className="bb-shell">
          <div className="dayShell">
        {!isLoading && currentDay && (<>
            <section className="card sectionGrowth">
              <div className="sectionTitleRow">
                <span className="pill pillGrowth">1 · Business growth</span>
                <h2 className="sectionH">Business growth task</h2>
              </div>
              <div className="sectionGuidance sectionGuidance--growth">
                <p className="lede">{currentDay.businessGrowthAction || ""}</p>
              </div>
              <h3 className="miniH">Focus</h3>
              <p className="focusTitle">{growthTitle}</p>
              <h3 className="miniH">Execution steps</h3>
              <ul className="checkList">
                {(currentDay.executionSteps ?? []).map((step, index) => (<li key={`${index}-${step}`}>
                    <span className="stepBadge">Step {index + 1}</span>
                    <p>{step}</p>
                  </li>))}
              </ul>
              <div className="kpiRow">
                <span className="pill pillKpi">KPI</span>
                <p className="kpiText">{currentDay.successMetric || ""}</p>
              </div>
              {currentDay.marketingActivation?.promotionIdea ? (<div className="promoCallout">
                  <span className="pill pillPromo">Promotion idea</span>
                  <p>{currentDay.marketingActivation.promotionIdea}</p>
                </div>) : null}
            </section>

            <section className="card sectionActivation">
              {activationView ? (<>
                  <div className="activationHeadRow">
                    <div className="activationHeadLeft">
                      <span className="pill pillActivation">2 · Marketing activation</span>
                      <h2 className="sectionH activationMainTitle">{"Today's social post"}</h2>
                      <div className="sectionGuidance sectionGuidance--activation">
                        <p className="activationSub">Clear, ready-to-run promotion steps for today’s growth action.</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => openBizEditor()} className="editorBtn editorBtnHeader" aria-label="Open Biz Editor with today’s post context" title="Opens Biz Editor with caption, post idea, and poster hints from this day">
                      <span className="editorBtnInner">
                        <span className="editorBtnIcon" aria-hidden>
                          <FaEdit size={15}/>
                        </span>
                        <span className="editorBtnCopy">
                          <span className="editorBtnText">Go to Biz Editor</span>
                          <span className="editorBtnSub">Poster · Caption · Export</span>
                        </span>
                        <span className="editorBtnTrail" aria-hidden>
                          <FaChevronRight className="editorBtnChevron" size={12}/>
                        </span>
                      </span>
                    </button>
                  </div>

                  <div className="activationSummaryStrip" role="group" aria-label="Post format summary">
                    <div className="summaryCell">
                      <span className="summaryLabel">Marketing objective</span>
                      <span className="summaryValue">{activationView.objective}</span>
                    </div>
                    <div className="summaryCell">
                      <span className="summaryLabel">Recommended platform</span>
                      <span className="summaryValue">{activationView.platform}</span>
                    </div>
                    <div className="summaryCell">
                      <span className="summaryLabel">Post format</span>
                      <span className="summaryValue">{activationView.format}</span>
                    </div>
                    <div className="summaryCell">
                      <span className="summaryLabel">Best posting time</span>
                      <span className="summaryValue">{activationView.bestTime}</span>
                    </div>
                  </div>

                  <div className="activationStack">
                    <div className="activationCard">
                      <h3 className="activationCardLabel">What to create</h3>
                      <p className="activationOneLiner">{activationView.whatToPost || "—"}</p>
                      {activationView.hookLine ? (<>
                          <p className="activationSubLabel">Hook line</p>
                          <p className="activationHookLine">{activationView.hookLine}</p>
                        </>) : null}
                    </div>

                    <div className="activationCard activationCardPostIdea">
                      <h3 className="activationCardLabel">Poster / Video idea</h3>
                      <p className="activationOneLiner">{activationView.postIdeaText || "—"}</p>
                    </div>

                    <div className="activationCard">
                      <h3 className="activationCardLabel">What to show (visual guide)</h3>
                      <ul className="activationBulletList">
                        {activationView.visuals.map((item, index) => (<li key={`${index}-${item.slice(0, 24)}`}>{item}</li>))}
                      </ul>
                    </div>

                    <div className="activationCard activationCardCaption">
                      <div className="activationCardCaptionHead">
                        <h3 className="activationCardLabel">
                          Caption <span className="readyBadge">Ready to paste</span>
                        </h3>
                        <button type="button" className="copyBtn" onClick={() => void copyCaption()}>
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="caption activationCaptionPre">{activationView.captionText}</pre>
                    </div>

                    <div className="activationCard">
                      <h3 className="activationCardLabel">CTA</h3>
                      <p className="activationOneLiner">{activationView.cta}</p>
                    </div>

                    <div className="activationCard activationCardTags">
                      <h3 className="activationCardLabel">Hashtags</h3>
                      <div className="tags">
                        {activationView.hashtags.length > 0 ? (activationView.hashtags.map((tag) => (<span key={tag} className="tag">
                              {tag}
                            </span>))) : (<span className="noTag">No hashtags</span>)}
                      </div>
                    </div>
                  </div>

                  {activationView.storyFrames.length > 0 || activationView.reelScript ? (<details className="activationMore">
                      <summary>Story or Reel outline (optional)</summary>
                      {activationView.storyFrames.length > 0 ? (<ul className="activationBulletList tight">
                          {activationView.storyFrames.slice(0, 3).map((frame, index) => (<li key={`sf-${index}`}>{frame}</li>))}
                        </ul>) : null}
                      {activationView.reelScript ? (<div className="reelScriptCompact">
                          <p className="activationOneLiner">
                            <strong>Reel:</strong> {activationView.reelScript.hook || ""}
                          </p>
                          <ul className="activationBulletList tight">
                            {(activationView.reelScript.beats ?? []).slice(0, 3).map((beat, index) => (<li key={`rb-${index}`}>{beat}</li>))}
                          </ul>
                          <p className="activationOneLiner">
                            <strong>CTA:</strong> {activationView.reelScript.cta || ""}
                          </p>
                        </div>) : null}
                    </details>) : null}
                </>) : null}
            </section>

            <section className="card scoreCard">
              <div className="scoreHead">
                <div>
                  <span className="pill pillKpi"> AI estimate</span>
                  <h2 className="sectionH">Estimated Success Probability</h2>
                </div>
                <button type="button" className="recalculateBtn" onClick={() => void handleRecalculateScore()} disabled={scoreLoading}>
                  {scoreLoading ? "Calculating..." : "Recalculate"}
                </button>
              </div>
              {scoreError ? <p className="scoreError">{scoreError}</p> : null}
              {!scoreError && successScore ? (<>
                  <div className="percentRow">
                    <p className="percentValue">{Math.max(0, Math.min(100, Math.round(successScore.successPercent)))}%</p>
                    <div className="barTrack" aria-hidden>
                      <div className="barFill" style={{ width: `${Math.max(0, Math.min(100, Math.round(successScore.successPercent)))}%` }}/>
                    </div>
                  </div>
                  <div className="scoreColumns">
                    <div className="scoreColumn">
                      <h3 className="miniH">Why this score</h3>
                      <ul className="plainList">
                        {successScore.reasons.map((reason, index) => (<li key={`${index}-${reason}`}>{reason}</li>))}
                      </ul>
                    </div>
                    <div className="scoreColumn">
                      <h3 className="miniH">How to improve</h3>
                      <ul className="plainList">
                        {successScore.improvements.map((tip, index) => (<li key={`${index}-${tip}`}>{tip}</li>))}
                      </ul>
                    </div>
                  </div>
                </>) : scoreLoading ? (<p className="kpiText">Calculating success probability...</p>) : (<p className="kpiText">No estimate yet. Click Recalculate.</p>)}
            </section>
          </>)}
          </div>
        </div>
      </section>

      {modalContent && (<div className="modalOverlay">
          <div className="modalCard">
            <h3>{modalContent.title}</h3>
            <p>{modalContent.text}</p>
            <button type="button" className="modalPrimary" onClick={modalContent.primaryAction}>
              {modalContent.primaryText}
            </button>
          </div>
        </div>)}

      <style jsx>{`
        .dayShell {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          gap: clamp(18px, 3vw, 24px);
        }
        .dayHeroInner {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }
        .dayHeroCopy {
          flex: 1;
          min-width: min(100%, 280px);
        }
        .dayDateMeta {
          margin: 12px 0 0;
          font-size: 15px;
          font-weight: 700;
          color: rgba(248, 250, 252, 0.95);
          letter-spacing: -0.01em;
        }
        .dayMetaLead {
          margin-top: 12px !important;
          max-width: 42rem !important;
        }
        .dayHeroActions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .dayCompletePill {
          border: 1px solid #ffffff;
          background: #ffffff;
          color: #0f172a;
          border-radius: 999px;
          padding: 11px 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.25);
          transition: transform 0.18s ease, filter 0.18s ease;
        }
        .dayCompletePill:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.02);
        }
        .dayCompletePill:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
        .dayBackPill {
          border: 1px solid rgba(255, 255, 255, 0.38);
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          border-radius: 999px;
          padding: 11px 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }
        .dayBackPill:hover {
          background: rgba(255, 255, 255, 0.16);
          border-color: rgba(255, 255, 255, 0.55);
          transform: translateY(-1px);
        }
        .card {
          border-radius: 28px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 250, 250, 0.94) 100%);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 24px 64px rgba(15, 23, 42, 0.09);
          backdrop-filter: blur(12px);
          padding: clamp(22px, 3vw, 30px);
        }
        .copyBtn,
        .modalPrimary {
          border: 1px solid #111111;
          background: #111111;
          color: #fff;
          border-radius: 999px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease;
        }
        .copyBtn:hover,
        .modalPrimary:hover,
        .editorBtn:hover {
          transform: translateY(-1px);
        }
        .completedBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid rgba(167, 243, 208, 0.42);
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.32) 0%, rgba(5, 150, 105, 0.22) 100%);
          color: #ecfdf5;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.02em;
          padding: 10px 18px 10px 12px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.22) inset,
            0 12px 32px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .completedBadgeCheck {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: rgba(6, 78, 59, 0.92);
          color: #ecfdf5;
          font-size: 12px;
          font-weight: 900;
          line-height: 1;
          box-shadow: 0 0 0 1px rgba(167, 243, 208, 0.35);
        }
        .editorBtn {
          position: relative;
          min-height: 44px;
          padding: 0;
          border: 1px solid #111111;
          border-radius: 999px;
          cursor: pointer;
          color: #ffffff;
          background: #111111;
          box-shadow: none;
          transition: transform 0.18s ease;
        }
        .editorBtnInner {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 9px 16px;
          min-height: 44px;
          box-sizing: border-box;
          width: 100%;
        }
        .editorBtn:active {
          transform: translateY(0);
        }
        .editorBtn:focus-visible {
          outline: 2px solid #111111;
          outline-offset: 3px;
        }
        .editorBtnIcon {
          width: auto;
          height: auto;
          border-radius: 0;
          display: inline-flex;
          place-items: center;
          flex-shrink: 0;
          background: transparent;
          border: none;
          color: #ffffff;
          padding: 0;
          transition: opacity 0.18s ease;
        }
        .editorBtn:hover .editorBtnIcon {
          opacity: 0.92;
        }
        .editorBtnCopy {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          text-align: left;
          min-width: 0;
          flex: 1 1 auto;
          padding: 1px 0;
        }
        .editorBtnText {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.2;
          white-space: nowrap;
          color: #ffffff;
        }
        .editorBtnSub {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.25;
          white-space: nowrap;
        }
        .editorBtnTrail {
          flex-shrink: 0;
          margin-left: auto;
          width: auto;
          height: auto;
          border-radius: 0;
          display: inline-flex;
          place-items: center;
          background: transparent;
          border: none;
          color: #ffffff;
          padding: 0;
          transition: opacity 0.18s ease;
        }
        .editorBtnChevron {
          display: block;
          opacity: 0.85;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }
        .editorBtn:hover .editorBtnTrail {
          opacity: 1;
        }
        .editorBtn:hover .editorBtnChevron {
          transform: translateX(2px);
          opacity: 1;
        }
        @media (prefers-reduced-motion: reduce) {
          .copyBtn:hover,
          .modalPrimary:hover,
          .editorBtn:hover {
            transform: none;
          }
          .editorBtn:hover .editorBtnChevron {
            transform: none;
          }
        }
        .sectionTitleRow {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 10px;
        }

        .sectionGuidance {
          border-radius: 13px;
          padding: 12px 14px 12px 15px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-left: 3px solid #475569;
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.92) 0%,
            rgba(248, 250, 252, 0.94) 45%,
            rgba(241, 245, 249, 0.78) 100%
          );
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.92) inset,
            0 6px 18px rgba(15, 23, 42, 0.045);
        }

        .sectionGuidance--growth {
          margin-top: 2px;
          margin-bottom: 16px;
        }

        .sectionGuidance--activation {
          margin-top: 10px;
          margin-bottom: 0;
          max-width: min(52ch, 100%);
          border-left-color: #2563eb;
          border-color: rgba(147, 197, 253, 0.42);
          background: linear-gradient(
            145deg,
            rgba(239, 246, 255, 0.88) 0%,
            rgba(255, 255, 255, 0.94) 50%,
            rgba(248, 250, 252, 0.9) 100%
          );
        }

        .sectionGuidance .lede {
          margin: 0;
          font-size: 14.5px;
          font-weight: 600;
          color: #334155;
          line-height: 1.55;
          letter-spacing: -0.012em;
        }

        .sectionGuidance--activation .activationSub {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          line-height: 1.5;
          letter-spacing: -0.012em;
          max-width: none;
        }
        .activationHeadRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .activationHeadLeft {
          flex: 1;
          min-width: 200px;
        }
        .activationMainTitle {
          margin-top: 6px;
        }
        .editorBtnHeader {
          flex-shrink: 0;
          align-self: flex-start;
          max-width: min(100%, 340px);
        }
        .activationSummaryStrip {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(59, 130, 246, 0.22);
          background: linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(248, 250, 252, 0.88));
          margin-bottom: 16px;
        }
        .summaryCell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .summaryLabel {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #64748b;
        }
        .summaryValue {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
        }
        .activationStack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .activationCard {
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.78);
          padding: 14px 16px;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset;
        }
        .activationCardLabel {
          margin: 0 0 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #475569;
        }
        .activationOneLiner {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #0f172a;
          line-height: 1.5;
        }
        .activationSubLabel {
          margin: 12px 0 4px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #64748b;
        }
        .activationHookLine {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #1e40af;
          line-height: 1.45;
        }
        .activationBulletList {
          margin: 0;
          padding-left: 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #334155;
          font-size: 14px;
          line-height: 1.45;
        }
        .activationBulletList.tight {
          margin-top: 6px;
          gap: 4px;
        }
        .activationBulletList li {
          padding-left: 2px;
        }
        .activationCardCaption {
          border-color: #e5e5e5;
          background: #f5f5f5;
        }
        .activationCardCaptionHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .activationCardCaptionHead .activationCardLabel {
          margin-bottom: 0;
        }
        .readyBadge {
          display: inline-block;
          margin-left: 8px;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          vertical-align: middle;
          background: #f5f5f5;
          color: #111111;
          border: 1px solid #e5e5e5;
        }
        .activationCaptionPre {
          margin: 0;
        }
        .activationCardTags .tags {
          margin-top: 2px;
        }
        .activationMore {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px dashed rgba(148, 163, 184, 0.45);
          background: rgba(248, 250, 252, 0.65);
          font-size: 13px;
          color: #475569;
        }
        .activationMore summary {
          cursor: pointer;
          font-weight: 700;
          color: #334155;
        }
        .reelScriptCompact {
          margin-top: 8px;
        }
        .reelScriptCompact p {
          margin: 0 0 6px;
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
          background: #f5f5f5;
          color: #111111;
          border: 1px solid #e5e5e5;
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
        .promoCallout {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px dashed rgba(244, 114, 182, 0.55);
          background: rgba(253, 242, 248, 0.7);
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .promoCallout p {
          margin: 0;
          flex: 1;
          color: #831843;
          font-size: 14px;
          line-height: 1.5;
        }
        .pillPromo {
          background: #f9a8d4;
          color: #831843;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .sectionGrowth {
          border-color: #e5e5e5;
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
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 28px rgba(14, 165, 233, 0.28);
          transition: transform 0.18s ease, filter 0.18s ease;
        }
        .recalculateBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.03);
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
          background: #111111;
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
          border: 1px solid #e5e5e5;
          background: #f5f5f5;
          color: #111111;
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
          .card {
            padding: clamp(18px, 4vw, 24px);
          }
          .dayHeroInner {
            flex-direction: column;
            align-items: stretch;
          }
          .dayHeroActions {
            justify-content: flex-start;
          }
          .grid2 {
            grid-template-columns: 1fr;
          }
          .scoreColumns {
            grid-template-columns: 1fr;
          }
          .dayHeroActions > :global(button),
          .dayHeroActions > :global(span) {
            min-height: 42px;
          }
          .activationSummaryStrip {
            grid-template-columns: 1fr;
          }
          .activationHeadRow {
            flex-direction: column;
          }
          .editorBtnHeader {
            width: 100%;
            max-width: 100%;
          }
          .editorBtnHeader .editorBtnInner {
            justify-content: flex-start;
            width: 100%;
          }
        }
        @media (max-width: 560px) {
          .activationSummaryStrip {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>);
}
