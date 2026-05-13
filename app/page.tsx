"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Hash, ListChecks, Megaphone, PartyPopper, Sparkles, Target } from "lucide-react";
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
    {
        title: "Growth",
        desc: "Daily growth actions and business tasks tailored to your profile, goals, and plan length.",
    },
    {
        title: "Marketing",
        desc: "Marketing activations and channel guidance aligned to each day—built from your business context.",
    },
    {
        title: "Poster generator",
        desc: "Turn ideas into branded posters with layouts, templates, and AI-assisted visual hints.",
    },
    {
        title: "Post ideas & captions",
        desc: "Ready-to-use hooks and caption ideas for Instagram, Facebook, and other channels.",
    },
    {
        title: "Hashtag suggestions",
        desc: "Curated hashtag sets to improve discovery, relevance, and reach for each post.",
    },
    {
        title: "Calendar view",
        desc: "See your full timeline and daily focus in Biz Calendar at a glance.",
    },
    {
        title: "Save & resume",
        desc: "Plans and progress stay in your account—pick up where you left off anytime.",
    },
];
const PREVIEW_ROWS = [
    { date: "Apr 21", title: "Bundle promo launch" },
    { date: "Apr 22", title: "Highlight best-selling offer" },
    { date: "Apr 23", title: "Customer review collection day" },
    { date: "Apr 24", title: "Behind-the-scenes process" },
    { date: "Apr 25", title: "Weekend special activation" },
];
const PREVIEW_PLAN_SAMPLE = {
    businessName: "Kandy Spice Kitchen",
    goal: "Grow weekday lunch covers and weekend takeaway orders within 30 days.",
    checklist: [
        { label: "Shoot 3 hero plates in natural light", done: true },
        { label: "Schedule post for 6:00 PM", done: true },
        { label: "Reply to comments within 2 hours", done: false },
    ],
    progressPct: 42,
};
/** Sample growth-plan rows: daily business / ops actions */
const PREVIEW_GROWTH_DAYS = [
    {
        day: "Day 10",
        week: "Week 2",
        date: "Tue · May 13",
        action: "Email 12 past catering clients with a weekday lunch bundle menu PDF.",
    },
    {
        day: "Day 11",
        week: "Week 2",
        date: "Wed · May 14",
        action: "Coach counter staff on a 60-second upsell script for the weekend combo.",
    },
    {
        day: "Day 12",
        week: "Week 2",
        date: "Thu · May 15",
        action: "Share a carousel of your top 3 dishes with a limited weekend combo price.",
    },
];
/** Sample marketing-plan rows: social hooks + caption + hashtags */
const PREVIEW_MARKETING_DAYS = [
    {
        day: "Day 10",
        hook: "Bring-a-friend lunch",
        caption: "Two platters, one table — tag who you'd invite for lunch tomorrow. Bundle ends Wed.",
        tags: ["#LunchDeal", "#KandyEats", "#ShopLocalLK"],
    },
    {
        day: "Day 11",
        hook: "Behind the pass",
        caption: "60 seconds in our kitchen — fresh grind, fresh fry. Sound on for the sizzle.",
        tags: ["#BTS", "#SriLankanFood", "#SmallBiz"],
    },
    {
        day: "Day 12",
        hook: "Weekend combo drop",
        caption:
            "Weekend flavours just landed — tag someone you'd split our tasting platter with. Combo ends Sunday night!",
        tags: ["#WeekendSpecial", "#KandyEats", "#SriLankanFood", "#ShopLocalLK"],
    },
];
const WHY_BULLETS = [
    "Made for Sri Lankan SMEs",
    "Simple templates now, AI later",
    "Works even with minimal marketing knowledge",
];
/**
 * Animated home gallery — swap `src` for your real screenshots (e.g. `/showcase/profile-1.png`).
 * Keep `id` unique. `row`: 0 = top strip, 1 = middle, 2 = bottom. `size` controls tile footprint (masonry feel).
 */
