"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCheck, FaRegCopy, FaTimes } from "react-icons/fa";
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
          <div>
            <p className="eyebrow">Smart Calendar</p>
            <h1>Biz Calendar</h1>
            <p className="heroText">
              Track your latest {planDays || planData.length || ""}-day growth plan, open day tasks, and see which days already have posters.
            </p>
          </div>
          <div className="progressPanel">
            <span className="progressNumber">{progressPercent}%</span>
            <span className="progressText">{completedCount}/{planData.length || 0} completed</span>
          </div>
        </header>

        <section className="calendarCard">
          <div className="weekdayGrid" aria-hidden>
            {weekdays.map((day) => (<span key={day}>{day}</span>))}
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
                return (<button key={cell.key} type="button" className={`dayCell ${completed ? "completed" : ""} ${todayMatch ? "today" : ""}`} onClick={() => {
                        setCopied(false);
                        setSelectedDayNumber(cell.day?.dayNumber ?? null);
                    }}>
                    {completed ? <span className="completedWatermark">COMPLETED</span> : null}
                    <span className="cellTop">
                      <span className="dateText">{dateLabel(cell.date)}</span>
                      {todayMatch ? <span className="todayBadge">Today</span> : null}
                    </span>
                    <span className="cellTitle" title={title}>{title}</span>
                    <span className="cellBottom">
                      <span className={`statusBadge ${completed ? "done" : "pending"}`}>
                        {completed ? "✅ Completed" : "⏳ Pending"}
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
              <h2 id="day-drawer-title">{selectedDay.mainActionTitle || `Day ${selectedDay.dayNumber}`}</h2>
              <span className={`statusBadge ${completedMap[selectedDay.dayNumber] ? "done" : "pending"}`}>
                {completedMap[selectedDay.dayNumber] ? "✅ Completed" : "⏳ Pending"}
              </span>
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
          padding: 28px 16px 16px;
          background: var(--page-bg);
        }

        .calShell {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          gap: 16px;
        }

        .calHero,
        .calendarCard {
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(18px);
        }

        .calHero {
          border-radius: 30px;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 18px;
        }

        .eyebrow {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 800;
        }

        h1 {
          margin: 8px 0 0;
          color: #0f172a;
          font-size: clamp(34px, 5vw, 56px);
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .heroText {
          margin: 10px 0 0;
          max-width: 680px;
          color: #475569;
          line-height: 1.6;
        }

        .progressPanel {
          min-width: 150px;
          border-radius: 22px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: rgba(15, 23, 42, 0.92);
          color: #fff;
          padding: 16px;
          display: grid;
          gap: 4px;
          text-align: right;
        }

        .progressNumber {
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .progressText {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 700;
        }

        .calendarCard {
          border-radius: 30px;
          padding: 18px;
        }

        .weekdayGrid,
        .calendarGrid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 10px;
        }

        .weekdayGrid {
          margin-bottom: 10px;
        }

        .weekdayGrid span {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(15, 23, 42, 0.92);
          border-radius: 999px;
          padding: 8px 10px;
          text-align: center;
          font-size: 12px;
          font-weight: 800;
        }

        .dayCell {
          position: relative;
          min-height: 150px;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: rgba(255, 255, 255, 0.86);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
          padding: 14px;
          text-align: left;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        }

        .dayCell:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 38px rgba(15, 23, 42, 0.16);
          border-color: rgba(15, 23, 42, 0.24);
        }

        .dayCell.today {
          border-color: rgba(59, 130, 246, 0.55);
          box-shadow: 0 18px 34px rgba(37, 99, 235, 0.18);
        }

        .dayCell.completed {
          border-color: rgba(16, 185, 129, 0.38);
          background: linear-gradient(180deg, rgba(236, 253, 245, 0.94), rgba(255, 255, 255, 0.88));
          box-shadow: 0 16px 32px rgba(16, 185, 129, 0.14);
        }

        .dayCellEmpty {
          cursor: default;
          opacity: 0.35;
          pointer-events: none;
          background: rgba(255, 255, 255, 0.34);
        }

        .skeleton {
          min-height: 130px;
          background: linear-gradient(90deg, rgba(226, 232, 240, 0.75), rgba(248, 250, 252, 0.9), rgba(226, 232, 240, 0.75));
          background-size: 200% 100%;
          animation: shimmer 1.2s ease-in-out infinite;
        }

        .cellTop,
        .cellBottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .dateText {
          color: #0f172a;
          font-size: 13px;
          font-weight: 900;
        }

        .todayBadge {
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.12);
          color: #1d4ed8;
          border: 1px solid rgba(37, 99, 235, 0.22);
          padding: 4px 7px;
          font-size: 10px;
          font-weight: 900;
        }

        .cellTitle {
          color: #111827;
          font-size: 14px;
          line-height: 1.35;
          font-weight: 800;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 38px;
        }

        .statusBadge {
          width: fit-content;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 900;
          border: 1px solid transparent;
        }

        .statusBadge.done {
          background: rgba(16, 185, 129, 0.14);
          border-color: rgba(16, 185, 129, 0.36);
          color: #047857;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.18);
        }

        .statusBadge.pending {
          background: rgba(148, 163, 184, 0.16);
          border-color: rgba(148, 163, 184, 0.28);
          color: #475569;
        }

        .posterMini {
          width: 34px;
          height: 42px;
          overflow: hidden;
          border-radius: 9px;
          border: 1px solid rgba(15, 23, 42, 0.14);
          background: #fff;
          flex-shrink: 0;
        }

        .posterMini img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .completedWatermark {
          position: absolute;
          inset: auto -24px 26px auto;
          transform: rotate(-28deg);
          color: rgba(5, 150, 105, 0.12);
          font-size: 20px;
          font-weight: 1000;
          letter-spacing: 0.12em;
          pointer-events: none;
        }

        .emptyState {
          min-height: 160px;
          display: grid;
          place-items: center;
          color: #64748b;
          font-weight: 700;
        }

        .drawerOverlay,
        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(0, 0, 0, 0.54);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: flex-end;
          padding: 16px;
        }

        .dayDrawer {
          position: relative;
          width: min(100%, 560px);
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.36);
          backdrop-filter: blur(20px);
          padding: 24px;
        }

        .closeBtn {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.85);
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .drawerHeader {
          padding-right: 42px;
          display: grid;
          gap: 8px;
        }

        .drawerHeader h2 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(24px, 4vw, 36px);
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        .posterPreview {
          margin-top: 18px;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #0f172a;
        }

        .posterPreview img {
          width: 100%;
          max-height: 420px;
          object-fit: contain;
          display: block;
        }

        .drawerSection {
          margin-top: 18px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(255, 255, 255, 0.7);
          padding: 14px;
        }

        .drawerSection h3 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: 15px;
        }

        .drawerSection p {
          margin: 0;
          color: #334155;
          line-height: 1.6;
          font-size: 14px;
        }

        .stepList {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }

        .stepList li {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          color: #334155;
          font-size: 14px;
          line-height: 1.5;
        }

        .stepList svg {
          margin-top: 4px;
          color: #059669;
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
          padding: 10px 13px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          border: 1px solid rgba(148, 163, 184, 0.36);
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .copyBtn,
        .modalBtn.secondary {
          background: rgba(255, 255, 255, 0.86);
          color: #334155;
        }

        .modalBtn.primary {
          background: linear-gradient(145deg, #0f172a, #111827);
          color: #fff;
          border-color: rgba(15, 23, 42, 0.22);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.22);
        }

        .modalBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .captionBox {
          width: 100%;
          min-height: 118px;
          resize: vertical;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.34);
          background: rgba(255, 255, 255, 0.82);
          color: #0f172a;
          padding: 12px;
          line-height: 1.5;
          font: inherit;
        }

        .chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .chips span {
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.08);
          color: #334155;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 800;
        }

        .drawerActions {
          justify-content: flex-end;
          margin-top: 18px;
        }

        .modalOverlay {
          align-items: center;
          justify-content: center;
        }

        .modalCard {
          width: min(100%, 440px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(18px);
          padding: 22px;
        }

        .modalCard h3 {
          margin: 0;
          color: #0f172a;
          font-size: 22px;
        }

        .modalCard p {
          margin: 10px 0 18px;
          color: #475569;
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

          .progressPanel {
            text-align: left;
          }

          .weekdayGrid,
          .calendarGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .weekdayGrid {
            display: none;
          }

          .dayCell {
            min-height: 138px;
          }

          .drawerOverlay {
            justify-content: center;
          }

          .dayDrawer {
            width: min(100%, 680px);
          }
        }

        @media (max-width: 560px) {
          .calendarGrid {
            grid-template-columns: 1fr;
          }

          .dayDrawer {
            padding: 20px 16px;
          }
        }
      `}</style>
    </div>);
}
