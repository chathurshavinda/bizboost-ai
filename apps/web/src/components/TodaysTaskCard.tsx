"use client";

import { useEffect, useState } from "react";

type TaskDay = {
  dayNumber: number;
  dateLabel?: string;
  dateISO?: string;
  mainActionTitle?: string;
  completed?: boolean;
};

type TodaysTaskCardProps = {
  loading?: boolean;
  planDays?: number;
  days: TaskDay[];
  completedMap: Record<number, boolean>;
  firebaseUid?: string;
  onOpenDay: (dayNumber: number) => void;
  onOpenPlan: () => void;
  className?: string;
};

function cleanTitle(title: string): string {
  return title.replace(/^Week\s*\d+\s*/i, "").replace(/^Day\s*\d+\s*/i, "").trim();
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TodaysTaskCard({
  loading = false,
  planDays,
  days,
  completedMap,
  firebaseUid,
  onOpenDay,
  onOpenPlan,
  className,
}: TodaysTaskCardProps) {
  const [taskState, setTaskState] = useState<string>("");
  const [taskDay, setTaskDay] = useState<TaskDay | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);

  useEffect(() => {
    if (!firebaseUid) {
      setTaskState("");
      setTaskDay(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingTask(true);
      try {
        const response = await fetch(`/api/marketing-plan/today-task?firebase_uid=${encodeURIComponent(firebaseUid)}`, {
          cache: "no-store",
        });
        const json = await response.json();
        if (cancelled) return;
        if (!response.ok || !json?.ok) {
          setTaskState("");
          setTaskDay(null);
          return;
        }
        setTaskState(String(json.state ?? ""));
        setTaskDay((json.todayTask as TaskDay | null) ?? null);
      } catch {
        if (cancelled) return;
        setTaskState("");
        setTaskDay(null);
      } finally {
        if (!cancelled) setLoadingTask(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [firebaseUid, completedMap]);

  const sortedDays = [...days].sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));
  const isCompleted = (day: TaskDay) => Boolean(completedMap[day.dayNumber] || day.completed === true);

  const completedCount = sortedDays.filter((day) => isCompleted(day)).length;
  const totalDays = planDays && planDays > 0 ? planDays : sortedDays.length;
  const progressPercent = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

  const nextIncomplete = sortedDays.find((day) => !isCompleted(day)) ?? null;
  const selectedDay = taskDay ?? nextIncomplete;
  const selectedIsCompleted = selectedDay ? isCompleted(selectedDay) : false;
  const allCompleted = sortedDays.length > 0 && completedCount >= sortedDays.length;
  const effectiveLoading = loading || loadingTask;

  return (
    <section className={`todaysTaskCard ${className ?? ""}`}>
      <div className="headRow">
        <h3>Today&apos;s Task</h3>
        <span className="progressText">
          {completedCount}/{totalDays || 0} · {progressPercent}%
        </span>
      </div>

      {effectiveLoading ? (
        <div className="body loadingState">Loading today&apos;s task…</div>
      ) : sortedDays.length === 0 ? (
        <div className="body emptyState">
          <p>Generate your plan first</p>
          <button type="button" className="taskBtn primary" onClick={onOpenPlan}>
            Go to Plan Builder
          </button>
        </div>
      ) : taskState === "done_today" && selectedDay ? (
        <div className="body completeState">
          <div className="metaRow">
            <span className="dayBadge">
              {(selectedDay.dateLabel || "Today").trim()} · Day {selectedDay.dayNumber}
            </span>
            <span className="statusPill done">Completed ✅</span>
          </div>
          <p className="headline">
            {cleanTitle(selectedDay.mainActionTitle || "") || selectedDay.mainActionTitle || `Day ${selectedDay.dayNumber}`}
          </p>
          <p className="sub">Today&apos;s task completed ✅</p>
          <div className="actions">
            <button type="button" className="taskBtn primary" onClick={() => onOpenDay(selectedDay.dayNumber)}>
              Open Day Detail
            </button>
            {nextIncomplete && nextIncomplete.dayNumber !== selectedDay.dayNumber ? (
              <button type="button" className="taskBtn secondary" onClick={() => onOpenDay(nextIncomplete.dayNumber)}>
                Next Task
              </button>
            ) : null}
          </div>
        </div>
      ) : allCompleted ? (
        <div className="body completeState">
          <p className="headline">Plan completed ✅</p>
          <p className="sub">Great work. You completed all scheduled tasks.</p>
          <button type="button" className="taskBtn primary" onClick={onOpenPlan}>
            View Plan
          </button>
        </div>
      ) : selectedDay ? (
        <div className="body">
          <div className="metaRow">
            <span className="dayBadge">
              {(selectedDay.dateLabel || getTodayLabel()).trim()} · Day {selectedDay.dayNumber}
            </span>
            <span className={`statusPill ${selectedIsCompleted ? "done" : "pending"}`}>
              {selectedIsCompleted ? "✅ Completed" : "⏳ Pending"}
            </span>
          </div>
          <p className="headline" title={selectedDay.mainActionTitle || ""}>
            {cleanTitle(selectedDay.mainActionTitle || "") || selectedDay.mainActionTitle || `Day ${selectedDay.dayNumber}`}
          </p>
          <div className="actions">
            {taskState === "todo" ? (
              <button type="button" className="taskBtn primary" onClick={() => onOpenDay(selectedDay.dayNumber)}>
                Open Day Detail
              </button>
            ) : !selectedIsCompleted && nextIncomplete ? (
              <button type="button" className="taskBtn primary" onClick={() => onOpenDay(nextIncomplete.dayNumber)}>
                Next Task
              </button>
            ) : (
              <button type="button" className="taskBtn primary" onClick={onOpenPlan}>
                View Plan
              </button>
            )}
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .todaysTaskCard {
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(12px);
          padding: 14px 16px;
        }

        .headRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        h3 {
          margin: 0;
          color: #0f172a;
          font-size: 17px;
          line-height: 1.2;
        }

        .progressText {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .body {
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(255, 255, 255, 0.75);
          padding: 12px;
          display: grid;
          gap: 10px;
        }

        .loadingState,
        .emptyState {
          color: #64748b;
          font-size: 14px;
        }

        .emptyState p {
          margin: 0;
        }

        .metaRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .dayBadge {
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(255, 255, 255, 0.85);
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 9px;
        }

        .statusPill {
          border-radius: 999px;
          border: 1px solid transparent;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 800;
        }

        .statusPill.done {
          border-color: rgba(16, 185, 129, 0.35);
          background: rgba(16, 185, 129, 0.14);
          color: #047857;
        }

        .statusPill.pending {
          border-color: rgba(148, 163, 184, 0.35);
          background: rgba(148, 163, 184, 0.14);
          color: #475569;
        }

        .headline {
          margin: 0;
          color: #0f172a;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .sub {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .actions {
          display: flex;
          justify-content: flex-start;
        }

        .taskBtn {
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .taskBtn.primary {
          background: linear-gradient(145deg, #10b981, #059669);
          border-color: rgba(16, 185, 129, 0.3);
          color: #ffffff;
          box-shadow: 0 10px 20px rgba(16, 185, 129, 0.22);
        }

        .taskBtn.secondary {
          background: #ffffff;
          border-color: rgba(148, 163, 184, 0.4);
          color: #334155;
        }

        .taskBtn:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </section>
  );
}
