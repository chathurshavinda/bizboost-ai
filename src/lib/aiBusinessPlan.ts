import { GoogleGenerativeAI } from "@google/generative-ai";
export type AiPlanInput = {
    firebase_uid: string;
    businessName: string;
    businessType: string;
    inferredCategory: string;
    city: string;
    country: string;
    location: string;
    productsOrServices: string[];
    targetCustomers: string;
    businessGoals: string;
    currentChallenges: string;
    ownerOrManagerName: string;
    teamSize: string;
    operatingModel: string;
    priceRange: string;
    preferredChannels: string[];
    socialLinks: string[];
    currentMarketingMethods: string;
    competitors: string;
    monthlyMarketingBudget: string;
    monthlyBusinessBudget: string;
    expectedRevenueRange: string;
    language: string;
    planDuration: 7 | 14 | 30;
    startDate: string;
    weakFields: string[];
};
export type AiDailyTask = {
    dayNumber: number;
    title: string;
    growthAction: string;
    executionSteps: string[];
    marketingAction: string;
    marketingObjective?: string;
    recommendedPlatform?: string;
    postFormat?: string;
    bestPostingTime?: string;
    whatToCreate?: string;
    posterVideoIdea?: string;
    postIdea: string;
    caption: string;
    hashtags: string[];
    hook?: string;
    cta?: string;
    promotionIdea?: string;
    successMetric?: string;
};
export type AiGrowthPillar = {
    title: string;
    why: string;
    how: string[];
    kpis?: string[];
};
export type AiWeeklyMilestone = {
    week: number;
    focus: string;
    goals: string[];
    actions: string[];
};
export type AiMarketingStrategy = {
    overview: string;
    primaryChannels: string[];
    contentMix: string[];
    audienceTips: string[];
    weeklyRhythm: string[];
};
export type AiBusinessPlan = {
    generatedAt: string;
    language: string;
    businessSummary: string;
    mainGrowthGoal: string;
    keyOpportunities: string[];
    keyChallenges: string[];
    growthStrategy: AiGrowthPillar[];
    marketingStrategy: AiMarketingStrategy;
    weeklyActionPlan: AiWeeklyMilestone[];
    dailyTasks: AiDailyTask[];
    contentIdeas: string[];
    captionSuggestions: string[];
    hashtagSuggestions: string[];
    promotionIdeas: string[];
    customerAttractionIdeas: string[];
    customerRetentionIdeas: string[];
    salesImprovementIdeas: string[];
    successMetrics: string[];
    finalRecommendations: string[];
    missingDetails: string[];
};
const GEMINI_MODEL_CANDIDATES = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-pro-latest",
];
function resolveGeminiModels(): string[] {
    const fromEnv = process.env.GEMINI_MODEL?.trim();
    if (fromEnv)
        return [fromEnv, ...GEMINI_MODEL_CANDIDATES.filter((m) => m !== fromEnv)];
    return GEMINI_MODEL_CANDIDATES;
}
function listLine(label: string, value: string | string[]): string {
    if (Array.isArray(value)) {
        const cleaned = value.map((v) => String(v ?? "").trim()).filter(Boolean);
        if (cleaned.length === 0)
            return "";
        return `- ${label}: ${cleaned.join(" | ")}`;
    }
    const text = String(value ?? "").trim();
    return text ? `- ${label}: ${text}` : "";
}
export function buildAiBusinessPlanPrompt(input: AiPlanInput): string {
    const profileLines = [
        listLine("Business Name", input.businessName),
        listLine("Business Type / Industry", input.businessType),
        listLine("Inferred Category", input.inferredCategory),
        listLine("Location", input.location),
        listLine("City", input.city),
        listLine("Country", input.country),
        listLine("Products / Services", input.productsOrServices),
        listLine("Target Customers", input.targetCustomers),
        listLine("Business Goals", input.businessGoals),
        listLine("Current Challenges", input.currentChallenges),
        listLine("Owner / Manager", input.ownerOrManagerName),
        listLine("Team Size", input.teamSize),
        listLine("Operating Model", input.operatingModel),
        listLine("Price Range", input.priceRange),
        listLine("Preferred Marketing Channels", input.preferredChannels),
        listLine("Social Links", input.socialLinks),
        listLine("Current Marketing Methods", input.currentMarketingMethods),
        listLine("Known Competitors", input.competitors),
        listLine("Monthly Marketing Budget (LKR)", input.monthlyMarketingBudget),
        listLine("Monthly Business Budget (LKR)", input.monthlyBusinessBudget),
        listLine("Expected Revenue Range", input.expectedRevenueRange),
        listLine("Plan Duration (days)", String(input.planDuration)),
        listLine("Plan Start Date", input.startDate),
        listLine("Preferred Language", input.language),
        listLine("Profile fields the user has NOT filled yet", input.weakFields),
    ]
        .filter(Boolean)
        .join("\n");
    const dailyTemplate = `
    {
      "dayNumber": number,                                  // 1..${input.planDuration}
      "title": "short, business-specific action name (no 'Day N' prefix)",
      "growthAction": "one concrete operations / sales / retention / partnership move tied to this business",
      "executionSteps": ["3-5 short, owner-doable steps. No fluff. Reference real ${input.businessName} products where natural."],
      "marketingAction": "one matching marketing activation that supports today's growth move",
      "marketingObjective": "what business result this activation drives today (orders/bookings/leads/footfall)",
      "recommendedPlatform": "specific platform destination, e.g. 'Instagram Reel + Facebook Reel' (never 'Both')",
      "postFormat": "specific format, e.g. Reel / Story / Carousel / Feed Post",
      "bestPostingTime": "specific time in local business timezone, e.g. '7:30 PM'",
      "whatToCreate": "clear creation instruction for owner: what asset to produce today",
      "posterVideoIdea": "specific visual angle that can be executed with phone camera + simple editing",
      "postIdea": "what the post visual + concept actually is (no captions here)",
      "caption": "ready-to-post caption: hook -> value -> specific detail (price/offer/process/proof) -> CTA. Max 3 emojis. Match ${input.language}.",
      "hashtags": ["6-10 hashtags. Mix business-type, city, product, audience, and 1-2 SriLanka tags. No spam/follow-back tags."],
      "hook": "one-line attention hook used in the post",
      "cta": "the call to action (DM / WhatsApp / visit / book / call)",
      "promotionIdea": "optional offer / bundle / event tied to this day's action",
      "successMetric": "measurable result for today (e.g., 'WhatsApp inquiries from offer', '5 new pre-orders'). Realistic targets only."
    }
`;
    return `SYSTEM ROLE
You are BizBoost AI — an expert small business consultant and digital marketing strategist for Sri Lankan SMEs. You write practical, real-world growth and marketing plans that a busy small business owner can actually execute with limited budget and simple tools (Instagram, Facebook, WhatsApp, local flyers, partnerships).

NON-NEGOTIABLE RULES
1. Use the user's actual business profile below. Every recommendation must clearly reference the business name, products/services, location, and target customers wherever it makes sense.
2. Never give generic advice such as "use social media", "improve marketing", "be consistent", or "engage with customers". Replace any such phrase with a specific, owner-doable action with a concrete what / who / when / how.
3. Match the business type. A restaurant/cafe gets menu-led ideas; a clothing store gets outfit/seasonal-led ideas; a salon gets appointment/treatment-led ideas; a grocery shop gets bundle/loyalty-led ideas; a service business gets lead-generation/trust-led ideas. Generic ideas are not allowed.
4. Write in ${input.language}. Keep tone friendly, professional, and beginner-friendly. Short sentences. No jargon.
5. Sri Lankan context: prefer LKR where money is mentioned, mention WhatsApp where it actually fits, and use local festival/seasonal context (Avurudu, Vesak, Poson, Ramadan, Deepavali, Christmas, weekends) when the dates land near them.
6. Do not invent specific revenue / profit / customer numbers. If exact financial inputs are missing, give practical actions and label any numeric example as "example only".
7. If important details are missing (target customers, products, goals, budget, etc.), put them in the "missingDetails" array — do NOT silently make them up.
8. Output STRICT JSON ONLY — no markdown, no code fences, no commentary before or after.

BUSINESS PROFILE
${profileLines}

OUTPUT FORMAT — return ONLY a JSON object with EXACTLY these keys:
{
  "language": "${input.language}",
  "businessSummary": "2-4 sentence summary describing this business, what it offers, where, who it serves, and one differentiator.",
  "mainGrowthGoal": "the single most important growth outcome for the next ${input.planDuration} days, phrased plainly.",
  "keyOpportunities": ["3-6 business-specific opportunities visible from the profile."],
  "keyChallenges": ["3-6 honest, realistic challenges this business likely faces."],
  "growthStrategy": [
    {
      "title": "Strategy pillar (e.g., 'Lock-in repeat orders for ${input.businessName}')",
      "why": "Why this matters for THIS business right now.",
      "how": ["3-6 concrete moves. Mention real products/services where natural."],
      "kpis": ["2-4 measurable signals that show this pillar is working."]
    }
    // 3-5 pillars in total, ordered by impact
  ],
  "marketingStrategy": {
    "overview": "2-3 sentence summary of the marketing direction (positioning, voice, where to be visible).",
    "primaryChannels": ["Ordered list of best channels for THIS business (e.g., Instagram, WhatsApp Business, Facebook, Google Maps, walk-in flyers). Justify briefly in each entry."],
    "contentMix": ["What % / what type of content to post (offers, behind-the-scenes, testimonials, education, etc.) — written as readable bullets, not raw numbers."],
    "audienceTips": ["How to actually reach the target customers in ${input.city || input.location || "the local area"}."],
    "weeklyRhythm": ["A simple weekly posting / promotion rhythm the owner can repeat."]
  },
  "weeklyActionPlan": [
    {
      "week": 1,
      "focus": "main theme for the week (e.g., 'Reactivate past customers')",
      "goals": ["2-4 measurable goals for the week"],
      "actions": ["4-7 concrete actions, mentioning the owner, products, and channels"]
    }
    // Provide ${Math.max(1, Math.ceil(input.planDuration / 7))} weeks total (one per 7 days of the plan).
  ],
  "dailyTasks": [
    // EXACTLY ${input.planDuration} entries, dayNumber 1..${input.planDuration}, ordered by dayNumber.
    // Each entry follows this shape:
${dailyTemplate}
  ],
  "salesImprovementIdeas": ["6-10 practical ways this specific business can sell more this month."],
  "customerAttractionIdeas": ["6-10 practical ways to bring new customers in (no generic 'run ads' lines)."],
  "customerRetentionIdeas": ["6-10 practical ways to bring existing customers back / increase frequency."],
  "contentIdeas": ["10-15 specific content ideas (each one references ${input.businessName} or its products/services)."],
  "captionSuggestions": ["6-10 short, ready-to-use captions in ${input.language}. Vary tone."],
  "hashtagSuggestions": ["10-15 hashtags blending business type, city, products, and Sri Lanka. No spam tags. No follow-back tags."],
  "promotionIdeas": ["5-8 realistic promotion / offer / bundle / event ideas for the ${input.planDuration}-day window."],
  "successMetrics": ["5-8 measurable KPIs the owner should track during this plan. Each metric must be a thing the owner can actually count (WhatsApp inquiries, orders, bookings, walk-ins, repeat orders, reviews, follower growth, etc.). No revenue guesses."],
  "finalRecommendations": ["4-8 short bullet recommendations the owner should keep doing after this plan ends."],
  "missingDetails": ["List the business profile fields that are missing / weak and should be completed for an even better plan. Use plain field names the user understands (e.g., 'Target customers', 'Monthly marketing budget'). Empty array if everything is complete."]
}

QUALITY CHECKS BEFORE YOU RESPOND
- dailyTasks.length MUST equal ${input.planDuration}.
- Every dailyTasks entry must have non-empty title, growthAction, executionSteps (3-5), marketingAction, postIdea, caption, hashtags (6+).
- Every dailyTasks entry must include marketingObjective, recommendedPlatform, postFormat, bestPostingTime, whatToCreate, and posterVideoIdea.
- Never output recommendedPlatform as "Both" or "Instagram/Facebook". Use explicit combined naming such as "Instagram Reel + Facebook Reel".
- No two days share the same title.
- Captions must read like a real human, not a template. They must include a clear CTA line.
- Hashtags must not include #followforfollow, #f4f, #l4l, #like4like, #growthhack or similar spam.
- Mention "${input.businessName}" naturally in summaries / pillars / captions, but never spam it.
- Return JSON only. No prose outside JSON.`;
}
function extractJson(text: string): string {
    const trimmed = text.trim();
    if (!trimmed)
        return "";
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first === -1 || last === -1 || last < first)
        return candidate;
    return candidate.slice(first, last + 1);
}
function toStringArray(value: unknown, max = 25): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
            .filter(Boolean)
            .slice(0, max);
    }
    if (typeof value === "string") {
        return value
            .split(/\r?\n|\u2022|,(?=\s|$)/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, max);
    }
    return [];
}
function safeString(value: unknown, fallback = ""): string {
    if (typeof value === "string")
        return value.trim();
    if (value == null)
        return fallback;
    return String(value).trim() || fallback;
}
function normaliseDailyTask(raw: unknown, dayNumber: number): AiDailyTask {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
        dayNumber,
        title: safeString(r.title, `Day ${dayNumber} action`),
        growthAction: safeString(r.growthAction ?? r.businessGrowthAction ?? r.businessAction),
        executionSteps: toStringArray(r.executionSteps ?? r.steps, 6),
        marketingAction: safeString(r.marketingAction ?? r.marketingActivation),
        marketingObjective: safeString(r.marketingObjective) || undefined,
        recommendedPlatform: safeString(r.recommendedPlatform ?? r.platform) || undefined,
        postFormat: safeString(r.postFormat ?? r.format) || undefined,
        bestPostingTime: safeString(r.bestPostingTime ?? r.bestTime ?? r.postingTime) || undefined,
        whatToCreate: safeString(r.whatToCreate ?? r.whatToPost) || undefined,
        posterVideoIdea: safeString(r.posterVideoIdea ?? r.visualIdea) || undefined,
        postIdea: safeString(r.postIdea),
        caption: safeString(r.caption),
        hashtags: toStringArray(r.hashtags, 15),
        hook: safeString(r.hook) || undefined,
        cta: safeString(r.cta) || undefined,
        promotionIdea: safeString(r.promotionIdea ?? r.offerIdea) || undefined,
        successMetric: safeString(r.successMetric ?? r.metric) || undefined,
    };
}
function normaliseGrowthPillar(raw: unknown): AiGrowthPillar {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
        title: safeString(r.title, "Growth pillar"),
        why: safeString(r.why),
        how: toStringArray(r.how ?? r.steps, 8),
        kpis: toStringArray(r.kpis, 6),
    };
}
function normaliseWeek(raw: unknown, index: number): AiWeeklyMilestone {
    const r = (raw ?? {}) as Record<string, unknown>;
    const weekNumber = Number(r.week ?? r.weekNumber ?? index + 1) || index + 1;
    return {
        week: weekNumber,
        focus: safeString(r.focus ?? r.theme, `Week ${weekNumber}`),
        goals: toStringArray(r.goals, 6),
        actions: toStringArray(r.actions, 10),
    };
}
function normaliseMarketingStrategy(raw: unknown): AiMarketingStrategy {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
        overview: safeString(r.overview),
        primaryChannels: toStringArray(r.primaryChannels ?? r.channels, 8),
        contentMix: toStringArray(r.contentMix, 10),
        audienceTips: toStringArray(r.audienceTips, 8),
        weeklyRhythm: toStringArray(r.weeklyRhythm, 8),
    };
}
export function normaliseAiBusinessPlan(raw: unknown, planDuration: 7 | 14 | 30, language: string): AiBusinessPlan {
    const r = (raw ?? {}) as Record<string, unknown>;
    const dailyRaw = Array.isArray(r.dailyTasks) ? r.dailyTasks : [];
    const daily: AiDailyTask[] = Array.from({ length: planDuration }, (_, index) => {
        const found = dailyRaw.find((item) => Number((item as Record<string, unknown>)?.dayNumber) === index + 1) ??
            dailyRaw[index] ?? null;
        return normaliseDailyTask(found, index + 1);
    });
    const growthRaw = Array.isArray(r.growthStrategy) ? r.growthStrategy : [];
    return {
        generatedAt: new Date().toISOString(),
        language: safeString(r.language, language) || language,
        businessSummary: safeString(r.businessSummary),
        mainGrowthGoal: safeString(r.mainGrowthGoal ?? r.mainGoal),
        keyOpportunities: toStringArray(r.keyOpportunities, 10),
        keyChallenges: toStringArray(r.keyChallenges ?? r.challenges, 10),
        growthStrategy: growthRaw.slice(0, 6).map(normaliseGrowthPillar).filter((p) => p.title || p.how.length > 0),
        marketingStrategy: normaliseMarketingStrategy(r.marketingStrategy),
        weeklyActionPlan: (Array.isArray(r.weeklyActionPlan) ? r.weeklyActionPlan : [])
            .slice(0, Math.max(1, Math.ceil(planDuration / 7)))
            .map((week, i) => normaliseWeek(week, i)),
        dailyTasks: daily,
        contentIdeas: toStringArray(r.contentIdeas, 25),
        captionSuggestions: toStringArray(r.captionSuggestions, 15),
        hashtagSuggestions: toStringArray(r.hashtagSuggestions, 25),
        promotionIdeas: toStringArray(r.promotionIdeas, 15),
        customerAttractionIdeas: toStringArray(r.customerAttractionIdeas, 15),
        customerRetentionIdeas: toStringArray(r.customerRetentionIdeas, 15),
        salesImprovementIdeas: toStringArray(r.salesImprovementIdeas, 15),
        successMetrics: toStringArray(r.successMetrics, 12),
        finalRecommendations: toStringArray(r.finalRecommendations, 12),
        missingDetails: toStringArray(r.missingDetails, 12),
    };
}
export async function generateAiBusinessPlan(input: AiPlanInput): Promise<AiBusinessPlan | null> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        console.warn("[aiBusinessPlan] GEMINI_API_KEY missing — structured AI plan skipped");
        return null;
    }
    const prompt = buildAiBusinessPlanPrompt(input);
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelCandidates = resolveGeminiModels();
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const isOverloaded = (m: string) => /503|overload|service unavailable|high demand|rate limit|429|quota|temporarily/i.test(m);
    const isMissingModel = (m: string) => /not found|not supported|unsupported model|404/i.test(m);
    for (const modelName of modelCandidates) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.65,
                        topP: 0.9,
                        responseMimeType: "application/json",
                    },
                });
                const result = await model.generateContent(prompt);
                const raw = typeof result.response.text === "function" ? result.response.text() : "";
                const text = typeof raw === "string" ? raw.trim() : "";
                if (!text)
                    continue;
                const json = extractJson(text);
                try {
                    const parsed = JSON.parse(json) as unknown;
                    return normaliseAiBusinessPlan(parsed, input.planDuration, input.language);
                }
                catch (parseError) {
                    console.warn(`[aiBusinessPlan] JSON parse failed for ${modelName} attempt ${attempt + 1}:`, parseError instanceof Error ? parseError.message : parseError);
                    if (attempt < 2) {
                        await sleep([500, 1100][attempt] ?? 1100);
                        continue;
                    }
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`[aiBusinessPlan] Gemini error on ${modelName} (attempt ${attempt + 1}):`, message);
                if (isOverloaded(message) && attempt < 2) {
                    await sleep([700, 1500][attempt] ?? 1500);
                    continue;
                }
                if (isOverloaded(message) || isMissingModel(message))
                    break;
                return null;
            }
        }
    }
    return null;
}
export function renderAiBusinessPlanMarkdown(plan: AiBusinessPlan, businessName: string): string {
    const lines: string[] = [];
    const heading = (level: 2 | 3, text: string) => lines.push(`${level === 2 ? "##" : "###"} ${text}`);
    const para = (text: string) => {
        if (text && text.trim())
            lines.push(text.trim());
    };
    const bullets = (items: string[]) => {
        for (const item of items) {
            if (item && item.trim())
                lines.push(`- ${item.trim()}`);
        }
    };
    heading(2, `${businessName || "Your Business"} — Growth & Marketing Plan`);
    if (plan.businessSummary) {
        para(plan.businessSummary);
        lines.push("");
    }
    if (plan.mainGrowthGoal) {
        heading(3, "Main Growth Goal");
        para(plan.mainGrowthGoal);
        lines.push("");
    }
    if (plan.keyOpportunities.length || plan.keyChallenges.length) {
        heading(3, "Key Opportunities & Challenges");
        if (plan.keyOpportunities.length) {
            para("**Opportunities**");
            bullets(plan.keyOpportunities);
        }
        if (plan.keyChallenges.length) {
            para("**Challenges**");
            bullets(plan.keyChallenges);
        }
        lines.push("");
    }
    if (plan.growthStrategy.length) {
        heading(3, "Business Growth Strategy");
        for (const pillar of plan.growthStrategy) {
            para(`**${pillar.title}**`);
            if (pillar.why)
                para(pillar.why);
            if (pillar.how.length)
                bullets(pillar.how);
            if (pillar.kpis && pillar.kpis.length) {
                para("_KPIs:_ " + pillar.kpis.join(" · "));
            }
            lines.push("");
        }
    }
    if (plan.marketingStrategy.overview || plan.marketingStrategy.primaryChannels.length) {
        heading(3, "Marketing Strategy");
        if (plan.marketingStrategy.overview)
            para(plan.marketingStrategy.overview);
        if (plan.marketingStrategy.primaryChannels.length) {
            para("**Primary Channels**");
            bullets(plan.marketingStrategy.primaryChannels);
        }
        if (plan.marketingStrategy.contentMix.length) {
            para("**Content Mix**");
            bullets(plan.marketingStrategy.contentMix);
        }
        if (plan.marketingStrategy.audienceTips.length) {
            para("**Reaching Your Audience**");
            bullets(plan.marketingStrategy.audienceTips);
        }
        if (plan.marketingStrategy.weeklyRhythm.length) {
            para("**Weekly Rhythm**");
            bullets(plan.marketingStrategy.weeklyRhythm);
        }
        lines.push("");
    }
    if (plan.weeklyActionPlan.length) {
        heading(3, "Weekly Action Plan");
        for (const week of plan.weeklyActionPlan) {
            para(`**Week ${week.week} — ${week.focus}**`);
            if (week.goals.length) {
                para("Goals");
                bullets(week.goals);
            }
            if (week.actions.length) {
                para("Actions");
                bullets(week.actions);
            }
            lines.push("");
        }
    }
    if (plan.salesImprovementIdeas.length) {
        heading(3, "Sales Improvement Ideas");
        bullets(plan.salesImprovementIdeas);
        lines.push("");
    }
    if (plan.customerAttractionIdeas.length) {
        heading(3, "Customer Attraction Ideas");
        bullets(plan.customerAttractionIdeas);
        lines.push("");
    }
    if (plan.customerRetentionIdeas.length) {
        heading(3, "Customer Retention Ideas");
        bullets(plan.customerRetentionIdeas);
        lines.push("");
    }
    if (plan.contentIdeas.length) {
        heading(3, "Content Ideas");
        bullets(plan.contentIdeas);
        lines.push("");
    }
    if (plan.captionSuggestions.length) {
        heading(3, "Caption Suggestions");
        bullets(plan.captionSuggestions);
        lines.push("");
    }
    if (plan.hashtagSuggestions.length) {
        heading(3, "Hashtag Suggestions");
        para(plan.hashtagSuggestions.map((h) => (h.startsWith("#") ? h : `#${h.replace(/^#+/, "")}`)).join(" "));
        lines.push("");
    }
    if (plan.promotionIdeas.length) {
        heading(3, "Promotion Ideas");
        bullets(plan.promotionIdeas);
        lines.push("");
    }
    if (plan.successMetrics.length) {
        heading(3, "Success Metrics");
        bullets(plan.successMetrics);
        lines.push("");
    }
    if (plan.finalRecommendations.length) {
        heading(3, "Final Recommendations");
        bullets(plan.finalRecommendations);
        lines.push("");
    }
    if (plan.missingDetails.length) {
        heading(3, "Profile Details to Complete");
        para("These details would make your next plan even stronger:");
        bullets(plan.missingDetails);
        lines.push("");
    }
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
type DayLike = Record<string, unknown> & {
    dayNumber: number;
    mainActionTitle?: string;
    mainTitle?: string;
    businessGrowthAction?: string;
    executionSteps?: string[];
    postIdea?: string;
    caption?: string;
    hashtags?: string[];
    successMetric?: string;
    marketingActivation?: Record<string, unknown>;
};
export function enrichPlanDaysWithAi<T extends DayLike>(planDays: T[], ai: AiBusinessPlan | null): T[] {
    if (!ai || !Array.isArray(ai.dailyTasks) || ai.dailyTasks.length === 0)
        return planDays;
    return planDays.map((day) => {
        const aiDay = ai.dailyTasks.find((d) => d.dayNumber === day.dayNumber);
        if (!aiDay)
            return day;
        const next = { ...day } as T;
        if (aiDay.title && aiDay.title.length > 4) {
            next.mainActionTitle = aiDay.title;
            next.mainTitle = aiDay.title;
        }
        if (aiDay.growthAction && aiDay.growthAction.length > 8) {
            next.businessGrowthAction = aiDay.growthAction;
        }
        if (Array.isArray(aiDay.executionSteps) && aiDay.executionSteps.length >= 3) {
            next.executionSteps = aiDay.executionSteps.slice(0, 6);
        }
        if (aiDay.postIdea && aiDay.postIdea.length > 8) {
            next.postIdea = aiDay.postIdea;
        }
        if (aiDay.caption && aiDay.caption.length > 20) {
            next.caption = aiDay.caption;
        }
        if (Array.isArray(aiDay.hashtags) && aiDay.hashtags.length >= 4) {
            next.hashtags = aiDay.hashtags.map((h) => (h.startsWith("#") ? h : `#${h.replace(/^#+/, "")}`));
        }
        if (aiDay.successMetric && aiDay.successMetric.length > 4) {
            next.successMetric = aiDay.successMetric;
        }
        const existingActivation = (day.marketingActivation ?? {}) as Record<string, unknown>;
        const nextActivation: Record<string, unknown> = { ...existingActivation };
        if (aiDay.postIdea)
            nextActivation.postIdea = aiDay.postIdea;
        if (aiDay.caption)
            nextActivation.caption = aiDay.caption;
        if (Array.isArray(aiDay.hashtags) && aiDay.hashtags.length >= 4) {
            nextActivation.hashtags = aiDay.hashtags;
        }
        if (aiDay.hook)
            nextActivation.hook = aiDay.hook;
        if (aiDay.cta)
            nextActivation.cta = aiDay.cta;
        if (aiDay.marketingAction) {
            nextActivation.postBrief = aiDay.marketingAction;
            nextActivation.whatToPost = aiDay.marketingAction;
            nextActivation.contentBrief = aiDay.marketingAction;
        }
        if (aiDay.marketingObjective) {
            nextActivation.matchNote = aiDay.marketingObjective;
        }
        if (aiDay.recommendedPlatform) {
            nextActivation.platform = aiDay.recommendedPlatform;
        }
        if (aiDay.postFormat) {
            const lc = aiDay.postFormat.toLowerCase();
            nextActivation.format = lc.includes("reel")
                ? "Reel"
                : lc.includes("story")
                    ? "Story"
                    : lc.includes("carousel")
                        ? "Carousel"
                        : "Feed";
        }
        if (aiDay.bestPostingTime) {
            nextActivation.bestTime = aiDay.bestPostingTime;
            nextActivation.postingTime = aiDay.bestPostingTime;
        }
        if (aiDay.whatToCreate) {
            nextActivation.whatToPost = aiDay.whatToCreate;
            nextActivation.contentBrief = aiDay.whatToCreate;
        }
        if (aiDay.posterVideoIdea) {
            nextActivation.visualGuide = [
                aiDay.posterVideoIdea,
                ...toStringArray(nextActivation.visualGuide ?? [], 3),
            ]
                .map((x) => x.trim())
                .filter(Boolean)
                .slice(0, 3);
        }
        if (aiDay.promotionIdea) {
            nextActivation.promotionIdea = aiDay.promotionIdea;
        }
        next.marketingActivation = nextActivation;
        return next;
    });
}
export function detectWeakProfileFields(profile: Record<string, unknown>): string[] {
    const weak: string[] = [];
    const check = (label: string, value: unknown) => {
        if (Array.isArray(value)) {
            if (value.filter(Boolean).length === 0)
                weak.push(label);
        }
        else if (typeof value === "string") {
            if (!value.trim())
                weak.push(label);
        }
        else if (value == null) {
            weak.push(label);
        }
    };
    check("Target customers", profile.targetCustomers);
    check("Business goals", profile.businessGoals);
    check("Products or services", profile.productsOrServices);
    check("Team size", profile.teamSize);
    check("Owner / manager name", profile.ownerOrManagerName);
    check("Monthly marketing budget", profile.monthlyMarketingBudget);
    check("Monthly business budget", profile.monthlyBusinessBudget);
    check("Expected revenue range", profile.expectedRevenueRange);
    check("Social links", profile.socialLinks);
    check("Preferred marketing channels", profile.preferredChannels ?? profile.preferredPlatforms);
    check("Current marketing methods", profile.currentMarketingMethods);
    check("Known competitors", profile.competitors);
    check("Current challenges", profile.currentChallenges);
    return weak;
}
