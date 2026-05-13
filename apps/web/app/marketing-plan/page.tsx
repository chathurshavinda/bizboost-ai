"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
import { auth } from "@/src/lib/firebase";
import { downloadMarketingPlanPdf } from "@/src/lib/pdf/marketingPlanPdf";
import { getNextIncompleteDay, getTodayPlanDay, isPlanFullyCompleted } from "@/src/lib/taskCardState";
type BusinessDetails = {
    businessName?: string;
    businessType?: string;
};
type SelectedPlan = {
    planDays?: number;
    plan_days?: number;
};
type GeneratedDay = {
    dayNumber: number;
    dateISO?: string;
    dateLabel?: string;
    mainActionTitle?: string;
    businessGrowthAction?: string;
    marketingActivation?: {
        postIdea?: string;
        caption?: string;
        hashtags?: string[];
        posterHint?: string;
    };
    executionSteps?: string[];
    postIdea?: string;
    caption?: string;
    hashtags?: string[];
    successMetric?: string;
    posterHint?: string;
    notes?: string;
    completed?: boolean;
};
type ModalType = "missingBusiness" | "incompleteBusiness" | "missingPlan" | "serverError" | null;
type AiGrowthPillar = {
    title?: string;
    why?: string;
    how?: string[];
    kpis?: string[];
};
type AiMarketingStrategy = {
    overview?: string;
    primaryChannels?: string[];
    contentMix?: string[];
    audienceTips?: string[];
    weeklyRhythm?: string[];
};
type AiWeeklyMilestone = {
    week?: number;
    focus?: string;
    goals?: string[];
    actions?: string[];
};
type AiBusinessPlanDto = {
    generatedAt?: string;
    language?: string;
    businessSummary?: string;
    mainGrowthGoal?: string;
    keyOpportunities?: string[];
    keyChallenges?: string[];
    growthStrategy?: AiGrowthPillar[];
    marketingStrategy?: AiMarketingStrategy;
    weeklyActionPlan?: AiWeeklyMilestone[];
    contentIdeas?: string[];
    captionSuggestions?: string[];
    hashtagSuggestions?: string[];
    promotionIdeas?: string[];
    customerAttractionIdeas?: string[];
    customerRetentionIdeas?: string[];
    salesImprovementIdeas?: string[];
    successMetrics?: string[];
    finalRecommendations?: string[];
    missingDetails?: string[];
};
type LatestPlanResponse = {
    ok?: boolean;
    plan?: {
        _id?: string;
        status?: "active" | "completed" | "archived";
        durationDays?: number;
        planDays?: GeneratedDay[];
        progress?: {
            completedCount?: number;
            percent?: number;
        };
        narrativePlan?: string;
        aiBusinessPlan?: AiBusinessPlanDto | null;
        missingProfileFields?: string[];
    };
    data?: Record<string, unknown>;
    error?: string;
};
type CompleteDayResponse = {
    ok?: boolean;
    plan?: {
        _id?: string;
        status?: "active" | "completed" | "archived";
        planDays?: GeneratedDay[];
        progress?: {
            completedCount?: number;
            percent?: number;
        };
    };
    error?: string;
};
const cleanTitle = (title: string) => title
    .replace(/^Week\s*\d+\s*/i, "")
    .replace(/^Day\s*\d+\s*/i, "")
    .trim();
