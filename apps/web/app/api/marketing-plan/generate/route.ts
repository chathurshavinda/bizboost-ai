export const dynamic = "force-dynamic";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireActiveSubscription } from "@/lib/subscriptionAccess";
import { buildDateRange, buildLifecyclePlanDays, computeProgress, startOfLocalDay } from "@/src/lib/marketingPlan";
import { deriveDayThemeForPlan } from "@/src/lib/posterDayTheme";
import { buildMarketingActivationCopyPack } from "@/src/lib/posterActivationCopy";
import {
    detectWeakProfileFields,
    enrichPlanDaysWithAi,
    generateAiBusinessPlan,
    renderAiBusinessPlanMarkdown,
    type AiBusinessPlan,
    type AiPlanInput,
} from "@/src/lib/aiBusinessPlan";
type DayPlan = {
    dayNumber: number;
    dateLabel?: string;
    dayTheme?: string;
    mainTitle?: string;
    mainActionTitle: string;
    businessGrowthAction: string;
    marketingActivation?: {
        platform?: "Instagram" | "Facebook" | "Both";
        format?: "Reel" | "Story" | "Feed" | "Carousel";
        bestTime?: string;
        goal?: "DMs" | "Orders" | "Bookings" | "Footfall" | "Leads";
        postBrief?: string;
        whatToPost?: string;
        hook?: string;
        visualGuide?: string[];
        posterHeadlineHint?: string;
        posterSubheadline?: string;
        posterCtaLabel?: string;
        posterOfferBadge?: string;
        postIdea: string;
        caption: string;
        hashtags: string[];
        cta?: string;
        matchNote?: string;
        channel?: "instagram" | "facebook" | "both";
        formatPlan?: Array<"Reel" | "Story" | "FeedPost" | "Carousel">;
        contentBrief?: string;
        postingTime?: string;
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
    notes?: string;
};
type ThemeKey = "promo_offer" | "highlight" | "review_collection" | "behind_scenes" | "engagement" | "growth_push" | "track_improve";
type BusinessCategoryKey = "FOOD_CAFE" | "RETAIL_ONLINE" | "SERVICES" | "BEAUTY_SALON" | "EDUCATION_TUITION" | "GENERIC";
type CategoryKey = "food" | "retail" | "salon" | "services" | "education" | "generic";
type TemplateContext = {
    businessName: string;
    businessType: string;
    businessCategory: BusinessCategoryKey;
    city: string;
    country: string;
    location: string;
    productLine: string;
    productsOrServices: string[];
    targetCustomers: string;
    businessGoals: string;
    socialLinks: string[];
    budgetText: string;
    teamSize: string;
    operatingModel: string;
    priceRange: string;
    preferredChannels: string[];
};
const PLAN_TEMPLATE_VERSION = "growth-action-cycle-v12-ai-business-plan";
const SPAM_HASHTAG = /like4like|follow4follow|followforfollow|f4f|l4l|followers|growthhack/i;
const baseHashtags = ["#BizBoostAI"];
function resolveBusinessCategory(...parts: string[]): BusinessCategoryKey {
    const value = parts
        .join(" ")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    if (value.includes("cafe") ||
        value.includes("coffee") ||
        value.includes("restaurant") ||
        value.includes("food") ||
        value.includes("bakery") ||
        value.includes("tea shop") ||
        value.includes("juice") ||
        value.includes("kottu") ||
        value.includes("rice and curry"))
        return "FOOD_CAFE";
    if (value.includes("retail") ||
        value.includes("store") ||
        value.includes("shop") ||
        value.includes("ecommerce") ||
        value.includes("e-commerce") ||
        value.includes("online store") ||
        value.includes("cod") ||
        value.includes("fashion") ||
        value.includes("boutique") ||
        value.includes("clothing"))
        return "RETAIL_ONLINE";
    if (value.includes("salon") ||
        value.includes("beauty") ||
        value.includes("spa") ||
        value.includes("nail") ||
        value.includes("makeup") ||
        value.includes("bridal"))
        return "BEAUTY_SALON";
    if (value.includes("tuition") ||
        value.includes("class") ||
        value.includes("education") ||
        value.includes("school") ||
        value.includes("course") ||
        value.includes("academy") ||
        value.includes("teacher") ||
        value.includes("tutor"))
        return "EDUCATION_TUITION";
    if (value.includes("service") ||
        value.includes("agency") ||
        value.includes("freelance") ||
        value.includes("repair") ||
        value.includes("consult") ||
        value.includes("training")) {
        return "SERVICES";
    }
    return "GENERIC";
}
function businessCategoryToCategoryKey(category: BusinessCategoryKey): CategoryKey {
    switch (category) {
        case "FOOD_CAFE":
            return "food";
        case "RETAIL_ONLINE":
            return "retail";
        case "BEAUTY_SALON":
            return "salon";
        case "EDUCATION_TUITION":
            return "education";
        case "SERVICES":
            return "services";
        case "GENERIC":
        default:
            return "generic";
    }
}
function normalizeCategoryFromText(...parts: string[]): CategoryKey {
    return businessCategoryToCategoryKey(resolveBusinessCategory(...parts));
}
function normalizeCategory(businessType: string, productsOrServices: string[] = []): CategoryKey {
    return normalizeCategoryFromText(businessType, productsOrServices.join(" "));
}
function toCleanString(value: unknown, fallback = ""): string {
    const next = typeof value === "string" ? value : String(value ?? "");
    const clean = next.trim();
    return clean || fallback;
}
function toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
    return String(value ?? "")
        .split(/\r?\n|,/g)
        .map((item) => item.trim())
        .filter(Boolean);
}
function normalizePlanDays(raw: unknown): 7 | 14 | 30 | null {
    const value = Number(raw ?? 0);
    if (value === 7 || value === 14 || value === 30)
        return value;
    return null;
}
function missingRequiredProfileFields(profile: Record<string, unknown>, body: Record<string, unknown>): string[] {
    const products = toStringArray(profile.productsOrServices ?? profile.products ?? profile.services ?? profile.items ?? "");
    const businessType = toCleanString(profile.businessType ?? profile.industry);
    const city = toCleanString(profile.city ?? profile.town ?? profile.location);
    const country = toCleanString(profile.country);
    const location = [city, country].filter(Boolean).join(", ");
    const businessName = toCleanString(profile.businessName);
    const goals = toCleanString(profile.businessGoals ?? profile.goals ?? body.goals);
    const targetCustomers = toCleanString(profile.targetCustomers ?? profile.targetAudience);
    const missing: string[] = [];
    if (!businessType)
        missing.push("businessType");
    if (!businessName)
        missing.push("businessName");
    if (products.length === 0)
        missing.push("productsOrServices");
    if (!location)
        missing.push("location");
    if (!goals)
        missing.push("businessGoals");
    if (!targetCustomers)
        missing.push("targetCustomers");
    return missing;
}
function resolveProfileContext(profile: Record<string, unknown>, body: Record<string, unknown>): {
    context: TemplateContext;
    inferredBusinessType: string;
    planStartDate: Date;
    requestedPlanStartDateISO: string;
} {
    const products = toStringArray(profile.productsOrServices ?? profile.products ?? profile.services ?? profile.items ?? "");
    const businessCategory = resolveBusinessCategory(toCleanString(profile.businessType), products.join(" "), toCleanString(profile.industry));
    const inferredCategory = businessCategoryToCategoryKey(businessCategory);
    const inferredBusinessType = toCleanString(profile.businessType, inferredCategory !== "generic" ? inferredCategory : "generic");
    const businessGoals = toCleanString(profile.businessGoals ?? profile.goals ?? body.goals, "Grow sales");
    const targetCustomers = toCleanString(profile.targetCustomers ?? profile.targetAudience, "Local customers");
    const businessName = toCleanString(profile.businessName, "Your Business");
    const city = toCleanString(profile.city);
    const country = toCleanString(profile.country);
    const location = [city, country].filter(Boolean).join(", ");
    const operatingModel = toCleanString(profile.operatingModel ?? profile.businessModel ?? profile.salesModel ?? "both");
    const priceRange = toCleanString(profile.priceRange ?? profile.averageOrderValue ?? profile.pricePoint);
    const preferredChannels = toStringArray(profile.preferredChannels ?? profile.preferredPlatforms ?? profile.marketingChannels);
    const startDateCandidate = toCleanString(body.startDate ?? profile.startDate);
    const parsedStart = startDateCandidate ? new Date(startDateCandidate) : new Date();
    const planStartDate = Number.isNaN(parsedStart.getTime()) ? startOfLocalDay(new Date()) : startOfLocalDay(parsedStart);
    const context: TemplateContext = {
        businessName,
        businessType: inferredBusinessType,
        businessCategory,
        city,
        country,
        location,
        productLine: products[0] ?? inferredBusinessType ?? "your product/service",
        productsOrServices: products.length ? products : [inferredBusinessType || "your offer"],
        targetCustomers,
        businessGoals,
        socialLinks: toStringArray(profile.socialLinks),
        budgetText: toCleanString(profile.monthlyMarketingBudget ?? profile.monthlyBusinessBudget ?? profile.budget),
        teamSize: toCleanString(profile.teamSize),
        operatingModel,
        priceRange,
        preferredChannels,
    };
    return {
        context,
        inferredBusinessType,
        planStartDate,
        requestedPlanStartDateISO: planStartDate.toISOString(),
    };
}
function ensurePlanDataLength(planData: DayPlan[], planDays: number, context: TemplateContext, startDate: Date): DayPlan[] {
    if (Array.isArray(planData) && planData.length === planDays)
        return planData;
    const safe = Array.isArray(planData) ? planData.filter(Boolean) : [];
    if (safe.length === 0)
        return buildPlan(planDays, context, startDate);
    return Array.from({ length: planDays }, (_, index) => {
        const source = safe[index % safe.length];
        const dayNumber = index + 1;
        const dateLabel = formatDateLabel(startDate, index);
        const titleBase = source?.mainActionTitle || `Business growth action for ${context.productLine}`;
        const title = `${titleBase} · Day ${dayNumber}`;
        return {
            ...source,
            dayNumber,
            dateLabel,
            mainActionTitle: title,
            executionSteps: Array.isArray(source?.executionSteps) && source.executionSteps.length >= 3
                ? source.executionSteps.slice(0, 6)
                : [
                    "Define today’s goal clearly (orders, leads, or bookings).",
                    "Run one focused business action with your team.",
                    "Track results and prepare tomorrow’s improvement.",
                ],
            marketingActivation: {
                postIdea: source?.marketingActivation?.postIdea || source?.postIdea || `Promote today’s ${context.productLine} action.`,
                caption: source?.marketingActivation?.caption ||
                    source?.caption ||
                    `${context.businessName}: we’re improving ${context.productLine} today. Message us to learn more.`,
                hashtags: source?.marketingActivation?.hashtags ||
                    source?.hashtags ||
                    [...baseHashtags, ...categoryHashtags[normalizeCategory(context.businessType, context.productsOrServices)]],
                posterHint: source?.marketingActivation?.posterHint || source?.posterHint || `${context.productLine} · ${context.businessName}`,
            },
        };
    });
}
function dateForOffset(startDate: Date, offset: number): Date {
    const d = new Date(startDate);
    d.setDate(d.getDate() + offset);
    return d;
}
function formatDateLabel(startDate: Date, offset: number): string {
    return dateForOffset(startDate, offset).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function isWeekendForDate(startDate: Date, offset: number): boolean {
    const day = dateForOffset(startDate, offset).getDay();
    return day === 0 || day === 6;
}
function weekdayName(startDate: Date, offset: number): string {
    return dateForOffset(startDate, offset).toLocaleDateString("en-US", { weekday: "long" });
}
function getSriLankaFestival(date: Date): string {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    if ((m === 4 && d >= 10 && d <= 16))
        return "Avurudu";
    if (m === 5 && d >= 20 && d <= 28)
        return "Vesak";
    if (m === 6 && d >= 18 && d <= 25)
        return "Poson";
    if (m === 3 && d >= 8 && d <= 31)
        return "Ramadan";
    if (m === 10 && d >= 20 && d <= 31)
        return "Deepavali";
    if (m === 12 && d >= 20 && d <= 31)
        return "Christmas";
    return "";
}
function buildThemeSequence(planDays: number): ThemeKey[] {
    const themeCycle: ThemeKey[] = [
        "promo_offer",
        "highlight",
        "review_collection",
        "behind_scenes",
        "engagement",
        "growth_push",
        "track_improve",
    ];
    return Array.from({ length: planDays }, (_, index) => themeCycle[index % themeCycle.length]);
}
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
type NarrativeInput = {
    businessName: string;
    businessType: string;
    category: string;
    location: string;
    productsOrServices: string;
    targetCustomers: string;
    businessGoal: string;
    budget: string;
    language: string;
    monthlyMarketingBudget: string;
    teamSize: string;
    expectedRevenueRange: string;
    socialLinks: string;
    currentMarketingMethods: string;
    competitors: string;
    preferredPlatforms: string;
    planDuration: 7 | 14 | 30;
    startDate: string;
};
function buildNarrativeMarketingPrompt(d: NarrativeInput): string {
    const line = (label: string, value: string) => (value ? `- ${label}: ${value}` : "");
    const lines = [
        line("Business Name", d.businessName),
        line("Industry / Business Type", d.businessType),
        line("Inferred Category", d.category),
        line("Location", d.location),
        line("Products or Services", d.productsOrServices),
        line("Target Customers", d.targetCustomers),
        line("Business Goals", d.businessGoal),
        line("Budget Level", d.budget),
        line("Monthly Marketing Budget (LKR)", d.monthlyMarketingBudget),
        line("Expected Revenue Range", d.expectedRevenueRange),
        line("Team Size", d.teamSize),
        line("Current Marketing Methods", d.currentMarketingMethods),
        line("Known Competitors", d.competitors),
        line("Preferred Platforms", d.preferredPlatforms),
        line("Social Links", d.socialLinks),
        line("Plan Duration (days)", String(d.planDuration)),
        line("Plan Start Date", d.startDate),
        `- Preferred Language: ${d.language}`,
    ]
        .filter(Boolean)
        .join("\n");
    return `You are BizBoost AI planner for Sri Lankan SMEs.
Write in ${d.language}.

Your primary objective:
Generate a REAL-WORLD, BUSINESS-FIRST daily plan where business action is the main output and marketing activation is support only.

Business details:
${lines}

Hard rules (must follow):
1) Business-first structure:
- Every day must prioritize practical business growth work (operations, sales, retention, pricing, funnel, customer experience, partnerships, systems).
- Marketing activation must support that business action. Never make social posting the main task.

2) Use profile deeply:
- Infer and use category from inputs: Food/Cafe, Retail/Online, Service, Beauty, Education, Other.
- Tailor every day using products/services, location, goals, target customers, and preferred channels (WhatsApp/Instagram/Facebook/Website when available).
- No generic, copy-paste, or business-name hardcoding from other contexts.

3) Realistic and actionable output:
- mainActionTitle: short, human, non-jargon.
- businessAction: concrete practical move.
- executionSteps: 3-6 specific steps.
- marketingActivation: 1 short activation that supports the action.
- caption: ready-to-post only if needed for activation.
- successMetric: measurable KPI.
- notes optional.

3.1) MarketingActivation must be social-only (Instagram/Facebook) and easy at a glance:
- Use exactly ONE primary format per day: Reel OR Story OR Feed OR Carousel.
- Return these fields in order:
  platform, format, bestTime, goal, postBrief, hook, visualGuide, posterHeadlineHint, caption, hashtags, cta, matchNote.
- Do not repeat the same sentence across postBrief/caption/hook.
- Caption must include: Hook -> Value/Reason -> Specific detail -> CTA.
- Make caption format-aware:
  Reel: include "Watch till the end" or "Quick demo" tone.
  Story: include a question sticker prompt.
  Feed: informative and slightly longer.
  Carousel: include Slide 1/2/3 style mini structure.
- Keep language simple. Emojis max 3.

4) Quality constraints:
- Never use repetitive filler like "growth focus".
- Avoid vague tasks like "post something" / "improve engagement" without exact execution steps.
- Each day must progress toward measurable business outcomes.
- Titles should be unique across days.

5) Planning logic:
- Do not force a rigid identical 7-day script.
- Use a balanced mix across plan: sales/offer, retention, lead capture, operations/systems, trust/proof, partnerships, review/measure.
- Adapt weekends to realistic weekend behavior.
- Adapt festival/seasonal context for Sri Lanka when relevant (Avurudu, Vesak, Poson, Ramadan, Christmas, etc.).

6) Date awareness:
- Plan duration: ${d.planDuration}
- Start date: ${d.startDate}
- Compute each day dateLabel from startDate.

Output format requirements:
- Return STRICT JSON only (no markdown, no commentary, no code fences).
- Use this exact structure:
{
  "planDuration": 7|14|30,
  "startDate": "YYYY-MM-DD",
  "category": "...",
  "days": [
    {
      "dayNumber": number,
      "dateLabel": "MMM D",
      "mainActionTitle": string,
      "businessAction": string,
      "executionSteps": string[],
      "marketingActivation": string,
      "postIdea": string,
      "caption": string,
      "hashtags": string[],
      "successMetric": string,
      "notes": string
    }
  ]
}

Additional strict checks:
- days.length must equal planDuration.
- Every day must include non-empty businessAction and executionSteps (3-6).
- No cafe-specific wording unless category is truly food/cafe.
- Must work for ANY SME profile including repair shop, salon, tuition, online store, freelancer, and generic business.`;
}
async function generateNarrativePlan(input: NarrativeInput): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        console.warn("[marketing-plan/generate] GEMINI_API_KEY missing — narrative plan skipped");
        return "";
    }
    const prompt = buildNarrativeMarketingPrompt(input);
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelCandidates = resolveGeminiModels();
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const isOverloaded = (m: string) => /503|overload|service unavailable|high demand|rate limit|429|quota|temporarily/i.test(m);
    const isMissingModel = (m: string) => /not found|not supported|unsupported model|404/i.test(m);
    for (const modelName of modelCandidates) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const raw = result.response.text();
                const text = typeof raw === "string" ? raw.trim() : "";
                if (text)
                    return text;
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`[marketing-plan/generate] narrative Gemini error on ${modelName} (attempt ${attempt + 1}):`, message);
                if (isOverloaded(message) && attempt < 2) {
                    await sleep([700, 1500][attempt] ?? 1500);
                    continue;
                }
                if (isOverloaded(message) || isMissingModel(message))
                    break;
                return "";
            }
        }
    }
    return "";
}
type DayBuilderInput = {
    ctx: TemplateContext;
    category: CategoryKey;
    dayNumber: number;
    weekNumber: number;
    weekIndex: number;
    variantIndex: number;
    product: string;
    weekend: boolean;
    planDays: number;
    weekday: string;
    dateLabel: string;
};
type DayBuilderOutput = Omit<DayPlan, "dayNumber" | "dateLabel">;
type RepeatMetadata = {
    offerType: string;
    postFormat: string;
    stepTemplate: string;
    similarityKey: string;
};
type RepeatMemory = {
    recentThemes: ThemeKey[];
    recentOfferTypes: string[];
    recentStepTemplates: string[];
    similarityCounts: Record<string, number>;
};
type ActionType = "sales_offer" | "retention" | "lead_capture" | "operations" | "trust_proof" | "partnership" | "review_optimize";
type CategoryStrategyPool = {
    actionTypes: ActionType[];
    titles: Record<ActionType, string[]>;
    actions: Record<ActionType, string[]>;
    activations: Record<ActionType, string[]>;
    metrics: Record<ActionType, string[]>;
};
const categoryHashtags: Record<CategoryKey, string[]> = {
    food: ["#FoodBusiness", "#WeekendSpecial"],
    retail: ["#ShopLocal", "#CODAvailable"],
    salon: ["#BeautyBusiness", "#BookNow"],
    services: ["#ServiceBusiness", "#FreeConsultation"],
    education: ["#TuitionClass", "#LearnWithUs"],
    generic: ["#LocalBusiness", "#SMEGrowth"],
};
const categoryStrategyPools: Record<CategoryKey, CategoryStrategyPool> = {
    food: {
        actionTypes: ["sales_offer", "operations", "retention", "lead_capture", "trust_proof", "partnership", "review_optimize"],
        titles: {
            sales_offer: ["Launch a combo offer with add-on script", "Set a weekend pre-order menu push", "Create a high-margin meal bundle"],
            retention: ["Start a repeat-customer stamp reward", "Recover last-week diners with a return offer", "Build a weekday regulars hook"],
            lead_capture: ["Capture WhatsApp leads from walk-ins", "Collect booking contacts at checkout", "Turn menu QR scans into repeat leads"],
            operations: ["Tighten kitchen prep and service flow", "Reduce delay between order and handover", "Standardize upsell prompts at counter"],
            trust_proof: ["Build a Google review request system", "Collect testimonial photos from happy tables", "Show hygiene and quality proof daily"],
            partnership: ["Run a cross-offer with nearby business", "Partner with local office/community group", "Bundle with a complementary local seller"],
            review_optimize: ["Review top-selling items and margins", "Adjust offer using real weekend numbers", "Refine menu pricing using demand data"],
        },
        actions: {
            sales_offer: ["Package {product} with one profitable add-on and a clear deadline.", "Create a weekend-ready offer around {product} with pre-order cutoff.", "Use one SKU-focused combo on {product} to lift average order value."],
            retention: ["Bring back recent buyers with a simple return incentive tied to {product}.", "Reward repeat guests for choosing {businessName} again this week.", "Create a predictable weekly reason to reorder {product}."],
            lead_capture: ["Capture direct contacts from customers interested in {product} for follow-up.", "Move casual inquiries into a WhatsApp list with clear consent.", "Add a low-friction lead form flow for people comparing {product} options."],
            operations: ["Improve speed and consistency for {product} without sacrificing quality.", "Set one SOP for prep, handover, and complaint handling related to {product}.", "Reduce operational friction around peak-time {product} demand."],
            trust_proof: ["Collect verifiable customer proof for {product} and reuse it in sales flow.", "Use ratings and testimonials to reduce purchase hesitation on {product}.", "Systemize social proof collection for {product} every service day."],
            partnership: ["Use a nearby partner to unlock new customers for {product}.", "Co-promote {product} with a local complementary business.", "Launch a joint mini-campaign to increase trial of {product}."],
            review_optimize: ["Audit offer performance and optimize {product} pricing/packaging.", "Track what converts for {product} and remove weak tactics.", "Use KPI review to tune the next week’s {product} actions."],
        },
        activations: {
            sales_offer: ["Counter signage + WhatsApp broadcast for today’s combo.", "One post + story with pre-order CTA and cutoff.", "In-store script card + DM template for staff."],
            retention: ["Send repeat-customer reminder via WhatsApp list.", "Print a loyalty card explanation at billing desk.", "Post a customer thank-you with a return CTA."],
            lead_capture: ["Offer a quick opt-in message for menu updates.", "Use QR prompt to capture contact + preferred order time.", "Run comment-to-WhatsApp lead capture on offer post."],
            operations: ["Show one behind-the-scenes quality checkpoint.", "Pin updated service timing commitment on socials + counter.", "Share SOP-based quality promise in a short story."],
            trust_proof: ["Post one real review screenshot with permission.", "Request Google reviews via receipt/QR and follow-up text.", "Use before/after quality shot of {product}."],
            partnership: ["Cross-tag partner and share joint benefit offer.", "Place co-branded flyer at both counters.", "Publish partner bundle details in status/story."],
            review_optimize: ["Share weekly best-seller + limited offer adjustment.", "Post ‘what customers asked for’ and updated menu note.", "Publish mini KPI win with next action CTA."],
        },
        metrics: {
            sales_offer: ["Combo orders sold", "Average order value", "Offer conversion rate"],
            retention: ["Repeat orders", "Return customer rate", "7-day re-order count"],
            lead_capture: ["New contacts captured", "Qualified inquiries", "Lead-to-order conversion"],
            operations: ["Prep-to-handover time", "Order error rate", "Peak-hour throughput"],
            trust_proof: ["New reviews collected", "Rating mentions in inquiries", "Review-to-order lift"],
            partnership: ["Leads from partner channel", "Joint-offer redemptions", "New customers via partner"],
            review_optimize: ["Week-over-week revenue change", "Top SKU margin change", "Conversion improvement"],
        },
    },
    retail: {
        actionTypes: ["sales_offer", "lead_capture", "operations", "retention", "trust_proof", "partnership", "review_optimize"],
        titles: {
            sales_offer: ["Launch a stock-led bundle deal", "Set a limited-quantity flash offer", "Run COD-ready product bundle push"],
            retention: ["Reactivate recent buyers with loyalty perk", "Create repeat-purchase reminder flow", "Set post-purchase upsell sequence"],
            lead_capture: ["Recover carts with WhatsApp follow-up", "Capture waitlist for low-stock items", "Build inquiry-to-order funnel for {product}"],
            operations: ["Improve order packing and dispatch SOP", "Set delivery promise by zone", "Reduce returns with product-fit checklist"],
            trust_proof: ["Collect buyer photos + testimonials", "Strengthen review/ratings request flow", "Publish product proof and delivery reliability"],
            partnership: ["Run collab drop with complementary seller", "Exchange audience with local micro-brand", "Set referral deal with service partner"],
            review_optimize: ["Audit SKU performance and margins", "Adjust pricing or bundle after KPI review", "Optimize channel spend by conversion data"],
        },
        actions: {
            sales_offer: ["Create a stock-based push for {product} with a hard quantity cap.", "Package {product} into a bundle that improves margin.", "Use COD-friendly offer terms to increase checkout confidence."],
            retention: ["Bring back past buyers of {product} with an incentive tied to repeat purchase.", "Set follow-up automation/manual script after delivery.", "Use loyalty tagging to prioritize high-LTV customers."],
            lead_capture: ["Recover lost carts and DM inquiries for {product} systematically.", "Capture waitlist demand for out-of-stock variants.", "Convert product questions into trackable leads."],
            operations: ["Improve fulfillment quality for {product} from order to handover.", "Document delivery/return policy for fewer disputes.", "Reduce avoidable returns with clearer product qualification."],
            trust_proof: ["Collect and publish real buyer proof for {product}.", "Increase conversion by strengthening social proof assets.", "Use review-first selling approach on key product pages."],
            partnership: ["Acquire new demand for {product} through partner reach.", "Bundle offers with a relevant nearby/online partner.", "Run a co-promo to reach a similar audience segment."],
            review_optimize: ["Use weekly KPI review to optimize {product} offer and channel.", "Shift effort to top-converting campaigns for {product}.", "Cut weak actions and scale proven revenue drivers."],
        },
        activations: {
            sales_offer: ["Flash banner + WhatsApp order message template.", "One product carousel with stock countdown.", "Checkout note + COD assurance post."],
            retention: ["Post-purchase DM script with repeat incentive.", "VIP buyer status list update + reminder message.", "Short story/post: returning-customer bonus."],
            lead_capture: ["Abandoned cart follow-up script via WhatsApp.", "Waitlist form/status update for {product}.", "Comment/DM prompt for product restock alerts."],
            operations: ["Delivery policy highlight card for customer trust.", "Packaging quality check story post.", "FAQ post reducing wrong-order expectations."],
            trust_proof: ["Before/after buyer content + testimonial post.", "Review screenshot carousel.", "Delivery success proof in daily status."],
            partnership: ["Cross-promo post with partner handle.", "Joint giveaway or referral code announcement.", "Bundle flyer for both partner audiences."],
            review_optimize: ["Share top SKU insight + revised offer.", "KPI summary story with updated CTA.", "Post next-week offer based on customer data."],
        },
        metrics: {
            sales_offer: ["Units sold", "Gross margin per order", "Offer sell-through rate"],
            retention: ["Repeat order count", "30-day repeat rate", "Reactivated customer count"],
            lead_capture: ["Recovered carts", "Qualified leads", "Lead response-to-order rate"],
            operations: ["On-time dispatch rate", "Return/refund rate", "Packing error rate"],
            trust_proof: ["New proof assets collected", "Review count", "Proof-assisted conversion rate"],
            partnership: ["Partner-attributed orders", "Referral code usage", "New customer acquisition via partner"],
            review_optimize: ["Revenue by channel", "Margin improvement", "Conversion rate change"],
        },
    },
    services: {
        actionTypes: ["lead_capture", "sales_offer", "trust_proof", "operations", "retention", "partnership", "review_optimize"],
        titles: {
            sales_offer: ["Package your service into clear offers", "Launch a scoped starter package", "Set premium vs basic service pricing"],
            retention: ["Set client follow-up and rebooking rhythm", "Build referral ask into delivery flow", "Activate lapsed clients with value check-in"],
            lead_capture: ["Launch a free consult lead funnel", "Capture WhatsApp leads from service inquiry", "Turn DMs into booked appointments"],
            operations: ["Standardize service delivery SOP", "Shorten response and booking turnaround", "Create proposal + follow-up system"],
            trust_proof: ["Publish case study and outcome proof", "Collect testimonial proof by service type", "Build credibility kit for objections"],
            partnership: ["Partner with complementary service provider", "Run a local workshop/demo collaboration", "Create referral exchange with nearby business"],
            review_optimize: ["Review pipeline stages and conversion", "Optimize service offer using KPI data", "Adjust lead sources based on close rate"],
        },
        actions: {
            sales_offer: ["Define clear outcomes, scope, and pricing for {product}.", "Reduce buyer confusion by packaging {product} into tiers.", "Position {product} with outcome-first value and proof."],
            retention: ["Build repeat/rebooking behavior after {product} delivery.", "Create a simple referral trigger for satisfied clients.", "Reconnect old clients with a specific {product} update."],
            lead_capture: ["Capture qualified leads for {product} and move them to booked calls.", "Use WhatsApp + form flow to track service inquiries.", "Shorten inquiry-to-booking time with clear scripts."],
            operations: ["Improve internal delivery consistency for {product}.", "Set SLA/response standards for faster lead handling.", "Systemize proposal, follow-up, and close workflow for {product}."],
            trust_proof: ["Collect measurable outcomes from recent {product} clients.", "Use case studies to reduce trust barriers.", "Map objections and answer with proof assets."],
            partnership: ["Source qualified leads via strategic partner for {product}.", "Run a co-branded micro-event around {product}.", "Exchange referral opportunities with aligned businesses."],
            review_optimize: ["Use weekly KPI review to improve {product} close rates.", "Shift channel effort toward highest-intent leads.", "Tune service pricing/positioning based on data."],
        },
        activations: {
            sales_offer: ["One-pager + WhatsApp intro message for service tiers.", "Carousel/post explaining package outcomes.", "Proposal template update notice to leads."],
            retention: ["Post-delivery check-in script with next-step CTA.", "Referral ask message with benefit.", "Client win story + rebooking prompt."],
            lead_capture: ["Free-consult landing message + booking CTA.", "Lead magnet post with direct WhatsApp CTA.", "FAQ reel/post to qualify inquiries faster."],
            operations: ["Service process transparency post.", "Response-time promise pinned in channels.", "Workflow update shared with prospects."],
            trust_proof: ["Case study post with before/after outcome.", "Client testimonial card.", "Proof-based response template in DMs."],
            partnership: ["Partner collab announcement + booking benefit.", "Workshop invitation post/status.", "Joint referral offer across both channels."],
            review_optimize: ["Weekly result snapshot + next-step CTA.", "Post highlighting optimized service path.", "Share one measurable KPI improvement."],
        },
        metrics: {
            sales_offer: ["Package close rate", "Average deal size", "Proposal-to-close conversion"],
            retention: ["Rebooking rate", "Referral leads", "Lapsed-client reactivation count"],
            lead_capture: ["Booked consultations", "Lead-to-call conversion", "Inquiry response time"],
            operations: ["Delivery SLA adherence", "Turnaround time", "Proposal follow-up completion rate"],
            trust_proof: ["Case studies published", "Testimonial count", "Proof-assisted close rate"],
            partnership: ["Partner-sourced leads", "Joint-event signups", "Partner-attributed bookings"],
            review_optimize: ["Pipeline conversion by stage", "Win rate trend", "Channel ROI improvement"],
        },
    },
    education: {
        actionTypes: ["lead_capture", "trust_proof", "sales_offer", "operations", "retention", "partnership", "review_optimize"],
        titles: {
            sales_offer: ["Package trial class + monthly plan", "Launch exam prep mini-batch", "Set sibling referral enrolment offer"],
            retention: ["Set parent follow-up and renewal rhythm", "Create attendance recovery flow", "Build student progress check-in system"],
            lead_capture: ["Launch free assessment lead funnel", "Capture parent inquiries from WhatsApp", "Turn trial class interest into enrolments"],
            operations: ["Standardize lesson delivery checklist", "Improve attendance and reminder workflow", "Create class capacity and slot system"],
            trust_proof: ["Publish result proof and parent testimonials", "Collect student progress stories", "Build credibility kit for new parents"],
            partnership: ["Partner with school supply or bookshop", "Run local parent workshop collaboration", "Create referral exchange with nearby classes"],
            review_optimize: ["Review attendance and conversion data", "Optimize class offer using progress KPIs", "Adjust subject batches by demand"],
        },
        actions: {
            sales_offer: ["Package {product} into a clear trial-to-monthly path.", "Create a limited {product} exam batch with capped seats.", "Use a sibling or friend referral for qualified enrolments."],
            retention: ["Keep students continuing through visible progress and parent follow-up.", "Recover absent students before they silently drop out.", "Create repeat-term commitment for {product}."],
            lead_capture: ["Capture parent leads for {product} with one assessment CTA.", "Move WhatsApp inquiries into booked trial classes.", "Qualify students by grade, subject, and exam timeline."],
            operations: ["Improve lesson consistency for {product} with a repeatable class checklist.", "Reduce no-shows with reminders, attendance marks, and parent updates.", "Map class capacity so new leads get the right slot fast."],
            trust_proof: ["Use student results and parent words to reduce enrolment hesitation.", "Collect progress proof for {product} after every assessment cycle.", "Answer parent objections with simple credibility assets."],
            partnership: ["Reach new parent groups through a trusted local partner.", "Run a study-skills collab that introduces {product}.", "Exchange referrals with complementary education businesses."],
            review_optimize: ["Use attendance, trial, and enrolment data to tune {product}.", "Shift effort toward subjects and grades with strongest conversion.", "Improve weak class batches using parent and student feedback."],
        },
        activations: {
            sales_offer: ["Feed offer card: trial class + monthly plan + WhatsApp CTA.", "Carousel explaining exam batch seats and deadline.", "Story reminder for sibling/friend referral enrolment."],
            retention: ["Parent update story with renewal reminder.", "Progress check-in post with next-term CTA.", "Attendance recovery WhatsApp story prompt."],
            lead_capture: ["Free assessment Reel with WhatsApp booking CTA.", "Story Q&A for parent questions.", "Carousel: grade/subject fit + trial class steps."],
            operations: ["BTS lesson planning post.", "Story showing attendance/reminder system.", "Feed note about class capacity and time slots."],
            trust_proof: ["Parent testimonial carousel.", "Student progress proof feed post.", "Result recap story with enrolment CTA."],
            partnership: ["Workshop announcement with partner tag.", "Joint study tips Reel.", "Referral code post for local parent groups."],
            review_optimize: ["Weekly progress recap feed post.", "Story poll for subject demand.", "Carousel explaining improved class schedule."],
        },
        metrics: {
            sales_offer: ["Trial class bookings", "Trial-to-enrolment rate", "Monthly plan signups"],
            retention: ["Attendance rate", "Renewal rate", "Absent student recovery count"],
            lead_capture: ["Parent inquiries", "Assessment bookings", "Lead-to-trial conversion"],
            operations: ["Class capacity fill rate", "Reminder response rate", "No-show rate"],
            trust_proof: ["Parent testimonials collected", "Proof-assisted enrolments", "Review count"],
            partnership: ["Workshop signups", "Partner-sourced leads", "Referral enrolments"],
            review_optimize: ["Subject demand lift", "Batch conversion rate", "Week-over-week enrolment change"],
        },
    },
    salon: {
        actionTypes: ["sales_offer", "retention", "lead_capture", "operations", "trust_proof", "partnership", "review_optimize"],
        titles: {
            sales_offer: ["Create a treatment bundle package", "Launch seasonal beauty package", "Set upgrade offer at checkout"],
            retention: ["Start rebooking reminder flow", "Introduce loyalty touchpoint for regulars", "Recover inactive clients with targeted offer"],
            lead_capture: ["Capture booking leads from WhatsApp", "Turn style inquiries into booked slots", "Run quick consultation booking drive"],
            operations: ["Improve appointment flow and punctuality", "Standardize hygiene and service checklist", "Optimize chair/staff utilization plan"],
            trust_proof: ["Collect before/after proof consistently", "Build review request system after service", "Show trust signals for new clients"],
            partnership: ["Partner with nearby fashion/bridal vendor", "Create cross-referral with local business", "Run mini-collab event for new bookings"],
            review_optimize: ["Review no-show and rebooking KPIs", "Adjust package pricing from demand data", "Optimize channels by booking quality"],
        },
        actions: {
            sales_offer: ["Package {product} with a complementary add-on for higher ticket value.", "Launch a time-bound service bundle around {product}.", "Increase upgrade rate for {product} at payment stage."],
            retention: ["Drive repeat visits with structured follow-up after {product}.", "Encourage regulars to pre-book next appointment.", "Win back dormant clients interested in {product}."],
            lead_capture: ["Move social/WhatsApp inquiries into confirmed slots for {product}.", "Create a low-friction consult-to-booking flow.", "Capture booking intent with clear timing and price prompts."],
            operations: ["Improve service consistency and turnaround for {product}.", "Run daily SOP for hygiene, setup, and handover.", "Reduce idle slots by optimizing schedule operations."],
            trust_proof: ["Collect outcome proof and testimonials for {product}.", "Use reviews to build confidence with first-time clients.", "Publish trust assets tied to real client outcomes."],
            partnership: ["Acquire new clients for {product} through local collab.", "Exchange referrals with complementary nearby businesses.", "Use event/collab day to fill near-term slots."],
            review_optimize: ["Measure booking funnel and optimize weak points for {product}.", "Tune offer based on no-show and conversion data.", "Improve channel focus for profitable appointments."],
        },
        activations: {
            sales_offer: ["Package card in salon + story/post with booking CTA.", "WhatsApp broadcast for limited appointment windows.", "Checkout script + offer badge update."],
            retention: ["Rebooking reminder template after service.", "Loyalty update card at reception.", "Client reactivation message with slot options."],
            lead_capture: ["Consultation booking post with direct WhatsApp CTA.", "Before/after teaser with slot booking link.", "Status update: available chairs/times today."],
            operations: ["Service standards post for confidence.", "Timeliness promise update in status.", "Behind-the-scenes hygiene checklist snippet."],
            trust_proof: ["Before/after collage with permission.", "Review screenshot story.", "Testimonial short-form post for new leads."],
            partnership: ["Collab announcement with partner business.", "Joint referral code/status push.", "Mini-event booking announcement."],
            review_optimize: ["Weekly booking KPI snapshot post.", "Data-backed offer adjustment update.", "Channel-specific CTA refinement post."],
        },
        metrics: {
            sales_offer: ["Average bill per client", "Package uptake rate", "Upgrade attach rate"],
            retention: ["Rebooking rate", "Client return rate", "Dormant client reactivation"],
            lead_capture: ["Inquiry-to-booking conversion", "Confirmed slots", "New lead count"],
            operations: ["On-time appointment rate", "No-show rate", "Service turnaround time"],
            trust_proof: ["Before/after assets collected", "New reviews", "Proof-assisted bookings"],
            partnership: ["Partner-sourced bookings", "Collab referrals", "Event booking conversions"],
            review_optimize: ["Booking funnel improvement", "Revenue per slot", "Channel performance lift"],
        },
    },
    generic: {
        actionTypes: ["sales_offer", "lead_capture", "retention", "operations", "trust_proof", "partnership", "review_optimize"],
        titles: {
            sales_offer: ["Create a focused offer for one core product", "Package your top product with clear value", "Set a simple upsell script for core sales"],
            retention: ["Build a repeat-customer follow-up loop", "Reactivate recent customers with targeted value", "Add referral ask after successful delivery"],
            lead_capture: ["Capture WhatsApp leads from inquiries", "Turn curiosity into trackable leads", "Set a direct booking/request form path"],
            operations: ["Standardize daily execution checklist", "Improve response speed and handover quality", "Reduce friction in service/order process"],
            trust_proof: ["Collect and publish customer proof", "Set review request workflow", "Use testimonials to reduce hesitation"],
            partnership: ["Launch local collaboration offer", "Cross-promote with complementary business", "Exchange referrals with nearby partners"],
            review_optimize: ["Review KPIs and tune weak points", "Adjust offer after weekly results", "Focus resources on top-converting channels"],
        },
        actions: {
            sales_offer: ["Use {product} as the lead offer with clear value and deadline.", "Improve conversion around {product} with simple offer structure.", "Increase revenue per customer with one targeted upsell tied to {product}."],
            retention: ["Keep customers returning through follow-up tied to {product}.", "Use structured outreach to re-engage past buyers.", "Embed referral trigger into post-purchase workflow."],
            lead_capture: ["Capture contact details of people interested in {product}.", "Move inquiries into one trackable lead channel.", "Use clear CTA to convert awareness into qualified leads."],
            operations: ["Improve daily execution quality for {product}.", "Define SOP for response, delivery, and follow-up.", "Cut operational delays that reduce conversion."],
            trust_proof: ["Gather trust signals and proof for {product}.", "Use customer stories to support buying decisions.", "Systemize review/testimonial collection."],
            partnership: ["Find partner channel to introduce {product} to new buyers.", "Create a joint offer with related local business.", "Leverage partner audience for faster lead growth."],
            review_optimize: ["Measure what worked for {product} and optimize next actions.", "Use weekly data to remove low-value tasks.", "Refocus on highest impact growth activities."],
        },
        activations: {
            sales_offer: ["One concise offer post + direct CTA.", "WhatsApp broadcast to warm contacts.", "In-store/online banner with conversion CTA."],
            retention: ["Follow-up message template for returning customers.", "Referral prompt in thank-you message.", "Status/story update for repeat-customer benefit."],
            lead_capture: ["Lead capture prompt on key channel.", "Simple form/DM CTA for quick inquiry.", "Post with direct WhatsApp contact intent."],
            operations: ["Process transparency message for trust.", "Service quality update to customers.", "SOP-based confidence message in channel."],
            trust_proof: ["Review/testimonial card post.", "Customer success mini-story.", "Trust badge/highlight in profile/status."],
            partnership: ["Partner mention + shared offer post.", "Cross-channel referral announcement.", "Joint flyer/digital promo for both audiences."],
            review_optimize: ["Weekly KPI summary with next action.", "Post what changed based on customer feedback.", "Data-backed offer update message."],
        },
        metrics: {
            sales_offer: ["Offer conversion rate", "Average transaction value", "Revenue from core offer"],
            retention: ["Repeat customer count", "Referral leads", "Return purchase rate"],
            lead_capture: ["Qualified leads captured", "Lead-to-sale conversion", "Response turnaround time"],
            operations: ["Service/order completion time", "Error/complaint rate", "SLA adherence"],
            trust_proof: ["Reviews/testimonials added", "Trust-mention conversions", "Proof-assisted close rate"],
            partnership: ["Partner-attributed leads", "Joint-offer conversions", "New customers from partner"],
            review_optimize: ["Week-over-week KPI lift", "Conversion improvement", "Revenue impact from optimizations"],
        },
    },
};
type BusinessGrowthAction = {
    actionType: ActionType;
    title: string;
    task: string;
    executionSteps: string[];
};
type SocialMediaActivation = {
    actionType: ActionType;
    platform: "Instagram" | "Facebook" | "Both";
    format: "Feed" | "Story" | "Reel" | "Carousel";
    whatToPost: string;
    visualGuide: string[];
    CTA: string;
    bestTime: string;
    hashtagsSeed: string[];
};
type KpiItem = {
    actionType: ActionType;
    label: string;
    target: number;
    unit: string;
};
type CategoryActionLibrary = {
    businessGrowthActions: BusinessGrowthAction[];
    socialMediaActivations: SocialMediaActivation[];
    kpis: KpiItem[];
};
const actionTypeLabels: Record<ActionType, string> = {
    sales_offer: "Offer",
    retention: "Retention",
    lead_capture: "Lead Capture",
    operations: "Operations",
    trust_proof: "Proof",
    partnership: "Partnership",
    review_optimize: "Review",
};
const actionTypeThemes: Record<ActionType, ThemeKey> = {
    sales_offer: "promo_offer",
    retention: "engagement",
    lead_capture: "growth_push",
    operations: "behind_scenes",
    trust_proof: "review_collection",
    partnership: "highlight",
    review_optimize: "track_improve",
};
const socialFormatCycle: Array<SocialMediaActivation["format"]> = ["Feed", "Story", "Reel", "Carousel"];
const categoryLibraryTargets: Record<CategoryKey, Record<ActionType, number>> = {
    food: {
        sales_offer: 18,
        retention: 12,
        lead_capture: 16,
        operations: 10,
        trust_proof: 8,
        partnership: 7,
        review_optimize: 6,
    },
    retail: {
        sales_offer: 12,
        retention: 8,
        lead_capture: 15,
        operations: 8,
        trust_proof: 6,
        partnership: 5,
        review_optimize: 6,
    },
    salon: {
        sales_offer: 8,
        retention: 6,
        lead_capture: 10,
        operations: 8,
        trust_proof: 5,
        partnership: 4,
        review_optimize: 5,
    },
    services: {
        sales_offer: 4,
        retention: 4,
        lead_capture: 8,
        operations: 6,
        trust_proof: 4,
        partnership: 3,
        review_optimize: 5,
    },
    education: {
        sales_offer: 5,
        retention: 7,
        lead_capture: 10,
        operations: 6,
        trust_proof: 5,
        partnership: 4,
        review_optimize: 5,
    },
    generic: {
        sales_offer: 6,
        retention: 5,
        lead_capture: 8,
        operations: 5,
        trust_proof: 4,
        partnership: 3,
        review_optimize: 4,
    },
};
function categoryNoun(category: CategoryKey): string {
    switch (category) {
        case "food":
            return "menu item";
        case "retail":
            return "product";
        case "salon":
            return "service";
        case "services":
            return "service package";
        case "education":
            return "class";
        case "generic":
        default:
            return "offer";
    }
}
function buildChecklistTemplates(actionType: ActionType, noun: string): string[] {
    const trackerByAction: Record<ActionType, string> = {
        sales_offer: "orders",
        retention: "repeat customers",
        lead_capture: "qualified leads",
        operations: "completion time",
        trust_proof: "reviews",
        partnership: "partner leads",
        review_optimize: "conversion change",
    };
    return [
        `Choose the exact ${noun}, price, deadline, and owner.`,
        "Write one reply script for DMs, calls, and walk-ins.",
        "Update the customer-facing note before any promotion goes live.",
        "Message warm customers first, then answer every reply same day.",
        `Record today's ${trackerByAction[actionType]}, source, revenue, and follow-up owner.`,
    ];
}
function buildCategoryActionLibrary(category: CategoryKey): CategoryActionLibrary {
    const pool = categoryStrategyPools[category] ?? categoryStrategyPools.generic;
    const noun = categoryNoun(category);
    const businessGrowthActions = pool.actionTypes.flatMap((actionType) => {
        const titles = pool.titles[actionType] ?? [];
        const actions = pool.actions[actionType] ?? [];
        return Array.from({ length: 5 }, (_, index) => {
            const titleSeed = titles[index % Math.max(titles.length, 1)] ?? `${actionTypeLabels[actionType]} system`;
            const actionSeed = actions[index % Math.max(actions.length, 1)] ?? `Improve the ${noun} system with a measurable owner.`;
            return {
                actionType,
                title: `${titleSeed} · ${actionTypeLabels[actionType]} ${index + 1}`,
                task: actionSeed,
                executionSteps: buildChecklistTemplates(actionType, noun),
            };
        });
    });
    const socialMediaActivations = pool.actionTypes.flatMap((actionType) => {
        const activations = pool.activations[actionType] ?? [];
        return socialFormatCycle.map((format, index) => {
            const activationSeed = activations[index % Math.max(activations.length, 1)] ?? `Show the ${noun} value with a direct CTA.`;
            const theme = actionTypeThemes[actionType];
            return {
                actionType,
                platform: "Both" as const,
                format,
                whatToPost: activationSeed,
                visualGuide: [
                    `${noun} hero visual with one clear benefit line.`,
                    `Simple proof, price, or process detail in the second frame.`,
                    `CTA strip visible before viewers scroll away.`,
                ],
                CTA: actionType === "sales_offer"
                    ? "DM to order or book before today's cutoff."
                    : actionType === "retention"
                        ? "Reply to claim your returning-customer perk."
                        : actionType === "trust_proof"
                            ? "Message us for proof, reviews, or next steps."
                            : "DM us and we will guide the next step.",
                bestTime: format === "Story" ? "12:30 PM" : format === "Reel" ? "6:30 PM" : "7:30 PM",
                hashtagsSeed: [toHashTag(actionTypeLabels[actionType]), ...categoryHashtags[category], ...themeSpecificHashtagCandidates(category, theme, "", "", noun)].filter(Boolean),
            };
        });
    });
    const kpis = pool.actionTypes.flatMap((actionType) => {
        const metrics = pool.metrics[actionType] ?? [];
        return metrics.map((label, index) => ({
            actionType,
            label,
            target: (categoryLibraryTargets[category]?.[actionType] ?? 5) + index * 2,
            unit: /rate|conversion|margin|roi|adherence|fill/i.test(label) ? "%" : "count",
        }));
    });
    return {
        businessGrowthActions: businessGrowthActions.slice(0, Math.max(35, businessGrowthActions.length)),
        socialMediaActivations: socialMediaActivations.slice(0, Math.max(25, socialMediaActivations.length)),
        kpis: kpis.slice(0, Math.max(20, kpis.length)),
    };
}
const CATEGORY_ACTION_LIBRARIES: Record<CategoryKey, CategoryActionLibrary> = {
    food: buildCategoryActionLibrary("food"),
    retail: buildCategoryActionLibrary("retail"),
    services: buildCategoryActionLibrary("services"),
    salon: buildCategoryActionLibrary("salon"),
    education: buildCategoryActionLibrary("education"),
    generic: buildCategoryActionLibrary("generic"),
};
function pickLibraryItem<T extends { actionType: ActionType }>(items: T[], actionType: ActionType, variant: number): T | undefined {
    const scoped = items.filter((item) => item.actionType === actionType);
    return scoped.length ? scoped[variant % scoped.length] : items[variant % items.length];
}
const GENERIC_TITLE_RE = /\b(growth focus|boost engagement|business growth action|day \d+ growth action|drive business growth)\b/i;
function wordCount(value: string): number {
    return value.trim().split(/\s+/).filter(Boolean).length;
}
function normalizeExecutionChecklist(steps: string[], category: CategoryKey, product: string, metric: string): string[] {
    const noun = categoryNoun(category);
    const fallback = [
        `Choose the exact ${product || noun} offer, price, deadline, and owner.`,
        "Write one reply script for DMs, calls, and walk-ins.",
        "Update the customer-facing note before promotion goes live today.",
        "Message warm customers first, then answer every reply same day.",
        `Record today's ${metric || "results"}, source, revenue, and follow-up owner.`,
    ];
    const cleaned = steps
        .map((step) => conciseStep(step).replace(/^[\-•\s]+/, ""))
        .filter((step) => {
            const count = wordCount(step);
            return count >= 8 && count <= 14;
        });
    const merged = dedupeKeepOrder([...cleaned, ...fallback]);
    return merged.slice(0, 5);
}
function avoidRepeatedFormat(format: CaptionFormatKey, previous: CaptionFormatKey | null, dayNumber: number): CaptionFormatKey {
    if (format !== previous)
        return format;
    const cycle: CaptionFormatKey[] = ["Feed", "Story", "Reel", "Carousel"];
    return cycle[(cycle.indexOf(format) + dayNumber) % cycle.length] ?? "Feed";
}
function hasTargetMetric(successMetric: string): boolean {
    return /\b(target|at least|minimum|aim for)\b/i.test(successMetric) && /\d/.test(successMetric);
}
function isMissingActivationField(day: DayBuilderOutput): boolean {
    const activation = day.marketingActivation;
    return !activation?.cta || !activation?.format || !activation?.postIdea || !activation?.caption;
}
function productForDay(ctx: TemplateContext, index: number): string {
    const products = ctx.productsOrServices.length ? ctx.productsOrServices : [ctx.productLine];
    return products[index % products.length] || ctx.businessType || "your offer";
}
function withLocation(ctx: TemplateContext): string {
    return ctx.city ? ` in ${ctx.city}` : "";
}
function uniqueTitle(title: string, usedTitles: Set<string>, dayNumber: number): string {
    let nextTitle = title.trim();
    if (!nextTitle)
        nextTitle = `Growth action day ${dayNumber}`;
    if (usedTitles.has(nextTitle.toLowerCase())) {
        nextTitle = `${nextTitle} - Day ${dayNumber}`;
    }
    usedTitles.add(nextTitle.toLowerCase());
    return nextTitle;
}
function normalizeDayOutput(output: DayBuilderOutput): DayBuilderOutput {
    const steps = Array.isArray(output.executionSteps) ? output.executionSteps.filter(Boolean).slice(0, 6) : [];
    const padded = steps.length >= 3
        ? steps
        : [...steps, "Log today’s results in a simple tracker (orders, leads, or bookings)."].slice(0, 3);
    return {
        ...output,
        executionSteps: padded,
        hashtags: Array.isArray(output.hashtags) ? output.hashtags : [],
        posterHint: typeof output.posterHint === "string" ? output.posterHint : "",
        marketingActivation: {
            platform: output.marketingActivation?.platform ?? "Both",
            format: output.marketingActivation?.format ?? "Feed",
            bestTime: String(output.marketingActivation?.bestTime ?? "7:30 PM"),
            goal: output.marketingActivation?.goal ?? "Leads",
            postBrief: String(output.marketingActivation?.postBrief ?? output.postIdea ?? ""),
            hook: String(output.marketingActivation?.hook ?? `Need better ${output.postIdea || "results"}?`),
            visualGuide: Array.isArray(output.marketingActivation?.visualGuide)
                ? output.marketingActivation?.visualGuide.slice(0, 3).map((item) => String(item))
                : [],
            posterHeadlineHint: String(output.marketingActivation?.posterHeadlineHint ?? output.posterHint ?? ""),
            posterSubheadline: String(output.marketingActivation?.posterSubheadline ?? ""),
            posterCtaLabel: String(output.marketingActivation?.posterCtaLabel ?? ""),
            posterOfferBadge: String(output.marketingActivation?.posterOfferBadge ?? ""),
            whatToPost: String(output.marketingActivation?.whatToPost ?? output.marketingActivation?.postIdea ?? output.postIdea ?? ""),
            postIdea: String(output.postIdea ?? ""),
            caption: String(output.caption ?? ""),
            hashtags: Array.isArray(output.hashtags) ? output.hashtags.slice(0, 10) : [],
            cta: String(output.marketingActivation?.cta ?? "DM us now"),
            matchNote: String(output.marketingActivation?.matchNote ?? ""),
            channel: output.marketingActivation?.channel ?? "both",
            formatPlan: output.marketingActivation?.formatPlan ?? ["FeedPost"],
            contentBrief: String(output.marketingActivation?.contentBrief ?? output.postIdea ?? ""),
            postingTime: String(output.marketingActivation?.postingTime ?? output.marketingActivation?.bestTime ?? "7:30 PM"),
            storyFrames: Array.isArray(output.marketingActivation?.storyFrames) ? output.marketingActivation?.storyFrames : [],
            reelScript: output.marketingActivation?.reelScript && typeof output.marketingActivation.reelScript === "object"
                ? {
                    hook: String(output.marketingActivation.reelScript.hook ?? ""),
                    beats: Array.isArray(output.marketingActivation.reelScript.beats)
                        ? output.marketingActivation.reelScript.beats.map((b) => String(b)).slice(0, 3)
                        : [],
                    cta: String(output.marketingActivation.reelScript.cta ?? ""),
                }
                : undefined,
            posterHint: typeof output.posterHint === "string" ? output.posterHint : "",
            ...(typeof output.marketingActivation?.offerDeadlineHint === "string" && output.marketingActivation.offerDeadlineHint.trim()
                ? { offerDeadlineHint: output.marketingActivation.offerDeadlineHint.trim() }
                : {}),
        },
    };
}
function conciseStep(text: string): string {
    const cleaned = text
        .replace(/\s+/g, " ")
        .replace(/\s+([,.!?;:])/g, "$1")
        .trim();
    if (!cleaned)
        return "";
    const sentence = cleaned.length > 110 ? `${cleaned.slice(0, 107).trim()}...` : cleaned;
    return sentence;
}
function toHashTag(value: string): string {
    const clean = value.replace(/[^a-zA-Z0-9]/g, "");
    return clean ? `#${clean}` : "";
}
function dedupeKeepOrder(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
        const key = value.toLowerCase();
        if (!value || seen.has(key))
            continue;
        seen.add(key);
        result.push(value);
    }
    return result;
}
function themeSpecificHashtagCandidates(category: CategoryKey, theme: ThemeKey, businessType: string, city: string, product: string): string[] {
    const byTheme: Record<ThemeKey, string[]> = {
        promo_offer: ["#LimitedOffer", "#DealToday"],
        highlight: ["#TopPick", "#WhyUs"],
        review_collection: ["#CustomerStory", "#RealTalk"],
        behind_scenes: ["#BehindTheScenes", "#Craft"],
        engagement: ["#Poll", "#YourSay"],
        growth_push: ["#BookNow", "#LimitedRun"],
        track_improve: ["#WeeklyWins", "#ShopUpdate"],
    };
    const categoryTag = toHashTag(category === "food"
        ? "FoodieLK"
        : category === "retail"
            ? "ShopLK"
            : category === "salon"
                ? "BeautyLK"
                : category === "services"
                    ? "ServicesLK"
            : category === "education"
                ? "TuitionLK"
                : "LKBusiness");
    const businessTypeTag = toHashTag(businessType || "LocalBiz");
    const cityTag = toHashTag(city || "");
    const productTag = toHashTag(product || "");
    return dedupeKeepOrder([
        categoryTag,
        businessTypeTag,
        cityTag,
        productTag,
        ...byTheme[theme],
        "#BizBoost",
        "#MadeInLK",
    ].filter(Boolean)).filter((t) => !SPAM_HASHTAG.test(t));
}
function sanitizeHashtagList(tags: string[], minCount = 6, maxCount = 10): string[] {
    const cleaned = dedupeKeepOrder(tags.filter(Boolean))
        .map((t) => (t.startsWith("#") ? t : `#${t.replace(/^#+/, "")}`))
        .filter((t) => !SPAM_HASHTAG.test(t));
    const padPool = ["#SmallBizLK", "#ColomboFood", "#Entrepreneurs", "#ShopSmall", "#LocalFirst", "#SriLanka", "#SriLankaBusiness", "#SupportLocalLK", "#LocalDeals", "#WhatsAppOrders"];
    const out = [...cleaned];
    let pad = 0;
    while (out.length < minCount && pad < padPool.length) {
        if (!out.some((x) => x.toLowerCase() === padPool[pad].toLowerCase()))
            out.push(padPool[pad]);
        pad += 1;
    }
    return out.slice(0, maxCount);
}
function activationToPostBrief(marketingActivation: string, product: string, businessName: string): string {
    const t0 = marketingActivation.trim();
    if (!t0) {
        return `Today’s story keeps ${product} honest and easy to act on for ${businessName}.`;
    }
    const low = t0.toLowerCase();
    if (/post\s+one\s+real\s+review\s+screenshot/i.test(low)) {
        return `Warm quote layout about ${product} — sincere words neighbours already share about ${businessName}.`;
    }
    if (/\breview\s+screenshot\b/i.test(low)) {
        return `Quote-style tiles for ${product} — bright text on brand colours, neighbour-made energy.`;
    }
    const cleaned = t0
        .replace(/\bscreenshot\b/gi, "quote graphic")
        .replace(/\breceipt\/qr\b/gi, "checkout card")
        .replace(/\bwith permission\b/gi, "")
        .replace(/\bpost\s+one\b/gi, "One")
        .replace(/\s+/g, " ")
        .trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
function themeVisualGuide(theme: ThemeKey, product: string, ctx: TemplateContext, activationSeed: string): string[] {
    const name = ctx.businessName;
    const city = ctx.city.trim();
    const loc = ctx.location?.trim();
    switch (theme) {
        case "behind_scenes":
            return [
                `${name} prepping ${product}${loc ? ` at ${loc}` : city ? ` around ${city}` : ""} — candid motion, respectful lighting.`,
                `One tight overlay names the quality checkpoint so trust lands before the fade.`,
            ];
        case "review_collection":
            return activationSeed.toLowerCase().includes("google")
                ? [
                    `Simple ${product} still with a heartfelt line about the visit — nothing staged.`,
                    `Soft end card nodding to Maps so happy guests know where the love belongs.`,
                ]
                : [
                    `Portrait-style quote tile beside ${product} in natural light.`,
                    `Subtle ${name} mark on the footer so reshares stay recognisable.`,
                ];
        case "engagement":
            return [
                `Split visual: two ${product} angles so the vote feels obvious at a glance.`,
                `Thumb-friendly text that mirrors the question you ask in the caption.`,
            ];
        case "growth_push":
            return [
                `${product} hero shot + urgency line that matches how many slots are really open.`,
                `Close with ${name} contact strip so serious buyers know the fastest route.`,
            ];
        case "promo_offer":
            return [
                `${product} bundle tile with deadline language that matches your real window.`,
                `WhatsApp or DM strip visible before viewers bounce — same offer, zero guesswork.`,
            ];
        case "highlight":
            return [
                `Macro detail of ${product} plus one plain-language benefit line.`,
                `Simple before/after or comparison frame if it helps ${name} stand out.${city ? ` Keep the ${city} nod tasteful.` : ""}`,
            ];
        case "track_improve":
        default:
            return [
                `Light recap graphic: what moved for ${product} and what gets sharper next.`,
                `Calm typography, no hype — shows ${name} listens and ships fixes.`,
            ];
    }
}
type MarketingGoalKey = NonNullable<DayPlan["marketingActivation"]>["goal"];
function buildThemedCta(theme: ThemeKey, goal: MarketingGoalKey, product: string, ctx: TemplateContext, format: CaptionFormatKey): string {
    const prefersWa = ctx.preferredChannels.some((c) => /whatsapp/i.test(c));
    const chatTo = prefersWa ? `WhatsApp ${ctx.businessName}` : `Message ${ctx.businessName}`;
    const city = ctx.city.trim();
    const loc = ctx.location?.trim();
    const storyTail = format === "Story" ? "Sticker replies count — we tally before prep starts." : "Chat replies decide what we batch next.";
    switch (theme) {
        case "promo_offer":
            if (goal === "Orders") {
                return prefersWa
                    ? `${chatTo} with your ${product} order window — we confirm payment + pickup as replies land.`
                    : `DM ${ctx.businessName} to order ${product} before cutoff — pickup details go out instantly.`;
            }
            if (goal === "Footfall") {
                return loc
                    ? `Visit ${loc}${city ? ` (${city})` : ""} for ${product} — say you saw today’s drop for the insiders note.`
                    : `Walk into ${ctx.businessName}${city ? ` in ${city}` : ""} for ${product} while today’s batch is fresh.`;
            }
            break;
        case "growth_push":
            return prefersWa
                ? `${chatTo}: type "${product}" and we hold your slot before the cap hits.`
                : `DM ${ctx.businessName} to lock your ${product} spot before the week’s limit lands.`;
        case "behind_scenes":
            if (goal === "Footfall") {
                return loc
                    ? `Visit ${loc} this week — ask for today’s ${product} run and feel the rhythm behind it.`
                    : `Drop by ${ctx.businessName}${city ? ` on ${city} turf` : ""} — we’ll walk you through how ${product} comes together.`;
            }
            break;
        case "highlight":
            return `${chatTo} if ${product} should be yours this cycle — we send specs the same hour.`;
        case "review_collection":
            return prefersWa
                ? `Loved ${product}? ${chatTo} — we ping the Google Maps link while the visit is fresh.`
                : `DM ${ctx.businessName}: say "${product}" and we send the Maps review shortcut.`;
        case "engagement":
            return `${chatTo}: tell us which ${product} direction wins. ${storyTail}`;
        case "track_improve":
            return `${chatTo} for the refreshed ${product} plan — what changed, what’s next, and how to book.${city ? ` ${city} slots update live.` : ""}`.trim();
        default:
            break;
    }
    switch (goal) {
        case "Orders":
            return `${chatTo} to place your ${product} order — we bundle totals + pickup or delivery notes.${city ? ` ${city} routes covered where we can.` : ""}`.trim();
        case "Bookings":
            return `${chatTo} to anchor your ${product} booking — calendars lock once you confirm.${city ? ` ${city}-friendly times available.` : ""}`.trim();
        case "Footfall":
            return loc
                ? `Visit ${loc} for ${product} — mention today’s post for the crew to match you faster.`
                : `Visit ${ctx.businessName}${city ? ` (${city})` : ""} for ${product} — we’ll meet you at the counter.`;
        case "Leads":
        case "DMs":
        default:
            return prefersWa
                ? `${chatTo}: say "${product}" and we map the fastest next step.${city ? ` Local to ${city}.` : ""}`.trim()
                : `DM ${ctx.businessName}: tell us "${product}" and we send tailored options.${city ? ` ${city} crew on it.` : ""}`.trim();
    }
}
type CaptionActivationKey = "promo" | "highlight" | "testimonial" | "google_review" | "bts" | "engagement" | "growth" | "track";
type CaptionFormatKey = "Reel" | "Story" | "Feed" | "Carousel";
type CaptionSlots = {
    businessName: string;
    locationPhrase: string;
    city: string;
    product: string;
    businessType: string;
    targetAudience: string;
    offerLine: string;
    benefitLine: string;
    proofLine: string;
    deadlinePhrase: string;
    pricePhrase: string;
    postBriefNatural: string;
    visualWatchLine: string;
    cta: string;
};
const CAPTION_META_BANNED = /\bpost\s+one\b|\b(post|share)\s+(a|your)\s+(.{0,20})?\b(real\s+)?(review\s+)?(screenshot|photo)\b|\brecord\s+(a\s+)?(video|clip|story)\b|\bscreenshot\b|with\s+permission|\bpermission\b|\bcreate\s+a\s+(post|carousel|story|reel)\b|\buse\s+this\s+(caption|template)\b|^question\s+sticker:/i;
function captionBodyMinusHashtags(captionFull: string): string {
    const lines = captionFull.split(/\r?\n/);
    const withoutHashLines = lines.filter((ln) => !ln.trim().startsWith("#") && !/^(\s*#\w+)/.test(ln.trim()));
    return withoutHashLines.join("\n").replace(/(^|\s)#[\w\u00c0-\u024f]+\b/giu, "").trim();
}
function clipEmojis(body: string, max = 2): string {
    const re = /\p{Extended_Pictographic}\uFE0F?/gu;
    let n = 0;
    return body.replace(re, (m) => {
        if (n < max) {
            n += 1;
            return m;
        }
        return "";
    });
}
function escapeRegexToken(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function captionBrandRuleOk(bodyRaw: string, businessName: string, city: string): boolean {
    const body = captionBodyMinusHashtags(bodyRaw);
    const b = businessName.trim();
    if (!b)
        return true;
    const bizRe = new RegExp(`\\b${escapeRegexToken(b)}\\b`, "gi");
    const bizHits = [...body.matchAll(bizRe)].length;
    if (bizHits < 1 || bizHits > 2)
        return false;
    const c = city.trim();
    if (c.length >= 2) {
        const cityRe = new RegExp(`\\b${escapeRegexToken(c)}\\b`, "gi");
        const cityHits = [...body.matchAll(cityRe)].length;
        if (cityHits > 1)
            return false;
    }
    return true;
}
function containsCta(captionBody: string, ctaText: string): boolean {
    const lc = captionBody.toLowerCase();
    const cue = (ctaText || "").toLowerCase().trim();
    if (cue.length >= 5 && lc.includes(cue))
        return true;
    return /\b(dm|direct message|whatsapp|wa\b|visit us|walk in|book now|reserve|pre-?order|order now|grab yours|tap in|slide into|reply here|tell us)\b/i.test(lc);
}
function captionPassesChecks(body: string, format: CaptionFormatKey, ctaLine: string, businessName?: string, city?: string): boolean {
    if (!body || CAPTION_META_BANNED.test(body))
        return false;
    if (!containsCta(body, ctaLine))
        return false;
    if (businessName && !captionBrandRuleOk(body, businessName, city ?? ""))
        return false;
    const len = captionBodyMinusHashtags(body).replace(/\s+/g, " ").length;
    if (format === "Story") {
        return len >= 36;
    }
    return len >= 80;
}
function captionActivation(theme: ThemeKey, reviewSubtype: string): CaptionActivationKey {
    if (theme === "review_collection" && /\bgoogle\s+review\b/i.test(reviewSubtype || "")) {
        return "google_review";
    }
    switch (theme) {
        case "promo_offer":
            return "promo";
        case "highlight":
            return "highlight";
        case "review_collection":
            return "testimonial";
        case "behind_scenes":
            return "bts";
        case "engagement":
            return "engagement";
        case "growth_push":
            return "growth";
        case "track_improve":
        default:
            return "track";
    }
}
function buildSlotsForCaption(input: DayBuilderInput, theme: ThemeKey, reviewSubtype: string, visualBullets?: string[]): CaptionSlots {
    const { ctx, product, weekend } = input;
    const cityTrim = ctx.city.trim();
    const locationPhrase = cityTrim ? ` in ${cityTrim}` : "";
    const activationKeyEarly = captionActivation(theme, reviewSubtype);
    const audience = ctx.targetCustomers || "our customers nearby";
    const pricePhrase = ctx.priceRange.trim()
        ? `Pricing fits what you asked for (${ctx.priceRange}) — ping us for the exact quote.`
        : "";
    const deadlinePhrase = weekend ? "this weekend only" : "this week";
    const offerLines: Record<ThemeKey, string> = {
        promo_offer: `A sharper ${product} bundle with real savings${locationPhrase}.`,
        highlight: `The details that make ${product} easy to trust and reorder.`,
        review_collection: activationKeyEarly === "google_review"
            ? `Happy ${product} guests still tell friends first — Maps stars make it official.`
            : `Honest praise from people who already chose ${product} with ${ctx.businessName}.`,
        behind_scenes: `${ctx.businessName} keeps quality tight before ${product} ever reaches you.`,
        engagement: `We want your preference on ${product} so tomorrow’s lineup matches demand.`,
        growth_push: `Limited windows for ${product} — first replies get priority${locationPhrase}.`,
        track_improve: `${ctx.businessName} tightened how we serve ${product} ${deadlinePhrase}.`,
    };
    const benefitLines: Record<ThemeKey, string> = {
        promo_offer: `You skip guesswork — one clear perk on ${product} for busy ${audience}.`,
        highlight: `Clear benefits for ${audience} who care about dependable ${ctx.businessType} service.`,
        review_collection: `Social proof beats promises — hear it straight from neighbours around ${cityTrim || "town"}.`,
        behind_scenes: `Peace of mind: you see the care behind every ${product} hand-off.`,
        engagement: `Your vote steers bundles, timings, or flavours everyone wants next.`,
        growth_push: `Serious buyers move fast — this push keeps queues fair.`,
        track_improve: `We listened, adjusted, and the next drops feel smoother for loyal guests.`,
    };
    const proofLines: Record<ThemeKey, string> = {
        promo_offer: `Busy families grab ${product} here because turnaround stays honest.`,
        highlight: `${product} earns repeat visits — that’s why it leads today’s feed.`,
        review_collection: activationKeyEarly === "google_review"
            ? googleReviewProofLine(product)
            : `“Friendly team, straightforward ${product} — worth coming back.”`,
        behind_scenes: `Lighting, plating, prep — tiny details visible in-frame build trust.`,
        engagement: `${audience.split(",")[0] || "Locals"} voted last time — we folded it into the menu.`,
        growth_push: `Inventory and slots refresh daily so nobody waits on empty promises.`,
        track_improve: `Numbers up on satisfaction — we doubled down where it mattered for ${product}.`,
    };
    let postBriefNatural = `${ctx.businessName}${locationPhrase} lines up today's ${product} story with ${deadlinePhrase} momentum.`;
    switch (activationKeyEarly) {
        case "promo":
            postBriefNatural = `Feed spotlight: ${product} offer customers can redeem fast${locationPhrase}.`;
            break;
        case "highlight":
            postBriefNatural = `Highlight reel covers why ${product} fits ${audience}.`;
            break;
        case "testimonial":
            postBriefNatural = `Customer rave about ${product} — pull quote vibes, warm tone${locationPhrase}.`;
            break;
        case "google_review":
            postBriefNatural = `Gentle nudge so happy guests leave love on Maps for ${product}.`;
            break;
        case "bts":
            postBriefNatural = `Peek behind prep and packaging for ${product}.`;
            break;
        case "engagement":
            postBriefNatural = `Light poll vibe on ${product} choices for ${audience}.`;
            break;
        case "growth":
            postBriefNatural = `Momentum push — ${product}, limited commitment window${locationPhrase}.`;
            break;
        case "track":
            postBriefNatural = `Honest recap: what shifted for ${product} and what improves next sprint.`;
            break;
        default:
            break;
    }
    return {
        businessName: ctx.businessName,
        locationPhrase,
        city: cityTrim,
        product,
        businessType: ctx.businessType || "business",
        targetAudience: audience,
        offerLine: offerLines[theme],
        benefitLine: benefitLines[theme],
        proofLine: proofLines[theme],
        deadlinePhrase,
        pricePhrase,
        postBriefNatural,
        visualWatchLine: deriveVisualWatchLine(product, visualBullets),
        cta: "",
    };
}
function googleReviewProofLine(product: string): string {
    return `Friendly service moments right after trying ${product} — that goodwill travels fastest on Maps.`;
}
function buildVisualWatchLine(product: string): string {
    return `Warm, well-lit visuals of ${product} with tidy text overlays so scrolling thumbs stop naturally.`;
}
function deriveVisualWatchLine(product: string, hints?: string[]): string {
    if (!hints?.some((x) => x.trim()))
        return buildVisualWatchLine(product);
    const clean = (s: string) => s
        .replace(/^(Show|Capture|Include|Post|Record|Share|Publish|Use|Frame\s*\d+)\s*[:\-.]?\s*/i, "")
        .trim();
    const a = clean(hints[0]!) || `${product}, front-lit and crisp`;
    const b = clean(hints[1] ?? "") || `Bold line naming the payoff and your next tap`;
    return `Audience sees ${a.charAt(0).toLowerCase() + a.slice(1)}, then ${b.charAt(0).toLowerCase() + b.slice(1)}.`;
}
function assembleCaptionTriple(activation: CaptionActivationKey, format: CaptionFormatKey, slots: CaptionSlots, variant: number): {
    hook: string;
    value: string;
    specific: string;
} {
    const { businessName, locationPhrase, product, offerLine, benefitLine, proofLine, deadlinePhrase, visualWatchLine, postBriefNatural } = slots;
    const brandedOpen = `${businessName}${locationPhrase}`;
    const v = variant % 8;
    const pick = (): {
        hook: string;
        value: string;
        specific: string;
    } => {
        switch (activation) {
            case "promo":
                return [
                    { hook: `${brandedOpen} — ${deadlinePhrase} perk loading`, value: `${benefitLine}`, specific: `${offerLine} Looks like ${visualWatchLine.replace(/^Looks like /i, "")}` },
                    {
                        hook: `${deadlinePhrase.charAt(0).toUpperCase() + deadlinePhrase.slice(1)} at ${businessName}${locationPhrase}`,
                        value: `${benefitLine}`,
                        specific: `${postBriefNatural.split(" — ")[0]}. Frames show ${visualWatchLine.toLowerCase()}`,
                    },
                    { hook: `${product} spotlight${locationPhrase}? ${businessName} has answers`, value: `${offerLine}`, specific: `${proofLine}` },
                    { hook: `Saved you a seat for ${product} wins`, value: `${benefitLine}`, specific: `${offerLine}` },
                    {
                        hook: `${businessName}${locationPhrase} keeps ${product} simple`,
                        value: `${benefitLine}`,
                        specific: `${proofLine}`,
                    },
                    { hook: `Craving smoother ${product} runs? ${brandedOpen}`, value: `${offerLine}`, specific: `${visualWatchLine}` },
                    {
                        hook: `${product} hype, ${deadlinePhrase}`,
                        value: `${benefitLine}`,
                        specific: `${postBriefNatural}`,
                    },
                    { hook: `Locals asked — we listened${locationPhrase}`, value: `${offerLine}`, specific: `${proofLine}` },
                ][v % 8];
            case "highlight":
                return [
                    { hook: `Why everyone keeps tagging ${businessName}`, value: `${benefitLine}`, specific: `${product} detail + ${visualWatchLine.toLowerCase()}` },
                    { hook: `${product}, explained the calm way`, value: `${postBriefNatural}`, specific: `${proofLine}` },
                    { hook: `${brandedOpen} breaks down ${product}`, value: `${benefitLine}`, specific: `${offerLine.replace(/^A sharper /i, "").trimStart()}` },
                    {
                        hook: `Two truths about ${product}`,
                        value: `${benefitLine}`,
                        specific: `${visualWatchLine}`,
                    },
                    { hook: `${businessName}${locationPhrase} loves clarity`, value: `${postBriefNatural}`, specific: `${proofLine}` },
                    { hook: `Here’s ${product}, without fluff`, value: `${benefitLine}`, specific: `${offerLine}` },
                    { hook: `Proof > promises`, value: `${proofLine}`, specific: `${postBriefNatural}` },
                    { hook: `Stop scrolling — ${product} worth knowing`, value: `${benefitLine}`, specific: `${visualWatchLine}` },
                ][v % 8];
            case "testimonial":
                return [
                    {
                        hook: `${brandedOpen} — here's real love on ${product}`,
                        value: `${benefitLine}`,
                        specific: `${proofLine} On-screen mood matches ${visualWatchLine.slice(0, 1).toLowerCase()}${visualWatchLine.slice(1)}`,
                    },
                    { hook: `Real humans, real ${product} moments`, value: `${postBriefNatural}`, specific: `${proofLine}` },
                    { hook: `They said what we couldn't hype ourselves`, value: `${benefitLine}`, specific: `${offerLine}` },
                    { hook: `${product} wins hit different when it's unscripted`, value: `${proofLine}`, specific: `${visualWatchLine}` },
                    {
                        hook: `${businessName}${locationPhrase}? These words say it`,
                        value: `${benefitLine}`,
                        specific: `${postBriefNatural}`,
                    },
                    { hook: `If you wondered about ${product}…`, value: `${offerLine}`, specific: `${proofLine}` },
                    { hook: `Community receipts`, value: `${benefitLine}`, specific: `${postBriefNatural}` },
                    {
                        hook: `Here’s what customers notice first`,
                        value: `${benefitLine}`,
                        specific: `${proofLine} — frames lean into ${visualWatchLine.toLowerCase()}`,
                    },
                ][v % 8];
            case "google_review":
                return [
                    {
                        hook: `Loved ${product} recently${locationPhrase}?`,
                        value: `${benefitLine}`,
                        specific: `${businessName} grows when kind words land on Maps — DM us for your review shortcut link.`,
                    },
                    {
                        hook: `${brandedOpen} runs on goodwill`,
                        value: `Stars help neighbours pick ${product} faster.`,
                        specific: `If we earned it, swing by Google Reviews — need the link? Message us.`,
                    },
                    {
                        hook: `${product} crews thrive on shout-outs`,
                        value: `${benefitLine}`,
                        specific: `Two taps after your visit keeps us visible ${locationPhrase}.`,
                    },
                    { hook: `Quick favour`, value: `${benefitLine}`, specific: `${businessName} review link via DM — painless promise.` },
                    { hook: `Maps love = more tables${locationPhrase}`, value: `${proofLine}`, specific: `${postBriefNatural}` },
                    {
                        hook: `Share the vibe online`,
                        value: `${benefitLine}`,
                        specific: `${businessName}: ask for review link anytime.`,
                    },
                    { hook: `Good energy travels`, value: `${offerLine}`, specific: testimonialDmCta(product) },
                    {
                        hook: `${product} gang — thanks first`,
                        value: `${benefitLine}`,
                        specific: `${googleReviewProofLine(product)}`,
                    },
                ][v % 8];
            case "bts":
                return [
                    { hook: `Come backstage with ${businessName}`, value: `${benefitLine}`, specific: `${postBriefNatural}` },
                    { hook: `How ${product} gets love before you see it`, value: `${offerLine}`, specific: `${visualWatchLine}` },
                    { hook: `Trust lives in the small steps`, value: `${proofLine}`, specific: `${postBriefNatural}` },
                    { hook: `${brandedOpen} keeps standards loud`, value: `${benefitLine}`, specific: `${offerLine}` },
                    { hook: `No smoke, just process`, value: `${postBriefNatural}`, specific: `${visualWatchLine}` },
                    { hook: `BTS = peace of mind`, value: `${benefitLine}`, specific: `${proofLine}` },
                    { hook: `You asked for honesty`, value: `${offerLine}`, specific: `${postBriefNatural}` },
                    { hook: `${product} prep, unfiltered`, value: `${benefitLine}`, specific: `${visualWatchLine}` },
                ][v % 8];
            case "engagement":
                return [
                    { hook: `Quick pulse check`, value: `${postBriefNatural}`, specific: `Option A: classic ${product}. Option B: chef’s twist.` },
                    { hook: `Two flavours, one decision`, value: `${benefitLine}`, specific: `Tap your vote + tell us why.` },
                    { hook: `Help ${businessName} choose`, value: `${offerLine}`, specific: `Comment A or B — we read every note.` },
                    { hook: `Weekend mood?`, value: `${postBriefNatural}`, specific: `Which ${product} combo should return?` },
                    { hook: `Ask the crew`, value: `${benefitLine}`, specific: `Tap your vote + drop a quick DM so we know what to prep.` },
                    { hook: `Crowdsource the menu`, value: `${offerLine}`, specific: `${visualWatchLine}` },
                    { hook: `You drive the next drop`, value: `${postBriefNatural}`, specific: `${proofLine}` },
                    { hook: `Two paths for ${product}`, value: `${benefitLine}`, specific: `Vote on what ${audienceStub(slots)} wants next.` },
                ][v % 8];
            case "growth":
                return [
                    { hook: `${deadlinePhrase.toUpperCase()} momentum`, value: `${offerLine}`, specific: `${proofLine}` },
                    { hook: `${product} slots tightening${locationPhrase}`, value: `${benefitLine}`, specific: `${postBriefNatural}` },
                    { hook: `${businessName} is prioritising serious buyers`, value: `${offerLine}`, specific: `${visualWatchLine}` },
                    { hook: `Don't sleep on ${product}`, value: `${benefitLine}`, specific: `${proofLine}` },
                    { hook: `Inventory truth hour`, value: `${postBriefNatural}`, specific: `${offerLine}` },
                    { hook: `Move now, thank later`, value: `${benefitLine}`, specific: `${proofLine}` },
                    { hook: `${brandedOpen} push day`, value: `${offerLine}`, specific: `${postBriefNatural}` },
                    { hook: `Limited lane open`, value: `${benefitLine}`, specific: `${visualWatchLine}` },
                ][v % 8];
            case "track":
            default:
                return [
                    { hook: `${businessName} week in motion${locationPhrase}`, value: `${postBriefNatural}`, specific: `${proofLine}` },
                    { hook: `Honest brand chat`, value: `${benefitLine}`, specific: `${offerLine}` },
                    { hook: `What changed for ${product}`, value: `${postBriefNatural}`, specific: `${visualWatchLine}` },
                    { hook: `Progress > perfection`, value: `${proofLine}`, specific: `${benefitLine}` },
                    { hook: `Thanks for riding with us`, value: `${postBriefNatural}`, specific: `${offerLine}` },
                    { hook: `Next chapter loading`, value: `${benefitLine}`, specific: `${proofLine}` },
                    { hook: `${brandedOpen} recap`, value: `${postBriefNatural}`, specific: `${visualWatchLine}` },
                    { hook: `We're doubling down`, value: `${offerLine}`, specific: `${proofLine}` },
                ][v % 8];
        }
    };
    return pick();
}
function audienceStub(slots: CaptionSlots): string {
    return slots.targetAudience.split(/[,&]/)[0]?.trim() || "regulars";
}
function testimonialDmCta(product: string): string {
    return `Tell us "${product}" in DMs — we'll send your Google Maps link while it's fresh.`;
}
function formatCaptionBody(format: CaptionFormatKey, hook: string, value: string, specific: string, cta: string, slots: CaptionSlots): string {
    const priceTail = slots.pricePhrase ? ` ${slots.pricePhrase}` : "";
    const baseValue = `${value}${priceTail}`.trim();
    switch (format) {
        case "Story":
            return clipEmojis(`${hook}\n${baseValue}\n${cta}`.trim(), 2);
        case "Reel":
            return clipEmojis(`${hook}\n• ${value}\n• ${specific}\n${cta}`.trim(), 2);
        case "Carousel":
            return clipEmojis(`${hook}\nSlide 1 — ${value}\nSlide 2 — ${specific}\nSlide 3 — ${slots.postBriefNatural}\nSlide 4 — ${slots.proofLine}\nSlide 5 — ${slots.offerLine}\n${cta}`.trim(), 2);
        case "Feed":
        default:
            return clipEmojis(`${hook}\n${baseValue}\n${specific}\n${cta}`.trim(), 2);
    }
}
function buildPublishableCaptionBundle(args: {
    theme: ThemeKey;
    format: CaptionFormatKey;
    input: DayBuilderInput;
    reviewSubtype: string;
    cta: string;
    hashtagCandidates: string[];
    variantBase: number;
    visualGuideHints?: string[];
}): {
    caption: string;
    hashtags: string[];
    postBriefUi: string;
    hookUi: string;
    visualGuide: string[];
} {
    const activation = captionActivation(args.theme, args.reviewSubtype);
    const slots = buildSlotsForCaption(args.input, args.theme, args.reviewSubtype, args.visualGuideHints);
    slots.cta = args.cta;
    const hashtags = sanitizeHashtagList(args.hashtagCandidates, 6, 10);
    const brandName = args.input.ctx.businessName;
    const brandCity = args.input.ctx.city ?? "";
    let body = "";
    for (let attempt = 0; attempt < 12; attempt += 1) {
        const triple = assembleCaptionTriple(activation, args.format, slots, args.variantBase + attempt);
        body = formatCaptionBody(args.format, triple.hook, triple.value, triple.specific, args.cta, slots);
        if (captionPassesChecks(body, args.format, args.cta, brandName, brandCity))
            break;
    }
    if (!captionPassesChecks(body, args.format, args.cta, brandName, brandCity)) {
        body = formatCaptionBody(args.format, `${slots.businessName}${slots.locationPhrase} — ${slots.product} update`, slots.benefitLine, `${slots.postBriefNatural} ${slots.visualWatchLine}`, args.cta, slots);
    }
    const tagLine = hashtags.join(" ");
    const caption = `${body}\n\n${tagLine}`;
    const postBriefUi = slots.postBriefNatural;
    const hookUi = captionBodyMinusHashtags(body).split("\n")[0] || tripleHookFallback(slots);
    const hinted = args.visualGuideHints?.map((x) => x.trim()).filter(Boolean) ?? [];
    const visualGuide = hinted.length > 0
        ? hinted.slice(0, 2)
        : [slots.visualWatchLine, `Keep ${slots.product} well lit with CTA readable before thumbs scroll away.`];
    return { caption, hashtags, postBriefUi, hookUi, visualGuide };
}
function tripleHookFallback(slots: CaptionSlots): string {
    return `${slots.businessName}${slots.locationPhrase} — ${slots.product}`;
}
function cleanActivationText(value: string): string {
    return value
        .replace(/\s+/g, " ")
        .replace(/\s+([,.!?;:])/g, "$1")
        .replace(/\b(optional|support content|activation)\s*[:\-]\s*/gi, "")
        .trim();
}
function activationFeatureLine(value: string): string {
    return cleanActivationText(value)
        .replace(/^(feed|story|reel|carousel)\s+(offer\s+card|post|reminder|explaining|announcement|update|prompt|tile|graphic)\s*[:\-]?\s*/i, "")
        .replace(/^(one\s+)?(post|share|publish|create|show)\s+(a|an|the)?\s*/i, "")
        .replace(/\s*\+\s*/g, " + ")
        .trim();
}
function buildPostIdeaFromActivation(args: {
    format: CaptionFormatKey;
    whatToPost: string;
    visualGuide: string[];
}): string {
    const source = cleanActivationText(args.whatToPost || args.visualGuide[0] || "Share today's offer with a clear CTA.");
    const withoutInstruction = activationFeatureLine(source)
        .replace(/^(one|short|feed|story|reel|carousel)\s+/i, "")
        .replace(/\bpost\b/gi, "feature")
        .trim();
    const lineOne = `${args.format} idea: ${withoutInstruction.charAt(0).toUpperCase()}${withoutInstruction.slice(1)}`;
    const lineTwo = args.visualGuide[0] ? `Show it with ${cleanActivationText(args.visualGuide[0]).replace(/\.$/, "").toLowerCase()}.` : "";
    return [lineOne, lineTwo].filter(Boolean).join("\n");
}
function extractHashtagSeeds(...values: string[]): string[] {
    const stop = new Set(["with", "from", "today", "your", "this", "that", "into", "clear", "post", "story", "feed", "reel", "carousel", "whatsapp", "message"]);
    return values
        .join(" ")
        .split(/[^a-zA-Z0-9]+/g)
        .map((word) => word.trim())
        .filter((word) => word.length >= 4 && !stop.has(word.toLowerCase()))
        .slice(0, 8)
        .map(toHashTag)
        .filter(Boolean);
}
function buildActivationHashtags(args: {
    category: CategoryKey;
    ctx: TemplateContext;
    product: string;
    whatToPost: string;
    postIdea: string;
}): string[] {
    const categoryTag = args.category === "food"
        ? "#FoodBusinessLK"
        : args.category === "retail"
            ? "#ShopSriLanka"
            : args.category === "salon"
                ? "#SalonSriLanka"
                : args.category === "education"
                    ? "#TuitionSriLanka"
                    : args.category === "services"
                        ? "#ServiceBusinessLK"
                        : "#LocalBusinessLK";
    const seeds = [
        ...categoryHashtags[args.category],
        categoryTag,
        toHashTag(args.ctx.city),
        toHashTag(args.ctx.businessType),
        toHashTag(args.product),
        ...extractHashtagSeeds(args.whatToPost, args.postIdea),
        "#SriLanka",
        "#SmallBusinessLK",
        "#BizBoostAI",
    ];
    return sanitizeHashtagList(seeds.filter(Boolean), 8, 12);
}
function buildCaptionFromActivation(args: {
    format: CaptionFormatKey;
    platform: "Instagram" | "Facebook" | "Both";
    bestTime: string;
    hookLine: string;
    postIdea: string;
    whatToPost: string;
    visualGuide: string[];
    cta: string;
    ctx: TemplateContext;
    hashtags: string[];
}): string {
    const location = args.ctx.city.trim() ? ` in ${args.ctx.city.trim()}` : "";
    const brandLine = `${args.ctx.businessName}${location}`;
    const feature = activationFeatureLine(args.whatToPost || args.postIdea).replace(/\.$/, "");
    const hook = cleanActivationText(args.hookLine) || `${brandLine}: ${feature}`;
    const visualLine = args.visualGuide[0] ? cleanActivationText(args.visualGuide[0]).replace(/\.$/, "") : "simple visuals, clear benefit, and direct contact details";
    const urgency = /\blimited|deadline|cutoff|few|stock|slots|today|weekend\b/i.test(feature)
        ? "Limited window, so message early if this fits you."
        : "";
    const cta = cleanActivationText(args.cta || "DM or WhatsApp us to order, book, or ask for details.");
    const tagLine = args.hashtags.join(" ");
    let body = "";
    switch (args.format) {
        case "Reel":
            body = `${hook}\nQuick look: ${feature}.\nYou will see ${visualLine.toLowerCase()}.\n${urgency ? `${urgency}\n` : ""}${cta}`;
            break;
        case "Carousel":
            body = `${hook}\nSlide 1: ${feature}.\nSlide 2: Why it helps customers choose faster.\nSlide 3: ${visualLine}.\n${urgency ? `${urgency}\n` : ""}${cta}`;
            break;
        case "Story":
            body = `${hook}\n${feature}.\nReply here or tap DM if you want details.\n${urgency ? `${urgency}\n` : ""}${cta}`;
            break;
        case "Feed":
        default:
            body = `${hook}\n${feature}.\n${brandLine} is keeping it simple: clear value, clear next step.\n${urgency ? `${urgency}\n` : ""}${cta}`;
            break;
    }
    return `${clipEmojis(body.trim(), 2)}\n\n${tagLine}`;
}
function buildActivationMatchedPostBundle(args: {
    category: CategoryKey;
    ctx: TemplateContext;
    product: string;
    format: CaptionFormatKey;
    platform: "Instagram" | "Facebook" | "Both";
    bestTime: string;
    hookLine: string;
    whatToPost: string;
    visualGuide: string[];
    cta: string;
    postIdeaOverride?: string;
}): {
    postIdea: string;
    caption: string;
    hashtags: string[];
    hookUi: string;
} {
    const visualGuide = args.visualGuide.map(cleanActivationText).filter(Boolean).slice(0, 3);
    const postIdea = args.postIdeaOverride ?? buildPostIdeaFromActivation({
        format: args.format,
        whatToPost: args.whatToPost,
        visualGuide,
    });
    const hashtags = buildActivationHashtags({
        category: args.category,
        ctx: args.ctx,
        product: args.product,
        whatToPost: args.whatToPost,
        postIdea,
    });
    const caption = buildCaptionFromActivation({
        format: args.format,
        platform: args.platform,
        bestTime: args.bestTime,
        hookLine: args.hookLine,
        postIdea,
        whatToPost: args.whatToPost,
        visualGuide,
        cta: args.cta,
        ctx: args.ctx,
        hashtags,
    });
    const hookTrim = cleanActivationText(args.hookLine).slice(0, 160);
    const hookUi = hookTrim || captionBodyMinusHashtags(caption).split("\n")[0] || postIdea.split("\n")[0] || "";
    return { postIdea, caption, hashtags, hookUi };
}
function variantValue<T>(items: T[], input: DayBuilderInput): T {
    return items[(input.weekIndex + input.variantIndex) % items.length];
}
function stepTemplateSignature(steps: string[]): string {
    return steps.map((step) => step.toLowerCase().replace(/\s+/g, " ").trim()).join("|");
}
function rememberRecent<T>(items: T[], value: T): T[] {
    return [...items, value].slice(-5);
}
function maxSimilarActions(planDays: number): number {
    return planDays >= 30 ? 4 : 2;
}
function promoOfferType(input: DayBuilderInput): string {
    const types = ["discount-bundle", "referral-free-add-on", "limited-package-upsell", "giveaway-loyalty"] as const;
    return types[input.weekIndex % 4];
}
function reviewPostFormat(input: DayBuilderInput): string {
    return variantValue(["video review", "photo and quote", "Google review request", "story testimonial"], input);
}
function engagementPostFormat(input: DayBuilderInput): string {
    return variantValue(["poll", "Q&A", "quiz", "this-or-that", "comment-to-get-template"], input);
}
function growthPushFormat(input: DayBuilderInput): string {
    const growthTitles: Record<CategoryKey, string[]> = {
        food: ["pre-order combo push", "weekend event teaser", "upsell script rollout", "limited menu drop"],
        retail: ["limited-stock alert", "COD delivery push", "cart recovery follow-up", "restock waitlist drive"],
        salon: ["booking slots push", "loyalty rebooking drive", "before-after appointment campaign", "package upgrade push"],
        services: ["lead magnet launch", "free consultation push", "appointment slots campaign", "case study lead drive"],
        education: ["trial class push", "parent inquiry follow-up", "exam batch enrolment drive", "attendance recovery push"],
        generic: ["limited slots campaign", "referral push", "live demo invite", "follow-up lead drive"],
    };
    return variantValue(growthTitles[input.category], input);
}
function highlightPostFormat(input: DayBuilderInput): string {
    return variantValue(["benefit spotlight", "problem-solution spotlight", "trust-point spotlight", "comparison spotlight"], input);
}
function behindScenesPostFormat(input: DayBuilderInput): string {
    return variantValue(["process reel", "quality-check story", "team workflow", "tools-and-prep walkthrough"], input);
}
function trackPostFormat(input: DayBuilderInput): string {
    return input.planDays >= 30 && (input.dayNumber === 21 || input.dayNumber === 28)
        ? "retention checkpoint"
        : variantValue(["KPI review", "content review", "offer adjustment", "next-week prep"], input);
}
function repeatMetadata(theme: ThemeKey, input: DayBuilderInput, output: DayBuilderOutput): RepeatMetadata {
    const offerType = theme === "promo_offer"
        ? promoOfferType(input)
        : theme === "growth_push"
            ? growthPushFormat(input)
            : theme === "track_improve" && input.planDays >= 30 && (input.dayNumber === 21 || input.dayNumber === 28)
                ? "retention-loyalty"
                : theme;
    const postFormat = theme === "review_collection"
        ? reviewPostFormat(input)
        : theme === "engagement"
            ? engagementPostFormat(input)
            : theme === "growth_push"
                ? growthPushFormat(input)
                : theme === "highlight"
                    ? highlightPostFormat(input)
                    : theme === "behind_scenes"
                        ? behindScenesPostFormat(input)
                        : theme === "track_improve"
                            ? trackPostFormat(input)
                            : offerType;
    const stepTemplate = stepTemplateSignature(output.executionSteps ?? []);
    return {
        offerType,
        postFormat,
        stepTemplate,
        similarityKey: `${offerType}:${postFormat}`,
    };
}
function shouldTryAnotherVariant(theme: ThemeKey, metadata: RepeatMetadata, memory: RepeatMemory, usedTitles: Set<string>, title: string, planDays: number): boolean {
    const exactTitleAlreadyUsed = usedTitles.has(title.trim().toLowerCase());
    const repeatedRecentSteps = memory.recentStepTemplates.includes(metadata.stepTemplate);
    const sameRecentAngle = memory.recentThemes.includes(theme) &&
        memory.recentOfferTypes.includes(metadata.offerType) &&
        (memory.similarityCounts[metadata.similarityKey] ?? 0) >= maxSimilarActions(planDays);
    return exactTitleAlreadyUsed || repeatedRecentSteps || sameRecentAngle;
}
function weekendNote(category: CategoryKey): string {
    if (category === "food")
        return "Weekend adaptation: use this as a weekend special, tasting event, or dine-in/takeaway push.";
    return "Weekend equivalent: use this as a booking push, flash sale, referral push, workshop, live demo, or limited-slots campaign.";
}
function buildPromoDay(input: DayBuilderInput): DayBuilderOutput {
    const { ctx, category, product, weekend, planDays } = input;
    const offerType = promoOfferType(input);
    const location = withLocation(ctx);
    const retentionOffer = planDays >= 30 && offerType === "giveaway-loyalty";
    const vTag = ["", " · set B", " · set C"][input.variantIndex % 3];
    if (offerType === "discount-bundle") {
        const titleByCategory: Record<CategoryKey, string> = {
            food: `Time-boxed ${product} bundle + counter upsell${vTag}`,
            retail: `Discount bundle push for ${product} (COD / delivery ready)${vTag}`,
            salon: `${product} service bundle + add-on at checkout${vTag}`,
            services: `Starter ${product} bundle (scoped hours / deliverables)${vTag}`,
            education: `Trial ${product} class + monthly enrolment path${vTag}`,
            generic: `Launch a ${product} bundle with a hard deadline${vTag}`,
        };
        return {
            mainActionTitle: titleByCategory[category],
            businessGrowthAction: category === "retail"
                ? `Protect margin while moving stock: one bundle SKU, clear COD/delivery rule, and follow-up on abandoned carts / DMs.`
                : `Increase average ticket with a defined bundle for ${product}, trained staff cues, and tracked redemptions${location}.`,
            executionSteps: category === "food"
                ? [
                    `Pick one ${product} combo with a healthy margin and pair a profitable drink or add-on.`,
                    "Update counter menu, QR/order sheet, and POS shortcut so staff ring it in one tap.",
                    "Train a 2-sentence upsell: when someone orders the hero item, offer the bundle upgrade.",
                    "Send WhatsApp to 15–30 regulars with the bundle name, price, and cutoff time.",
                    "Log bundles sold vs. baseline day (sheet or notebook).",
                ]
                : category === "retail"
                    ? [
                        `Choose bundle SKUs for ${product} with stock counts and a firm cut-off time.`,
                        "Update shop banner, product page, and checkout note for COD/Delivery areas.",
                        "Script WhatsApp replies: price, what’s included, how to pay, delivery slot.",
                        "Call or message 10 warm leads who asked before but didn’t buy.",
                        "Track bundle units sold and return rate vs. non-promo days.",
                    ]
                    : [
                        `Define one bundled scope for ${product} (what’s in / out) and price it as a package.`,
                        "Add a booking or invoice line item staff must select when selling the package.",
                        "Brief the team on qualification questions so the right buyers pick the bundle.",
                        "Email or WhatsApp past clients who fit the package profile.",
                        "Record package sales and attach margin notes.",
                    ],
            postIdea: `Promo tile: ${product} bundle, price, deadline, WhatsApp CTA — adapted for your main channel.`,
            caption: `Special ${product} bundle this week at ${ctx.businessName}${location}. Message us for details before the window closes.`,
            posterHint: `${product.toUpperCase()} BUNDLE · Save more this week · ${ctx.businessName}`,
            hashtags: [...baseHashtags, ...categoryHashtags[category], "#Offer"],
            successMetric: `Orders/bookings from the offer, average ticket, and qualified replies (${ctx.budgetText || "budget-aware execution"}).`,
            notes: weekend ? weekendNote(category) : undefined,
        };
    }
    if (offerType === "referral-free-add-on") {
        return {
            mainActionTitle: category === "services"
                ? `Refer-one free consult / audit for ${product}${vTag}`
                : `Bring-a-friend free add-on on ${product}${vTag}`,
            businessGrowthAction: category === "services"
                ? `Grow pipeline with a referral pair-reward: easy to explain, easy to track in WhatsApp.`
                : `Turn existing buyers into promoters: small free add-on, clear rules, referral keyword.`,
            executionSteps: [
                "Write the referral rule in one line (who counts, what they get, how to claim).",
                category === "services"
                    ? "Create a 15-minute consult or mini-audit template so the gift doesn’t burn time."
                    : `Pick a low-cost add-on that pairs with ${product} (sample, topping, extended warranty, extra glaze).`,
                "Send the offer to last 20–40 happy customers with a copy-paste forward message.",
                "Track referrals in a 3-column sheet: referrer, new name, outcome (booked/bought).",
                "Thank every referrer within 24 hours to reinforce the behaviour.",
            ],
            postIdea: `Activation graphic: “Refer a friend → both get ___” with your WhatsApp link.`,
            caption: `Love ${product}? Refer someone to ${ctx.businessName} this week — we’ve got a thank-you for both of you. Ask for details on WhatsApp.`,
            posterHint: `REFER & REWARD · ${product} · WhatsApp us`,
            hashtags: [...baseHashtags, ...categoryHashtags[category], "#ReferralOffer"],
            successMetric: `Counted referrals, new leads named, and conversions from referral traffic (team capacity: ${ctx.teamSize || "lean"}).`,
            notes: weekend ? weekendNote(category) : undefined,
        };
    }
    if (offerType === "limited-package-upsell") {
        return {
            mainActionTitle: `Limited ${product} package + upsell line${vTag}`,
            businessGrowthAction: category === "retail"
                ? `Move paired SKUs before restock: package, stock cap, and upsell before payment.`
                : `Raise AOV: premium step-up bundled with ${product}, limited slots or inventory.`,
            executionSteps: [
                "Write the package as a single line item with 3 bullets: outcome, duration/stock, price.",
                category === "salon" || category === "services"
                    ? "Block 6–10 appointment slots only for this package so scarcity is real."
                    : "Set a visible stock or time cap at the register and online.",
                "Add an upsell prompt at payment: “Add ___ for Rs.___ today only.”",
                "Script DM/WhatsApp for warm leads who have asked about this service before.",
                `Tally package uptake vs. standard ${product} sales.`,
            ],
            postIdea: `Announcement post/reel hook: premium tier, real cap, CTA to WhatsApp/Book.`,
            caption: `${ctx.businessName}: limited ${product} package — upgrade while slots last. Message us to hold yours.`,
            posterHint: `LIMITED PACKAGE · ${product} · Few slots left`,
            hashtags: [...baseHashtags, ...categoryHashtags[category], "#LimitedOffer"],
            successMetric: "Package units sold, upsell attach rate, and booking/order value vs. baseline.",
            notes: weekend ? weekendNote(category) : undefined,
        };
    }
    return {
        mainActionTitle: retentionOffer ? `Loyalty perk for returning buyers / bookers${vTag}` : `Giveaway → lead list for ${product}${vTag}`,
        businessGrowthAction: retentionOffer
            ? `Bring repeat revenue: thank high-frequency customers with a controlled perk on ${product}.`
            : `Fill top-of-funnel: contest rules that still capture phone/email/WhatsApp for follow-up.`,
        executionSteps: retentionOffer
            ? [
                "Export or list customers with 2+ purchases/bookings in 90 days.",
                "Pick a perk that protects margin (priority slot, small upgrade, not blanket discount).",
                "Send personal WhatsApp with their name and the perk code.",
                "Train staff to redeem with a checkmark in your tracker.",
                "Measure repeat visits or second purchase within 14 days.",
            ]
            : [
                `Choose one prize tied to ${product} so entrants are qualified leads.`,
                "Rules: comment + WhatsApp keyword OR Google form with phone — avoid empty vanity entries.",
                "Reply to every entry within a day with a soft second offer.",
                "Save entries in a spreadsheet for outbound next week.",
                "Count qualified leads and cost per lead vs. a normal day.",
            ],
        postIdea: retentionOffer ? "Thank-you tile: loyal customers first, soft CTA to book/buy again." : "Contest tile: prize + how to enter + deadline.",
        caption: retentionOffer
            ? `Our regulars at ${ctx.businessName} make everything possible — a small thank-you is waiting for you this week.`
            : `Giveaway time at ${ctx.businessName} around ${product}. Join and we’ll follow up with something useful even if you don’t win.`,
        posterHint: retentionOffer ? `THANK YOU, REGULARS · ${ctx.businessName}` : `GIVEAWAY · ${product} · Enter now`,
        hashtags: [...baseHashtags, ...categoryHashtags[category], retentionOffer ? "#LoyaltyOffer" : "#Giveaway"],
        successMetric: retentionOffer
            ? "Repeat orders/bookings; perk redemptions; returning-customer revenue."
            : "Qualified leads captured; WhatsApp/DM conversations started; downstream sales.",
        notes: weekend ? weekendNote(category) : undefined,
    };
}
function buildHighlightDay(input: DayBuilderInput): DayBuilderOutput {
    const { ctx, category, product, weekend } = input;
    const format = highlightPostFormat(input);
    const titleByCategory: Record<CategoryKey, string> = {
        food: `Elevate ${product} as the hero SKU (margin + clarity)`,
        retail: `Position ${product}: stock, delivery, and why buy now`,
        salon: `Clarify ${product} outcome + ideal client + booking path`,
        services: `Sharpen ${product} offer: problem → result → proof`,
        education: `Clarify ${product}: result, grade fit, and enrolment path`,
        generic: `Clarify your core offer: ${product} (${format})`,
    };
    return {
        mainActionTitle: titleByCategory[category],
        businessGrowthAction: category === "retail"
            ? `Win more carts: one hero SKU (${product}), trust on COD/stock, and a single next step to buy.`
            : `Improve conversion on ${product} by tightening how you explain value and remove doubt for ${ctx.targetCustomers || "your buyers"}.`,
        executionSteps: [
            `Lock the hero item/service: ${product} — one primary outcome per pitch.`,
            "Update written materials (menu card, one-pager, quote template) with 3 customer benefits + 1 proof (review, cert, metric).",
            category === "retail"
                ? "Add checkout trust: delivery zones, return/COD line, or ‘ready to ship’ note on the shelf."
                : "Add one operational proof: timeline, guarantee boundary, or before/after example.",
            "Role-play 3 objections with staff and land on one concise answer each.",
            "Track inquiries that mention this SKU and how many close within 48 hours.",
        ],
        postIdea: `Short visual: ${format} — ${product}, one headline benefit, WhatsApp/book CTA (support only).`,
        caption: `${ctx.businessName}: ${product} — built for people who want clear results. Ask us how it works.`,
        posterHint: `${product.toUpperCase()} · Why customers choose us · ${ctx.businessName}`,
        hashtags: [...baseHashtags, ...categoryHashtags[category], "#ProductHighlight"],
        successMetric: `Sales inquiries/bookings mentioning ${product}; chat-to-paid conversion — aligned to goal: ${ctx.businessGoals || "growth"}.`,
        notes: weekend ? weekendNote(category) : undefined,
    };
}
function buildReviewDay(input: DayBuilderInput): DayBuilderOutput {
    const { ctx, category, product, weekend } = input;
    const format = reviewPostFormat(input);
    return {
        mainActionTitle: `Google + WhatsApp review system for ${product}`,
        businessGrowthAction: `Turn happy buyers into public proof: structured asks, saved quotes, and optional activation content.`,
        executionSteps: [
            "Create or update your Google Business review link; print a small counter QR if you have foot traffic.",
            `Script a post-service WhatsApp: thank you + one link + one question about ${product}.`,
            `Collect 3 ${format}s: name permission, exact words, and photo/video if they agree.`,
            "File testimonials in a folder or sheet tagged by product for website and proposals.",
            category === "food" || category === "retail"
                ? "Offer a tiny thank-you (stamp, sample) that doesn’t train customers only to chase freebies."
                : "Add one testimonial line to your quote template or pricing PDF.",
        ],
        postIdea: `Activation: one proof card — quote + name + ${product} — ready for feed or poster.`,
        caption: `Real customers fuel ${ctx.businessName}. Thank you for trusting us with ${product} — your words help the next person decide.`,
        posterHint: `REAL CUSTOMERS · ${product} · Rated at ${ctx.businessName}`,
        hashtags: [...baseHashtags, ...categoryHashtags[category], "#CustomerReview", "#SocialProof"],
        successMetric: "New Google or platform reviews; permissions secured; leads who mention reviews before buying.",
        notes: weekend ? weekendNote(category) : undefined,
    };
}
function buildBehindScenesDay(input: DayBuilderInput): DayBuilderOutput {
    const { ctx, category, product, weekend } = input;
    const format = behindScenesPostFormat(input);
    const titleByCategory: Record<CategoryKey, string> = {
        food: `Hygiene + prep SOP spotlight for ${product}`,
        retail: `Fulfillment quality check before ${product} ships`,
        salon: `Sterilisation & timing standards for ${product}`,
        services: `Delivery workflow: how ${product} gets done on time`,
        education: `Lesson delivery checklist for ${product}`,
        generic: `Process trust pack (${format}) for ${product}`,
    };
    return {
        mainActionTitle: titleByCategory[category],
        businessGrowthAction: `Reduce buyer anxiety with transparent operations: what happens, who checks it, and how you fix issues before they ship.`,
        executionSteps: [
            `Write a 4-step checklist for delivering ${product} (prep → QC → handoff → follow-up).`,
            "Do a live walk-through with staff; assign a backup owner for each step.",
            category === "food"
                ? "Photograph one hygiene/cross-control moment customers rarely see."
                : "Capture one QC checkpoint (measurement, test fit, sign-off).",
            "Optional: short clips for marketing — but primary win is the SOP + training, not the camera.",
            "Add ‘how we fix problems’ line to invoices or WhatsApp confirmations.",
        ],
        postIdea: `Optional BTS ${format}: your checklist in plain language + CTA to book/order ${product}.`,
        caption: `How ${ctx.businessName} delivers ${product}: careful steps, real people. Ask how we can help you today.`,
        posterHint: `TRUST THE PROCESS · ${product} · ${ctx.businessName}`,
        hashtags: [...baseHashtags, ...categoryHashtags[category], "#BehindTheScenes"],
        successMetric: "Fewer ‘is this legit?’ objections; refund/complaint rate; bookings that cite quality or process.",
        notes: weekend ? weekendNote(category) : undefined,
    };
}
function buildEngagementDay(input: DayBuilderInput): DayBuilderOutput {
    const { ctx, category, product, weekend } = input;
    const format = engagementPostFormat(input);
    return {
        mainActionTitle: `Capture demand data (${format}) for ${product}`,
        businessGrowthAction: `Learn what to stock, say, or build next — log responses in a sheet, not only vanity engagement.`,
        executionSteps: [
            `Design one ${format} focused on ${product} (two clear choices or one sharp question).`,
            "Run the same question in-store or via WhatsApp broadcast list — not only a public post.",
            "Reply same-day; tag themes: price objection, timing, flavour, delivery, etc.",
            "Summarize top 2 insights in 3 bullet points in your team chat.",
            "Pick one business action for tomorrow based on the data (offer tweak, inventory, hours).",
        ],
        postIdea: `Support content: ${format} teaser that drives answers to WhatsApp/DM where you can convert.`,
        caption: `We’re planning what’s next at ${ctx.businessName} for ${product}. Tell us what you want — we read every reply.`,
        posterHint: `WE WANT YOUR VOTE · ${product} · Reply/DM`,
        hashtags: [...baseHashtags, ...categoryHashtags[category], "#Engagement"],
        successMetric: `Structured responses logged; at least one inventory/offer/ops change triggered by data from ${ctx.targetCustomers || "target customers"}.`,
        notes: weekend ? weekendNote(category) : undefined,
    };
}
function buildGrowthPushDay(input: DayBuilderInput): DayBuilderOutput {
    const { ctx, category, product, weekend } = input;
    const title = growthPushFormat(input);
    if (weekend && category === "food") {
        return {
            mainActionTitle: `Weekend ${product} event / preorder + table throughput`,
            businessGrowthAction: `Fill Saturday–Sunday: set an on-brand mini-event, preorder slots, or tasting bundle so the kitchen and floor stay profitable.`,
            executionSteps: [
                "Pick one weekend mechanic: tasting board, live brew bar, dine-in set menu, or preorder pickup window.",
                "Cap covers or cups so service quality holds; brief staff on upsell for drink/pairing.",
                "Push WhatsApp list + Google Maps update with hours and ‘today’s special’ line.",
                "Track covers, average ticket, and sell-outs vs. a normal weekend.",
                "Gather 5 quick verbal ‘would you come back?’ notes from tables.",
            ],
            postIdea: `Weekend activation post: event name, time, price anchor, preorder WhatsApp — food-first story.`,
            caption: `Weekend plans at ${ctx.businessName}: ${product} is the star — book or message us before slots fill.`,
            posterHint: `WEEKEND SPECIAL · ${product} · ${ctx.businessName}`,
            hashtags: [...baseHashtags, ...categoryHashtags[category], "#WeekendSpecial", "#GrowthPush"],
            successMetric: "Weekend revenue vs. last weekend; preorders placed; repeat bookings captured.",
            notes: weekendNote(category),
        };
    }
    if (weekend && category !== "food") {
        return {
            mainActionTitle: `Weekend flash: slots / stock / referral on ${product}`,
            businessGrowthAction: `Use the weekend buying window: limited slots, flash stock count, or referral double-side reward — all tracked in WhatsApp.`,
            executionSteps: [
                "Declare one weekend-only constraint (slots left, stock units, or referral bonus).",
                "Message 30–50 warm contacts with a single CTA line and deadline Sunday night.",
                category === "retail"
                    ? "Enable COD pickup or same-day delivery cut-off; write it in the auto-reply."
                    : "Hold 3–5 appointment gaps exclusively for this push.",
                "Log each reply in a pipeline sheet: name → stage → follow-up owner.",
                "Monday review: close loose deals before the offer expires.",
            ],
            postIdea: `Weekend-only tile: scarcity true to ops, not fake — support with SMS/WhatsApp broadcast.`,
            caption: `Weekend window at ${ctx.businessName} for ${product}. Message now — we’ll hold a spot/stock line for serious buyers.`,
            posterHint: `WEEKEND ONLY · ${product} · Act today`,
            hashtags: [...baseHashtags, ...categoryHashtags[category], "#WeekendPush", "#GrowthPush"],
            successMetric: "Qualified leads; paid deposits; cart recoveries — not followers gained.",
            notes: weekendNote(category),
        };
    }
    return {
        mainActionTitle: `${title} for ${product}`,
        businessGrowthAction: category === "food"
            ? `Drive weekday revenue: preorder list, combo discipline, or production batch tied to ${product}.`
            : category === "retail"
                ? `Move ${product} with stock truth, cart recovery calls, and delivery promise you can keep.`
                : category === "services"
                    ? `Fill the calendar for ${product}: lead magnet handoff + call script + deposit step.`
                    : category === "salon"
                        ? `Pack ${product} into a bookable block with clear before/after expectations.`
                        : `Systematic push: referral keyword, limited slots, and logged follow-ups for ${product}.`,
        executionSteps: [
            "Pick one number goal today (orders, bookings, deposits) and write it at the top of your sheet.",
            "Script two WhatsApp messages: cold-ish lead vs. repeat buyer.",
            "Spend 45 minutes doing outbound from your warm list — no scrolling.",
            category === "retail" ? "Run abandoned-cart / viewed-not-bought follow-ups manually." : "Offer next-two-slots booking for consults.",
            "End of day: count outcomes by source (referral, walk-in, WhatsApp, web).",
        ],
        postIdea: `Promo support: ${title} — product front, deadline, WhatsApp CTA (activation, not the whole plan).`,
        caption: `${ctx.businessName}: focused week for ${product}. Message us with your goal — we’ll match you to the right option.`,
        posterHint: `THIS WEEK · ${title.toUpperCase()} · ${product}`,
        hashtags: [...baseHashtags, ...categoryHashtags[category], "#GrowthPush"],
        successMetric: "Leads with intent, deposits/bookings, revenue attributed — not likes.",
        notes: weekend ? weekendNote(category) : undefined,
    };
}
function buildTrackDay(input: DayBuilderInput): DayBuilderOutput {
    const { ctx, category, dayNumber, weekNumber, product, planDays } = input;
    const retentionFocus = planDays >= 30 && (dayNumber === 21 || dayNumber === 28);
    const format = trackPostFormat(input);
    return {
        mainActionTitle: retentionFocus
            ? `Retention & repeat-revenue checkpoint (${product})`
            : `KPI review + next-week playbook (Week ${weekNumber})`,
        businessGrowthAction: retentionFocus
            ? `Protect margin with repeat buyers: segment list, thank-you, one measurable bring-back action.`
            : `Close the loop on revenue drivers: which offer, channel, and ops step actually paid — then adjust.`,
        executionSteps: retentionFocus
            ? [
                `Export or list customers with 2+ visits/purchases tied to ${product}.`,
                "Calculate repeat % and average days between purchases.",
                "Send a personal loyalty note with a time-bound perk that still protects margin.",
                "Assign one owner to call lapsed repeats from 60–90 days ago.",
                "Set a repeat-revenue target for next week.",
            ]
            : [
                "Write 5 numbers: leads, conv. rate, orders/bookings, revenue, repeat rate (estimate if needed).",
                "Name the single best-performing business action (offer bundle, referral, ops fix).",
                `Review using a ${format} lens: what would you double down vs. stop?`,
                "Pick one bottleneck (slow reply, pricing clarity, stock-out, no follow-up script).",
                "Schedule one change for Day 1 of next cycle with an owner and deadline.",
            ],
        postIdea: retentionFocus
            ? "Optional gratitude tile: loyal customers — invite back with a clear next step."
            : "Optional weekly recap post: transparent progress builds trust — tie to business results.",
        posterHint: retentionFocus ? `LOYALTY MATTERS · ${ctx.businessName}` : `RESULTS · WEEK ${weekNumber} · ${ctx.businessName}`,
        caption: retentionFocus
            ? `To everyone who keeps choosing ${ctx.businessName}: thank you. We’re building the next chapter around ${product} together.`
            : `${ctx.businessName}: Week ${weekNumber} review — we’re doubling down on what worked for customers and fixing what didn’t.`,
        hashtags: [...baseHashtags, ...categoryHashtags[category], retentionFocus ? "#CustomerLoyalty" : "#WeeklyReview"],
        successMetric: retentionFocus
            ? "Repeat purchase rate; lapsed win-backs; revenue from returning customers."
            : "Written KPI snapshot; one committed improvement with owner/date — not vanity metrics alone.",
        notes: retentionFocus
            ? "Retention day in 30-day plans balances new demand with profitable repeats."
            : "Aligns Day 7 / 14 / 21 / 28 with business KPIs and next-week priorities.",
    };
}
function buildDayOutput(theme: ThemeKey, input: DayBuilderInput): DayBuilderOutput {
    const themeToActionType: Record<ThemeKey, ActionType> = {
        promo_offer: "sales_offer",
        highlight: "lead_capture",
        review_collection: "trust_proof",
        behind_scenes: "operations",
        engagement: "retention",
        growth_push: "partnership",
        track_improve: "review_optimize",
    };
    const actionType = themeToActionType[theme];
    const pool = categoryStrategyPools[input.category] ?? categoryStrategyPools.generic;
    const actionTypes = pool.actionTypes.length > 0 ? pool.actionTypes : categoryStrategyPools.generic.actionTypes;
    const actionTypeIndex = (actionTypes.indexOf(actionType) + input.variantIndex + input.weekIndex) % actionTypes.length;
    const resolvedActionType = actionTypes[actionTypeIndex];
    const titles = pool.titles[resolvedActionType];
    const actions = pool.actions[resolvedActionType];
    const activations = pool.activations[resolvedActionType];
    const metrics = pool.metrics[resolvedActionType];
    const library = CATEGORY_ACTION_LIBRARIES[input.category] ?? CATEGORY_ACTION_LIBRARIES.generic;
    const libraryVariant = input.dayNumber + input.weekIndex * 7 + input.variantIndex;
    const libraryAction = pickLibraryItem(library.businessGrowthActions, resolvedActionType, libraryVariant);
    const librarySocial = pickLibraryItem(library.socialMediaActivations, resolvedActionType, libraryVariant);
    const libraryKpi = pickLibraryItem(library.kpis, resolvedActionType, libraryVariant);
    const titleTemplate = libraryAction?.title ?? titles[(input.dayNumber + input.variantIndex) % titles.length] ?? "Drive business growth with focused execution";
    const actionTemplate = libraryAction?.task ?? actions[(input.dayNumber + input.weekIndex) % actions.length] ?? "Run one focused business growth action for {product}.";
    const activationTemplate = librarySocial?.whatToPost ?? activations[(input.dayNumber + input.variantIndex + input.weekIndex) % activations.length] ??
        "Share one focused activation that supports today’s business action.";
    const metric = libraryKpi?.label ?? metrics[(input.dayNumber + input.variantIndex) % metrics.length] ?? "Measured business outcome";
    const product = input.product || input.ctx.productLine || "your offer";
    const businessAction = actionTemplate
        .replace(/\{product\}/g, product)
        .replace(/\{businessName\}/g, input.ctx.businessName);
    const marketingActivation = activationTemplate
        .replace(/\{product\}/g, product)
        .replace(/\{businessName\}/g, input.ctx.businessName);
    const mainActionTitle = titleTemplate
        .replace(/\{product\}/g, product)
        .replace(/\{businessName\}/g, input.ctx.businessName);
    const locationText = input.ctx.location || withLocation(input.ctx).replace(/^ in /, "");
    const channelsText = input.ctx.preferredChannels.length > 0 ? input.ctx.preferredChannels.join(", ") : "WhatsApp/Facebook";
    const weekendHint = input.weekend && input.category === "food"
        ? "Use a weekend special, event, or pre-order push."
        : input.weekend
            ? "Use a weekend booking push, flash sale, workshop, or live demo."
            : "";
    const firstVerbByCategory: Record<CategoryKey, string> = {
        food: "Prepare",
        retail: "Select",
        services: "Package",
        salon: "Set",
        education: "Schedule",
        generic: "Choose",
    };
    const steps = (libraryAction?.executionSteps ?? [
        `${firstVerbByCategory[input.category]} one clear offer for ${product}.`,
        "Write the price, deadline, and customer benefit.",
        `Send the offer to ${input.ctx.targetCustomers || "your target customers"} via ${channelsText}.`,
        "Use one simple script when customers reply.",
        `Record results in a sheet: ${metric}.`,
    ]).map((step) => step.replace(/\{product\}/g, product).replace(/\{businessName\}/g, input.ctx.businessName));
    if (locationText) {
        steps.splice(2, 0, `Mention ${locationText} in your message.`);
    }
    if (input.ctx.operatingModel) {
        steps.push(`Match this plan to your ${input.ctx.operatingModel} setup.`);
    }
    if (weekendHint) {
        steps.push(input.category === "food"
            ? "Add a weekend special and promote pre-orders."
            : "Add a weekend push: flash sale, booking, or workshop.");
    }
    const cleanSteps = steps.map(conciseStep).filter(Boolean).slice(0, 6);
    const primaryFormatByActionType: Record<ActionType, "Reel" | "Story" | "Feed" | "Carousel"> = {
        sales_offer: "Reel",
        retention: "Story",
        lead_capture: "Carousel",
        operations: "Feed",
        trust_proof: "Carousel",
        partnership: "Reel",
        review_optimize: "Feed",
    };
    const primaryGoalByActionType: Record<ActionType, "DMs" | "Orders" | "Bookings" | "Footfall" | "Leads"> = {
        sales_offer: input.category === "food" || input.category === "retail" ? "Orders" : "Bookings",
        retention: input.category === "food" || input.category === "retail" ? "Orders" : "Bookings",
        lead_capture: "Leads",
        operations: input.category === "food" || input.category === "retail" ? "Footfall" : "Bookings",
        trust_proof: input.category === "food" || input.category === "retail" ? "Orders" : "Bookings",
        partnership: "Leads",
        review_optimize: "Leads",
    };
    const primaryFormat = librarySocial?.format ?? primaryFormatByActionType[resolvedActionType] ?? "Feed";
    const primaryGoal = primaryGoalByActionType[resolvedActionType] ?? "Leads";
    const socialChannel: "instagram" | "facebook" | "both" = input.ctx.preferredChannels.some((c) => /instagram/i.test(c)) && input.ctx.preferredChannels.some((c) => /facebook/i.test(c))
        ? "both"
        : input.ctx.preferredChannels.some((c) => /instagram/i.test(c))
            ? "instagram"
            : input.ctx.preferredChannels.some((c) => /facebook/i.test(c))
                ? "facebook"
                : "both";
    const platformValue: "Instagram" | "Facebook" | "Both" = socialChannel === "instagram" ? "Instagram" : socialChannel === "facebook" ? "Facebook" : "Both";
    const bestTime = input.weekend ? "11:00 AM" : "7:30 PM";
    const reviewSubtype = theme === "review_collection" ? reviewPostFormat(input) : "";
    const concisePostBrief = activationToPostBrief(marketingActivation, product, input.ctx.businessName);
    const visualGuideHints = librarySocial?.visualGuide ?? themeVisualGuide(theme, product, input.ctx, theme === "review_collection" ? reviewSubtype : marketingActivation);
    const primaryCta = librarySocial?.CTA ?? buildThemedCta(theme, primaryGoal, product, input.ctx, primaryFormat);
    const offerDeadlineHint = [input.weekend ? "This weekend" : "", input.ctx.priceRange.trim()]
        .filter(Boolean)
        .join(" · ");
    const copyPack = buildMarketingActivationCopyPack({
        rawActivation: marketingActivation,
        product,
        businessName: input.ctx.businessName,
        businessGrowthAction: businessAction,
        city: input.ctx.city,
        format: primaryFormat,
        theme,
        weekend: input.weekend,
        goal: primaryGoal,
        visualGuide: visualGuideHints.slice(0, 3),
        offerDeadlineHint,
    });
    const matchedPost = buildActivationMatchedPostBundle({
        category: input.category,
        ctx: input.ctx,
        product,
        format: primaryFormat,
        platform: platformValue,
        bestTime,
        hookLine: copyPack.hookLine,
        whatToPost: copyPack.whatToPostInstruction,
        visualGuide: visualGuideHints,
        cta: primaryCta,
        postIdeaOverride: copyPack.postIdeaCreative,
    });
    const postIdea = matchedPost.postIdea;
    const caption = matchedPost.caption;
    const hashtags = matchedPost.hashtags;
    const storyFrames = primaryFormat === "Story"
        ? [
            `Beat 1 — the pinch people feel around ${product}.`,
            `Beat 2 — how ${input.ctx.businessName} smooths it in real life.`,
            `Beat 3 — your next step (${primaryGoal === "Footfall" ? "visit or message" : "DM / order"}) with today’s payoff.`,
        ]
        : [];
    const reelScript = primaryFormat === "Reel"
        ? {
            hook: `Micro ${product} story worth the save.`,
            beats: [`Name the pain in one breath.`, `Show the fix in motion.`, `Leave them with proof that feels human.`],
            cta: primaryCta.length > 140 ? `${primaryCta.slice(0, 137)}...` : primaryCta,
        }
        : undefined;
    const posterHeadlineHint = copyPack.poster.headline;
    const matchNote = copyPack.whyThisWorks;
    return {
        mainActionTitle,
        businessGrowthAction: businessAction,
        executionSteps: cleanSteps,
        postIdea,
        caption,
        hashtags,
        successMetric: `${metric}: target ${libraryKpi?.target ?? 5}${libraryKpi?.unit === "%" ? "%" : ""} for ${product}`,
        posterHint: `${product.toUpperCase()} · ${input.ctx.businessName}`,
        notes: input.weekend ? weekendNote(input.category) : undefined,
        marketingActivation: {
            platform: platformValue,
            format: primaryFormat,
            bestTime,
            goal: primaryGoal,
            postBrief: copyPack.postIdeaCreative,
            hook: copyPack.hookLine,
            visualGuide: visualGuideHints.slice(0, 3),
            posterHeadlineHint,
            posterSubheadline: copyPack.poster.subheadline,
            posterCtaLabel: copyPack.poster.ctaLabel,
            posterOfferBadge: copyPack.poster.offerBadge,
            channel: socialChannel,
            formatPlan: [primaryFormat === "Feed" ? "FeedPost" : primaryFormat],
            contentBrief: copyPack.postIdeaCreative,
            whatToPost: copyPack.whatToPostInstruction,
            postIdea: matchedPost.postIdea,
            caption: matchedPost.caption,
            hashtags: matchedPost.hashtags,
            cta: primaryCta,
            matchNote,
            postingTime: bestTime,
            storyFrames,
            reelScript,
            posterHint: posterHeadlineHint,
            ...(offerDeadlineHint ? { offerDeadlineHint } : {}),
        },
    };
}
function buildPlan(planDays: number, context: TemplateContext, startDate: Date): DayPlan[] {
    const category = businessCategoryToCategoryKey(context.businessCategory || resolveBusinessCategory(context.businessType, context.productsOrServices.join(" ")));
    const resolvedCategory: CategoryKey = category;
    const themes = buildThemeSequence(planDays);
    const usedTitles = new Set<string>();
    let previousFormat: CaptionFormatKey | null = null;
    const memory: RepeatMemory = {
        recentThemes: [],
        recentOfferTypes: [],
        recentStepTemplates: [],
        similarityCounts: {},
    };
    return Array.from({ length: planDays }, (_, index) => {
        const dayNumber = index + 1;
        const weekIndex = Math.floor(index / 7);
        const weekNumber = weekIndex + 1;
        const product = productForDay(context, index);
        const weekend = isWeekendForDate(startDate, index);
        const weekday = weekdayName(startDate, index);
        const dateLabel = formatDateLabel(startDate, index);
        const theme = themes[index];
        const festival = getSriLankaFestival(dateForOffset(startDate, index));
        let selectedInput: DayBuilderInput | null = null;
        let selectedOutput: DayBuilderOutput | null = null;
        let selectedMetadata: RepeatMetadata | null = null;
        for (let variantIndex = 0; variantIndex < 6; variantIndex += 1) {
            const input: DayBuilderInput = {
                ctx: context,
                category: resolvedCategory,
                dayNumber,
                weekNumber,
                weekIndex,
                variantIndex,
                product,
                weekend,
                planDays,
                weekday,
                dateLabel,
            };
            const output = normalizeDayOutput(buildDayOutput(theme, input));
            const metadata = repeatMetadata(theme, input, output);
            selectedInput = input;
            selectedOutput = output;
            selectedMetadata = metadata;
            if (!shouldTryAnotherVariant(theme, metadata, memory, usedTitles, output.mainActionTitle, planDays)) {
                break;
            }
        }
        const fallbackInput: DayBuilderInput = {
            ctx: context,
            category: resolvedCategory,
            dayNumber,
            weekNumber,
            weekIndex,
            variantIndex: 0,
            product,
            weekend,
            planDays,
            weekday,
            dateLabel,
        };
        const normalized = selectedOutput ?? normalizeDayOutput(buildDayOutput(theme, fallbackInput));
        const metadata = selectedMetadata ?? repeatMetadata(theme, selectedInput ?? fallbackInput, normalized);
        const initialTitle = GENERIC_TITLE_RE.test(normalized.mainActionTitle)
            ? `${product} ${deriveDayThemeForPlan(theme, weekend, festival)} plan`
            : normalized.mainActionTitle;
        const mainActionTitle = uniqueTitle(initialTitle, usedTitles, dayNumber);
        memory.recentThemes = rememberRecent(memory.recentThemes, theme);
        memory.recentOfferTypes = rememberRecent(memory.recentOfferTypes, metadata.offerType);
        memory.recentStepTemplates = rememberRecent(memory.recentStepTemplates, metadata.stepTemplate);
        memory.similarityCounts[metadata.similarityKey] = (memory.similarityCounts[metadata.similarityKey] ?? 0) + 1;
        const formatValue = avoidRepeatedFormat((normalized.marketingActivation?.format ?? "Feed") as CaptionFormatKey, previousFormat, dayNumber);
        previousFormat = formatValue;
        const needsActivationFix = isMissingActivationField(normalized);
        const ctaFinalize = needsActivationFix ? "DM us now to order, book, or ask for details." : normalized.marketingActivation?.cta ?? "DM us now.";
        const safeSuccessMetric = hasTargetMetric(normalized.successMetric)
            ? normalized.successMetric
            : `${normalized.successMetric || "Qualified responses"}: target ${5 + dayNumber}`;
        const safeExecutionSteps = normalizeExecutionChecklist(normalized.executionSteps, resolvedCategory, product, safeSuccessMetric);
        const mergedVisualGuideRaw = Array.isArray(normalized.marketingActivation?.visualGuide)
            ? normalized.marketingActivation.visualGuide.slice(0, 3).map((x) => String(x))
            : [];
        const mergedVisualGuide = mergedVisualGuideRaw.length
            ? mergedVisualGuideRaw
            : themeVisualGuide(theme, product, context, normalized.postIdea).slice(0, 3);
        const finalWhatToPost = normalized.marketingActivation?.whatToPost ??
            normalized.marketingActivation?.postIdea ??
            normalized.postIdea;
        const finalPlatform = normalized.marketingActivation?.platform ?? "Both";
        const finalBestTime = normalized.marketingActivation?.bestTime ?? normalized.marketingActivation?.postingTime ?? "7:30 PM";
        const offerHint = String(normalized.marketingActivation?.offerDeadlineHint ?? "").trim();
        const copyPackFinal = buildMarketingActivationCopyPack({
            rawActivation: finalWhatToPost,
            product,
            businessName: context.businessName,
            businessGrowthAction: normalized.businessGrowthAction ?? "",
            city: context.city,
            format: formatValue,
            theme,
            weekend,
            goal: normalized.marketingActivation?.goal ?? "Leads",
            visualGuide: mergedVisualGuide,
            offerDeadlineHint: offerHint,
        });
        const finalPost = buildActivationMatchedPostBundle({
            category: resolvedCategory,
            ctx: context,
            product,
            format: formatValue,
            platform: finalPlatform,
            bestTime: finalBestTime,
            hookLine: copyPackFinal.hookLine,
            whatToPost: copyPackFinal.whatToPostInstruction,
            visualGuide: mergedVisualGuide,
            cta: ctaFinalize,
            postIdeaOverride: copyPackFinal.postIdeaCreative,
        });
        return {
            dayNumber,
            dateLabel,
            ...normalized,
            dayTheme: deriveDayThemeForPlan(theme, weekend, festival),
            mainTitle: festival ? `${mainActionTitle} (${festival} special)` : mainActionTitle,
            mainActionTitle: festival ? `${mainActionTitle} (${festival} special)` : mainActionTitle,
            postIdea: finalPost.postIdea,
            caption: finalPost.caption,
            hashtags: finalPost.hashtags,
            executionSteps: safeExecutionSteps,
            successMetric: safeSuccessMetric,
            marketingActivation: {
                platform: finalPlatform,
                format: formatValue,
                bestTime: finalBestTime,
                goal: normalized.marketingActivation?.goal ?? "Leads",
                whatToPost: copyPackFinal.whatToPostInstruction,
                postBrief: copyPackFinal.postIdeaCreative,
                hook: copyPackFinal.hookLine,
                visualGuide: mergedVisualGuide,
                posterHeadlineHint: copyPackFinal.poster.headline,
                posterSubheadline: copyPackFinal.poster.subheadline,
                posterCtaLabel: copyPackFinal.poster.ctaLabel,
                posterOfferBadge: copyPackFinal.poster.offerBadge,
                channel: normalized.marketingActivation?.channel ?? "both",
                formatPlan: [formatValue === "Feed" ? "FeedPost" : formatValue],
                contentBrief: copyPackFinal.postIdeaCreative,
                postIdea: finalPost.postIdea,
                caption: finalPost.caption,
                hashtags: finalPost.hashtags,
                postingTime: finalBestTime,
                cta: ctaFinalize,
                matchNote: copyPackFinal.whyThisWorks,
                storyFrames: normalized.marketingActivation?.storyFrames ?? [],
                reelScript: normalized.marketingActivation?.reelScript,
                posterHint: copyPackFinal.poster.headline,
                ...(offerHint ? { offerDeadlineHint: offerHint } : {}),
            },
            notes: festival
                ? `${festival} seasonal day: adapt offer and messaging to festival demand.`
                : normalized.notes,
        };
    });
}
export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Record<string, unknown>;
        const firebase_uid = typeof body?.firebase_uid === "string" ? body.firebase_uid.trim() : "";
        const requestedDays = Number(body?.durationDays ?? body?.days ?? body?.planDays ?? 0);
        const forceNew = body?.mode === "new" || body?.forceNew === true;
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        const db = await getDb();
        const subGate = await requireActiveSubscription(db, firebase_uid);
        if (subGate) {
            return NextResponse.json(
                { ok: false, error: subGate.error, code: subGate.code },
                { status: 403 },
            );
        }
        const profile = await db.collection("business_profiles").findOne({ firebase_uid });
        if (!profile) {
            return NextResponse.json({ ok: false, error: "business_profile_not_found" }, { status: 404 });
        }
        const selectedPlan = await db.collection("selected_plans").findOne({ firebase_uid });
        const planDays = normalizePlanDays(requestedDays) ??
            normalizePlanDays(body?.planDays) ??
            normalizePlanDays(selectedPlan?.nextPlanDays) ??
            normalizePlanDays(selectedPlan?.planDays) ??
            normalizePlanDays(selectedPlan?.plan_days) ??
            normalizePlanDays(profile?.planDays);
        if (!planDays) {
            return NextResponse.json({ ok: false, error: "plan_not_selected" }, { status: 404 });
        }
        const missingFields = missingRequiredProfileFields(profile as Record<string, unknown>, body);
        if (missingFields.length > 0) {
            return NextResponse.json({
                ok: false,
                error: "business_profile_incomplete",
                missingFields,
                message: "Please complete required business details before generating a plan.",
            }, { status: 400 });
        }
        const existingPlan = await db.collection("marketing_plans").findOne({ firebase_uid }, { sort: { generatedAt: -1 } });
        if (existingPlan && !forceNew) {
            const existingPlanDays = Number(existingPlan.planDays ?? 0);
            const existingTemplateVersion = typeof existingPlan.templateVersion === "string" ? existingPlan.templateVersion : "";
            if (existingPlanDays === planDays && existingTemplateVersion === PLAN_TEMPLATE_VERSION) {
                const reusedPlanData = Array.isArray(existingPlan.planData) ? existingPlan.planData : [];
                const reusedNarrative = typeof existingPlan.narrativePlan === "string" ? existingPlan.narrativePlan : "";
                const reusedAi = typeof existingPlan.aiBusinessPlan === "object" && existingPlan.aiBusinessPlan
                    ? (existingPlan.aiBusinessPlan as AiBusinessPlan)
                    : null;
                const reusedMissing = Array.isArray(existingPlan.missingProfileFields)
                    ? (existingPlan.missingProfileFields as unknown[]).map((v) => String(v ?? "").trim()).filter(Boolean)
                    : [];
                return NextResponse.json({
                    ok: true,
                    data: {
                        planDays: existingPlanDays,
                        planData: reusedPlanData,
                        narrativePlan: reusedNarrative,
                        aiBusinessPlan: reusedAi,
                        missingProfileFields: reusedMissing,
                    },
                    reused: true,
                }, { status: 200 });
            }
        }
        const { context, inferredBusinessType, planStartDate, requestedPlanStartDateISO } = resolveProfileContext(profile as Record<string, unknown>, body);
        const resolvedCategory = businessCategoryToCategoryKey(context.businessCategory);
        console.info("[marketing-plan/generate] profile fields", {
            firebase_uid,
            businessName: context.businessName,
            businessTypeRaw: toCleanString((profile as Record<string, unknown>).businessType),
            inferredBusinessType,
            category: resolvedCategory,
            businessCategory: context.businessCategory,
            location: context.location,
            productsOrServices: context.productsOrServices,
            goals: context.businessGoals,
            targetCustomers: context.targetCustomers,
            operatingModel: context.operatingModel,
            priceRange: context.priceRange,
            preferredChannels: context.preferredChannels,
            startDate: requestedPlanStartDateISO,
            planDays,
        });
        const generatedAt = new Date();
        const { endDate } = buildDateRange(planDays, planStartDate);
        const startDate = planStartDate.toISOString().slice(0, 10);
        const templatePlanData = ensurePlanDataLength(buildPlan(planDays, context, planStartDate), planDays, context, planStartDate);
        const profileLanguage = toCleanString(profile.language, "English") || "English";
        const weakProfileFields = detectWeakProfileFields(profile as Record<string, unknown>);
        const aiPlanInput: AiPlanInput = {
            firebase_uid,
            businessName: context.businessName,
            businessType: context.businessType,
            inferredCategory: resolvedCategory,
            city: context.city,
            country: context.country,
            location: [context.city, context.country].filter(Boolean).join(", ") || "Sri Lanka",
            productsOrServices: context.productsOrServices,
            targetCustomers: context.targetCustomers || "Local Sri Lankan customers",
            businessGoals: context.businessGoals || "Grow customer base and revenue",
            currentChallenges: toCleanString((profile as Record<string, unknown>).currentChallenges ?? (profile as Record<string, unknown>).challenges),
            ownerOrManagerName: toCleanString((profile as Record<string, unknown>).ownerOrManagerName),
            teamSize: context.teamSize,
            operatingModel: context.operatingModel,
            priceRange: context.priceRange,
            preferredChannels: context.preferredChannels,
            socialLinks: context.socialLinks,
            currentMarketingMethods: toCleanString(profile.currentMarketingMethods),
            competitors: toCleanString(profile.competitors),
            monthlyMarketingBudget: toCleanString(profile.monthlyMarketingBudget),
            monthlyBusinessBudget: toCleanString(profile.monthlyBusinessBudget),
            expectedRevenueRange: toCleanString(profile.expectedRevenueRange),
            language: profileLanguage,
            planDuration: planDays,
            startDate,
            weakFields: weakProfileFields,
        };
        let aiBusinessPlan: AiBusinessPlan | null = null;
        try {
            aiBusinessPlan = await generateAiBusinessPlan(aiPlanInput);
        }
        catch (aiError) {
            console.error("[marketing-plan/generate] AI plan generation failed (non-fatal):", aiError);
            aiBusinessPlan = null;
        }
        // If the AI succeeded, override generic per-day text with business-specific AI text.
        // Otherwise we keep the deterministic template output, which is still a valid plan.
        const mergedPlanData = aiBusinessPlan
            ? enrichPlanDaysWithAi(templatePlanData as Array<Record<string, unknown>> as Array<{ dayNumber: number } & Record<string, unknown>>, aiBusinessPlan)
            : templatePlanData;
        const narrativePlan = aiBusinessPlan
            ? renderAiBusinessPlanMarkdown(aiBusinessPlan, context.businessName)
            : await generateNarrativePlan({
                businessName: context.businessName,
                businessType: context.businessType,
                category: resolvedCategory,
                location: aiPlanInput.location,
                productsOrServices: context.productsOrServices.join(", ") || context.businessType,
                targetCustomers: aiPlanInput.targetCustomers,
                businessGoal: aiPlanInput.businessGoals,
                budget: toCleanString(profile.monthlyMarketingBudget ?? profile.monthlyBusinessBudget, "Medium"),
                language: profileLanguage,
                monthlyMarketingBudget: aiPlanInput.monthlyMarketingBudget,
                teamSize: aiPlanInput.teamSize,
                expectedRevenueRange: aiPlanInput.expectedRevenueRange,
                socialLinks: aiPlanInput.socialLinks.filter(Boolean).join(", "),
                currentMarketingMethods: aiPlanInput.currentMarketingMethods,
                competitors: aiPlanInput.competitors,
                preferredPlatforms: aiPlanInput.preferredChannels.filter(Boolean).join(", "),
                planDuration: planDays,
                startDate,
            });
        const lifecyclePlanDays = buildLifecyclePlanDays((Array.isArray(mergedPlanData) ? mergedPlanData : []) as Array<Record<string, unknown>>, planDays, startDate);
        const progress = computeProgress(lifecyclePlanDays);
        const missingProfileFields = aiBusinessPlan && aiBusinessPlan.missingDetails.length > 0
            ? aiBusinessPlan.missingDetails
            : weakProfileFields;
        const document = {
            firebase_uid,
            userId: firebase_uid,
            planId: crypto.randomUUID(),
            days: planDays,
            durationDays: planDays,
            status: "active",
            startDate,
            endDate,
            templateVersion: PLAN_TEMPLATE_VERSION,
            generatedAt,
            createdAt: generatedAt.toISOString(),
            updatedAt: generatedAt.toISOString(),
            businessSnapshot: {
                businessName: context.businessName,
                businessType: context.businessType,
                businessCategory: context.businessCategory,
                city: context.city,
                country: context.country,
                location: context.location,
                productsOrServices: context.productsOrServices,
                targetCustomers: context.targetCustomers,
                businessGoals: context.businessGoals,
                operatingModel: context.operatingModel,
                priceRange: context.priceRange,
                preferredChannels: context.preferredChannels,
                socialLinks: context.socialLinks,
            },
            planData: lifecyclePlanDays,
            dayItems: lifecyclePlanDays,
            planDaysStructured: lifecyclePlanDays,
            planDays: lifecyclePlanDays,
            completedDays: lifecyclePlanDays.filter((day) => day.completed).map((day) => day.dayNumber),
            progress,
            narrativePlan: narrativePlan || "",
            aiBusinessPlan: aiBusinessPlan ?? null,
            missingProfileFields,
        };
        if (forceNew) {
            await db.collection("marketing_plans").updateMany({ firebase_uid, status: "active" }, {
                $set: {
                    status: "archived",
                    updatedAt: new Date().toISOString(),
                },
            });
        }
        await db.collection("marketing_plans").insertOne(document);
        return NextResponse.json({
            ok: true,
            data: {
                planDays,
                planData: lifecyclePlanDays,
                narrativePlan: narrativePlan || "",
                aiBusinessPlan: aiBusinessPlan ?? null,
                missingProfileFields,
            },
            reused: false,
        }, { status: 200 });
    }
    catch (error) {
        console.error("marketing-plan generate error:", error);
        return NextResponse.json({ ok: false, error: "Failed to generate marketing plan" }, { status: 500 });
    }
}
