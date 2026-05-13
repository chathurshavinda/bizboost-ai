type TaskDayBase = {
    dayNumber: number;
    dateLabel?: string;
};
export function isPlanFullyCompleted<T extends TaskDayBase>(planDays: T[], completedMap: Record<number, boolean>): boolean {
    if (planDays.length === 0)
        return false;
    return planDays.every((day) => Boolean(completedMap[day.dayNumber]));
}
export function getTodayPlanDay<T extends TaskDayBase>(planDays: T[]): T | null {
    const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return planDays.find((day) => (day.dateLabel ?? "").trim() === todayLabel) ?? null;
}
export function getNextIncompleteDay<T extends TaskDayBase>(planDays: T[], completedMap: Record<number, boolean>): T | null {
    return planDays.find((day) => !completedMap[day.dayNumber]) ?? null;
}

/** Same priority as the home “Today’s task” banner: today’s dated row, else next incomplete day. */
export function getRecommendedDayNumber<T extends TaskDayBase>(planDays: T[], completedMap: Record<number, boolean>): number | null {
    if (planDays.length === 0)
        return null;
    const todayPlanDay = getTodayPlanDay(planDays);
    const fallbackDay = getNextIncompleteDay(planDays, completedMap);
    const taskDay = todayPlanDay ?? fallbackDay;
    const n = taskDay?.dayNumber;
    return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
}
