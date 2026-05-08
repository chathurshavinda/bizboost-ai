"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaChevronRight, FaCalendarCheck, FaChartLine, FaClipboardCheck, FaEdit, FaFileAlt, FaIdBadge, FaImages, FaListOl, FaSignInAlt, FaUserCheck, } from "react-icons/fa";
import GradientText from "@/src/components/ui/GradientText";
import { BackgroundPaths } from "@/components/ui/background-paths";
import SplitText from "@/components/ui/SplitText";
import { useAuth } from "../src/lib/useAuth";
import { getNextIncompleteDay, getTodayPlanDay, isPlanFullyCompleted } from "../src/lib/taskCardState";
const HOW_STEPS = [
    {
        n: "01",
        title: "Sign Up / Log In",
        desc: "Create your account and access your workspace.",
        href: "/login",
        icon: <FaSignInAlt size={15}/>,
    },
    {
        n: "02",
        title: "Add Business Details",
        desc: "Enter business name, type, location, products/services.",
        href: "/onboarding/business-details",
        icon: <FaIdBadge size={15}/>,
    },
    {
        n: "03",
        title: "Review Business Profile",
        desc: "Check saved details and edit anytime.",
        href: "/dashboard/profile",
        icon: <FaUserCheck size={15}/>,
    },
    {
        n: "04",
        title: "Select a Plan",
        desc: "Choose 7 / 14 / 30 days based on your goals.",
        href: "/select-plan",
        icon: <FaListOl size={15}/>,
    },
    {
        n: "05",
        title: "Generate Action Plan",
        desc: "Get daily business growth actions + post ideas.",
        href: "/marketing-plan",
        icon: <FaFileAlt size={15}/>,
    },
    {
        n: "06",
        title: "Open Day Detail",
        desc: "See steps, caption, hashtags, success metric.",
        href: "/marketing-plan",
        icon: <FaClipboardCheck size={15}/>,
    },
    {
        n: "07",
        title: "Create Post in Biz Editor",
        desc: "Upload a real photo, auto-fill caption, generate poster.",
        href: "/biz-editor",
        icon: <FaEdit size={15}/>,
    },
    {
        n: "08",
        title: "Preview & Download/Share",
        desc: "Confirm poster, download image, share to platforms.",
        href: "/poster-preview",
        icon: <FaImages size={15}/>,
    },
    {
        n: "09",
        title: "Mark Completed & Track Progress",
        desc: "Tick completed days, see progress %, calendar view.",
        href: "/biz-calendar",
        icon: <FaCalendarCheck size={15}/>,
    },
];
const WHAT_YOU_GET = [
    { title: "Growth Action Plan", desc: "Daily tasks tailored to your profile" },
    { title: "Post Ideas + Captions", desc: "Ready-to-use copy for social posts" },
    { title: "Hashtag Suggestions", desc: "Relevant tags for reach" },
    { title: "Calendar View", desc: "Biz Calendar for your full timeline" },
    { title: "Save & Resume", desc: "Plans saved in your account (DB)" },
];
const PREVIEW_ROWS = [
    { date: "Apr 21", title: "Bundle promo launch" },
    { date: "Apr 22", title: "Highlight best-selling offer" },
    { date: "Apr 23", title: "Customer review collection day" },
    { date: "Apr 24", title: "Behind-the-scenes process" },
    { date: "Apr 25", title: "Weekend special activation" },
];
const WHY_BULLETS = [
    "Made for Sri Lankan SMEs",
    "Simple templates now, AI later",
    "Works even with minimal marketing knowledge",
];
function cleanTitle(title: string): string {
    return title.replace(/^Week\s*\d+\s*/i, "").replace(/^Day\s*\d+\s*/i, "").trim();
}
export default function Home() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [taskLoading, setTaskLoading] = useState(false);
    const [taskDays, setTaskDays] = useState<Array<{
        dayNumber: number;
        dateLabel?: string;
        mainActionTitle?: string;
    }>>([]);
    const [taskCompletedMap, setTaskCompletedMap] = useState<Record<number, boolean>>({});
    const [taskPlanDays, setTaskPlanDays] = useState<number>(0);
    useEffect(() => {
        if (loading)
            return;
        if (!user?.uid) {
            setTaskDays([]);
            setTaskCompletedMap({});
            setTaskPlanDays(0);
            return;
        }
        let cancelled = false;
        const loadTaskData = async () => {
            setTaskLoading(true);
            try {
                const [latestRes, statusesRes] = await Promise.all([
                    fetch(`/api/marketing-plan/latest?firebase_uid=${encodeURIComponent(user.uid)}`, { cache: "no-store" }),
                    fetch(`/api/day-status/all?firebase_uid=${encodeURIComponent(user.uid)}`, { cache: "no-store" }),
                ]);
                const latestJson = await latestRes.json();
                const statusesJson = await statusesRes.json();
                if (cancelled)
                    return;
                if (!latestRes.ok || !latestJson?.ok) {
                    setTaskDays([]);
                    setTaskCompletedMap({});
                    setTaskPlanDays(0);
                    return;
                }
                const rawDays = Array.isArray(latestJson?.plan?.planDays) ? latestJson.plan.planDays : [];
                const normalizedDays = rawDays
                    .map((day: {
                    dayNumber?: number;
                    dateLabel?: string;
                    mainActionTitle?: string;
                }) => ({
                    dayNumber: Number(day.dayNumber ?? 0),
                    dateLabel: typeof day.dateLabel === "string" ? day.dateLabel : "",
                    mainActionTitle: typeof day.mainActionTitle === "string" ? day.mainActionTitle : "",
                }))
                    .filter((day: {
                    dayNumber: number;
                }) => Number.isInteger(day.dayNumber) && day.dayNumber > 0)
                    .sort((a: {
                    dayNumber: number;
                }, b: {
                    dayNumber: number;
                }) => Number(a.dayNumber) - Number(b.dayNumber));
                const nextCompletedMap: Record<number, boolean> = {};
                const statusRows = Array.isArray(statusesJson?.data) ? statusesJson.data : [];
                for (const row of statusRows) {
                    const dayNumber = Number(row?.dayNumber ?? 0);
                    if (Number.isInteger(dayNumber) && dayNumber > 0)
                        nextCompletedMap[dayNumber] = Boolean(row?.completed);
                }
                const completedDays = rawDays
                    .filter((day: {
                    completed?: boolean;
                }) => Boolean(day?.completed))
                    .map((day: {
                    dayNumber?: number;
                }) => Number(day.dayNumber));
                for (const completedDay of completedDays) {
                    const dayNumber = Number(completedDay);
                    if (Number.isInteger(dayNumber) && dayNumber > 0)
                        nextCompletedMap[dayNumber] = true;
                }
                setTaskDays(normalizedDays);
                setTaskCompletedMap(nextCompletedMap);
                setTaskPlanDays(Number(latestJson?.plan?.durationDays ?? normalizedDays.length));
            }
            catch {
                if (cancelled)
                    return;
                setTaskDays([]);
                setTaskCompletedMap({});
                setTaskPlanDays(0);
            }
            finally {
                if (!cancelled)
                    setTaskLoading(false);
            }
        };
        void loadTaskData();
        return () => {
            cancelled = true;
        };
    }, [loading, user?.uid]);
    const taskState = useMemo(() => {
        const planFullyCompleted = isPlanFullyCompleted(taskDays, taskCompletedMap);
        const todayPlanDay = getTodayPlanDay(taskDays);
        const fallbackDay = getNextIncompleteDay(taskDays, taskCompletedMap);
        const taskDay = todayPlanDay ?? fallbackDay;
        const isTodayTaskCompleted = Boolean(todayPlanDay && taskCompletedMap[todayPlanDay.dayNumber]);
        const isFallbackTask = !todayPlanDay && Boolean(fallbackDay);
        return {
            planFullyCompleted,
            todayPlanDay,
            fallbackDay,
            taskDay,
            isTodayTaskCompleted,
            isFallbackTask,
        };
    }, [taskDays, taskCompletedMap]);
    return (<main className="landingRoot">
      <section className="heroShell">
        <div className="heroPathsLayer" aria-hidden>
          <BackgroundPaths title="" />
        </div>
        <div className="heroGradientBase" aria-hidden/>
        <div className="heroGradientMesh" aria-hidden/>

        <div className="heroContent">
          <h1 className="heroTitle">
            Premium marketing plans{" "}
            <GradientText
              className="heroTitleAccent heroTitleAccentGradient"
              colors={["#180954", "#da19d4", "#684d80"]}
              animationSpeed={3}
              showBorder={false}
            >
              for businesses
            </GradientText>
            {" "}that need momentum.
          </h1>

          <SplitText
            tag="p"
            text="Daily action plans, campaign-ready content, and clear progress tracking - all in one calm, focused workspace built for modern SMEs."
            className="heroSubtitle"
            delay={16}
            duration={0.6}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 24 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.12}
            rootMargin="-80px"
            textAlign="center"
          />

          <div className="heroActions">
            {!loading && !user && (<Link className="heroBtn heroBtnPrimary" href="/login">
                Start growing today
                <FaChevronRight size={12} aria-hidden/>
              </Link>)}
            <Link className="heroTextLink" href="#how-it-works">
              See how it works
              <FaChevronRight size={11} aria-hidden/>
            </Link>
          </div>

          <div className="heroTrust" aria-label="BizBoost highlights">
            <span><strong>7/14/30</strong> growth plan</span>
            <span className="heroTrustDot" aria-hidden>·</span>
            <span><strong>Poster templates</strong> + captions</span>
            <span className="heroTrustDot" aria-hidden>·</span>
            <span><strong>Track</strong> progress daily</span>
          </div>
        </div>
      </section>

      {!loading && user && (<div className="todayTaskWrap">
          {taskState.planFullyCompleted ? (<div className="homePlanCompleteCard">
              <p className="homePlanCompleteTitle">Plan Completed 🎉</p>
              <p className="homePlanCompleteText">Great work! You completed all scheduled tasks.</p>
              <button type="button" className="homeTaskBtn homeTaskBtnPrimary" onClick={() => router.push("/select-plan?mode=new")}>
                Start New Plan
              </button>
            </div>) : (<section className={`homeTaskCard ${taskState.isTodayTaskCompleted ? "homeTaskCelebration" : ""}`}>
              <div className="homeTaskHead">
                <h3>
                  {taskState.isTodayTaskCompleted ? "Today completed 🎉" : taskState.isFallbackTask ? "Next Task" : "Today’s Task"}
                </h3>
                {taskPlanDays > 0 ? <span>{taskPlanDays} Days</span> : null}
              </div>
              {taskLoading ? (<div className="homeTaskBody">
                  <p className="homeTaskSub">Loading today&apos;s task…</p>
                </div>) : taskState.taskDay ? (<div className="homeTaskBody">
                  <span className="homeTaskDate">{taskState.taskDay.dateLabel || "Today"}</span>
                  <p className="homeTaskTitle">
                    {cleanTitle(taskState.taskDay.mainActionTitle || "") || taskState.taskDay.mainActionTitle || `Day ${taskState.taskDay.dayNumber} action`}
                  </p>
                  {taskState.isTodayTaskCompleted ? (<>
                      <div className="homeTaskActionsRow">
                        <button type="button" className="homeTaskBtn homeTaskBtnSecondary" disabled>Completed</button>
                        {taskState.fallbackDay && taskState.fallbackDay.dayNumber !== taskState.taskDay.dayNumber ? (<button type="button" className="homeTaskBtn homeTaskBtnPrimary" onClick={() => router.push(`/marketing-plan/day/${taskState.fallbackDay.dayNumber}`)}>
                            View Tomorrow →
                          </button>) : null}
                      </div>
                      <p className="homeTaskSub">Today is done. Keep the streak going!</p>
                    </>) : (<button type="button" className="homeTaskBtn homeTaskBtnPrimary" onClick={() => router.push(`/marketing-plan/day/${taskState.taskDay.dayNumber}`)}>
                      Open Day Detail
                    </button>)}
                </div>) : (<div className="homeTaskBody">
                  <p className="homeTaskSub">No task available yet.</p>
                </div>)}
            </section>)}
        </div>)}

      <div className="scrollStack">
        <section id="how-it-works" className="scrollSection glassPanel">
            <div className="workflowHeader">
              <p className="sectionEyebrow">Workflow</p>
              <h2 className="sectionTitle">How BizBoost Works</h2>
              <p className="sectionLead">A premium guided journey from setup to execution, built for consistency.</p>
            </div>
            <div className="workflowShell">
              <div className="workflowIntro">
                <div className="setupBadge">
                  <FaChartLine size={13}/>
                  <span>Estimated setup time: 3-5 minutes</span>
                </div>
                <h3 className="workflowIntroTitle">Launch your growth engine</h3>
                <p>
                  Complete this flow once and BizBoost builds your daily momentum system with actions, post ideas, and measurable progress.
                </p>
                <div className="workflowKpis" aria-label="Workflow highlights">
                  <div className="workflowKpi">
                    <strong>9 steps</strong>
                    <span>guided onboarding flow</span>
                  </div>
                  <div className="workflowKpi">
                    <strong>Daily tasks</strong>
                    <span>clear next actions each day</span>
                  </div>
                </div>
                <div className="workflowActions">
                  <Link href={!loading && user ? "/onboarding/business-details" : "/login"} className="workflowBtn workflowBtnPrimary">
                    Start Now
                  </Link>
                  <Link href="/marketing-plan" className="workflowBtn workflowBtnGhost">
                    View Plan Builder
                  </Link>
                </div>
              </div>

              <div className="workflowTimeline">
                {HOW_STEPS.map((step) => (<div key={step.n}>
                    <article className="timelineItem">
                      <div className="timelineCard">
                        <div className="timelineCardTop">
                          <span className="stepNum" aria-hidden>{step.n}</span>
                          <span className="stepIconWrap" aria-hidden>
                            <span className="stepIcon">{step.icon}</span>
                          </span>
                          <h3>{step.title}</h3>
                        </div>
                        <p>{step.desc}</p>
                        <div className="timelineCardFooter">
                          <span className="timelineMeta">Step {step.n}</span>
                          <Link href={step.href} className="stepGoLink">
                            Open
                            <FaChevronRight size={12} aria-hidden/>
                          </Link>
                        </div>
                      </div>
                    </article>
                  </div>))}
              </div>
            </div>
          </section>

        <section id="features" className="scrollSection glassPanel">
            <p className="sectionEyebrow">Inside the app</p>
            <h2 className="sectionTitle">What you get</h2>
            <p className="sectionLead">Everything tied to your business profile and selected plan length.</p>

            <div className="featureGrid">
              {WHAT_YOU_GET.map((f) => (<div key={f.title}>
                  <article className="featureCard">
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </article>
                </div>))}
            </div>
          </section>

        <section id="example-preview" className="scrollSection glassPanel">
            <p className="sectionEyebrow">Preview</p>
            <h2 className="sectionTitle">Example Preview</h2>
            <p className="sectionLead">Sample day rows from a growth plan (illustrative).</p>

            <div className="previewList" role="presentation">
              {PREVIEW_ROWS.map((row) => (<div key={row.date} className="previewRow">
                  <span className="previewDate">{row.date}</span>
                  <span className="previewTitle">{row.title}</span>
                  <span className="previewArrow" aria-hidden>
                    <FaChevronRight size={14}/>
                  </span>
                </div>))}
            </div>
          </section>

        <section id="about" className="scrollSection glassPanel glassPanelCompact">
            <p className="sectionEyebrow">Why us</p>
            <h2 className="sectionTitle">Why BizBoost</h2>
            <ul className="whyList">
              {WHY_BULLETS.map((text) => (<li key={text}>{text}</li>))}
            </ul>
          </section>

        <section id="pricing" className="ctaStrip">
            <div className="ctaInner">
              <h2 className="ctaTitle">Ready to build your plan?</h2>
              <Link href="/select-plan" className="ctaBtn">
                Build your plan
                <FaChevronRight size={12} aria-hidden/>
              </Link>
            </div>
          </section>

        <footer className="homeFooter">
          <div className="homeFooterTop">
            <div className="homeFooterBrand">
              <Image src="/bizboost-mark.png" alt="BizBoost mark" width={36} height={36} className="homeFooterLogo"/>
              <Image src="/bizboost-wordmark.png" alt="BizBoost" width={170} height={40} className="homeFooterName"/>
            </div>
            <nav className="homeFooterNav" aria-label="Footer">
              <Link href="/">Home</Link>
              <Link href="/#features">Features</Link>
              <Link href="/#about">About</Link>
              <a href="https://docs.google.com/forms/d/e/1FAIpQLSdcpfUEm9IjNt_b8HuKxofOL5L4i0OBwukpgiQSHe7P1fsEEg/viewform?usp=publish-editor" target="_blank" rel="noopener noreferrer">
                Contact
              </a>
            </nav>
            <nav className="homeFooterLegal" aria-label="Legal">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
            </nav>
          </div>
          <p className="homeFooterCopy">© {new Date().getFullYear()} BizBoost AI. All rights reserved.</p>
        </footer>
      </div>

      <style jsx>{`
        .landingRoot {
          min-height: 100vh;
          width: 100%;
          max-width: 100%;
          overflow-x: clip;
          padding: 0;
          background: #f8fafc;
        }

        .heroShell {
          position: relative;
          width: 100%;
          margin: 0;
          padding: calc(clamp(14px, 3.6vh, 44px) + 26px) clamp(20px, 5vw, 80px) clamp(58px, 9vh, 106px);
          background: linear-gradient(180deg, #f8fbff 0%, #ffffff 58%, #f8fafc 100%);
          isolation: isolate;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: calc(100vh - 52px);
        }

        .heroGradientBase {
          position: absolute;
          inset: -20% -6% auto -6%;
          height: 88%;
          background:
            radial-gradient(64% 58% at 18% 24%, rgba(17, 17, 17, 0.07), transparent 72%),
            radial-gradient(58% 50% at 82% 18%, rgba(17, 17, 17, 0.05), transparent 70%),
            radial-gradient(44% 42% at 48% 82%, rgba(17, 17, 17, 0.04), transparent 74%);
          z-index: 1;
          pointer-events: none;
        }

        .heroGradientMesh {
          position: absolute;
          top: 12%;
          left: 50%;
          transform: translateX(-50%);
          width: min(720px, 90%);
          height: 360px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.65);
          z-index: 1;
          pointer-events: none;
        }

        .heroPathsLayer {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.34;
          pointer-events: none;
        }

        .heroPathsLayer :global(.relative.min-h-screen) {
          min-height: 100%;
          background: transparent;
        }

        .heroContent {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 920px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          transform: translateY(clamp(34px, 3.6vh, 58px));
        }

        .heroTitle {
          margin: 10px 0 0;
          max-width: 18ch;
          color: #0f172a !important;
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(40px, 6vw, 84px);
          font-weight: 500;
          line-height: 1.04;
          letter-spacing: -0.025em;
        }

        .heroTitleAccent {
          font-style: italic;
          font-weight: 400;
          white-space: nowrap;
        }

        .heroTitleAccentGradient {
          vertical-align: baseline;
        }

        .heroSubtitle {
          margin: 24px 0 0;
          max-width: 600px;
          color: #64748b !important;
          font-size: clamp(15px, 1.3vw, 18px);
          line-height: 1.7;
          font-weight: 400;
        }

        .heroActions {
          margin-top: 36px;
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .heroBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 999px;
          padding: 15px 28px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.005em;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
        }

        .heroBtnPrimary {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
        }

        .heroBtnPrimary:hover {
          background: #111827;
        }

        .heroTextLink {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #111111;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          line-height: 1.2;
          transition: color 0.12s ease;
        }

        .heroTextLink :global(svg) {
          color: #111111;
          transition: transform 0.12s ease, color 0.12s ease;
        }

        .heroTextLink:hover {
          color: #000000;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .heroTextLink:hover :global(svg) {
          color: #000000;
          transform: translateX(1px);
        }

        .heroTrust {
          margin-top: 44px;
          display: inline-flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 500;
        }

        .heroTrust strong {
          color: #0f172a;
          font-weight: 700;
        }

        .heroTrustDot {
          color: #cbd5e1;
        }

        .scrollStack {
          max-width: 1120px;
          margin: 0 auto;
          padding: 8px 0 28px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .todayTaskWrap {
          max-width: 1120px;
          margin: 52px auto 14px;
        }
        .homeTaskCard,
        .homePlanCompleteCard {
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
          padding: 14px 16px;
        }
        .homeTaskCelebration {
          border-color: #e5e5e5;
          background: #f5f5f5;
          box-shadow: none;
        }
        .homeTaskHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .homeTaskHead h3 {
          margin: 0;
          color: #0f172a;
          font-size: 17px;
        }
        .homeTaskHead span {
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(255, 255, 255, 0.85);
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 8px;
        }
        .homeTaskBody {
          margin-top: 10px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(255, 255, 255, 0.75);
          padding: 12px;
          display: grid;
          gap: 10px;
        }
        .homeTaskDate {
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(255, 255, 255, 0.85);
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 9px;
        }
        .homeTaskTitle {
          margin: 0;
          color: #0f172a;
          font-size: 15px;
          font-weight: 700;
        }
        .homeTaskSub {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }
        .homeTaskActionsRow {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .homeTaskBtn {
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid transparent;
          width: fit-content;
        }
        .homeTaskBtnPrimary {
          background: #111111;
          border-color: #111111;
          color: #ffffff;
          cursor: pointer;
        }
        .homeTaskBtnSecondary {
          background: #ffffff;
          border-color: rgba(148, 163, 184, 0.4);
          color: #334155;
          cursor: default;
        }
        .homePlanCompleteTitle {
          margin: 0;
          font-weight: 800;
          color: #111111;
          font-size: 17px;
        }
        .homePlanCompleteText {
          margin: 8px 0 10px;
          color: #444444;
          font-size: 13px;
        }

        .scrollSection {
          padding: 28px 26px;
        }

        .glassPanel {
          border-radius: 28px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
        }

        .glassPanelCompact {
          padding: 24px 26px;
        }

        .sectionEyebrow {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }

        .sectionTitle {
          margin: 10px 0 0;
          color: #0f172a;
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(26px, 3.6vw, 40px);
          line-height: 1.12;
          letter-spacing: -0.02em;
        }

        .sectionLead {
          margin: 10px 0 0;
          max-width: 640px;
          color: #64748b;
          font-size: 15px;
          line-height: 1.55;
        }

        .workflowHeader {
          display: grid;
          gap: 8px;
        }

        .workflowShell {
          margin-top: 18px;
          display: grid;
          grid-template-columns: minmax(270px, 340px) minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }

        .workflowIntro {
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(255, 255, 255, 0.92);
          padding: 20px 18px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
          position: sticky;
          top: 14px;
        }

        .workflowIntroTitle {
          margin: 12px 0 0;
          color: #0f172a;
          font-size: 21px;
          line-height: 1.25;
          letter-spacing: -0.015em;
        }

        .workflowIntro p {
          margin: 10px 0 0;
          color: #475569;
          font-size: 13px;
          line-height: 1.6;
        }

        .workflowKpis {
          margin-top: 12px;
          display: grid;
          gap: 8px;
        }

        .workflowKpi {
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(255, 255, 255, 0.9);
          padding: 10px 12px;
          display: grid;
          gap: 2px;
        }

        .workflowKpi strong {
          color: #0f172a;
          font-size: 13px;
          font-weight: 700;
        }

        .workflowKpi span {
          color: #64748b;
          font-size: 12px;
        }

        .workflowTimeline {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          position: relative;
        }

        .timelineItem {
          display: block;
        }

        .timelineCard {
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(255, 255, 255, 0.9);
          padding: 14px 14px 13px;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
          display: grid;
          gap: 8px;
          min-height: 100%;
          transition: border-color 0.14s ease;
        }

        .timelineCard:hover {
          border-color: #111111;
        }

        .timelineCardTop {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .stepNum {
          display: inline-flex;
          width: 30px;
          height: 30px;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: #f8fafc;
          color: #334155;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .stepIconWrap {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .stepIcon {
          width: 100%;
          height: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #334155;
        }

        .timelineCard h3 {
          margin: 0;
          font-size: 15px;
          color: #0f172a;
          font-weight: 700;
          line-height: 1.25;
        }

        .timelineCard p {
          margin: 0;
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
          min-height: 2.8em;
        }

        .timelineCardFooter {
          margin-top: 2px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .timelineMeta {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748b;
        }

        .stepGoLink {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px 6px 12px;
          border-radius: 999px;
          color: #0f172a;
          background: rgba(15, 23, 42, 0.04);
          border: 1px solid rgba(15, 23, 42, 0.08);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.01em;
          text-decoration: none;
          transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
        }

        .stepGoLink:hover {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .setupBadge {
          margin-top: 0;
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: #f8fafc;
          color: #334155;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .workflowActions {
          margin-top: 16px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .workflowBtn {
          flex: 1 1 auto;
          min-width: 0;
          border-radius: 999px;
          padding: 11px 16px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: -0.005em;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
        }

        .workflowBtnPrimary {
          background: #ffffff;
          border: 1px solid #ffffff;
          color: #0f172a;
        }

        .workflowBtnPrimary:hover {
          background: #e4e4e7;
        }

        .workflowBtnGhost {
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #ffffff;
          color: #0f172a;
        }

        .workflowBtnGhost:hover {
          border-color: rgba(15, 23, 42, 0.2);
        }

        .featureGrid {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .featureCard {
          border-radius: 20px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(255, 255, 255, 0.9);
          padding: 20px 18px;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
        }

        .featureCard h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }

        .featureCard p {
          margin: 8px 0 0;
          font-size: 14px;
          color: #64748b;
          line-height: 1.5;
        }

        .previewList {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .previewRow {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 8px 14px;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: #ffffff;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.05);
        }

        .previewDate {
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.06);
          color: #64748b;
          white-space: nowrap;
        }

        .previewTitle {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }

        .previewArrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: #ffffff;
          color: #64748b;
        }

        .whyList {
          margin: 18px 0 0;
          padding: 0 0 0 1.1rem;
          color: #334155;
          font-size: 16px;
          line-height: 1.7;
        }

        .whyList li {
          margin-bottom: 8px;
        }

        .whyList li:last-child {
          margin-bottom: 0;
        }

        .ctaStrip {
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
          padding: 28px 22px;
        }

        .ctaInner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
        }

        .ctaTitle {
          margin: 0;
          color: #0f172a;
          font-size: clamp(22px, 3vw, 30px);
          font-family: var(--font-playfair), Georgia, serif;
          font-weight: 500;
          letter-spacing: -0.02em;
        }

        .ctaBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 15px 30px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: -0.005em;
          text-decoration: none;
          color: #ffffff;
          background: #111111;
          border: 1px solid #111111;
          transition: background 0.12s ease, border-color 0.12s ease;
        }

        .ctaBtn:hover {
          background: #000000;
          border-color: #000000;
        }

        .homeFooter {
          margin-top: 8px;
          padding: 28px 16px 20px;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.07);
        }

        .homeFooterTop {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .homeFooterBrand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .homeFooterLogo {
          width: 36px;
          height: 36px;
          object-fit: contain;
        }

        .homeFooterName {
          width: auto;
          height: 32px;
          object-fit: contain;
        }

        .homeFooterNav,
        .homeFooterLegal {
          display: flex;
          flex-wrap: wrap;
          gap: 14px 18px;
          align-items: center;
        }

        .homeFooterNav :global(a),
        .homeFooterLegal :global(a) {
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          text-decoration: none;
          transition: color 0.16s ease;
        }

        .homeFooterNav :global(a:hover),
        .homeFooterLegal :global(a:hover) {
          color: #0f172a;
        }

        .homeFooterLegal :global(a) {
          font-weight: 500;
          color: #64748b;
          font-size: 13px;
        }

        .homeFooterLegal :global(a:hover) {
          color: #0f172a;
        }

        .homeFooterCopy {
          margin: 20px 0 0;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }

        .scrollStack,
        .todayTaskWrap {
          width: min(calc(100% - 36px), 1180px);
          max-width: none;
        }

        .scrollStack {
          padding: 40px 0 44px;
        }

        .glassPanel,
        .ctaStrip,
        .homeFooter {
          border-color: rgba(148, 163, 184, 0.18) !important;
          background: rgba(255, 255, 255, 0.86) !important;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05) !important;
        }

        @media (max-width: 980px) {
          .heroShell {
            min-height: calc(100vh - 92px);
            margin-top: 0;
            padding: calc(clamp(10px, 3vh, 30px) + 16px) 18px clamp(48px, 8vh, 74px);
          }

          .heroContent {
            transform: translateY(clamp(26px, 3vh, 40px));
          }

          .heroTitle {
            font-size: clamp(36px, 10vw, 56px);
            margin-top: 8px;
          }

          .heroSubtitle {
            font-size: 15px;
          }

          .heroTrust {
            margin-top: 32px;
            font-size: 12px;
            gap: 10px;
          }

          .workflowShell {
            grid-template-columns: 1fr;
          }

          .workflowIntro {
            position: static;
          }

          .workflowTimeline {
            grid-template-columns: 1fr;
          }

          .featureGrid {
            grid-template-columns: 1fr;
          }

          .scrollSection {
            padding: 22px 18px;
          }

          .homeFooterTop {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 520px) {
          .heroShell {
            margin-top: 0;
            padding: calc(clamp(8px, 2.5vh, 20px) + 14px) 18px clamp(40px, 9vh, 66px);
          }

          .heroContent {
            transform: translateY(24px);
          }

          .heroTitle {
            max-width: 14ch;
            letter-spacing: -0.03em;
            margin-top: 4px;
          }

          .heroTitleAccent {
            white-space: normal;
          }

          .heroActions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }

          .heroBtn {
            width: 100%;
          }

          .heroTextLink {
            width: auto;
            align-self: center;
          }

          .workflowActions {
            flex-direction: column;
          }

          .workflowBtn {
            width: 100%;
          }

          .heroTrust {
            flex-direction: column;
            gap: 6px;
            margin-top: 26px;
          }

          .heroTrustDot {
            display: none;
          }

          .previewRow {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
          }

          .previewTitle {
            flex: 1 1 160px;
            min-width: 0;
          }

          .previewArrow {
            margin-left: auto;
          }
        }
      `}</style>
    </main>);
}
