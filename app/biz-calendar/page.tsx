"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCheck, FaCheckCircle, FaClock, FaRegCopy, FaTimes } from "react-icons/fa";
import { useAuth } from "@/src/lib/useAuth";
type GeneratedDay = {
    dayNumber: number;
    dateLabel?: string;
    mainActionTitle?: string;
    businessGrowthAction?: string;
    executionSteps?: string[];
    postIdea?: string;
    caption?: string;
    hashtags?: string[];
    successMetric?: string;
    notes?: string;
};
type ModalType = "missingBusiness" | "missingPlan" | "noPlan" | "serverError" | null;
type LatestPlanResponse = {
    ok?: boolean;
    data?: {
        planDays?: number;
        planData?: GeneratedDay[];
        completedDays?: number[];
    };
    error?: string;
};
type DayStatusRow = {
    dayNumber?: number;
    completed?: boolean;
};
type PosterByDayResponse = {
    ok?: boolean;
    data?: {
        dayNumber?: number;
        posterDataUrl?: string;
        caption?: string;
        hashtags?: string[];
    };
};
type CompleteDayResponse = {
    ok?: boolean;
    data?: {
        completedDays?: number[];
    };
    error?: string;
};
type CalendarCell = {
    key: string;
    date: Date | null;
    day: GeneratedDay | null;
};
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function sortDays(days: GeneratedDay[]): GeneratedDay[] {
    return [...days].sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));
}
function startOfToday(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}
function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}
function mondayFirstIndex(date: Date): number {
    return (date.getDay() + 6) % 7;
}
function dateLabel(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function cleanTitle(title: string): string {
    return title.replace(/^Week\s*\d+\s*/i, "").replace(/^Day\s*\d+\s*/i, "").trim();
}
export default function BizCalendarPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [modalType, setModalType] = useState<ModalType>(null);
    const [planDays, setPlanDays] = useState<number>(0);
    const [planData, setPlanData] = useState<GeneratedDay[]>([]);
    const [completedMap, setCompletedMap] = useState<Record<number, boolean>>({});
    const [posterMap, setPosterMap] = useState<Record<number, string>>({});
    const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
    const [savingDayNumber, setSavingDayNumber] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);
    const loadInitialData = useCallback(async () => {
        if (!user?.uid)
            return;
        setIsLoading(true);
        setModalType(null);
        setPlanData([]);
        setPlanDays(0);
        setCompletedMap({});
        setPosterMap({});
        try {
            const businessRes = await fetch(`/api/business-profile?firebase_uid=${encodeURIComponent(user.uid)}`, {
                cache: "no-store",
            });
            const businessJson = await businessRes.json();
            if (businessRes.status === 404 ||
                (businessJson?.ok === false &&
                    (businessJson?.error === "No business profile" || businessJson?.error === "business_profile_not_found"))) {
                setModalType("missingBusiness");
                return;
            }
            if (!businessRes.ok || !businessJson?.ok) {
                throw new Error(businessJson?.error || "Failed to load business details");
            }
            const [latestRes, statusesRes] = await Promise.all([
                fetch(`/api/marketing-plan/latest?firebase_uid=${encodeURIComponent(user.uid)}`, { cache: "no-store" }),
                fetch(`/api/day-status/all?firebase_uid=${encodeURIComponent(user.uid)}`, { cache: "no-store" }),
            ]);
            const latestJson = (await latestRes.json()) as LatestPlanResponse;
            const statusesJson = await statusesRes.json();
            if (latestRes.status === 404 || latestJson?.error === "no_plan_found") {
                setModalType("noPlan");
                return;
            }
            if (!latestRes.ok || !latestJson?.ok) {
                throw new Error(latestJson?.error || "Failed to load marketing plan");
            }
            const sorted = sortDays(Array.isArray(latestJson.data?.planData) ? latestJson.data.planData : []);
            if (sorted.length === 0) {
                setModalType("noPlan");
                return;
            }
            setPlanData(sorted.map((day) => ({
                ...day,
                executionSteps: Array.isArray(day.executionSteps) ? day.executionSteps : [],
                hashtags: Array.isArray(day.hashtags) ? day.hashtags : [],
            })));
            setPlanDays(Number(latestJson.data?.planDays ?? sorted.length));
            const fromStatusRows: Record<number, boolean> = {};
            const statusRows = Array.isArray(statusesJson?.data) ? (statusesJson.data as DayStatusRow[]) : [];
            for (const row of statusRows) {
                const dayNumber = Number(row.dayNumber ?? 0);
                if (Number.isInteger(dayNumber) && dayNumber > 0)
                    fromStatusRows[dayNumber] = Boolean(row.completed);
            }
            const completedDays = Array.isArray(latestJson.data?.completedDays) ? latestJson.data.completedDays : [];
            for (const completedDay of completedDays) {
                const dayNumber = Number(completedDay);
                if (Number.isInteger(dayNumber) && dayNumber > 0)
                    fromStatusRows[dayNumber] = true;
            }
            setCompletedMap(fromStatusRows);
            const posterPairs = await Promise.all(sorted.map(async (day) => {
                try {
                    const response = await fetch(`/api/posters/by-day?firebase_uid=${encodeURIComponent(user.uid)}&dayNumber=${day.dayNumber}`, { cache: "no-store" });
                    if (!response.ok)
                        return [day.dayNumber, ""] as const;
                    const json = (await response.json()) as PosterByDayResponse;
                    return [day.dayNumber, json.ok && json.data?.posterDataUrl ? json.data.posterDataUrl : ""] as const;
                }
                catch {
                    return [day.dayNumber, ""] as const;
                }
            }));
            const nextPosterMap: Record<number, string> = {};
            for (const [dayNumber, posterUrl] of posterPairs) {
                if (posterUrl)
                    nextPosterMap[dayNumber] = posterUrl;
            }
            setPosterMap(nextPosterMap);
        }
        catch (error) {
            console.error("Biz Calendar load failed:", error);
            setModalType("serverError");
        }
        finally {
            setIsLoading(false);
        }
    }, [user?.uid]);
    useEffect(() => {
        if (authLoading)
            return;
        if (!user?.uid) {
            router.replace("/login");
            return;
        }
        void loadInitialData();
    }, [authLoading, user?.uid, router, loadInitialData]);
    const selectedDay = useMemo(() => planData.find((day) => day.dayNumber === selectedDayNumber) ?? null, [planData, selectedDayNumber]);
    const calendarCells = useMemo<CalendarCell[]>(() => {
        if (planData.length === 0)
            return [];
        const today = startOfToday();
        const leadingEmpty = mondayFirstIndex(today);
        const filledCells: CalendarCell[] = [];
        for (let index = 0; index < leadingEmpty; index += 1) {
            filledCells.push({ key: `empty-start-${index}`, date: null, day: null });
        }
        for (let index = 0; index < planData.length; index += 1) {
            filledCells.push({
                key: `day-${planData[index].dayNumber}`,
                date: addDays(today, index),
                day: planData[index],
            });
        }
        while (filledCells.length % 7 !== 0) {
            filledCells.push({ key: `empty-end-${filledCells.length}`, date: null, day: null });
        }
        return filledCells;
    }, [planData]);
    const completedCount = planData.filter((day) => completedMap[day.dayNumber]).length;
    const progressPercent = planData.length > 0 ? Math.round((completedCount / planData.length) * 100) : 0;
    async function toggleDayCompleted(dayNumber: number, completed: boolean) {
        if (!user?.uid || savingDayNumber)
            return;
        const previousCompleted = Boolean(completedMap[dayNumber]);
        setSavingDayNumber(dayNumber);
        setCompletedMap((prev) => ({ ...prev, [dayNumber]: completed }));
        try {
            const response = await fetch("/api/marketing-plan/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firebase_uid: user.uid, dayNumber, completed }),
            });
            const result = (await response.json()) as CompleteDayResponse;
            if (!response.ok || !result?.ok) {
                setCompletedMap((prev) => ({ ...prev, [dayNumber]: previousCompleted }));
                setModalType("serverError");
                return;
            }
            const completedDays = Array.isArray(result.data?.completedDays) ? result.data.completedDays : [];
            setCompletedMap(completedDays.reduce<Record<number, boolean>>((acc, day) => {
                const completedDay = Number(day);
                if (Number.isInteger(completedDay) && completedDay > 0)
                    acc[completedDay] = true;
                return acc;
            }, {}));
        }
        catch {
            setCompletedMap((prev) => ({ ...prev, [dayNumber]: previousCompleted }));
            setModalType("serverError");
        }
        finally {
            setSavingDayNumber(null);
        }
    }
    async function copyCaption() {
        try {
            await navigator.clipboard.writeText(selectedDay?.caption ?? "");
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        }
        catch {
            setCopied(false);
        }
    }
    const modalContent = useMemo(() => {
        if (modalType === "missingBusiness") {
            return {
                title: "Fill business details first",
                text: "Add your business profile to unlock Biz Calendar.",
                primaryText: "Go to Business Details",
                primaryAction: () => router.push("/onboarding/business-details"),
                secondaryText: "Close",
                secondaryAction: () => setModalType(null),
            };
        }
        if (modalType === "missingPlan" || modalType === "noPlan") {
            return {
                title: "Generate a plan first",
                text: "Create your latest marketing plan before opening Biz Calendar.",
                primaryText: "Go to Plan Builder",
                primaryAction: () => router.push("/marketing-plan"),
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
    }, [modalType, router, loadInitialData]);
    const today = startOfToday();
    return (<div className="calPage">
      <div className="calShell">
        <header className="calHero">
          <div className="calHeroMain">
            <p className="eyebrow calHeroEyebrow">Smart Calendar</p>
            <h1 className="calHeroTitle">Biz Calendar</h1>
            <p className="heroText calHeroLead">
              Track your latest {planDays || planData.length || ""}-day growth plan, open day tasks, and see which days already have posters.
            </p>
          </div>
          {!isLoading && planData.length > 0 ? (<div className="progressPanel" role="status" aria-live="polite" aria-label={`Plan progress ${progressPercent} percent, ${completedCount} of ${planData.length} days completed`}>
              <div className="progressDonut" style={{ background: `conic-gradient(from -90deg, #34d399 ${progressPercent}%, rgba(148, 163, 184, 0.22) ${progressPercent}%)` }}>
                <div className="progressDonutInner">
                  <span className="progressDonutValue">{progressPercent}<span className="progressDonutPct">%</span></span>
                </div>
              </div>
              <div className="progressCopy">
                <p className="progressStat">
                  <strong>{completedCount}</strong>
                  <span className="progressStatOf"> / {planData.length}</span>
                </p>
                <p className="progressSub">days completed</p>
              </div>
            </div>) : null}
        </header>

        <section className="calendarCard">
          <div className="weekdayGrid" aria-hidden>
            {weekdays.map((day) => (<span key={day} className="weekdayCell">{day}</span>))}
          </div>
          <div className="weekdayStripMobile" aria-hidden>
            {weekdays.map((day) => (<span key={`mob-${day}`}>{day}</span>))}
          </div>

          {isLoading ? (<div className="calendarGrid" aria-busy="true" aria-label="Loading calendar">
              {Array.from({ length: 14 }).map((_, index) => (<div key={index} className="dayCell skeleton"/>))}
            </div>) : planData.length > 0 ? (<div className="calendarGrid" role="grid" aria-label="BizBoost marketing plan calendar">
              {calendarCells.map((cell) => {
                if (!cell.day || !cell.date) {
                    return <div key={cell.key} className="dayCell dayCellEmpty" aria-hidden/>;
                }
                const completed = Boolean(completedMap[cell.day.dayNumber]);
                const posterUrl = posterMap[cell.day.dayNumber];
                const todayMatch = isSameDay(cell.date, today);
                const title = cleanTitle(cell.day.mainActionTitle || "") || cell.day.mainActionTitle || `Day ${cell.day.dayNumber}`;
                const weekdayShort = cell.date.toLocaleDateString("en-US", { weekday: "short" });
                return (<button key={cell.key} type="button" className={`dayCell ${completed ? "completed" : ""} ${todayMatch ? "today" : ""}`} onClick={() => {
                        setCopied(false);
                        setSelectedDayNumber(cell.day?.dayNumber ?? null);
                    }}>
                    <span className="cellTop">
                      <span className="dateBlock">
                        <span className="dateWeekday">{weekdayShort}</span>
                        <span className="dateText">{dateLabel(cell.date)}</span>
                      </span>
                      <span className="cellBadgeGroup">
                        {todayMatch ? <span className="todayBadge">Today</span> : null}
                        {completed ? (<span className="cellDonePill">
                            <FaCheckCircle className="cellDonePillIcon" size={12} aria-hidden/>
                            Done
                          </span>) : null}
                      </span>
                    </span>
                    <span className="cellDayNum">Day {cell.day.dayNumber}</span>
                    <span className="cellTitle" title={title}>{title}</span>
                    <span className="cellBottom">
                      <span className={`statusPill ${completed ? "statusPill--done" : "statusPill--pending"}`}>
                        {completed ? (<>
                              <FaCheckCircle size={12} aria-hidden/>
                              Completed
                            </>) : (<>
                              <FaClock size={12} aria-hidden/>
                              Pending
                            </>)}
                      </span>
                      {posterUrl ? (<span className="posterMini" aria-label="Poster available">
                          <img src={posterUrl} alt=""/>
                        </span>) : null}
                    </span>
                  </button>);
            })}
            </div>) : (<div className="emptyState">No generated plan found. Generate your marketing plan first.</div>)}
        </section>
      </div>

      {selectedDay && (<div className="drawerOverlay" onClick={() => setSelectedDayNumber(null)}>
          <aside className="dayDrawer" role="dialog" aria-modal="true" aria-labelledby="day-drawer-title" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="closeBtn" aria-label="Close day details" onClick={() => setSelectedDayNumber(null)}>
              <FaTimes size={14}/>
            </button>
            <div className="drawerHeader">
              <p className="eyebrow">{selectedDay.dateLabel || `Day ${selectedDay.dayNumber}`}</p>
              <div className="drawerTitleRow">
                <h2 id="day-drawer-title">{selectedDay.mainActionTitle || `Day ${selectedDay.dayNumber}`}</h2>
                <span className={`statusPill statusPill--drawer ${completedMap[selectedDay.dayNumber] ? "statusPill--done" : "statusPill--pending"}`}>
                  {completedMap[selectedDay.dayNumber] ? (<>
                      <FaCheckCircle size={13} aria-hidden/>
                      Completed
                    </>) : (<>
                      <FaClock size={13} aria-hidden/>
                      Pending
                    </>)}
                </span>
              </div>
            </div>

            {posterMap[selectedDay.dayNumber] ? (<div className="posterPreview">
                <img src={posterMap[selectedDay.dayNumber]} alt={`Poster for day ${selectedDay.dayNumber}`}/>
              </div>) : null}

            <section className="drawerSection">
              <h3>Business Growth Action</h3>
              <p>{selectedDay.businessGrowthAction || "No growth action available."}</p>
            </section>

            <section className="drawerSection">
              <h3>Execution Steps</h3>
              <ul className="stepList">
                {(selectedDay.executionSteps ?? []).map((step, index) => (<li key={`${index}-${step}`}>
                    <FaCheck size={12}/>
                    <span>{step}</span>
                  </li>))}
              </ul>
            </section>

            <section className="drawerSection">
              <h3>Post Idea</h3>
              <p>{selectedDay.postIdea || "No post idea available."}</p>
            </section>

            <section className="drawerSection">
              <div className="sectionHead">
                <h3>Caption</h3>
                <button type="button" className="copyBtn" onClick={() => void copyCaption()}>
                  <FaRegCopy size={13}/>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea className="captionBox" value={selectedDay.caption || ""} readOnly/>
            </section>

            {(selectedDay.hashtags ?? []).length > 0 ? (<section className="drawerSection">
                <h3>Hashtags</h3>
                <div className="chips">
                  {(selectedDay.hashtags ?? []).map((tag) => (<span key={tag}>{tag}</span>))}
                </div>
              </section>) : null}

            <section className="drawerSection">
              <h3>Success Metric</h3>
              <p>{selectedDay.successMetric || "Track inquiries, engagement, and sales/bookings."}</p>
            </section>

            <div className="drawerActions">
              <button type="button" className="modalBtn secondary" onClick={() => router.push(`/marketing-plan/day/${selectedDay.dayNumber}`)}>
                Open Day Detail
              </button>
              <button type="button" className="modalBtn secondary" onClick={() => router.push(`/biz-editor?day=${selectedDay.dayNumber}`)}>
                Go to Biz Editor
              </button>
              <button type="button" className="modalBtn primary" disabled={savingDayNumber === selectedDay.dayNumber} onClick={() => void toggleDayCompleted(selectedDay.dayNumber, !completedMap[selectedDay.dayNumber])}>
                {savingDayNumber === selectedDay.dayNumber
                ? "Saving..."
                : completedMap[selectedDay.dayNumber]
                    ? "Undo Completed"
                    : "Mark Completed"}
              </button>
            </div>
          </aside>
        </div>)}

      {modalContent && (<div className="modalOverlay">
          <div className="modalCard" role="dialog" aria-modal="true" aria-labelledby="cal-modal-title">
            <h3 id="cal-modal-title">{modalContent.title}</h3>
            <p>{modalContent.text}</p>
            <div className="modalActions">
              <button type="button" onClick={modalContent.secondaryAction} className="modalBtn secondary">
                {modalContent.secondaryText}
              </button>
              <button type="button" onClick={modalContent.primaryAction} className="modalBtn primary">
                {modalContent.primaryText}
              </button>
            </div>
          </div>
        </div>)}

      <style jsx>{`
        .calPage {
          min-height: 100vh;
          padding: 28px 16px 40px;
          background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #e4e4e7;
        }

        .calShell {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          gap: 22px;
        }

        .calHero,
        .calendarCard {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(165deg, rgba(28, 28, 32, 0.96) 0%, rgba(12, 12, 14, 0.98) 100%);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.03) inset,
            0 24px 56px rgba(0, 0, 0, 0.5),
            0 8px 20px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(22px);
        }

        .calHero {
          border-radius: 20px;
          padding: clamp(24px, 3.5vw, 40px);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: clamp(20px, 3vw, 36px);
          flex-wrap: wrap;
        }

        .calHeroMain {
          flex: 1 1 280px;
          min-width: 0;
          max-width: min(100%, 52rem);
          padding-right: clamp(0px, 2vw, 20px);
        }

        .calHeroEyebrow {
          margin: 0 !important;
          font-size: 11px !important;
          letter-spacing: 0.2em !important;
          text-transform: uppercase !important;
          color: #a1a1aa !important;
          font-weight: 700 !important;
          line-height: 1.4 !important;
        }

        .calHeroTitle {
          margin: 14px 0 0 !important;
          padding: 0 !important;
          color: #fafafa !important;
          font-size: clamp(30px, 4.2vw, 44px) !important;
          line-height: 1.12 !important;
          letter-spacing: -0.03em !important;
          font-weight: 600 !important;
          max-width: 100%;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }

        .calHeroLead {
          margin: 16px 0 0 !important;
          padding: 0 !important;
          max-width: 100% !important;
          width: 100%;
          color: #d4d4d8 !important;
          line-height: 1.65 !important;
          font-size: clamp(14px, 1.65vw, 16px) !important;
          font-weight: 400 !important;
          overflow-wrap: break-word;
          word-wrap: break-word;
          text-wrap: pretty;
        }

        .eyebrow {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #71717a;
          font-weight: 700;
        }

        h1 {
          margin: 10px 0 0;
          color: #fafafa;
          font-size: clamp(32px, 4.6vw, 46px);
          line-height: 1.05;
          letter-spacing: -0.038em;
          font-weight: 600;
        }

        .heroText {
          margin: 12px 0 0;
          max-width: 36rem;
          color: #a1a1aa;
          line-height: 1.65;
          font-size: 15px;
        }

        .progressPanel {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 18px 22px;
          border-radius: 16px;
          background: linear-gradient(145deg, rgba(9, 9, 11, 0.95) 0%, rgba(24, 24, 27, 0.92) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.04) inset,
            0 16px 40px rgba(0, 0, 0, 0.4);
          color: #fafafa;
          flex-shrink: 0;
          align-self: center;
        }

        .progressStat {
          margin: 0 !important;
          font-size: 18px !important;
          font-weight: 700 !important;
          letter-spacing: -0.02em !important;
          color: #fafafa !important;
          line-height: 1.25 !important;
        }

        .progressStat strong {
          font-weight: 800 !important;
          color: #4ade80 !important;
        }

        .progressStatOf {
          font-weight: 600 !important;
          color: rgba(212, 212, 216, 0.95) !important;
          font-size: 16px !important;
        }

        .progressSub {
          margin: 0 !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #d4d4d8 !important;
          letter-spacing: 0.03em !important;
          line-height: 1.35 !important;
        }

        .progressDonut {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
        }

        .progressDonutInner {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: linear-gradient(180deg, #18181b 0%, #09090b 100%);
          display: grid;
          place-items: center;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
        }

        .progressDonutValue {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #fafafa;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        .progressDonutPct {
          font-size: 11px;
          font-weight: 700;
          opacity: 0.75;
        }

        .progressCopy {
          display: flex;
          flex-direction: column;
          gap: 5px;
          text-align: left;
          min-width: 0;
        }

        .calendarCard {
          border-radius: 20px;
          padding: clamp(18px, 2.4vw, 26px);
        }

        .weekdayGrid,
        .calendarGrid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: clamp(8px, 1.2vw, 12px);
        }

        .weekdayGrid {
          margin-bottom: 14px;
        }

        .weekdayCell {
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #a1a1aa;
          padding: 10px 6px;
          border-radius: 12px;
          background: rgba(24, 24, 27, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .dayCell {
          position: relative;
          min-height: 156px;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(165deg, rgba(30, 30, 34, 0.95) 0%, rgba(18, 18, 21, 0.98) 100%);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.03) inset,
            0 12px 32px rgba(0, 0, 0, 0.35);
          padding: 14px 14px 12px;
          text-align: left;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: #e4e4e7;
          transition:
            transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.22s ease,
            border-color 0.22s ease,
            background 0.22s ease;
        }

        .dayCell:focus-visible {
          outline: none;
          border-color: rgba(99, 102, 241, 0.55);
          box-shadow:
            0 0 0 3px rgba(99, 102, 241, 0.28),
            0 14px 36px rgba(0, 0, 0, 0.4);
        }

        .dayCell:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.14);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.05) inset,
            0 20px 44px rgba(0, 0, 0, 0.45);
        }

        .dayCell.today {
          border-color: rgba(59, 130, 246, 0.45);
          background: linear-gradient(165deg, rgba(30, 58, 138, 0.22) 0%, rgba(18, 18, 22, 0.96) 55%);
          box-shadow:
            0 0 0 1px rgba(96, 165, 250, 0.12) inset,
            0 12px 36px rgba(37, 99, 235, 0.15);
        }

        .dayCell.today:hover {
          border-color: rgba(96, 165, 250, 0.55);
        }

        .dayCell.completed {
          border-color: rgba(34, 197, 94, 0.35);
          background: linear-gradient(165deg, rgba(6, 78, 59, 0.28) 0%, rgba(18, 22, 20, 0.96) 60%);
          box-shadow:
            0 0 0 1px rgba(52, 211, 153, 0.08) inset,
            0 12px 32px rgba(16, 185, 129, 0.1);
        }

        .dayCell.completed:hover {
          border-color: rgba(52, 211, 153, 0.45);
        }

        .dayCell.today.completed {
          border-color: rgba(52, 211, 153, 0.4);
          background: linear-gradient(165deg, rgba(30, 58, 138, 0.2) 0%, rgba(6, 78, 59, 0.22) 45%, rgba(16, 18, 20, 0.97) 100%);
        }

        .cellDonePill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px 5px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #86efac;
          background: rgba(22, 101, 52, 0.45);
          border: 1px solid rgba(52, 211, 153, 0.35);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          flex-shrink: 0;
          white-space: nowrap;
        }

        .cellDonePillIcon {
          color: #4ade80;
          flex-shrink: 0;
        }

        .dayCellEmpty {
          cursor: default;
          opacity: 0.22;
          pointer-events: none;
          background: rgba(24, 24, 27, 0.4);
          border-style: dashed;
          border-color: rgba(63, 63, 70, 0.7);
          box-shadow: none;
        }

        .skeleton {
          min-height: 144px;
          border-radius: 14px;
          background: linear-gradient(90deg, rgba(39, 39, 42, 0.5), rgba(63, 63, 70, 0.35), rgba(39, 39, 42, 0.5));
          background-size: 200% 100%;
          animation: shimmer 1.2s ease-in-out infinite;
        }

        .cellTop,
        .cellBottom {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .cellTop {
          width: 100%;
          align-items: flex-start;
        }

        .cellBottom {
          align-items: center;
        }

        .dateBlock {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
          flex: 1 1 0;
        }

        .cellBadgeGroup {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-end;
          align-items: center;
          flex: 0 1 auto;
          max-width: min(148px, 46%);
        }

        @media (min-width: 1100px) {
          .cellBadgeGroup {
            max-width: min(168px, 40%);
          }
        }

        .dateWeekday {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #71717a;
        }

        .dateText {
          color: #fafafa;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .todayBadge {
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.35);
          color: #bfdbfe;
          border: 1px solid rgba(96, 165, 250, 0.45);
          padding: 5px 10px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          flex-shrink: 0;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .cellDayNum {
          font-size: 11px;
          font-weight: 700;
          color: #a5b4fc;
          letter-spacing: 0.04em;
        }

        .cellTitle {
          color: #d4d4d8;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 600;
          letter-spacing: -0.015em;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
          min-height: 38px;
          margin-top: 0;
          padding-right: 0;
        }

        .statusPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          border-radius: 999px;
          padding: 6px 11px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          border: 1px solid transparent;
        }

        .statusPill--done {
          background: rgba(22, 101, 52, 0.35);
          border-color: rgba(52, 211, 153, 0.28);
          color: #86efac;
        }

        .statusPill--pending {
          background: rgba(120, 53, 15, 0.35);
          border-color: rgba(251, 191, 36, 0.25);
          color: #fde68a;
        }

        .statusPill--drawer {
          width: auto;
          padding: 7px 14px;
          font-size: 12px;
        }

        .posterMini {
          width: 38px;
          height: 46px;
          overflow: hidden;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #09090b;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        }

        .posterMini img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .weekdayStripMobile {
          display: none;
        }

        .emptyState {
          min-height: 176px;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 28px 16px;
          color: #a1a1aa;
          font-weight: 600;
          font-size: 15px;
          line-height: 1.55;
          max-width: 28rem;
          margin: 0 auto;
        }

        .drawerOverlay,
        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(10px);
          display: flex;
          justify-content: flex-end;
          padding: 16px;
        }

        .dayDrawer {
          position: relative;
          width: min(100%, 560px);
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(180deg, rgba(28, 28, 32, 0.98) 0%, rgba(12, 12, 14, 0.99) 100%);
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(24px);
          padding: 24px;
          color: #e4e4e7;
        }

        .closeBtn {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(39, 39, 42, 0.9);
          display: grid;
          place-items: center;
          cursor: pointer;
          color: #a1a1aa;
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
        }

        .closeBtn:hover {
          background: #27272a;
          border-color: rgba(255, 255, 255, 0.18);
          color: #fafafa;
        }

        .drawerHeader {
          padding-right: 48px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .drawerHeader .eyebrow {
          color: #71717a;
        }

        .drawerTitleRow {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .drawerTitleRow h2 {
          flex: 1;
          min-width: min(100%, 220px);
          margin: 0;
          color: #fafafa;
          font-size: clamp(22px, 3.6vw, 32px);
          line-height: 1.12;
          letter-spacing: -0.03em;
          font-weight: 600;
        }

        .drawerTitleRow .statusPill {
          flex-shrink: 0;
          margin-top: 4px;
        }

        .posterPreview {
          margin-top: 18px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #09090b;
        }

        .posterPreview img {
          width: 100%;
          max-height: 420px;
          object-fit: contain;
          display: block;
        }

        .drawerSection {
          margin-top: 18px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(24, 24, 27, 0.65);
          padding: 16px;
        }

        .drawerSection h3 {
          margin: 0 0 10px;
          color: #fafafa;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .drawerSection p {
          margin: 0;
          color: #a1a1aa;
          line-height: 1.62;
          font-size: 14px;
        }

        .stepList {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }

        .stepList li {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          color: #d4d4d8;
          font-size: 14px;
          line-height: 1.5;
        }

        .stepList svg {
          margin-top: 4px;
          color: #4ade80;
          flex-shrink: 0;
        }

        .sectionHead,
        .drawerActions,
        .modalActions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .copyBtn,
        .modalBtn {
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.12);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        }

        .copyBtn,
        .modalBtn.secondary {
          background: rgba(39, 39, 42, 0.9);
          color: #e4e4e7;
        }

        .copyBtn:hover,
        .modalBtn.secondary:hover {
          background: #3f3f46;
          border-color: rgba(255, 255, 255, 0.16);
        }

        .modalBtn.primary {
          background: linear-gradient(145deg, #22c55e 0%, #16a34a 100%);
          color: #052e16;
          border-color: rgba(34, 197, 94, 0.5);
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.25);
          font-weight: 800;
        }

        .modalBtn.primary:hover {
          filter: brightness(1.06);
        }

        .modalBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .captionBox {
          width: 100%;
          min-height: 120px;
          resize: vertical;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(9, 9, 11, 0.85);
          color: #e4e4e7;
          padding: 12px;
          line-height: 1.55;
          font: inherit;
        }

        .chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .chips span {
          border-radius: 999px;
          background: rgba(39, 39, 42, 0.95);
          color: #d4d4d8;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .drawerActions {
          justify-content: flex-end;
          margin-top: 22px;
        }

        .modalOverlay {
          align-items: center;
          justify-content: center;
        }

        .modalCard {
          width: min(100%, 440px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(180deg, rgba(32, 32, 36, 0.98) 0%, rgba(16, 16, 18, 0.99) 100%);
          box-shadow: 0 28px 64px rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(20px);
          padding: 24px;
          color: #e4e4e7;
        }

        .modalCard h3 {
          margin: 0;
          color: #fafafa;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .modalCard p {
          margin: 12px 0 20px;
          color: #a1a1aa;
          line-height: 1.55;
        }

        @keyframes shimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }

        @media (max-width: 900px) {
          .calHero {
            flex-direction: column;
            align-items: stretch;
          }

          .calHeroMain {
            max-width: 100%;
            padding-right: 0;
          }

          .progressPanel {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
            align-self: stretch;
          }

          .weekdayGrid,
          .calendarGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .weekdayGrid {
            display: none;
          }

          .weekdayStripMobile {
            display: flex;
            justify-content: space-between;
            gap: 6px;
            margin-bottom: 14px;
            padding: 0 2px;
          }

          .weekdayStripMobile span {
            flex: 1;
            text-align: center;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.07em;
            text-transform: uppercase;
            color: #a1a1aa;
            padding: 8px 4px;
            border-radius: 10px;
            background: rgba(24, 24, 27, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.06);
          }

          .dayCell {
            min-height: 152px;
          }

          .cellBadgeGroup {
            max-width: min(160px, 52%);
          }

          .drawerOverlay {
            justify-content: center;
          }

          .dayDrawer {
            width: min(100%, 680px);
          }
        }

        @media (max-width: 560px) {
          .calPage {
            padding: 20px 12px 28px;
          }

          .calendarGrid {
            grid-template-columns: 1fr;
          }

          .weekdayStripMobile {
            display: none;
          }

          .cellBadgeGroup {
            max-width: min(200px, 55%);
          }

          .dayDrawer {
            padding: 20px 16px;
          }
        }
      `}</style>
    </div>);
}