function truncateText(text: string, max: number) {
    const t = text.trim();
    if (!t)
        return "";
    if (t.length <= max)
        return t;
    return `${t.slice(0, Math.max(0, max - 1))}…`;
}
function truncateWords(text: string, maxWords: number) {
    const t = text.trim();
    if (!t)
        return "";
    const words = t.split(/\s+/);
    if (words.length <= maxWords)
        return t;
    return `${words.slice(0, maxWords).join(" ")}…`;
}
function isLegacyFallbackPlan(plan: GeneratedDay[]): boolean {
    if (!Array.isArray(plan) || plan.length === 0)
        return false;
    const fallbackLikeDays = plan.filter((day) => {
        const title = String(day.mainActionTitle ?? "").toLowerCase().trim();
        const action = String(day.businessGrowthAction ?? "").toLowerCase().trim();
        const postIdea = String(day.postIdea ?? "").toLowerCase().trim();
        return (/^day\s+\d+\s+growth focus$/.test(title) ||
            action.includes("complete one practical business task that moves leads") ||
            postIdea.includes("one short post or customer story that backs up today"));
    }).length;
    return fallbackLikeDays >= Math.max(2, Math.ceil(plan.length * 0.5));
}
function renderInline(text: string): (string | JSX.Element)[] {
    const parts: (string | JSX.Element)[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let i = 0;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > last)
            parts.push(text.slice(last, match.index));
        parts.push(<strong key={`b-${i++}`}>{match[1]}</strong>);
        last = match.index + match[0].length;
    }
    if (last < text.length)
        parts.push(text.slice(last));
    return parts.length > 0 ? parts : [text];
}
function renderMarkdownPlan(markdown: string): JSX.Element {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const blocks: JSX.Element[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (/^\s*$/.test(line)) {
            i += 1;
            continue;
        }
        const h2 = line.match(/^##\s+(.+)$/);
        if (h2) {
            blocks.push(<h3 key={`h-${i}`} className="mdH2">
          {h2[1].trim()}
        </h3>);
            i += 1;
            continue;
        }
        const h3 = line.match(/^###\s+(.+)$/);
        if (h3) {
            blocks.push(<h4 key={`h-${i}`} className="mdH3">
          {h3[1].trim()}
        </h4>);
            i += 1;
            continue;
        }
        if (/^\s*\|(.+)\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-+/.test(lines[i + 1])) {
            const headerCells = line
                .trim()
                .replace(/^\||\|$/g, "")
                .split("|")
                .map((c) => c.trim());
            i += 2;
            const rows: string[][] = [];
            while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
                const cells = lines[i]
                    .trim()
                    .replace(/^\||\|$/g, "")
                    .split("|")
                    .map((c) => c.trim());
                rows.push(cells);
                i += 1;
            }
            blocks.push(<div className="mdTableWrap" key={`t-${i}`}>
          <table className="mdTable">
            <thead>
              <tr>
                {headerCells.map((h, idx) => (<th key={idx}>{renderInline(h)}</th>))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rIdx) => (<tr key={rIdx}>
                  {r.map((c, cIdx) => (<td key={cIdx}>{renderInline(c)}</td>))}
                </tr>))}
            </tbody>
          </table>
        </div>);
            continue;
        }
        if (/^\s*[-*]\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
                i += 1;
            }
            blocks.push(<ul className="mdList" key={`u-${i}`}>
          {items.map((it, idx) => (<li key={idx}>{renderInline(it)}</li>))}
        </ul>);
            continue;
        }
        if (/^\s*\d+\.\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
                i += 1;
            }
            blocks.push(<ol className="mdOl" key={`o-${i}`}>
          {items.map((it, idx) => (<li key={idx}>{renderInline(it)}</li>))}
        </ol>);
            continue;
        }
        const paragraph: string[] = [];
        while (i < lines.length &&
            !/^\s*$/.test(lines[i]) &&
            !/^##\s+/.test(lines[i]) &&
            !/^###\s+/.test(lines[i]) &&
            !/^\s*[-*]\s+/.test(lines[i]) &&
            !/^\s*\d+\.\s+/.test(lines[i]) &&
            !/^\s*\|.+\|\s*$/.test(lines[i])) {
            paragraph.push(lines[i]);
            i += 1;
        }
        blocks.push(<p className="mdP" key={`p-${i}`}>
        {renderInline(paragraph.join(" "))}
      </p>);
    }
    return <div className="mdWrap">{blocks}</div>;
}
export default function MarketingPlanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const isNewMode = searchParams.get("mode") === "new";
    const requestedDays = Number(searchParams.get("days") ?? 0);
    const [isLoading, setIsLoading] = useState(true);
    const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
    const [selectedPlanDays, setSelectedPlanDays] = useState<number | null>(null);
    const [modalType, setModalType] = useState<ModalType>(null);
    const [generating, setGenerating] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<GeneratedDay[]>([]);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [narrativePlan, setNarrativePlan] = useState<string>("");
    const [narrativeOpen, setNarrativeOpen] = useState(false);
    const [aiPlan, setAiPlan] = useState<AiBusinessPlanDto | null>(null);
    const [planMissingFields, setPlanMissingFields] = useState<string[]>([]);
    const [activeStrategyTab, setActiveStrategyTab] = useState<
        "summary" | "growth" | "marketing" | "weekly" | "content" | "captions" | "hashtags" | "promotions" | "metrics" | "recommendations"
    >("summary");
    const [completedMap, setCompletedMap] = useState<Record<number, boolean>>({});
    const [savingDayNumber, setSavingDayNumber] = useState<number | null>(null);
    const [planId, setPlanId] = useState<string>("");
    const [planStatus, setPlanStatus] = useState<"active" | "completed" | "archived">("active");
    const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);
    const canGenerate = !isLoading && !!businessDetails && !!selectedPlanDays && !generating && (!hasGenerated || isNewMode);
    const loadInitialData = useCallback(async () => {
        const uid = auth.currentUser?.uid ?? user?.uid;
        console.log("UID", uid);
        if (!uid)
            return;
        setIsLoading(true);
        setModalType(null);
        setMissingProfileFields([]);
        try {
            const businessRes = await fetch(`/api/business-profile?firebase_uid=${encodeURIComponent(uid)}`, {
                cache: "no-store",
            });
            const businessJson = await businessRes.json();
            if (businessRes.status === 404 ||
                (businessJson?.ok === false &&
                    (businessJson?.error === "No business profile" || businessJson?.error === "business_profile_not_found"))) {
                setBusinessDetails(null);
                setSelectedPlanDays(null);
                setModalType("missingBusiness");
                return;
            }
            if (!businessRes.ok || !businessJson?.ok) {
                throw new Error(businessJson?.error || "Failed to load business details");
            }
            setBusinessDetails((businessJson.data ?? {}) as BusinessDetails);
            const planRes = await fetch(`/api/select-plan?firebase_uid=${encodeURIComponent(uid)}`, {
                cache: "no-store",
            });
            const planJson = await planRes.json();
            if (planRes.status === 404 ||
                (planJson?.ok === false && (planJson?.error === "No plan selected" || planJson?.error === "plan_not_selected"))) {
                setSelectedPlanDays(null);
                setModalType("missingPlan");
                return;
            }
            if (!planRes.ok || !planJson?.ok) {
                throw new Error(planJson?.error || "Failed to load selected plan");
            }
            const selected = (planJson.data ?? {}) as SelectedPlan;
            const savedNextDays = Number((planJson.data as Record<string, unknown>)?.next_plan_days ?? 0);
            const days = [7, 14, 30].includes(requestedDays)
                ? requestedDays
                : Number(savedNextDays || (selected.planDays ?? selected.plan_days ?? 0));
            if (![7, 14, 30].includes(days)) {
                setSelectedPlanDays(null);
                setModalType("missingPlan");
                return;
            }
            setSelectedPlanDays(days);
            if (isNewMode) {
                setGeneratedPlan([]);
                setHasGenerated(false);
                setNarrativePlan("");
                setAiPlan(null);
                setPlanMissingFields([]);
                setCompletedMap({});
                setPlanId("");
                setPlanStatus("active");
                return;
            }
            const latestRes = await fetch(`/api/marketing-plan/latest?firebase_uid=${encodeURIComponent(uid)}`, {
                cache: "no-store",
            });
            const latestJson = (await latestRes.json()) as LatestPlanResponse;
            if (latestRes.ok && latestJson?.ok) {
                const plan = latestJson.plan;
                const rawPlan = Array.isArray(plan?.planDays) ? plan.planDays : [];
                const normalized = rawPlan.map((d) => ({
                    ...d,
                    executionSteps: Array.isArray(d.executionSteps) ? d.executionSteps : [],
                    hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
                }));
                const legacyFallback = isLegacyFallbackPlan(normalized);
                setGeneratedPlan(legacyFallback ? [] : normalized);
                setHasGenerated(normalized.length > 0 && !legacyFallback);
                setSelectedPlanDays(Number(plan?.durationDays ?? days));
                setNarrativePlan(typeof plan?.narrativePlan === "string" ? plan.narrativePlan : "");
                setAiPlan(plan?.aiBusinessPlan && typeof plan.aiBusinessPlan === "object" ? plan.aiBusinessPlan : null);
                setPlanMissingFields(Array.isArray(plan?.missingProfileFields) ? plan.missingProfileFields.map(String) : []);
                const completedDays = normalized.filter((day) => day.completed).map((day) => day.dayNumber);
                setCompletedMap(completedDays.reduce<Record<number, boolean>>((acc, day) => {
                    const dayNumber = Number(day);
                    if (Number.isInteger(dayNumber) && dayNumber > 0)
                        acc[dayNumber] = true;
                    return acc;
                }, {}));
                setPlanId(typeof plan?._id === "string" ? plan._id : "");
                setPlanStatus(plan?.status ?? "active");
            }
            else {
                setGeneratedPlan([]);
                setHasGenerated(false);
                setNarrativePlan("");
                setAiPlan(null);
                setPlanMissingFields([]);
                setCompletedMap({});
            }
        }
        catch {
            setBusinessDetails(null);
            setSelectedPlanDays(null);
            setModalType("serverError");
        }
        finally {
            setIsLoading(false);
        }
    }, [user?.uid, isNewMode, requestedDays]);
    async function generatePlan() {
        const uid = auth.currentUser?.uid ?? user?.uid;
        console.log("UID", uid);
        if (!uid) {
            router.replace("/login");
            return;
        }
        setGenerating(true);
        setModalType(null);
        setMissingProfileFields([]);
        try {
            const response = await fetch("/api/marketing-plan/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firebase_uid: uid,
                    durationDays: selectedPlanDays,
                    days: selectedPlanDays,
                    mode: isNewMode ? "new" : "default",
                    forceNew: isNewMode,
                }),
            });
            const result = await response.json();
            if (!response.ok || !result?.ok) {
                if (result?.error === "business_profile_not_found") {
                    setModalType("missingBusiness");
                }
                else if (result?.error === "business_profile_incomplete") {
                    setMissingProfileFields(Array.isArray(result?.missingFields) ? result.missingFields.map((value: unknown) => String(value)) : []);
                    setModalType("incompleteBusiness");
                }
                else if (result?.error === "plan_not_selected") {
                    setModalType("missingPlan");
                }
                else {
                    setModalType("serverError");
                }
                return;
            }
            const rawNext = Array.isArray(result?.plan?.planDays)
                ? result.plan.planDays
                : Array.isArray(result?.data?.planDays)
                    ? result.data.planDays
                    : Array.isArray(result?.data?.planData)
                        ? result.data.planData
                        : [];
            const nextPlan = rawNext.map((d: GeneratedDay) => ({
                ...d,
                executionSteps: Array.isArray(d.executionSteps) ? d.executionSteps : [],
                hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
            }));
            setGeneratedPlan(nextPlan);
            setSelectedPlanDays(Number(result?.plan?.durationDays ?? result?.data?.planDays ?? selectedPlanDays ?? nextPlan.length ?? 0));
            setHasGenerated(nextPlan.length > 0);
            const nextNarrative = typeof result?.plan?.narrativePlan === "string"
                ? result.plan.narrativePlan
                : typeof result?.data?.narrativePlan === "string"
                    ? result.data.narrativePlan
                    : "";
            setNarrativePlan(nextNarrative);
            setNarrativeOpen(Boolean(nextNarrative));
            const nextAiPlan: AiBusinessPlanDto | null =
                result?.plan?.aiBusinessPlan && typeof result.plan.aiBusinessPlan === "object"
                    ? (result.plan.aiBusinessPlan as AiBusinessPlanDto)
                    : result?.data?.aiBusinessPlan && typeof result.data.aiBusinessPlan === "object"
                        ? (result.data.aiBusinessPlan as AiBusinessPlanDto)
                        : null;
            setAiPlan(nextAiPlan);
            const nextMissing: string[] = Array.isArray(result?.data?.missingProfileFields)
                ? (result.data.missingProfileFields as unknown[]).map((v) => String(v))
                : Array.isArray(result?.plan?.missingProfileFields)
                    ? (result.plan.missingProfileFields as unknown[]).map((v) => String(v))
                    : [];
            setPlanMissingFields(nextMissing);
            if (nextAiPlan) setActiveStrategyTab("summary");
            setCompletedMap(nextPlan.reduce<Record<number, boolean>>((acc, day) => {
                if (day.completed)
                    acc[day.dayNumber] = true;
                return acc;
            }, {}));
            setPlanId(typeof result?.plan?._id === "string" ? result.plan._id : "");
            setPlanStatus(result?.plan?.status ?? "active");
            if (isNewMode) {
                router.push("/marketing-plan");
            }
        }
        catch {
            setModalType("serverError");
        }
        finally {
            setGenerating(false);
        }
    }
    async function toggleDayCompleted(dayNumber: number, completed: boolean) {
        const uid = auth.currentUser?.uid ?? user?.uid;
        console.log("UID", uid);
        if (!uid || savingDayNumber)
            return;
        const previousCompleted = Boolean(completedMap[dayNumber]);
        setSavingDayNumber(dayNumber);
        setCompletedMap((prev) => ({
            ...prev,
            [dayNumber]: completed,
        }));
        try {
            const response = await fetch("/api/marketing-plan/day-complete", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firebase_uid: uid, planId, dayNumber, completed }),
            });
            const result = (await response.json()) as CompleteDayResponse;
            if (!response.ok || !result?.ok) {
                setCompletedMap((prev) => ({
                    ...prev,
                    [dayNumber]: previousCompleted,
                }));
                setModalType("serverError");
                return;
            }
            const nextPlanDays = Array.isArray(result?.plan?.planDays) ? result.plan.planDays : [];
            const completedDays = nextPlanDays.filter((day) => day.completed).map((day) => day.dayNumber);
            setCompletedMap(completedDays.reduce<Record<number, boolean>>((acc, day) => {
                const completedDay = Number(day);
                if (Number.isInteger(completedDay) && completedDay > 0)
                    acc[completedDay] = true;
                return acc;
            }, {}));
            setGeneratedPlan(nextPlanDays);
            setPlanStatus(result?.plan?.status ?? "active");
        }
        catch {
            setCompletedMap((prev) => ({
                ...prev,
                [dayNumber]: previousCompleted,
            }));
            setModalType("serverError");
        }
        finally {
            setSavingDayNumber(null);
        }
    }
    function downloadPdf() {
        if (generatedPlan.length === 0)
            return;
        const businessName = (businessDetails?.businessName ?? "Business")
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/\s+/g, "_");
        const days = selectedPlanDays ?? generatedPlan.length;
        downloadMarketingPlanPdf({
            businessName: businessDetails?.businessName ?? "Business",
            planDays: days,
            planData: generatedPlan,
            filename: `BizBoost_Plan_${businessName || "Business"}_${days}Days.pdf`,
        });
    }
    useEffect(() => {
        if (authLoading)
            return;
        if (!user?.uid) {
            router.replace("/login");
            return;
        }
        void loadInitialData();
    }, [authLoading, user?.uid, router, loadInitialData]);
    const modalContent = useMemo(() => {
        if (modalType === "missingBusiness") {
            return {
                title: "Fill business details first",
                text: "Please complete your business details.",
                primaryText: "Go to Business Details",
                primaryAction: () => router.push("/onboarding/business-details"),
                secondaryText: "Close",
                secondaryAction: () => setModalType(null),
            };
        }
        if (modalType === "incompleteBusiness") {
            const fieldsText = missingProfileFields.length > 0
                ? `Missing: ${missingProfileFields.join(", ")}.`
                : "Some required details are missing.";
            return {
                title: "Complete business details",
                text: `${fieldsText} Update your business profile, then generate your plan again.`,
                primaryText: "Update Business Details",
                primaryAction: () => router.push("/onboarding/business-details"),
                secondaryText: "Close",
                secondaryAction: () => setModalType(null),
            };
        }
        if (modalType === "missingPlan") {
            return {
                title: "Select a plan first",
                text: "Please choose a plan to continue.",
                primaryText: "Go to Select Plan",
                primaryAction: () => router.push("/select-plan"),
                secondaryText: "Close",
                secondaryAction: () => setModalType(null),
            };
        }
        if (modalType === "serverError") {
            return {
                title: "Something went wrong",
                text: "Please try again.",
                primaryText: "Retry",
                primaryAction: () => void loadInitialData(),
                secondaryText: "Close",
                secondaryAction: () => setModalType(null),
            };
        }
        return null;
    }, [modalType, missingProfileFields, router, loadInitialData]);
    const planDaysLabel = selectedPlanDays ?? generatedPlan.length ?? 0;
    const safePlan = Array.isArray(generatedPlan) ? generatedPlan : [];
    const completedCount = safePlan.filter((day) => completedMap[day.dayNumber]).length;
    const progressPercent = safePlan.length > 0 ? Math.round((completedCount / safePlan.length) * 100) : 0;
    const planFullyCompleted = isPlanFullyCompleted(safePlan, completedMap);
    const todayPlanDay = getTodayPlanDay(safePlan);
    const fallbackDay = getNextIncompleteDay(safePlan, completedMap);
    const taskDay = todayPlanDay ?? fallbackDay;
    const isTodayTaskCompleted = Boolean(todayPlanDay && completedMap[todayPlanDay.dayNumber]);
    const isFallbackTask = !todayPlanDay && Boolean(fallbackDay);
    return (<div className="bb-page">
      <section className="bb-hero-dark bb-hero-dark--planHeroBreath">
        <div className="bb-hero-dark-inner bb-hero-centered bb-hero-planBuilder mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
          <p className="bb-eyebrow-dark">Plan Builder</p>
          <h1 className="bb-title-dark">Marketing Plan</h1>
          <p className="bb-lead-dark bb-lead-dark--planBuilder">
            Generate a business growth plan (operations &amp; revenue first) with matching marketing activation ideas from your profile and plan length.
          </p>
        </div>
      </section>

      <section className="bb-band-light">
        <div className="bb-shell">
          <div className="planShell">
        <section className="topCard">
          <div className="summaryGrid">
            <div className="summaryCard">
              <div className="summaryLabel">Business Name</div>
              <div className="summaryValue">
                {isLoading ? "Loading..." : businessDetails?.businessName || "Not loaded"}
              </div>
            </div>

            <div className="summaryCard">
              <div className="summaryLabel">Business Type</div>
              <div className="summaryValue">
                {isLoading ? "Loading..." : businessDetails?.businessType || "Not loaded"}
              </div>
            </div>

            <div className="summaryCard">
              <div className="summaryLabel">Selected Plan</div>
              <div className="summaryValue">
                {isLoading ? "Loading..." : selectedPlanDays ? `${selectedPlanDays} Days` : "Not loaded"}
              </div>
            </div>
          </div>

          {!hasGenerated ? (<div className="generateWrap">
              <button type="button" disabled={!canGenerate} onClick={() => void generatePlan()} className="generateBtn">
                {generating ? (<>
                    <span className="spinner"/>
                    Generating...
                  </>) : (isNewMode ? "Generate New Plan" : "Generate My Plan")}
              </button>
            </div>) : (<p className="planSavedNote">Your latest plan is saved and loads automatically on every visit.</p>)}
        </section>

        <section className="listCard">
          {planFullyCompleted ? (<div className="planCompleteCard topBanner">
              <p className="planCompleteTitle">Plan Completed 🎉</p>
              <p className="planCompleteText">Great work! You completed all scheduled tasks.</p>
              <div className="planCompleteActions">
                <button type="button" className="downloadBtn" onClick={() => router.push("/select-plan?mode=new")}>Start New Plan</button>
              </div>
            </div>) : (<section className={`todayTaskCard taskCardInset ${isTodayTaskCompleted ? "todayTaskCelebration" : ""}`}>
              <div className="todayTaskHead">
                <h3>
                  {isTodayTaskCompleted
                ? "Today completed!"
                : isFallbackTask
                    ? "Next Task"
                    : "Today’s Task"}
                </h3>
              </div>
              {isLoading ? (<div className="todayTaskBody">
                  <p className="todayTaskSub">Loading today&apos;s task…</p>
                </div>) : taskDay ? (<div className="todayTaskBody">
                  <span className="todayTaskDate">{taskDay.dateLabel || "Today"}</span>
                  <p className="todayTaskTitle">
                    {taskDay.mainActionTitle ? cleanTitle(taskDay.mainActionTitle) || taskDay.mainActionTitle : `Day ${taskDay.dayNumber} action`}
                  </p>
                  {isTodayTaskCompleted ? (<>
                      <div className="todayTaskActionsRow">
                        <button type="button" className="todayTaskBtn todayTaskBtnSecondary" disabled>
                          Completed
                        </button>
                        {fallbackDay && fallbackDay.dayNumber !== taskDay.dayNumber ? (<button type="button" className="todayTaskBtn todayTaskBtnPrimary" onClick={() => router.push(`/marketing-plan/day/${fallbackDay.dayNumber}`)}>
                            View Tomorrow →
                          </button>) : null}
                      </div>
                      <p className="todayTaskHint">Today is done. Keep the streak going!</p>
                    </>) : (<button type="button" className="todayTaskBtn todayTaskBtnPrimary" onClick={() => router.push(`/marketing-plan/day/${taskDay.dayNumber}`)}>
                      Open Day Detail
                    </button>)}
                </div>) : (<div className="todayTaskBody">
                  <p className="todayTaskSub">No task available yet.</p>
                </div>)}
            </section>)}
          <div className="listHead">
            <div>
              <h2>Your growth plan ({planDaysLabel} days)</h2>
              {safePlan.length > 0 ? (<>
                  <p className="planListSub">Each day: business growth task first, then marketing activation to support it.</p>
                  <div className="progressSummary">
                    <span>{completedCount}/{safePlan.length} completed</span>
                    <span>{progressPercent}%</span>
                  </div>
                </>) : null}
            </div>
            <div className="headRight">
              <span className="daysBadge">{planDaysLabel || 0} Days</span>
              {safePlan.length > 0 ? <span className="progressBadge">{progressPercent}% Complete</span> : null}
              {hasGenerated && <span className="savedBadge">Saved</span>}
              <button type="button" onClick={downloadPdf} disabled={generatedPlan.length === 0} className="downloadBtn">
                Download PDF
              </button>
            </div>
          </div>
          {safePlan.length === 0 ? (<div className="emptyState">Generate your plan to see daily actions here.</div>) : (<div className="rows">
              {safePlan.map((day) => (<div key={day.dayNumber} className={`dayRow ${completedMap[day.dayNumber] ? "dayRowCompleted" : ""}`} onClick={() => router.push(`/marketing-plan/day/${day.dayNumber}`)} role="button" tabIndex={0} onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/marketing-plan/day/${day.dayNumber}`);
                    }
                }}>
                  <label className={`dayCheckWrap ${savingDayNumber === day.dayNumber ? "dayCheckWrapSaving" : ""}`} aria-label={`Mark day ${day.dayNumber} as completed`} onClick={(event) => event.stopPropagation()}>
                    <input type="checkbox" className="dayCheck" checked={Boolean(completedMap[day.dayNumber])} disabled={savingDayNumber === day.dayNumber} onChange={(event) => {
                    event.stopPropagation();
                    void toggleDayCompleted(day.dayNumber, event.target.checked);
                }} onClick={(event) => event.stopPropagation()}/>
                    <span className="dayCheckVisual" aria-hidden>
                      {savingDayNumber === day.dayNumber ? "…" : completedMap[day.dayNumber] ? "✓" : ""}
                    </span>
                  </label>
                  <div className="dateBlock">
                    <span className="dateBlockMain">{day.dateLabel || "Date"}</span>
                    <span className="dateBlockSub">Day {day.dayNumber}</span>
                  </div>
                  <div className="dayRowMain">
                    <div className="rowTextCol">
                      <span className="rowTitle">
                        {day.mainActionTitle ? cleanTitle(day.mainActionTitle) || day.mainActionTitle : `Day ${day.dayNumber} action`}
                      </span>
                      <div className="rowChipLine">
                        <span className="miniChip business">Business Action</span>
                        <span className="chipText" title={day.businessGrowthAction || ""}>
                          {truncateWords(day.businessGrowthAction || "Execute the core business action for this day.", 12)}
                        </span>
                      </div>
                      <div className="rowChipLine">
                        <span className="miniChip marketing">Marketing Activation</span>
                        <span className="chipText" title={(day.marketingActivation?.postIdea || day.postIdea || "")}>
                          {truncateWords(day.marketingActivation?.postIdea || day.postIdea || "Promote today’s business action with one focused message.", 12)}
                        </span>
                      </div>
                    </div>
                    <span className="rowArrow" aria-hidden>→</span>
                  </div>
                </div>))}
            </div>)}
        </section>

        {aiPlan && (<section className="strategyCard">
            <div className="strategyHead">
              <div>
                <p className="eyebrow">AI Business + Marketing Plan</p>
                <h2>Your Personalized Growth Strategy</h2>
                <p className="narrativeHint">
                  Built from your business profile, products/services, location, and selected plan duration.
                </p>
              </div>
            </div>
            {planMissingFields.length > 0 && (<div className="missingBanner">
                <p className="missingTitle">Make this plan even sharper</p>
                <p className="missingText">
                  Complete these business profile details for stronger next-time results:&nbsp;
                  <strong>{planMissingFields.join(", ")}.</strong>
                </p>
                <button type="button" className="missingBtn" onClick={() => router.push("/onboarding/business-details")}>
                  Update Business Details
                </button>
              </div>)}
            <div className="strategyTabs" role="tablist">
              {([
                ["summary", "Business Summary"],
                ["growth", "Growth Strategy"],
                ["marketing", "Marketing Strategy"],
                ["weekly", "Weekly Plan"],
                ["content", "Content Ideas"],
                ["captions", "Captions"],
                ["hashtags", "Hashtags"],
                ["promotions", "Promotions"],
                ["metrics", "Success Metrics"],
                ["recommendations", "Recommendations"],
              ] as const).map(([id, label]) => (<button key={id} type="button" role="tab" aria-selected={activeStrategyTab === id} className={`strategyTab ${activeStrategyTab === id ? "active" : ""}`} onClick={() => setActiveStrategyTab(id)}>
                  {label}
                </button>))}
            </div>
            <div className="strategyBody">
              {activeStrategyTab === "summary" && (<div className="strategySection">
                  {aiPlan.businessSummary && (<p className="strategyPara">{aiPlan.businessSummary}</p>)}
                  {aiPlan.mainGrowthGoal && (<div className="strategyBlock">
                      <h3>Main Growth Goal</h3>
                      <p className="strategyPara">{aiPlan.mainGrowthGoal}</p>
                    </div>)}
                  {Array.isArray(aiPlan.keyOpportunities) && aiPlan.keyOpportunities.length > 0 && (<div className="strategyBlock">
                      <h3>Key Opportunities</h3>
                      <ul className="strategyList">
                        {aiPlan.keyOpportunities.map((item, idx) => (<li key={`op-${idx}`}>{item}</li>))}
                      </ul>
                    </div>)}
                  {Array.isArray(aiPlan.keyChallenges) && aiPlan.keyChallenges.length > 0 && (<div className="strategyBlock">
                      <h3>Key Challenges</h3>
                      <ul className="strategyList">
                        {aiPlan.keyChallenges.map((item, idx) => (<li key={`ch-${idx}`}>{item}</li>))}
                      </ul>
                    </div>)}
                </div>)}

              {activeStrategyTab === "growth" && (<div className="strategySection">
                  {Array.isArray(aiPlan.growthStrategy) && aiPlan.growthStrategy.length > 0 ? (aiPlan.growthStrategy.map((pillar, idx) => (<div key={`pillar-${idx}`} className="strategyPillar">
                        <h3>{pillar.title || `Growth Pillar ${idx + 1}`}</h3>
                        {pillar.why && <p className="strategyPara">{pillar.why}</p>}
                        {Array.isArray(pillar.how) && pillar.how.length > 0 && (<ul className="strategyList">
                            {pillar.how.map((step, sidx) => (<li key={`p-${idx}-h-${sidx}`}>{step}</li>))}
                          </ul>)}
                        {Array.isArray(pillar.kpis) && pillar.kpis.length > 0 && (<p className="strategyKpi">
                            <strong>KPIs:</strong> {pillar.kpis.join(" · ")}
                          </p>)}
                      </div>))) : (<p className="strategyEmpty">No growth pillars yet.</p>)}
                </div>)}

              {activeStrategyTab === "marketing" && (<div className="strategySection">
                  {aiPlan.marketingStrategy?.overview && (<p className="strategyPara">{aiPlan.marketingStrategy.overview}</p>)}
                  {Array.isArray(aiPlan.marketingStrategy?.primaryChannels) && aiPlan.marketingStrategy!.primaryChannels!.length > 0 && (<div className="strategyBlock">
                      <h3>Primary Channels</h3>
                      <ul className="strategyList">
                        {aiPlan.marketingStrategy!.primaryChannels!.map((item, idx) => (<li key={`ch-${idx}`}>{item}</li>))}
                      </ul>
                    </div>)}
                  {Array.isArray(aiPlan.marketingStrategy?.contentMix) && aiPlan.marketingStrategy!.contentMix!.length > 0 && (<div className="strategyBlock">
                      <h3>Content Mix</h3>
                      <ul className="strategyList">
                        {aiPlan.marketingStrategy!.contentMix!.map((item, idx) => (<li key={`mix-${idx}`}>{item}</li>))}
                      </ul>
                    </div>)}
                  {Array.isArray(aiPlan.marketingStrategy?.audienceTips) && aiPlan.marketingStrategy!.audienceTips!.length > 0 && (<div className="strategyBlock">
                      <h3>Reaching Your Audience</h3>
                      <ul className="strategyList">
                        {aiPlan.marketingStrategy!.audienceTips!.map((item, idx) => (<li key={`at-${idx}`}>{item}</li>))}
                      </ul>
                    </div>)}
                  {Array.isArray(aiPlan.marketingStrategy?.weeklyRhythm) && aiPlan.marketingStrategy!.weeklyRhythm!.length > 0 && (<div className="strategyBlock">
                      <h3>Weekly Rhythm</h3>
                      <ul className="strategyList">
                        {aiPlan.marketingStrategy!.weeklyRhythm!.map((item, idx) => (<li key={`wr-${idx}`}>{item}</li>))}
                      </ul>
                    </div>)}
                </div>)}

              {activeStrategyTab === "weekly" && (<div className="strategySection">
                  {Array.isArray(aiPlan.weeklyActionPlan) && aiPlan.weeklyActionPlan.length > 0 ? (aiPlan.weeklyActionPlan.map((week, idx) => (<div key={`week-${idx}`} className="strategyPillar">
                        <h3>Week {week.week || idx + 1}{week.focus ? ` — ${week.focus}` : ""}</h3>
                        {Array.isArray(week.goals) && week.goals.length > 0 && (<>
                            <p className="strategyPara"><strong>Goals</strong></p>
                            <ul className="strategyList">
                              {week.goals.map((g, gi) => (<li key={`wg-${idx}-${gi}`}>{g}</li>))}
                            </ul>
                          </>)}
                        {Array.isArray(week.actions) && week.actions.length > 0 && (<>
                            <p className="strategyPara"><strong>Actions</strong></p>
                            <ul className="strategyList">
                              {week.actions.map((a, ai) => (<li key={`wa-${idx}-${ai}`}>{a}</li>))}
                            </ul>
                          </>)}
                      </div>))) : (<p className="strategyEmpty">No weekly milestones yet.</p>)}
                </div>)}

              {activeStrategyTab === "content" && (<div className="strategySection">
                  {[
                {
                    title: "Sales Improvement Ideas",
                    items: aiPlan.salesImprovementIdeas,
                },
                {
                    title: "Customer Attraction Ideas",
                    items: aiPlan.customerAttractionIdeas,
                },
                {
                    title: "Customer Retention Ideas",
                    items: aiPlan.customerRetentionIdeas,
                },
                {
                    title: "Content Ideas",
                    items: aiPlan.contentIdeas,
                },
            ].map(({ title, items }) => Array.isArray(items) && items.length > 0 ? (<div key={title} className="strategyBlock">
                      <h3>{title}</h3>
                      <ul className="strategyList">
                        {items.map((item, idx) => (<li key={`${title}-${idx}`}>{item}</li>))}
                      </ul>
                    </div>) : null)}
                </div>)}

              {activeStrategyTab === "captions" && (<div className="strategySection">
                  {Array.isArray(aiPlan.captionSuggestions) && aiPlan.captionSuggestions.length > 0 ? (aiPlan.captionSuggestions.map((c, idx) => (<div key={`cap-${idx}`} className="captionCard">
                        <pre className="captionPre">{c}</pre>
                        <button type="button" className="copyBtn" onClick={() => {
                            void navigator.clipboard?.writeText(c).catch(() => undefined);
                        }}>
                          Copy
                        </button>
                      </div>))) : (<p className="strategyEmpty">No caption suggestions yet.</p>)}
                </div>)}

              {activeStrategyTab === "hashtags" && (<div className="strategySection">
                  {Array.isArray(aiPlan.hashtagSuggestions) && aiPlan.hashtagSuggestions.length > 0 ? (<div className="hashtagWrap">
                      {aiPlan.hashtagSuggestions.map((tag, idx) => (<span key={`tag-${idx}`} className="hashtagChip">{tag.startsWith("#") ? tag : `#${tag.replace(/^#+/, "")}`}</span>))}
                    </div>) : (<p className="strategyEmpty">No hashtags yet.</p>)}
                </div>)}

              {activeStrategyTab === "promotions" && (<div className="strategySection">
                  {Array.isArray(aiPlan.promotionIdeas) && aiPlan.promotionIdeas.length > 0 ? (<ul className="strategyList">
                      {aiPlan.promotionIdeas.map((p, idx) => (<li key={`promo-${idx}`}>{p}</li>))}
                    </ul>) : (<p className="strategyEmpty">No promotion ideas yet.</p>)}
                </div>)}

              {activeStrategyTab === "metrics" && (<div className="strategySection">
                  {Array.isArray(aiPlan.successMetrics) && aiPlan.successMetrics.length > 0 ? (<ul className="strategyList">
                      {aiPlan.successMetrics.map((m, idx) => (<li key={`metric-${idx}`}>{m}</li>))}
                    </ul>) : (<p className="strategyEmpty">No success metrics yet.</p>)}
                </div>)}

              {activeStrategyTab === "recommendations" && (<div className="strategySection">
                  {Array.isArray(aiPlan.finalRecommendations) && aiPlan.finalRecommendations.length > 0 ? (<ul className="strategyList">
                      {aiPlan.finalRecommendations.map((r, idx) => (<li key={`rec-${idx}`}>{r}</li>))}
                    </ul>) : (<p className="strategyEmpty">No recommendations yet.</p>)}
                </div>)}
            </div>
          </section>)}

        {narrativePlan && (<section className="narrativeCard">
            <div className="narrativeHead">
              <div>
                <p className="eyebrow">AI Strategy Report</p>
                <h2>Full Plan in Detail</h2>
                <p className="narrativeHint">
                  Generated from your business details using Gemini. Tailored for small businesses in Sri Lanka.
                </p>
              </div>
              <button type="button" className="toggleBtn" onClick={() => setNarrativeOpen((v) => !v)}>
                {narrativeOpen ? "Hide" : "View Full Plan"}
              </button>
            </div>
            {narrativeOpen && (<div className="narrativeBody">{renderMarkdownPlan(narrativePlan)}</div>)}
          </section>)}
          </div>
        </div>
      </section>

      {modalContent && (<div className="modalOverlay">
          <div className="modalCard">
            <h3>{modalContent.title}</h3>
            <p>{modalContent.text}</p>
            <div className="modalActions">
              <button type="button" onClick={modalContent.secondaryAction} className="btn secondary">
                {modalContent.secondaryText}
              </button>
              <button type="button" onClick={modalContent.primaryAction} className="btn primary">
                {modalContent.primaryText}
              </button>
            </div>
          </div>
        </div>)}

      <style jsx>{`
        .planShell {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          gap: clamp(18px, 3vw, 24px);
        }

        .topCard,
        .listCard {
          border-radius: 28px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 250, 250, 0.94) 100%);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 24px 64px rgba(15, 23, 42, 0.09);
          backdrop-filter: blur(14px);
          padding: clamp(20px, 3vw, 28px);
        }

        .eyebrow {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }

        .summaryGrid {
          margin-top: 0;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .summaryCard {
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
          padding: 14px;
        }

        .summaryLabel {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #64748b;
          font-weight: 700;
        }

        .summaryValue {
          margin-top: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }

        .generateWrap {
          margin-top: 16px;
          display: flex;
          justify-content: center;
        }

        .planSavedNote {
          margin: 16px 0 0;
          text-align: center;
          font-size: 14px;
          color: #64748b;
          line-height: 1.5;
        }

        .generateBtn {
          border: 1px solid #111111;
          background: #111111;
          color: #ffffff;
          border-radius: 999px;
          min-width: min(280px, 100%);
          padding: 15px 28px;
          font-size: 15px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.22);
          cursor: pointer;
          transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease;
        }

        .generateBtn:hover {
          transform: translateY(-2px);
          filter: brightness(1.02);
        }

        .generateBtn:disabled {
          cursor: not-allowed;
          transform: none;
          filter: none;
          background: #cbd5e1;
          border-color: rgba(148, 163, 184, 0.45);
          box-shadow: none;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.38);
          border-top-color: #ffffff;
          animation: spin 1s linear infinite;
        }

        .listHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .planListSub {
          margin: 6px 0 0;
          font-size: 13px;
          color: #64748b;
          line-height: 1.45;
          max-width: 52ch;
        }

        .taskCardInset {
          margin-bottom: 14px;
        }
        .todayTaskCard {
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(12px);
          padding: 14px 16px;
        }
        .todayTaskCelebration {
          border-color: #e5e5e5;
          background: #f5f5f5;
          box-shadow: none;
        }
        .todayTaskHead h3 {
          margin: 0;
          color: #0f172a;
          font-size: 17px;
        }
        .todayTaskCelebration .todayTaskHead h3 {
          color: #111111;
        }
        .todayTaskBody {
          margin-top: 10px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(255, 255, 255, 0.75);
          padding: 12px;
          display: grid;
          gap: 10px;
        }
        .todayTaskDate {
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(255, 255, 255, 0.85);
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 9px;
        }
        .todayTaskTitle {
          margin: 0;
          color: #0f172a;
          font-size: 15px;
          font-weight: 700;
        }
        .todayTaskSub,
        .todayTaskHint {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }
        .todayTaskActionsRow {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .todayTaskBtn {
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
          width: fit-content;
        }
        .todayTaskBtnPrimary {
          background: #111111;
          border-color: #111111;
          color: #ffffff;
        }
        .todayTaskBtnSecondary {
          background: #ffffff;
          border-color: rgba(148, 163, 184, 0.4);
          color: #334155;
          cursor: default;
        }

        h2 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(24px, 3vw, 34px);
        }

        .progressSummary {
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .headRight {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .daysBadge {
          border-radius: 999px;
          border: 1px solid #e5e5e5;
          background: #f5f5f5;
          color: #111111;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 10px;
        }

        .progressBadge {
          border-radius: 999px;
          border: 1px solid rgba(59, 130, 246, 0.28);
          background: rgba(219, 234, 254, 0.86);
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 800;
          padding: 6px 10px;
        }

        .downloadBtn {
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.85);
          color: #334155;
          border-radius: 10px;
          padding: 9px 13px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .savedBadge {
          border-radius: 999px;
          border: 1px solid #e5e5e5;
          background: #f5f5f5;
          color: #111111;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 10px;
        }

        .downloadBtn:hover {
          background: #0f172a;
          color: #ffffff;
        }

        .downloadBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .planCompleteCard {
          border-radius: 14px;
          border: 1px solid #e5e5e5;
          background: #f5f5f5;
          padding: 12px;
          margin-bottom: 12px;
        }
        .topBanner {
          margin-bottom: 14px;
        }
        .planCompleteTitle {
          margin: 0;
          font-weight: 800;
          color: #111111;
        }
        .planCompleteText {
          margin: 8px 0 0;
          color: #444444;
          font-size: 13px;
        }
        .planCompleteActions {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .emptyState {
          border-radius: 16px;
          border: 1px dashed rgba(148, 163, 184, 0.45);
          background: rgba(255, 255, 255, 0.64);
          padding: 16px;
          color: #64748b;
          font-size: 14px;
        }

        .rows {
          display: grid;
          gap: 14px;
        }

        .dayRow {
          width: 100%;
          display: grid;
          grid-template-columns: auto 132px 1fr;
          align-items: stretch;
          gap: 16px;
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.84));
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.1);
          padding: 18px 20px;
          text-align: left;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
          min-height: 116px;
        }

        .dayRow:hover {
          transform: translateY(-2px);
          border-color: #111111;
          box-shadow: 0 22px 44px rgba(0, 0, 0, 0.12);
        }

        .dayRowCompleted {
          border-color: #e5e5e5;
          background: linear-gradient(160deg, rgba(245, 245, 245, 0.92), rgba(255, 255, 255, 0.85));
        }

        .dayCheckWrap {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .dayCheck {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .dayCheckVisual {
          width: 22px;
          height: 22px;
          border-radius: 7px;
          border: 1px solid rgba(148, 163, 184, 0.55);
          background: #ffffff;
          color: #ffffff;
          display: grid;
          place-items: center;
          font-size: 14px;
          font-weight: 900;
          transition: background 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
        }

        .dayCheck:checked + .dayCheckVisual {
          border-color: #111111;
          background: #111111;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
        }

        .dayCheck:disabled + .dayCheckVisual {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .dayRowMain {
          min-width: 0;
          border: 0;
          background: transparent;
          padding: 0;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 12px;
          text-align: left;
          cursor: pointer;
        }

        .rowTextCol {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .rowChipLine {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
        }

        .miniChip {
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 5px 10px;
          border: 1px solid transparent;
          flex-shrink: 0;
          line-height: 1.2;
        }
        .miniChip.business {
          color: #111111;
          background: #f5f5f5;
          border-color: #e5e5e5;
        }
        .miniChip.marketing {
          color: #1d4ed8;
          background: rgba(59, 130, 246, 0.14);
          border-color: rgba(59, 130, 246, 0.3);
        }
        .chipText {
          min-width: 0;
          flex: 1 1 auto;
          font-size: 13px;
          color: #475569;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }

        .dateBlock {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 4px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.78);
          min-width: 116px;
        }

        .dateBlockMain {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .dateBlockSub {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .dayRowCompleted .dateBlock {
          background: #f5f5f5;
          border-color: #e5e5e5;
        }

        .rowTitle {
          font-size: 17px;
          color: #0f172a;
          font-weight: 800;
          line-height: 1.32;
          letter-spacing: -0.01em;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .rowArrow {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: #ffffff;
          color: #475569;
          font-weight: 700;
          font-size: 16px;
          flex-shrink: 0;
        }

        .dayRow:hover .rowArrow {
          border-color: #111111;
          color: #111111;
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
          background: rgba(255, 255, 255, 0.86);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
          backdrop-filter: blur(12px);
          padding: 18px;
        }

        .modalCard h3 {
          margin: 0;
          font-size: 22px;
          color: #0f172a;
        }

        .modalCard p {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.55;
        }

        .modalActions {
          margin-top: 16px;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .btn {
          border-radius: 10px;
          padding: 9px 13px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn.secondary {
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: #ffffff;
          color: #334155;
        }

        .btn.primary {
          border: 1px solid #111111;
          background: #111111;
          color: #ffffff;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .narrativeCard {
          border-radius: 28px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(248, 250, 252, 0.96) 100%);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 28px 72px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(14px);
          padding: clamp(22px, 3vw, 30px);
        }

        .narrativeHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .narrativeHead h2 {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: clamp(22px, 3vw, 28px);
          letter-spacing: -0.01em;
        }

        .narrativeHint {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 13px;
          max-width: 560px;
          line-height: 1.5;
        }

        .toggleBtn {
          border: 1px solid rgba(99, 102, 241, 0.35);
          background: rgba(255, 255, 255, 0.95);
          color: #4338ca;
          border-radius: 999px;
          padding: 11px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
        }

        .toggleBtn:hover {
          background: rgba(238, 242, 255, 0.98);
          border-color: rgba(99, 102, 241, 0.5);
          transform: translateY(-1px);
        }

        .narrativeBody {
          margin-top: 20px;
          border-radius: 18px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: rgba(248, 250, 252, 0.65);
          padding: clamp(16px, 2.5vw, 22px);
        }

        .narrativeBody :global(.mdWrap) {
          display: flex;
          flex-direction: column;
          gap: 14px;
          color: #0f172a;
          font-size: 14.5px;
          line-height: 1.65;
        }

        .narrativeBody :global(.mdH2) {
          margin: 14px 0 0;
          font-size: 18px;
          color: #0f172a;
          font-weight: 800;
          letter-spacing: -0.005em;
          padding-bottom: 6px;
          border-bottom: 2px solid rgba(17, 17, 17, 0.35);
        }

        .narrativeBody :global(.mdH3) {
          margin: 6px 0 0;
          font-size: 15px;
          color: #0f172a;
          font-weight: 700;
        }

        .narrativeBody :global(.mdP) {
          margin: 0;
          color: #334155;
        }

        .narrativeBody :global(.mdList),
        .narrativeBody :global(.mdOl) {
          margin: 0;
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #334155;
        }

        .narrativeBody :global(.mdTableWrap) {
          overflow-x: auto;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 12px;
        }

        .narrativeBody :global(.mdTable) {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        .narrativeBody :global(.mdTable th) {
          text-align: left;
          padding: 10px 12px;
          background: rgba(241, 245, 249, 0.9);
          color: #0f172a;
          font-weight: 700;
          border-bottom: 1px solid rgba(148, 163, 184, 0.4);
          white-space: nowrap;
        }

        .narrativeBody :global(.mdTable td) {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.25);
          vertical-align: top;
          color: #334155;
        }

        .narrativeBody :global(.mdTable tr:last-child td) {
          border-bottom: none;
        }

        .strategyCard {
          border-radius: 28px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 24px 64px rgba(15, 23, 42, 0.09);
          padding: clamp(20px, 3vw, 28px);
          display: grid;
          gap: 16px;
        }
        .strategyHead h2 {
          margin: 4px 0 0;
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
        }
        .missingBanner {
          border-radius: 16px;
          border: 1px solid rgba(245, 158, 11, 0.35);
          background: linear-gradient(180deg, rgba(254, 243, 199, 0.7), rgba(254, 243, 199, 0.4));
          padding: 14px 16px;
          display: grid;
          gap: 8px;
        }
        .missingTitle {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          color: #92400e;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .missingText {
          margin: 0;
          font-size: 14px;
          color: #78350f;
        }
        .missingBtn {
          align-self: start;
          border-radius: 12px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(120, 53, 15, 0.35);
          background: #fff;
          color: #78350f;
          cursor: pointer;
          transition: all 160ms ease;
        }
        .missingBtn:hover {
          background: #78350f;
          color: #fff;
        }
        .strategyTabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.25);
        }
        .strategyTab {
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: #fff;
          color: #475569;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 140ms ease;
        }
        .strategyTab:hover {
          color: #0f172a;
          border-color: #0f172a;
        }
        .strategyTab.active {
          background: #0f172a;
          color: #fff;
          border-color: #0f172a;
        }
        .strategyBody {
          display: grid;
          gap: 14px;
        }
        .strategySection {
          display: grid;
          gap: 16px;
        }
        .strategyBlock h3,
        .strategyPillar h3 {
          margin: 0 0 6px;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }
        .strategyPara {
          margin: 0;
          font-size: 14.5px;
          line-height: 1.6;
          color: #1f2937;
        }
        .strategyList {
          margin: 6px 0 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
        }
        .strategyList li {
          font-size: 14px;
          line-height: 1.55;
          color: #334155;
        }
        .strategyPillar {
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(255, 255, 255, 0.85);
          padding: 14px 16px;
          display: grid;
          gap: 6px;
        }
        .strategyKpi {
          margin: 4px 0 0;
          font-size: 13px;
          color: #475569;
        }
        .strategyEmpty {
          font-size: 14px;
          color: #64748b;
        }
        .captionCard {
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(255, 255, 255, 0.9);
          padding: 12px 14px;
          display: grid;
          gap: 8px;
        }
        .captionPre {
          margin: 0;
          font-family: inherit;
          white-space: pre-wrap;
          font-size: 14px;
          line-height: 1.55;
          color: #1f2937;
        }
        .copyBtn {
          justify-self: start;
          border-radius: 10px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(15, 23, 42, 0.15);
          background: #fff;
          color: #0f172a;
          cursor: pointer;
          transition: all 140ms ease;
        }
        .copyBtn:hover {
          background: #0f172a;
          color: #fff;
        }
        .hashtagWrap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .hashtagChip {
          font-size: 13px;
          font-weight: 600;
          color: #1d4ed8;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.25);
          padding: 6px 10px;
          border-radius: 999px;
        }

        @media (max-width: 900px) {
          .summaryGrid {
            grid-template-columns: 1fr;
          }

          .dayRow {
            grid-template-columns: auto 1fr;
            grid-template-areas:
              "check title"
              "date  date";
            row-gap: 10px;
            padding: 16px;
          }
          .dayCheckWrap {
            grid-area: check;
          }
          .dayRowMain {
            grid-area: title;
          }
          .dateBlock {
            grid-area: date;
            flex-direction: row;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            min-width: 0;
            width: 100%;
            border-radius: 999px;
          }
          .dateBlockMain {
            font-size: 14px;
          }
          .dateBlockSub {
            font-size: 10px;
            margin-left: auto;
          }
          .rowTitle {
            font-size: 15px;
            -webkit-line-clamp: 2;
          }
          .chipText {
            font-size: 12.5px;
          }

          .narrativeHead {
            flex-direction: column;
          }
        }
      `}</style>
    </div>);
}
