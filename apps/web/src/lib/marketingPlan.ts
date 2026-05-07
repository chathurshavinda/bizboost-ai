export type MarketingPlanStatus = "active" | "completed" | "archived";
export type MarketingPlanDay = {
    dayNumber: number;
    dateISO: string;
    dateLabel: string;
    dayTheme?: string;
    mainActionTitle: string;
    businessGrowthAction: string;
    marketingActivation?: {
        platform?: "Instagram" | "Facebook" | "Both";
        format?: "Reel" | "Story" | "Feed" | "Carousel";
        bestTime?: string;
        goal?: "DMs" | "Orders" | "Bookings" | "Footfall" | "Leads";
        postBrief?: string;
        hook?: string;
        visualGuide?: string[];
        posterHeadlineHint?: string;
        channel?: "instagram" | "facebook" | "both";
        formatPlan?: Array<"Reel" | "Story" | "FeedPost" | "Carousel">;
        contentBrief?: string;
        postIdea: string;
        caption: string;
        hashtags: string[];
        postingTime?: string;
        cta?: string;
        matchNote?: string;
        storyFrames?: string[];
        reelScript?: {
            hook: string;
            beats: string[];
            cta: string;
        };
        posterHint?: string;
        offerDeadlineHint?: string;
    };
    executionSteps: string[];
    postIdea: string;
    caption: string;
    hashtags: string[];
    successMetric: string;
    posterHint?: string;
    completed: boolean;
    completedAt?: string;
    posterId?: string;
};
export type MarketingPlanProgress = {
    completedCount: number;
    percent: number;
};
export type MarketingPlanDocument = {
    _id?: unknown;
    firebase_uid: string;
    status: MarketingPlanStatus;
    durationDays: 7 | 14 | 30;
    startDate: string;
    endDate: string;
    createdAt: string;
    updatedAt: string;
    planDays: MarketingPlanDay[];
    progress: MarketingPlanProgress;
    narrativePlan?: string;
    businessSnapshot?: Record<string, unknown>;
};
function toISODateString(date: Date): string {
    return date.toISOString().slice(0, 10);
}
function toDateLabel(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
export function startOfLocalDay(date = new Date()): Date {
    const local = new Date(date);
    local.setHours(0, 0, 0, 0);
    return local;
}
export function buildDateRange(durationDays: 7 | 14 | 30, fromDate = new Date()) {
    const start = startOfLocalDay(fromDate);
    const end = new Date(start);
    end.setDate(end.getDate() + durationDays - 1);
    return {
        startDate: toISODateString(start),
        endDate: toISODateString(end),
    };
}
export function buildLifecyclePlanDays(rawPlanDays: Array<Partial<MarketingPlanDay> & Record<string, unknown>>, durationDays: 7 | 14 | 30, startDateISO: string): MarketingPlanDay[] {
    const start = new Date(`${startDateISO}T00:00:00`);
    return Array.from({ length: durationDays }, (_, index) => {
        const dayNumber = index + 1;
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const raw = rawPlanDays[index] ?? {};
        const dayTheme = typeof (raw as {
            dayTheme?: unknown;
        }).dayTheme === "string" && String((raw as {
            dayTheme: string;
        }).dayTheme).trim()
            ? String((raw as {
                dayTheme: string;
            }).dayTheme).trim()
            : "";
        return {
            dayNumber,
            dateISO: toISODateString(date),
            dateLabel: typeof raw.dateLabel === "string" && raw.dateLabel.trim() ? raw.dateLabel : toDateLabel(date),
            ...(dayTheme ? { dayTheme } : {}),
            mainActionTitle: typeof raw.mainActionTitle === "string" ? raw.mainActionTitle : `Day ${dayNumber} Growth Action`,
            businessGrowthAction: typeof raw.businessGrowthAction === "string" ? raw.businessGrowthAction : "",
            marketingActivation: typeof raw.marketingActivation === "object" && raw.marketingActivation
                ? {
                    channel: ["instagram", "facebook", "both"].includes(String((raw.marketingActivation as Record<string, unknown>).channel ?? "").toLowerCase())
                        ? (String((raw.marketingActivation as Record<string, unknown>).channel ?? "").toLowerCase() as "instagram" | "facebook" | "both")
                        : "both",
                    formatPlan: Array.isArray((raw.marketingActivation as Record<string, unknown>).formatPlan)
                        ? (((raw.marketingActivation as Record<string, unknown>).formatPlan as unknown[])
                            .map((s) => String(s))
                            .filter((s) => ["Reel", "Story", "FeedPost", "Carousel"].includes(s)) as Array<"Reel" | "Story" | "FeedPost" | "Carousel">)
                        : [],
                    platform: ["Instagram", "Facebook", "Both"].includes(String((raw.marketingActivation as Record<string, unknown>).platform ?? ""))
                        ? (String((raw.marketingActivation as Record<string, unknown>).platform ?? "") as "Instagram" | "Facebook" | "Both")
                        : "Both",
                    format: ["Reel", "Story", "Feed", "Carousel"].includes(String((raw.marketingActivation as Record<string, unknown>).format ?? ""))
                        ? (String((raw.marketingActivation as Record<string, unknown>).format ?? "") as "Reel" | "Story" | "Feed" | "Carousel")
                        : "Feed",
                    bestTime: String((raw.marketingActivation as Record<string, unknown>).bestTime ?? ""),
                    goal: ["DMs", "Orders", "Bookings", "Footfall", "Leads"].includes(String((raw.marketingActivation as Record<string, unknown>).goal ?? ""))
                        ? (String((raw.marketingActivation as Record<string, unknown>).goal ?? "") as "DMs" | "Orders" | "Bookings" | "Footfall" | "Leads")
                        : "Leads",
                    postBrief: String((raw.marketingActivation as Record<string, unknown>).postBrief ?? ""),
                    hook: String((raw.marketingActivation as Record<string, unknown>).hook ?? ""),
                    contentBrief: String((raw.marketingActivation as Record<string, unknown>).contentBrief ?? ""),
                    visualGuide: Array.isArray((raw.marketingActivation as Record<string, unknown>).visualGuide)
                        ? ((raw.marketingActivation as Record<string, unknown>).visualGuide as unknown[])
                            .map((s) => String(s))
                            .slice(0, 2)
                        : [],
                    posterHeadlineHint: String((raw.marketingActivation as Record<string, unknown>).posterHeadlineHint ?? ""),
                    postIdea: String((raw.marketingActivation as Record<string, unknown>).postIdea ?? ""),
                    caption: String((raw.marketingActivation as Record<string, unknown>).caption ?? ""),
                    hashtags: Array.isArray((raw.marketingActivation as Record<string, unknown>).hashtags)
                        ? ((raw.marketingActivation as Record<string, unknown>).hashtags as unknown[]).map((s) => String(s))
                        : [],
                    postingTime: String((raw.marketingActivation as Record<string, unknown>).postingTime ?? ""),
                    cta: String((raw.marketingActivation as Record<string, unknown>).cta ?? ""),
                    matchNote: String((raw.marketingActivation as Record<string, unknown>).matchNote ?? ""),
                    storyFrames: Array.isArray((raw.marketingActivation as Record<string, unknown>).storyFrames)
                        ? ((raw.marketingActivation as Record<string, unknown>).storyFrames as unknown[]).map((s) => String(s))
                        : [],
                    reelScript: typeof (raw.marketingActivation as Record<string, unknown>).reelScript === "object" &&
                        (raw.marketingActivation as Record<string, unknown>).reelScript
                        ? {
                            hook: String(((raw.marketingActivation as Record<string, unknown>).reelScript as Record<string, unknown>)
                                .hook ?? ""),
                            beats: Array.isArray(((raw.marketingActivation as Record<string, unknown>).reelScript as Record<string, unknown>)
                                .beats)
                                ? ((((raw.marketingActivation as Record<string, unknown>).reelScript as Record<string, unknown>)
                                    .beats as unknown[])
                                    .map((s) => String(s))
                                    .slice(0, 3))
                                : [],
                            cta: String(((raw.marketingActivation as Record<string, unknown>).reelScript as Record<string, unknown>)
                                .cta ?? ""),
                        }
                        : undefined,
                    posterHint: String((raw.marketingActivation as Record<string, unknown>).posterHint ?? ""),
                    ...(String((raw.marketingActivation as Record<string, unknown>).offerDeadlineHint ?? "").trim()
                        ? {
                            offerDeadlineHint: String((raw.marketingActivation as Record<string, unknown>).offerDeadlineHint ?? "").trim(),
                        }
                        : {}),
                }
                : undefined,
            executionSteps: Array.isArray(raw.executionSteps) ? raw.executionSteps.map((s) => String(s)) : [],
            postIdea: typeof raw.postIdea === "string" ? raw.postIdea : "",
            caption: typeof raw.caption === "string" ? raw.caption : "",
            hashtags: Array.isArray(raw.hashtags) ? raw.hashtags.map((s) => String(s)) : [],
            successMetric: typeof raw.successMetric === "string" ? raw.successMetric : "",
            posterHint: typeof raw.posterHint === "string" ? raw.posterHint : "",
            completed: Boolean(raw.completed),
            completedAt: typeof raw.completedAt === "string" ? raw.completedAt : undefined,
            posterId: typeof raw.posterId === "string" ? raw.posterId : undefined,
        };
    });
}
export function computeProgress(planDays: MarketingPlanDay[]): MarketingPlanProgress {
    const completedCount = planDays.filter((day) => day.completed).length;
    const percent = planDays.length > 0 ? Math.round((completedCount / planDays.length) * 100) : 0;
    return { completedCount, percent };
}
export function normalizePlanDocument(doc: Record<string, unknown> | null): MarketingPlanDocument | null {
    if (!doc)
        return null;
    const durationValue = Number(doc.durationDays ?? doc.planDays ?? 0);
    const durationDays: 7 | 14 | 30 = durationValue === 14 ? 14 : durationValue === 30 ? 30 : 7;
    const generatedAtRaw = doc.generatedAt;
    const createdAtRaw = doc.createdAt ?? generatedAtRaw ?? new Date().toISOString();
    const updatedAtRaw = doc.updatedAt ?? createdAtRaw;
    const startDate = typeof doc.startDate === "string" && doc.startDate
        ? doc.startDate
        : toISODateString(new Date(typeof createdAtRaw === "string" ? createdAtRaw : new Date()));
    const endDate = typeof doc.endDate === "string" && doc.endDate
        ? doc.endDate
        : (() => {
            const d = new Date(`${startDate}T00:00:00`);
            d.setDate(d.getDate() + durationDays - 1);
            return toISODateString(d);
        })();
    const rawDays = Array.isArray(doc.planDays)
        ? (doc.planDays as Array<Partial<MarketingPlanDay> & Record<string, unknown>>)
        : Array.isArray(doc.planData)
            ? (doc.planData as Array<Partial<MarketingPlanDay> & Record<string, unknown>>)
            : [];
    const completedDays = Array.isArray(doc.completedDays) ? doc.completedDays.map((d) => Number(d)) : [];
    const planDays = buildLifecyclePlanDays(rawDays.map((day, index) => {
        const dayNumber = Number(day.dayNumber ?? index + 1);
        return {
            ...day,
            dayNumber,
            completed: Boolean(day.completed) || completedDays.includes(dayNumber),
        };
    }), durationDays, startDate);
    const progress = computeProgress(planDays);
    return {
        _id: doc._id,
        firebase_uid: String(doc.firebase_uid ?? ""),
        status: (doc.status as MarketingPlanStatus) || (progress.completedCount === durationDays ? "completed" : "active"),
        durationDays,
        startDate,
        endDate,
        createdAt: new Date(createdAtRaw as string | number | Date).toISOString(),
        updatedAt: new Date(updatedAtRaw as string | number | Date).toISOString(),
        planDays,
        progress,
        narrativePlan: typeof doc.narrativePlan === "string" ? doc.narrativePlan : "",
        businessSnapshot: typeof doc.businessSnapshot === "object" && doc.businessSnapshot ? (doc.businessSnapshot as Record<string, unknown>) : undefined,
    };
}