type HomeShowcaseGalleryImage = {
    id: string;
    src: string;
    alt: string;
    category: "profile" | "poster" | "social";
    size: "sm" | "md" | "lg";
    row: 0 | 1 | 2;
    objectPosition?: string;
    objectFit?: "cover" | "contain";
};
const HOME_SHOWCASE_GALLERY_IMAGES: HomeShowcaseGalleryImage[] = [
    { id: "g01", src: "/auth-growth-hero.jpg", alt: "Sample business profile workspace in BizBoost", category: "profile", size: "lg", row: 0, objectPosition: "12% 28%" },
    { id: "g02", src: "https://picsum.photos/id/292/540/720", alt: "Placeholder poster preview — replace with your export", category: "poster", size: "md", row: 0 },
    { id: "g03", src: "/auth-growth-hero.jpg", alt: "Sample plan and profile context", category: "profile", size: "sm", row: 0, objectPosition: "72% 40%" },
    { id: "g04", src: "https://picsum.photos/id/429/480/640", alt: "Placeholder social-style visual — replace with your post mockup", category: "social", size: "md", row: 0 },
    { id: "g05", src: "/bizboost-mark.png", alt: "BizBoost brand mark placeholder tile", category: "poster", size: "sm", row: 0, objectPosition: "center", objectFit: "contain" },
    { id: "g06", src: "https://picsum.photos/id/431/520/700", alt: "Placeholder campaign poster tile", category: "poster", size: "lg", row: 0 },
    { id: "g07", src: "https://picsum.photos/id/866/500/660", alt: "Placeholder feed-style preview", category: "social", size: "md", row: 1 },
    { id: "g08", src: "/auth-growth-hero.jpg", alt: "Sample profile detail view", category: "profile", size: "md", row: 1, objectPosition: "45% 55%" },
    { id: "g09", src: "https://picsum.photos/id/225/560/740", alt: "Placeholder poster artwork", category: "poster", size: "lg", row: 1 },
    { id: "g10", src: "https://picsum.photos/id/364/420/560", alt: "Placeholder story-format preview", category: "social", size: "sm", row: 1 },
    { id: "g11", src: "/auth-growth-hero.jpg", alt: "Sample dashboard-style crop", category: "profile", size: "sm", row: 1, objectPosition: "30% 70%" },
    { id: "g12", src: "https://picsum.photos/id/326/500/680", alt: "Placeholder promotional tile", category: "poster", size: "md", row: 1 },
    { id: "g13", src: "https://picsum.photos/id/628/540/720", alt: "Placeholder social post visual", category: "social", size: "md", row: 2 },
    { id: "g14", src: "/auth-growth-hero.jpg", alt: "Sample BizBoost output crop", category: "profile", size: "lg", row: 2, objectPosition: "55% 22%" },
    { id: "g15", src: "https://picsum.photos/id/668/480/640", alt: "Placeholder square poster", category: "poster", size: "sm", row: 2 },
    { id: "g16", src: "https://picsum.photos/id/237/520/700", alt: "Placeholder marketing still", category: "social", size: "lg", row: 2 },
    { id: "g17", src: "/auth-growth-hero.jpg", alt: "Sample profile hero crop", category: "profile", size: "md", row: 2, objectPosition: "80% 45%" },
    { id: "g18", src: "https://picsum.photos/id/180/500/660", alt: "Placeholder print-style poster", category: "poster", size: "md", row: 2 },
];
const HOME_GALLERY_ROW_0 = HOME_SHOWCASE_GALLERY_IMAGES.filter((img) => img.row === 0);
const HOME_GALLERY_ROW_1 = HOME_SHOWCASE_GALLERY_IMAGES.filter((img) => img.row === 1);
const HOME_GALLERY_ROW_2 = HOME_SHOWCASE_GALLERY_IMAGES.filter((img) => img.row === 2);
function GalleryMarqueeChunk({ items, floatSeed, chunkSuffix, }: {
    items: HomeShowcaseGalleryImage[];
    floatSeed: number;
    chunkSuffix: string;
}) {
    return (<>
      {items.map((item, i) => {
            const delay = (floatSeed + i * 0.42) % 5;
            const imgStyle: CSSProperties = {
                objectFit: item.objectFit ?? "cover",
                ...(item.objectPosition ? { objectPosition: item.objectPosition } : {}),
            };
            return (<div key={`${chunkSuffix}-${item.id}`} className={`galleryTileWrap galleryTileWrap--${item.size}`} style={{ animationDelay: `${delay}s` }}>
              <figure className={`galleryTileFrame${item.objectFit === "contain" ? " galleryTileFrame--contain" : ""}`}>
                <img src={item.src} alt={item.alt} className="galleryTileImg" loading="lazy" decoding="async" sizes="(max-width: 520px) 42vw, 280px" style={imgStyle}/>
                <figcaption className="galleryTileCaption">
                  {item.category === "profile" ? "Profile" : item.category === "poster" ? "Poster" : "Social"}
                </figcaption>
              </figure>
            </div>);
        })}
    </>);
}
function HomeShowcaseGalleryRow({ direction, durationSec, items, floatSeed, }: {
    direction: "toRight" | "toLeft";
    durationSec: number;
    items: HomeShowcaseGalleryImage[];
    floatSeed: number;
}) {
    return (<div className={`galleryMarqueeRow galleryMarqueeRow--${direction}`}>
      <div className="galleryMarqueeViewport">
        <div className="galleryMarqueeTrack" style={{ animationDuration: `${durationSec}s` }}>
          <div className="galleryMarqueeChunk">
            <GalleryMarqueeChunk items={items} floatSeed={floatSeed} chunkSuffix="a"/>
          </div>
          <div className="galleryMarqueeChunk" aria-hidden="true">
            <GalleryMarqueeChunk items={items} floatSeed={floatSeed + 1.2} chunkSuffix="b"/>
          </div>
        </div>
      </div>
    </div>);
}
const SUPPORT_MAILTO = "mailto:hello@bizboost.ai?subject=BizBoost%20support";
function cleanTitle(title: string): string {
    return title.replace(/^Week\s*\d+\s*/i, "").replace(/^Day\s*\d+\s*/i, "").trim();
}
function useLandingReveal() {
    const ref = useRef<HTMLElement | null>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof window === "undefined")
            return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            el.classList.add("landingReveal--visible");
            return;
        }
        const io = new IntersectionObserver(([entry]) => {
            if (entry?.isIntersecting) {
                entry.target.classList.add("landingReveal--visible");
                io.disconnect();
            }
        }, { threshold: 0.09, rootMargin: "0px 0px -12% 0px" });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return ref;
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
    /** From DB via `/api/marketing-plan/latest` — user has at least one saved Plan Builder plan (not skeleton-only). */
    const [hasGeneratedPlan, setHasGeneratedPlan] = useState(false);
    const revealHow = useLandingReveal();
    const revealFeatures = useLandingReveal();
    const revealPreview = useLandingReveal();
    const revealAbout = useLandingReveal();
    const revealCta = useLandingReveal();
    const revealShowcase = useLandingReveal();
    useEffect(() => {
        if (loading)
            return;
        if (!user?.uid) {
            setTaskDays([]);
            setTaskCompletedMap({});
            setTaskPlanDays(0);
            setHasGeneratedPlan(false);
            return;
        }
        let cancelled = false;
        const loadTaskData = async () => {
            setTaskLoading(true);
            setHasGeneratedPlan(false);
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
                    setHasGeneratedPlan(false);
                    return;
                }
                setHasGeneratedPlan(Boolean(latestJson.hasGeneratedPlan));
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
                setHasGeneratedPlan(false);
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
    const prefersReducedMotion = useReducedMotion();
    return (<main className="landingRoot">
      <section className="heroShell">
        <div className="heroPathsLayer" aria-hidden>
          <BackgroundPaths pathsOnly />
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

      {!loading && user && !taskLoading && hasGeneratedPlan && (<div className="todayTaskWrap">
          {taskState.planFullyCompleted ? (<motion.section
              className="todayTaskBanner todayTaskBanner--complete"
              layout
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="todayTaskBannerMesh todayTaskBannerMesh--gold" aria-hidden/>
              <div className="todayTaskBannerInner">
                <div className="todayTaskBannerIcon todayTaskBannerIcon--gold" aria-hidden>
                  <PartyPopper size={26} strokeWidth={1.75}/>
                </div>
                <div className="todayTaskBannerCopy">
                  <p className="todayTaskEyebrow">Milestone</p>
                  <h3 className="todayTaskBannerTitle">Plan completed</h3>
                  <p className="todayTaskBannerLead">
                    Every day in your schedule is done—start a fresh plan when you&apos;re ready.
                  </p>
                  <button type="button" className="todayTaskCta" onClick={() => router.push("/select-plan?mode=new")}>
                    Start new plan
                    <ArrowRight size={18} aria-hidden strokeWidth={2}/>
                  </button>
                </div>
              </div>
            </motion.section>) : (<motion.section
              className={`todayTaskBanner ${taskState.isTodayTaskCompleted ? "todayTaskBanner--done" : taskState.isFallbackTask ? "todayTaskBanner--next" : "todayTaskBanner--active"}`}
              layout
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={`todayTaskBannerMesh ${taskState.isTodayTaskCompleted ? "todayTaskBannerMesh--muted" : "todayTaskBannerMesh--accent"}`} aria-hidden/>
              <div className="todayTaskBannerInner">
                <div className={`todayTaskBannerIcon ${taskState.isTodayTaskCompleted ? "todayTaskBannerIcon--success" : ""}`} aria-hidden>
                  {taskState.isTodayTaskCompleted ? (<CheckCircle2 size={26} strokeWidth={1.75}/>) : taskState.isFallbackTask ? (<CalendarDays size={26} strokeWidth={1.75}/>) : (<Sparkles size={26} strokeWidth={1.75}/>)}
                </div>
                <div className="todayTaskBannerCopy">
                  <div className="todayTaskBannerMeta">
                    <span className="todayTaskEyebrow">
                      {taskState.isTodayTaskCompleted ? "All caught up" : taskState.isFallbackTask ? "Up next" : "Daily focus"}
                    </span>
                    {taskPlanDays > 0 ? (<span className="todayTaskPlanPill">{taskPlanDays}-day plan</span>) : null}
                  </div>
                  <h3 className="todayTaskBannerTitle">
                    {taskState.isTodayTaskCompleted ? "Today's win" : taskState.isFallbackTask ? "Your next task" : "Today's task"}
                  </h3>
                  {taskLoading ? (<div className="todayTaskPanel todayTaskPanel--loading">
                      <div className="todayTaskSkeletonLine"/>
                      <div className="todayTaskSkeletonLine todayTaskSkeletonLine--short"/>
                    </div>) : taskState.taskDay ? (<div className="todayTaskPanel">
                      <div className="todayTaskPanelHead">
                        <span className="todayTaskDateChip">{taskState.taskDay.dateLabel || "Today"}</span>
                        <span className="todayTaskDayChip">Day {taskState.taskDay.dayNumber}</span>
                      </div>
                      <p className="todayTaskHeadline">
                        {cleanTitle(taskState.taskDay.mainActionTitle || "") || taskState.taskDay.mainActionTitle || `Day ${taskState.taskDay.dayNumber} action`}
                      </p>
                      {taskState.isTodayTaskCompleted ? (<>
                          <div className="todayTaskActions">
                            <span className="todayTaskBadgeDone">Completed</span>
                            {taskState.fallbackDay && taskState.taskDay && taskState.fallbackDay.dayNumber !== taskState.taskDay.dayNumber ? (<button type="button" className="todayTaskCta todayTaskCta--ghost" onClick={() => router.push(`/marketing-plan/day/${taskState.fallbackDay!.dayNumber}`)}>
                                Next day
                                <ArrowRight size={16} aria-hidden strokeWidth={2}/>
                              </button>) : null}
                          </div>
                          <p className="todayTaskFoot">Nice—come back tomorrow or peek at what&apos;s ahead.</p>
                        </>) : (<button type="button" className="todayTaskCta" onClick={() => router.push(`/marketing-plan/day/${taskState.taskDay.dayNumber}`)}>
                          Open day detail
                          <ArrowRight size={18} aria-hidden strokeWidth={2}/>
                        </button>)}
                    </div>) : (<div className="todayTaskPanel todayTaskPanel--empty">
                      <p className="todayTaskFoot">No task yet—finish onboarding or generate a plan to see your day here.</p>
                    </div>)}
                </div>
              </div>
            </motion.section>)}
        </div>)}

      <div className="landingLower">
        <section ref={revealHow} id="how-it-works" className="landingSection landingSection--dark landingReveal">
          <div className="landingSectionInner">
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
          </div>
        </section>

        <section ref={revealFeatures} id="features" className="landingSection landingSection--light landingReveal">
          <div className="landingSectionInner">
            <p className="sectionEyebrow">Inside the app</p>
            <h2 className="sectionTitle">What you get</h2>
            <p className="sectionLead">
              Growth plans, marketing actions, poster creation, post ideas, captions, hashtags, and more—aligned to your business profile and selected plan length.
            </p>

            <div className="featureGrid" role="list">
              {WHAT_YOU_GET.map((f) => (
                <div key={f.title} role="listitem">
                  <article className="featureCard">
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={revealPreview} id="example-preview" className="landingSection landingSection--dark landingReveal">
          <div className="landingSectionInner landingSectionInner--previewWide">
            <div className="previewShowcase">
              <div className="previewShowcaseIntro">
                <p className="sectionEyebrow">Example preview</p>
                <h2 className="sectionTitle">What a generated plan looks like</h2>
                <p className="sectionLead">
                  See how a generated plan splits into a <strong>growth plan</strong> (daily business actions) and a{" "}
                  <strong>marketing plan</strong> (captions, hashtags, and post ideas)—plus timeline and progress.
                </p>
                <ul className="previewIntroList">
                  <li>
                    <CheckCircle2 size={18} strokeWidth={2} className="previewIntroCheck" aria-hidden/>
                    Action steps aligned to your growth goal
                  </li>
                  <li>
                    <CheckCircle2 size={18} strokeWidth={2} className="previewIntroCheck" aria-hidden/>
                    Caption ideas &amp; hashtag sets per day
                  </li>
                  <li>
                    <CheckCircle2 size={18} strokeWidth={2} className="previewIntroCheck" aria-hidden/>
                    Schedule view + checklist progress
                  </li>
                </ul>
                <Link href="/marketing-plan" className="previewShowcaseCta">
                  Open plan builder
                  <FaChevronRight size={12} aria-hidden/>
                </Link>
              </div>

              <div className="previewShowcaseMock">
                <div className="planPreviewDevice" role="img" aria-label="Sample BizBoost growth plan and marketing plan interface">
                  <div className="planPreviewChrome">
                    <span className="planPreviewDots" aria-hidden>
                      <span/><span/><span/>
                    </span>
                    <span className="planPreviewChromeTitle">BizBoost · Growth &amp; marketing plans</span>
                  </div>

                  <div className="planPreviewScroll">
                    <header className="planPreviewHeader">
                      <div className="planPreviewBrandRow">
                        <span className="planPreviewAvatar" aria-hidden>K</span>
                        <div>
                          <p className="planPreviewBizName">{PREVIEW_PLAN_SAMPLE.businessName}</p>
                          <p className="planPreviewBizMeta">14-day plan · Growth + marketing workspace</p>
                        </div>
                        <span className="planPreviewLiveBadge">Sample</span>
                      </div>

                      <div className="planPreviewGoalCard">
                        <div className="planPreviewGoalIcon" aria-hidden>
                          <Target size={18} strokeWidth={2}/>
                        </div>
                        <div>
                          <p className="planPreviewGoalLabel">Growth goal</p>
                          <p className="planPreviewGoalText">{PREVIEW_PLAN_SAMPLE.goal}</p>
                        </div>
                      </div>
                    </header>

                    <section className="planPreviewPlanSection planPreviewPlanSection--growth" aria-labelledby="preview-growth-heading">
                      <div className="planPreviewPlanSectionHead">
                        <span className="planPreviewPlanSectionIcon" aria-hidden>
                          <ClipboardList size={20} strokeWidth={2}/>
                        </span>
                        <div>
                          <p id="preview-growth-heading" className="planPreviewPlanSectionTitle">
                            Growth plan
                          </p>
                          <p className="planPreviewPlanSectionSub">Daily business actions · sample days</p>
                        </div>
                      </div>
                      <ul className="planPreviewGrowthDays">
                        {PREVIEW_GROWTH_DAYS.map((row) => (<li key={row.day} className="planPreviewGrowthDay">
                            <div className="planPreviewGrowthDayMeta">
                              <span className="planPreviewDayPill">{row.day}</span>
                              <span className="planPreviewWeekPill">{row.week}</span>
                              <span className="planPreviewDateChip planPreviewDateChip--compact">
                                <CalendarDays size={13} strokeWidth={2} aria-hidden/>
                                {row.date}
                              </span>
                            </div>
                            <p className="planPreviewGrowthAction">{row.action}</p>
                          </li>))}
                      </ul>
                    </section>

                    <section className="planPreviewPlanSection planPreviewPlanSection--marketing" aria-labelledby="preview-marketing-heading">
                      <div className="planPreviewPlanSectionHead">
                        <span className="planPreviewPlanSectionIcon planPreviewPlanSectionIcon--marketing" aria-hidden>
                          <Megaphone size={20} strokeWidth={2}/>
                        </span>
                        <div>
                          <p id="preview-marketing-heading" className="planPreviewPlanSectionTitle">
                            Marketing plan
                          </p>
                          <p className="planPreviewPlanSectionSub">Posts, captions &amp; hashtags · sample days</p>
                        </div>
                      </div>
                      <ul className="planPreviewMarketingDays">
                        {PREVIEW_MARKETING_DAYS.map((row) => (<li key={row.day} className="planPreviewMarketingCard">
                            <div className="planPreviewMarketingCardTop">
                              <span className="planPreviewDayPill planPreviewDayPill--sm">{row.day}</span>
                              <span className="planPreviewMarketingHook">{row.hook}</span>
                            </div>
                            <div className="planPreviewCaptionBlock planPreviewCaptionBlock--compact">
                              <p className="planPreviewCaptionLabel">
                                <Sparkles size={13} strokeWidth={2} aria-hidden/>
                                Caption idea
                              </p>
                              <p className="planPreviewCaptionText">{row.caption}</p>
                            </div>
                            <div className="planPreviewTags planPreviewTags--compact">
                              <span className="planPreviewTagsLabel">
                                <Hash size={13} strokeWidth={2} aria-hidden/>
                                Hashtags
                              </span>
                              <div className="planPreviewTagRow">
                                {row.tags.map((tag) => (<span key={`${row.day}-${tag}`} className="planPreviewTag">
                                    {tag}
                                  </span>))}
                              </div>
                            </div>
                          </li>))}
                      </ul>
                    </section>

                    <section className="planPreviewProgressSec">
                      <div className="planPreviewProgressHead">
                        <span className="planPreviewProgressLabel">Overall plan progress</span>
                        <span className="planPreviewProgressPct">{PREVIEW_PLAN_SAMPLE.progressPct}%</span>
                      </div>
                      <div className="planPreviewProgressTrack" aria-hidden>
                        <div className="planPreviewProgressFill" style={{ width: `${PREVIEW_PLAN_SAMPLE.progressPct}%` }}/>
                      </div>
                      <ul className="planPreviewChecklist">
                        {PREVIEW_PLAN_SAMPLE.checklist.map((item) => (<li key={item.label} className={`planPreviewCheckItem ${item.done ? "planPreviewCheckItem--done" : ""}`}>
                            <span className="planPreviewCheckIcon" aria-hidden>
                              {item.done ? <CheckCircle2 size={17} strokeWidth={2}/> : <span className="planPreviewCheckEmpty"/>}
                            </span>
                            <span>{item.label}</span>
                          </li>))}
                      </ul>
                    </section>

                    <section className="planPreviewTimelineSec">
                      <div className="planPreviewTimelineHead">
                        <ListChecks size={16} strokeWidth={2} aria-hidden/>
                        <span>14-day timeline preview</span>
                      </div>
                      <ul className="planPreviewTimeline">
                        {PREVIEW_ROWS.map((row) => (<li key={row.date} className="planPreviewTimelineRow">
                            <span className="planPreviewTimelineDate">{row.date}</span>
                            <span className="planPreviewTimelineTitle">{row.title}</span>
                          </li>))}
                      </ul>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={revealAbout} id="about" className="landingSection landingSection--light landingReveal">
          <div className="landingSectionInner">
            <p className="sectionEyebrow">Why us</p>
            <h2 className="sectionTitle">Why BizBoost</h2>
            <ul className="whyList">
              {WHY_BULLETS.map((text) => (<li key={text}>{text}</li>))}
            </ul>
          </div>
        </section>

        <section ref={revealCta} id="pricing" className="landingSection landingSection--dark landingSection--cta landingReveal">
          <div className="landingSectionInner landingCtaInner">
            <h2 className="landingCtaTitle">Ready to build your plan?</h2>
            <Link href="/select-plan" className="landingCtaBtn">
              Build your plan
              <FaChevronRight size={12} aria-hidden/>
            </Link>
          </div>
        </section>

        <section ref={revealShowcase} id="showcase" className="landingSection landingSection--light landingSection--showcase landingReveal" aria-labelledby="home-showcase-title">
          <div className="landingSectionInner showcaseSectionInner">
            <h2 id="home-showcase-title" className="sectionTitle">
              See BizBoost in Action
            </h2>
            <p className="sectionLead showcaseSectionLead">
              Explore sample business profiles, generated posters, captions, and campaign previews created inside BizBoost.
            </p>
          </div>
          <div className="galleryFullBleed">
            <div className="galleryMarqueeStack" aria-label="Animated product image gallery">
              <HomeShowcaseGalleryRow direction="toRight" durationSec={105} items={HOME_GALLERY_ROW_0} floatSeed={0}/>
              <HomeShowcaseGalleryRow direction="toLeft" durationSec={118} items={HOME_GALLERY_ROW_1} floatSeed={0.5}/>
              <HomeShowcaseGalleryRow direction="toRight" durationSec={112} items={HOME_GALLERY_ROW_2} floatSeed={1}/>
            </div>
          </div>
        </section>
      </div>

      <footer className="homeFooter">
        <div className="homeFooterInner">
          <div className="homeFooterTop">
            <div className="homeFooterBrand">
              <p className="homeFooterBrandName">BizBoost</p>
              <p className="homeFooterTagline">
                Daily growth plans, campaign-ready posters, and progress tracking—built so modern SMEs can execute with confidence.
              </p>
              <p className="homeFooterMeta">7 / 14 / 30-day plans · Templates + captions · One focused workspace</p>
            </div>
            <div className="homeFooterColumn">
              <p className="homeFooterColumnTitle">Explore</p>
              <nav className="homeFooterNav" aria-label="Explore BizBoost">
                <Link className="homeFooterLink" href="/#features">Features</Link>
                <Link className="homeFooterLink" href="/#how-it-works">How It Works</Link>
                <Link className="homeFooterLink" href="/#about">About</Link>
                <Link className="homeFooterLink" href="/#showcase">
                  Showcase
                </Link>
              </nav>
            </div>
            <div className="homeFooterColumn">
              <p className="homeFooterColumnTitle">Product</p>
              <nav className="homeFooterNav" aria-label="Product links">
                <Link className="homeFooterLink" href="/select-plan">Choose a Plan</Link>
                <Link className="homeFooterLink" href="/marketing-plan">Plan Builder</Link>
                <Link className="homeFooterLink" href="/dashboard">Biz Dashboard</Link>
                <Link className="homeFooterLink" href="/poster-preview">Poster Preview</Link>
                <Link className="homeFooterLink" href="/login">Login</Link>
              </nav>
            </div>
            <div className="homeFooterColumn">
              <p className="homeFooterColumnTitle">Legal</p>
              <nav className="homeFooterNav" aria-label="Legal">
                <Link className="homeFooterLink" href="/terms">Terms &amp; Conditions</Link>
                <Link className="homeFooterLink" href="/privacy">Privacy Policy</Link>
              </nav>
            </div>
            <div className="homeFooterColumn homeFooterColumn--support">
              <p className="homeFooterColumnTitle">Support</p>
              <nav className="homeFooterNav" aria-label="Support">
                <Link className="homeFooterLink" href="/#showcase">
                  Product gallery
                </Link>
                <a className="homeFooterLink" href={SUPPORT_MAILTO}>
                  Email Support
                </a>
                <Link className="homeFooterLink" href="/terms#contact">
                  FAQ
                </Link>
              </nav>
            </div>
          </div>
          <div className="homeFooterBottom">
            <p className="homeFooterCopy">© {new Date().getFullYear()} BizBoost AI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .landingRoot {
          width: 100%;
          max-width: 100%;
          overflow-x: clip;
          padding: 0;
          padding-bottom: 0;
          margin: 0;
          margin-bottom: 0;
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

        .landingLower {
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .landingSection {
          width: 100%;
          position: relative;
          scroll-margin-top: 5.5rem;
        }

        .landingSectionInner {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(72px, 11vw, 120px) max(22px, 5vw);
          box-sizing: border-box;
        }

        .landingSection--dark {
          background: #000000;
          color: #f4f4f5;
        }

        .landingSection--light {
          background: #fafafa;
          color: #0f172a;
        }

        .landingReveal {
          opacity: 0;
          transform: translateY(44px);
          transition:
            opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.85s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .landingReveal.landingReveal--visible {
          opacity: 1;
          transform: translateY(0);
        }

        .landingSection--dark .sectionEyebrow {
          color: rgba(255, 255, 255, 0.48);
        }

        .landingSection--dark .sectionTitle {
          color: #ffffff;
        }

        .landingSection--dark .sectionLead {
          color: rgba(255, 255, 255, 0.68);
          max-width: 42rem;
        }

        .landingSection--light .sectionEyebrow {
          color: #64748b;
        }

        .landingSection--light .sectionTitle {
          color: #0f172a;
        }

        .landingSection--light .sectionLead {
          color: #64748b;
          max-width: 42rem;
        }

        .landingSection .workflowIntro,
        .landingSection .timelineCard {
          animation: none;
        }

        .landingSection--dark .workflowIntro {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          box-shadow: none;
        }

        .landingSection--dark .workflowIntro::after {
          background: radial-gradient(circle, rgba(255, 255, 255, 0.06), transparent 68%);
        }

        .landingSection--dark .workflowIntroTitle {
          color: #ffffff;
        }

        .landingSection--dark .workflowIntro p {
          color: rgba(255, 255, 255, 0.72);
        }

        .landingSection--dark .workflowKpi {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
        }

        .landingSection--dark .workflowKpi strong {
          color: #ffffff;
        }

        .landingSection--dark .workflowKpi span {
          color: rgba(255, 255, 255, 0.55);
        }

        .landingSection--dark .setupBadge {
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.85);
        }

        .landingSection--dark .workflowBtnPrimary {
          background: #ffffff;
          border-color: #ffffff;
          color: #0f172a;
        }

        .landingSection--dark .workflowBtnPrimary:hover {
          background: #e5e5e5;
          border-color: #e5e5e5;
        }

        .landingSection--dark .workflowBtnGhost {
          border-color: rgba(255, 255, 255, 0.35);
          background: transparent;
          color: #ffffff;
        }

        .landingSection--dark .workflowBtnGhost:hover {
          border-color: rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0.06);
        }

        .landingSection--dark .timelineCard {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          box-shadow: none;
        }

        .landingSection--dark .timelineCard:hover {
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
        }

        .landingSection--dark .timelineCard h3 {
          color: #ffffff;
        }

        .landingSection--dark .timelineCard p {
          color: rgba(255, 255, 255, 0.62);
        }

        .landingSection--dark .stepNum {
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.9);
        }

        .landingSection--dark .stepIconWrap {
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.06);
        }

        .landingSection--dark .stepIcon {
          color: rgba(255, 255, 255, 0.85);
        }

        .landingSection--dark .timelineMeta {
          color: rgba(255, 255, 255, 0.45);
        }

        .landingSection--dark .stepGoLink {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .landingSection--dark .stepGoLink:hover {
          background: #ffffff;
          color: #0f172a;
          border-color: #ffffff;
        }

        .landingCtaInner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 22px;
          text-align: center;
        }

        .landingSection--cta.landingSection--dark {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .landingCtaTitle {
          margin: 0;
          color: #ffffff;
          font-size: clamp(24px, 4vw, 36px);
          font-family: var(--font-playfair), Georgia, serif;
          font-weight: 500;
          letter-spacing: -0.02em;
          line-height: 1.15;
          max-width: 22ch;
        }

        .landingCtaBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 34px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: -0.005em;
          text-decoration: none;
          color: #0f172a;
          background: #ffffff;
          border: 1px solid #ffffff;
          transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }

        .landingCtaBtn:hover {
          background: #e5e5e5;
          border-color: #e5e5e5;
          transform: translateY(-2px);
        }

        .landingSection--showcase {
          position: relative;
          overflow-x: clip;
          overflow-y: visible;
          padding-bottom: clamp(40px, 7vw, 72px);
        }

        .landingSection--showcase::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse 90% 55% at 50% -32%, rgba(99, 102, 241, 0.08), transparent 56%),
            radial-gradient(ellipse 55% 42% at 100% 100%, rgba(16, 185, 129, 0.06), transparent 48%);
        }

        .showcaseSectionInner {
          position: relative;
          z-index: 1;
          text-align: center;
        }

        .landingSection--showcase .showcaseSectionInner .sectionTitle {
          margin-left: auto;
          margin-right: auto;
        }

        .showcaseSectionLead {
          max-width: 38rem;
          margin-left: auto;
          margin-right: auto;
        }

        .galleryFullBleed {
          position: relative;
          z-index: 1;
          width: 100vw;
          max-width: 100%;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          margin-top: clamp(24px, 4vw, 40px);
          overflow-x: clip;
          overflow-y: visible;
        }

        .galleryMarqueeStack {
          display: grid;
          gap: clamp(14px, 2.5vw, 22px);
        }

        .galleryMarqueeRow {
          position: relative;
          width: 100%;
        }

        .galleryMarqueeViewport {
          overflow: hidden;
          width: 100%;
          mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
        }

        .galleryMarqueeTrack {
          display: flex;
          flex-direction: row;
          width: max-content;
          animation: galleryScrollToRight 105s linear infinite;
          will-change: transform;
        }

        .galleryMarqueeRow--toLeft .galleryMarqueeTrack {
          animation-name: galleryScrollToLeft;
        }

        .galleryMarqueeRow:hover .galleryMarqueeTrack {
          animation-play-state: paused;
        }

        .galleryMarqueeChunk {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: clamp(12px, 2vw, 20px);
          flex-shrink: 0;
          padding-inline: clamp(6px, 1vw, 10px);
        }

        @keyframes galleryScrollToRight {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes galleryScrollToLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .galleryTileWrap {
          flex: 0 0 auto;
          animation: galleryTileFloat 7s ease-in-out infinite;
        }

        .galleryTileWrap--sm {
          width: clamp(128px, 22vw, 168px);
          height: clamp(148px, 26vw, 198px);
        }

        .galleryTileWrap--md {
          width: clamp(158px, 28vw, 218px);
          height: clamp(178px, 32vw, 248px);
        }

        .galleryTileWrap--lg {
          width: clamp(188px, 34vw, 268px);
          height: clamp(208px, 38vw, 298px);
        }

        @keyframes galleryTileFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        .galleryTileFrame {
          position: relative;
          margin: 0;
          width: 100%;
          height: 100%;
          border-radius: clamp(14px, 2vw, 20px);
          overflow: hidden;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.65) inset,
            0 20px 40px rgba(15, 23, 42, 0.12),
            0 6px 14px rgba(15, 23, 42, 0.06);
          background: #e2e8f0;
        }

        .galleryTileFrame--contain {
          background: linear-gradient(160deg, #f8fafc 0%, #eef2ff 100%);
        }

        .galleryTileImg {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .galleryTileCaption {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          margin: 0;
          padding: 18px 12px 10px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(248, 250, 252, 0.92);
          text-align: left;
          line-height: 1.2;
          background: linear-gradient(180deg, transparent, rgba(2, 6, 23, 0.72));
          pointer-events: none;
        }

        .todayTaskWrap {
          width: min(calc(100% - 36px), 1180px);
          max-width: none;
          margin: 48px auto 16px;
          padding: 0 6px;
        }

        .todayTaskBanner {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 250, 252, 0.88) 45%, rgba(255, 255, 255, 0.94) 100%);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.65) inset,
            0 24px 48px rgba(15, 23, 42, 0.09),
            0 8px 16px rgba(15, 23, 42, 0.04);
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, border-color 0.35s ease;
        }

        .todayTaskBanner:hover {
          transform: translateY(-3px);
          border-color: rgba(100, 116, 139, 0.35);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.7) inset,
            0 32px 56px rgba(15, 23, 42, 0.11),
            0 12px 24px rgba(15, 23, 42, 0.06);
        }

        .todayTaskBanner--active:hover {
          border-color: rgba(99, 102, 241, 0.35);
        }

        .todayTaskBanner--done {
          border-color: rgba(34, 197, 94, 0.28);
        }

        .todayTaskBanner--next {
          border-color: rgba(245, 158, 11, 0.35);
        }

        .todayTaskBanner--complete {
          border-color: rgba(251, 191, 36, 0.45);
          background:
            linear-gradient(145deg, rgba(255, 251, 235, 0.95) 0%, rgba(255, 255, 255, 0.92) 40%, rgba(254, 249, 231, 0.9) 100%);
        }

        @keyframes todayMeshFloat {
          0%,
          100% {
            opacity: 0.55;
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            opacity: 0.85;
            transform: translate3d(6px, -8px, 0) scale(1.03);
          }
        }

        .todayTaskBannerMesh {
          position: absolute;
          inset: -40%;
          pointer-events: none;
          background:
            radial-gradient(ellipse 55% 42% at 18% 22%, rgba(99, 102, 241, 0.14), transparent 62%),
            radial-gradient(ellipse 48% 38% at 88% 18%, rgba(236, 72, 153, 0.08), transparent 58%),
            radial-gradient(ellipse 60% 45% at 52% 92%, rgba(14, 165, 233, 0.07), transparent 55%);
          animation: todayMeshFloat 14s ease-in-out infinite;
        }

        .todayTaskBannerMesh--accent {
          background:
            radial-gradient(ellipse 52% 40% at 14% 24%, rgba(99, 102, 241, 0.18), transparent 60%),
            radial-gradient(ellipse 46% 36% at 90% 12%, rgba(236, 72, 153, 0.1), transparent 56%),
            radial-gradient(ellipse 58% 42% at 48% 88%, rgba(14, 165, 233, 0.09), transparent 54%);
        }

        .todayTaskBannerMesh--muted {
          animation: none;
          opacity: 0.45;
          background:
            radial-gradient(ellipse 50% 40% at 20% 30%, rgba(34, 197, 94, 0.12), transparent 58%),
            radial-gradient(ellipse 44% 36% at 85% 20%, rgba(16, 185, 129, 0.06), transparent 55%);
        }

        .todayTaskBannerMesh--gold {
          animation: todayMeshFloat 16s ease-in-out infinite;
          background:
            radial-gradient(ellipse 50% 42% at 22% 28%, rgba(251, 191, 36, 0.22), transparent 58%),
            radial-gradient(ellipse 44% 38% at 82% 16%, rgba(245, 158, 11, 0.12), transparent 56%),
            radial-gradient(ellipse 56% 44% at 50% 90%, rgba(253, 224, 71, 0.1), transparent 54%);
        }

        .todayTaskBannerInner {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: clamp(16px, 3.5vw, 28px);
          align-items: start;
          padding: clamp(18px, 3vw, 26px) clamp(18px, 3.5vw, 28px);
        }

        .todayTaskBannerIcon {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #4f46e5;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(238, 242, 255, 0.9) 100%);
          border: 1px solid rgba(99, 102, 241, 0.22);
          box-shadow:
            0 10px 22px rgba(79, 70, 229, 0.12),
            0 1px 0 rgba(255, 255, 255, 0.8) inset;
        }

        .todayTaskBannerIcon--success {
          color: #15803d;
          background: linear-gradient(145deg, rgba(240, 253, 244, 0.98) 0%, rgba(220, 252, 231, 0.92) 100%);
          border-color: rgba(34, 197, 94, 0.35);
          box-shadow:
            0 10px 22px rgba(22, 163, 74, 0.14),
            0 1px 0 rgba(255, 255, 255, 0.85) inset;
        }

        .todayTaskBannerIcon--gold {
          color: #b45309;
          background: linear-gradient(145deg, rgba(255, 251, 235, 0.98) 0%, rgba(254, 243, 199, 0.92) 100%);
          border-color: rgba(251, 191, 36, 0.45);
          box-shadow:
            0 12px 26px rgba(245, 158, 11, 0.18),
            0 1px 0 rgba(255, 255, 255, 0.85) inset;
        }

        .todayTaskBannerCopy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .todayTaskBannerMeta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .todayTaskEyebrow {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #64748b;
        }

        .todayTaskPlanPill {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 5px 11px;
          border-radius: 999px;
          color: #4338ca;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .todayTaskBannerTitle {
          margin: 0;
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(22px, 3.2vw, 30px);
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1.15;
          color: #0f172a;
        }

        .todayTaskBannerLead {
          margin: 0;
          font-size: 14px;
          line-height: 1.55;
          color: #64748b;
          max-width: 42rem;
        }

        .todayTaskPanel {
          margin-top: 4px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: grid;
          gap: 12px;
        }

        .todayTaskPanel--loading {
          gap: 10px;
        }

        .todayTaskPanel--empty .todayTaskFoot {
          margin: 0;
        }

        .todayTaskPanelHead {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .todayTaskDateChip {
          font-size: 12px;
          font-weight: 700;
          padding: 6px 11px;
          border-radius: 999px;
          color: #334155;
          background: rgba(248, 250, 252, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .todayTaskDayChip {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 6px 10px;
          border-radius: 999px;
          color: #64748b;
          background: rgba(241, 245, 249, 0.9);
          border: 1px dashed rgba(148, 163, 184, 0.45);
        }

        .todayTaskHeadline {
          margin: 0;
          font-size: clamp(15px, 1.35vw, 17px);
          font-weight: 650;
          line-height: 1.45;
          color: #0f172a;
          letter-spacing: -0.015em;
        }

        .todayTaskActions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .todayTaskBadgeDone {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 10px 18px;
          border-radius: 999px;
          color: rgba(248, 250, 252, 0.96);
          background:
            linear-gradient(148deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.02) 38%, transparent 52%),
            linear-gradient(180deg, #3f3f46 0%, #18181b 46%, #09090b 100%);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.28) inset,
            0 -1px 0 rgba(0, 0, 0, 0.45) inset,
            0 14px 32px rgba(0, 0, 0, 0.38),
            0 4px 12px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .todayTaskFoot {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: #64748b;
        }

        .todayTaskCta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: fit-content;
          margin-top: 2px;
          padding: 12px 20px;
          border-radius: 12px;
          border: 1px solid #0f172a;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 650;
          letter-spacing: -0.01em;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22);
        }

        .todayTaskCta:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.28);
          background: linear-gradient(180deg, #0f172a 0%, #020617 100%);
        }

        .todayTaskCta:active {
          transform: translateY(0);
        }

        .todayTaskCta--ghost {
          background: rgba(255, 255, 255, 0.92);
          color: #0f172a;
          border-color: rgba(148, 163, 184, 0.45);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
        }

        .todayTaskCta--ghost:hover {
          border-color: rgba(99, 102, 241, 0.45);
          background: rgba(255, 255, 255, 1);
          box-shadow: 0 10px 22px rgba(79, 70, 229, 0.12);
        }

        .todayTaskSkeletonLine {
          height: 14px;
          border-radius: 8px;
          background: linear-gradient(
            90deg,
            rgba(226, 232, 240, 0.65) 0%,
            rgba(241, 245, 249, 0.95) 48%,
            rgba(226, 232, 240, 0.65) 100%
          );
          background-size: 200% 100%;
          animation: todayShimmer 1.35s ease-in-out infinite;
        }

        .todayTaskSkeletonLine--short {
          width: 62%;
        }

        @keyframes todayShimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
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
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.92) 100%);
          padding: 20px 18px;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.1);
          position: sticky;
          top: 14px;
          animation: fadeSlideIn 0.5s ease both;
        }
        .workflowIntro::after {
          content: "";
          position: absolute;
          right: -80px;
          top: -80px;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(15, 23, 42, 0.08), transparent 68%);
          pointer-events: none;
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
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 250, 252, 0.9) 100%);
          padding: 14px 14px 13px;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
          display: grid;
          gap: 8px;
          min-height: 100%;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          animation: fadeSlideIn 0.48s ease both;
        }
        .timelineCard::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 25%, rgba(255, 255, 255, 0.55) 50%, transparent 75%);
          transform: translateX(-130%);
          pointer-events: none;
        }

        .timelineCard:hover {
          border-color: #111111;
          transform: translateY(-3px);
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.14);
        }
        .timelineCard:hover::before {
          animation: sheen 0.9s ease;
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
          transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.14s ease;
        }
        .workflowBtn:hover {
          transform: translateY(-1px);
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
          margin-top: 32px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .featureCard {
          position: relative;
          min-height: 176px;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: #ffffff;
          padding: 28px 26px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.85) inset,
            0 14px 36px rgba(15, 23, 42, 0.07);
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
        }

        .featureCard::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(ellipse 90% 55% at 100% 0%, rgba(99, 102, 241, 0.07), transparent 62%),
            radial-gradient(ellipse 70% 50% at 0% 100%, rgba(34, 197, 94, 0.05), transparent 55%);
          opacity: 1;
          pointer-events: none;
          transition: opacity 0.22s ease;
        }

        .featureCard:hover {
          transform: translateY(-4px);
          border-color: rgba(148, 163, 184, 0.35);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 22px 48px rgba(15, 23, 42, 0.12);
        }

        .featureCard:hover::before {
          opacity: 1;
        }

        .featureCard h3 {
          position: relative;
          margin: 0;
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.015em;
          line-height: 1.25;
        }

        .featureCard p {
          position: relative;
          margin: 12px 0 0;
          font-size: 14px;
          color: #64748b;
          line-height: 1.62;
        }

        .landingSectionInner--previewWide {
          max-width: 1220px;
        }

        .previewShowcase {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) minmax(300px, 1.12fr);
          gap: clamp(28px, 5vw, 56px);
          align-items: start;
          margin-top: 8px;
        }

        .previewShowcaseIntro {
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-width: 34rem;
        }

        .previewIntroList {
          margin: 4px 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 12px;
        }

        .previewIntroList li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 14px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.78);
        }

        .previewIntroCheck {
          flex-shrink: 0;
          margin-top: 2px;
          color: rgba(52, 211, 153, 0.95);
        }

        .previewShowcaseCta {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: fit-content;
          padding: 14px 26px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: -0.01em;
          text-decoration: none;
          color: #0f172a;
          background: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }

        .previewShowcaseCta:hover {
          transform: translateY(-2px);
          background: #f8fafc;
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
        }

        .previewShowcaseMock {
          position: relative;
          width: 100%;
          min-width: 0;
        }

        .planPreviewDevice {
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: linear-gradient(165deg, rgba(255, 255, 255, 0.08) 0%, rgba(15, 23, 42, 0.65) 42%, rgba(2, 6, 23, 0.92) 100%);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.06) inset,
            0 40px 80px rgba(0, 0, 0, 0.55),
            0 16px 32px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .planPreviewChrome {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.35);
        }

        .planPreviewDots {
          display: inline-flex;
          gap: 6px;
        }

        .planPreviewDots span {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
        }

        .planPreviewDots span:nth-child(1) {
          background: rgba(248, 113, 113, 0.85);
        }

        .planPreviewDots span:nth-child(2) {
          background: rgba(250, 204, 21, 0.85);
        }

        .planPreviewDots span:nth-child(3) {
          background: rgba(74, 222, 128, 0.85);
        }

        .planPreviewChromeTitle {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: rgba(255, 255, 255, 0.55);
        }

        .planPreviewScroll {
          padding: 18px 18px 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: min(640px, 72vh);
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .planPreviewScroll::-webkit-scrollbar {
          width: 6px;
        }

        .planPreviewScroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.14);
          border-radius: 999px;
        }

        .planPreviewHeader {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .planPreviewBrandRow {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .planPreviewAvatar {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 17px;
          color: #0f172a;
          background: linear-gradient(145deg, #ffffff 0%, #e2e8f0 100%);
          border: 1px solid rgba(148, 163, 184, 0.35);
          flex-shrink: 0;
        }

        .planPreviewBizName {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #0f172a;
        }

        .planPreviewBizMeta {
          margin: 2px 0 0;
          font-size: 12px;
          color: #64748b;
        }

        .planPreviewLiveBadge {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 6px 10px;
          border-radius: 999px;
          color: rgba(15, 23, 42, 0.85);
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .planPreviewGoalCard {
          display: flex;
          gap: 12px;
          padding: 14px 14px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
        }

        .planPreviewGoalIcon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #4f46e5;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .planPreviewGoalLabel {
          margin: 0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #64748b;
        }

        .planPreviewGoalText {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: #334155;
        }

        .planPreviewPlanSection {
          padding: 14px 14px 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.07);
        }

        .planPreviewPlanSection--growth {
          border-left: 3px solid rgba(99, 102, 241, 0.65);
        }

        .planPreviewPlanSection--marketing {
          border-left: 3px solid rgba(236, 72, 153, 0.55);
        }

        .planPreviewPlanSectionHead {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.85);
        }

        .planPreviewPlanSectionIcon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #4338ca;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.22);
        }

        .planPreviewPlanSectionIcon--marketing {
          color: #be185d;
          background: rgba(236, 72, 153, 0.1);
          border-color: rgba(236, 72, 153, 0.22);
        }

        .planPreviewPlanSectionTitle {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
        }

        .planPreviewPlanSectionSub {
          margin: 4px 0 0;
          font-size: 12px;
          line-height: 1.45;
          color: #64748b;
        }

        .planPreviewGrowthDays {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .planPreviewGrowthDay {
          padding: 12px 12px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.95);
        }

        .planPreviewGrowthDayMeta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .planPreviewGrowthAction {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 600;
          color: #1e293b;
          letter-spacing: -0.01em;
        }

        .planPreviewDateChip--compact {
          margin-left: 0;
          font-size: 11px;
          font-weight: 700;
        }

        .planPreviewMarketingDays {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .planPreviewMarketingCard {
          padding: 12px 12px;
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(253, 242, 248, 0.35) 100%);
          border: 1px solid rgba(251, 207, 232, 0.65);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .planPreviewMarketingCardTop {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .planPreviewMarketingHook {
          font-size: 13px;
          font-weight: 700;
          color: #9d174d;
          letter-spacing: -0.015em;
        }

        .planPreviewDayPill--sm {
          padding: 5px 9px;
          font-size: 10px;
        }

        .planPreviewCaptionBlock--compact {
          padding: 10px 12px;
        }

        .planPreviewTags--compact {
          gap: 6px;
        }

        .planPreviewDayPill {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 6px 11px;
          border-radius: 999px;
          color: #312e81;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.22);
        }

        .planPreviewWeekPill {
          font-size: 11px;
          font-weight: 700;
          padding: 6px 11px;
          border-radius: 999px;
          color: #475569;
          background: #f1f5f9;
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .planPreviewDateChip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }

        .planPreviewCaptionBlock {
          padding: 12px 14px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(248, 250, 252, 0.98) 0%, rgba(241, 245, 249, 0.95) 100%);
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .planPreviewCaptionLabel {
          margin: 0 0 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #6366f1;
        }

        .planPreviewCaptionText {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          color: #334155;
          font-style: italic;
        }

        .planPreviewTags {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .planPreviewTagsLabel {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748b;
        }

        .planPreviewTagRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .planPreviewTag {
          font-size: 12px;
          font-weight: 600;
          padding: 6px 11px;
          border-radius: 999px;
          color: #334155;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.95);
        }

        .planPreviewProgressSec {
          padding: 14px 16px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
        }

        .planPreviewProgressHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .planPreviewProgressLabel {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.02em;
        }

        .planPreviewProgressPct {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          font-variant-numeric: tabular-nums;
        }

        .planPreviewProgressTrack {
          height: 8px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
          margin-bottom: 14px;
        }

        .planPreviewProgressFill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #6366f1 0%, #22c55e 100%);
          transition: width 0.4s ease;
        }

        .planPreviewChecklist {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 10px;
        }

        .planPreviewCheckItem {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          line-height: 1.45;
          color: #475569;
        }

        .planPreviewCheckItem--done {
          color: #334155;
        }

        .planPreviewCheckIcon {
          flex-shrink: 0;
          margin-top: 1px;
          color: #22c55e;
          display: flex;
          align-items: center;
        }

        .planPreviewCheckEmpty {
          width: 17px;
          height: 17px;
          border-radius: 999px;
          border: 2px solid #cbd5e1;
          box-sizing: border-box;
        }

        .planPreviewTimelineSec {
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.97);
          border: 1px solid rgba(226, 232, 240, 0.95);
        }

        .planPreviewTimelineHead {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #64748b;
        }

        .planPreviewTimeline {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .planPreviewTimelineRow {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 10px 14px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(226, 232, 240, 0.85);
          font-size: 13px;
          align-items: baseline;
        }

        .planPreviewTimelineRow:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .planPreviewTimelineDate {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #6366f1;
          white-space: nowrap;
        }

        .planPreviewTimelineTitle {
          color: #334155;
          line-height: 1.45;
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

        .homeFooter {
          width: 100%;
          max-width: 100%;
          margin: 0;
          margin-bottom: 0;
          padding: clamp(52px, 7vw, 82px) max(20px, calc((100% - 1180px) / 2 + 20px)) clamp(24px, 4vw, 36px);
          border-radius: 0;
          border: 0;
          background: #000000;
          box-shadow: none;
        }

        .homeFooterInner {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .homeFooterTop {
          display: grid;
          grid-template-columns: minmax(240px, 1.2fr) repeat(4, minmax(0, 1fr));
          align-items: start;
          gap: clamp(28px, 4vw, 56px);
          column-gap: clamp(20px, 3vw, 40px);
        }

        .homeFooterBrand {
          display: grid;
          gap: 14px;
          max-width: 360px;
        }

        .homeFooterBrandName {
          margin: 0;
          color: #ffffff;
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(32px, 3.4vw, 46px);
          font-weight: 600;
          letter-spacing: -0.035em;
        }

        .homeFooterTagline {
          margin: 0;
          color: rgba(255, 255, 255, 0.62);
          font-size: 14px;
          line-height: 1.7;
        }

        .homeFooterMeta {
          margin: 0;
          font-size: 12px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.42);
          font-weight: 500;
          letter-spacing: 0.01em;
        }

        .homeFooterColumn {
          display: grid;
          gap: 14px;
        }

        .homeFooterColumnTitle {
          margin: 0;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .homeFooterNav {
          display: grid;
          gap: 13px;
        }

        .homeFooterNav :global(a.homeFooterLink) {
          display: inline-block;
          width: fit-content;
          max-width: 100%;
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          font-weight: 500;
          line-height: 1.45;
          text-decoration: none;
          border: none;
          background: transparent;
          padding: 0;
          margin: 0;
          box-shadow: none;
          transition: color 0.18s ease, transform 0.18s ease;
        }

        .homeFooterNav :global(a.homeFooterLink:hover) {
          color: #ffffff;
          transform: translateX(3px);
        }

        .homeFooterNav :global(a.homeFooterLink:focus) {
          outline: none;
        }

        .homeFooterNav :global(a.homeFooterLink:focus-visible) {
          outline: 2px solid rgba(255, 255, 255, 0.45);
          outline-offset: 3px;
          border-radius: 2px;
        }

        .homeFooterBottom {
          margin-top: clamp(34px, 5vw, 52px);
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .homeFooterCopy {
          margin: 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.46);
        }

        @keyframes fadeSlideIn {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes sheen {
          0% {
            transform: translateX(-130%);
          }
          100% {
            transform: translateX(130%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .landingReveal {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }

          .todayTaskBanner,
          .workflowIntro,
          .timelineCard {
            animation: none !important;
          }

          .todayTaskBannerMesh {
            animation: none !important;
          }

          .todayTaskSkeletonLine {
            animation: none !important;
          }

          .todayTaskBanner:hover,
          .timelineCard:hover,
          .workflowBtn:hover,
          .todayTaskCta:hover,
          .landingCtaBtn:hover {
            transform: none !important;
          }

          .galleryMarqueeTrack {
            animation: none !important;
            transform: none !important;
          }

          .galleryMarqueeRow:hover .galleryMarqueeTrack {
            animation: none !important;
          }

          .galleryTileWrap {
            animation: none !important;
          }

          .timelineCard::before,
          .timelineCard:hover::before {
            animation: none !important;
          }

          .homeFooterNav :global(a.homeFooterLink:hover) {
            transform: none !important;
          }
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

          .previewShowcase {
            grid-template-columns: 1fr;
            gap: 36px;
          }

          .previewShowcaseIntro {
            max-width: none;
          }

          .planPreviewScroll {
            max-height: none;
          }

          .landingSectionInner {
            padding-left: 18px;
            padding-right: 18px;
          }

          .homeFooterTop {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .homeFooterColumn--support {
            grid-column: 1 / -1;
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

          .homeFooterTop {
            grid-template-columns: 1fr;
          }

          .homeFooterBottom {
            align-items: center;
          }

          .heroTrustDot {
            display: none;
          }

          .previewShowcaseCta {
            width: 100%;
          }

          .planPreviewDateChip {
            margin-left: 0;
          }

          .todayTaskBannerInner {
            grid-template-columns: 1fr;
          }

          .todayTaskBannerIcon {
            width: 48px;
            height: 48px;
            border-radius: 16px;
          }

          .todayTaskCta {
            width: 100%;
          }

          .todayTaskCta--ghost {
            width: auto;
            flex: 1 1 auto;
          }

          .todayTaskActions {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </main>);
}
