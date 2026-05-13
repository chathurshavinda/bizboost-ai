import type { PosterDesign } from "@/src/components/poster/PosterTemplate";

export type ActivationFormat = "Reel" | "Story" | "Feed" | "Carousel";
export type InternalPlanTheme =
    | "promo_offer"
    | "highlight"
    | "review_collection"
    | "behind_scenes"
    | "engagement"
    | "growth_push"
    | "track_improve";
export type MarketingGoalKey = "DMs" | "Orders" | "Bookings" | "Footfall" | "Leads";

export type MarketingActivationCopyPack = {
    whatToPostInstruction: string;
    hookLine: string;
    postIdeaCreative: string;
    whyThisWorks: string;
    poster: Pick<PosterDesign, "headline" | "subheadline" | "offerBadge" | "ctaLabel">;
};

function squash(s: string, max: number): string {
    const t = (s || "").replace(/\s+/g, " ").trim();
    if (!t)
        return "";
    return t.length <= max ? t : `${t.slice(0, max - 1).trim()}…`;
}

function cleanRawActivation(value: string): string {
    return value
        .replace(/\s+/g, " ")
        .replace(/\s+([,.!?;:])/g, "$1")
        .replace(/\b(?:optional|support only|activation)\s*[:\-]?\s*/gi, "")
        .trim();
}

function stripPlanningPrefixes(s: string): string {
    return cleanRawActivation(s)
        .replace(/^(feed|story|reel|carousel)\s+[:\-]?\s*/i, "")
        .replace(/^(one|short)\s+(post|reel|story|carousel)\s+/i, "")
        .replace(/^(counter|checkout|whatsapp|banner)\s+/i, "")
        .trim();
}

function normKey(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokensTooSimilar(a: string, b: string): boolean {
    const na = normKey(a);
    const nb = normKey(b);
    if (!na || !nb)
        return false;
    if (na === nb)
        return true;
    if (na.length > 20 && nb.includes(na.slice(0, Math.min(24, na.length))))
        return true;
    if (nb.length > 20 && na.includes(nb.slice(0, Math.min(24, nb.length))))
        return true;
    return false;
}

export function buildWhatToPostInstruction(raw: string, product: string, format: ActivationFormat): string {
    const core = stripPlanningPrefixes(raw || `Promote ${product} with one clear ${format.toLowerCase()} and CTA.`);
    if (/^(create|publish|post|film|design|run|share)\b/i.test(core))
        return squash(core, 220);
    if (/[.!?]$/.test(core))
        return squash(`Create content that ${core.charAt(0).toLowerCase()}${core.slice(1)}`, 220);
    return squash(`Create a ${format} that ${core.charAt(0).toLowerCase()}${core.slice(1)}`, 220);
}

function intentFromInstruction(instruction: string, product: string): {
    preOrder: boolean;
    weekend: boolean;
    limited: boolean;
    bestSeller: boolean;
    review: boolean;
    booking: boolean;
    bundle: boolean;
    bts: boolean;
    poll: boolean;
    fresh: boolean;
} {
    const t = normKey(instruction);
    const p = normKey(product);
    return {
        preOrder: (/\bpre\b/.test(t) && /\border/.test(t)) || t.includes("preorder") || t.includes("pre order"),
        weekend: t.includes("weekend") || t.includes("saturday") || t.includes("sunday"),
        limited:
            /\blimited\b/.test(t) ||
            t.includes("deadline") ||
            t.includes("cutoff") ||
            t.includes("cut off") ||
            t.includes("flash") ||
            t.includes("few slots") ||
            t.includes("stock cap"),
        bestSeller:
            t.includes("best seller") ||
            t.includes("bestseller") ||
            t.includes("weekly favorite") ||
            t.includes("hero sku") ||
            (t.includes("favorite") && t.includes("week")),
        review: t.includes("review") || t.includes("testimonial") || t.includes("google map") || t.includes("maps") || t.includes("quote"),
        booking: t.includes("book") || t.includes("slot") || t.includes("appointment") || t.includes("reserve"),
        bundle: t.includes("bundle") || t.includes("combo") || t.includes("package"),
        bts:
            t.includes("behind") ||
            t.includes("process") ||
            t.includes("prep") ||
            t.includes("hygiene") ||
            t.includes("workflow") ||
            t.includes("quality check"),
        poll: t.includes("poll") || t.includes("vote") || t.includes("this or that") || t.includes("engagement"),
        fresh: p.includes("coffee") || p.includes("bake") || t.includes("fresh today") || t.includes("daily"),
    };
}

export function buildCatchyHookLine(args: {
    instruction: string;
    product: string;
    businessName: string;
    theme: InternalPlanTheme;
    weekend: boolean;
    format: ActivationFormat;
}): string {
    const { instruction, product, businessName, theme, weekend, format } = args;
    const intent = intentFromInstruction(instruction, product);
    const productShort = squash(product, 40) || "this";
    const picks: string[] = [];
    if (intent.preOrder) {
        picks.push(`Beat the rush — ${productShort} pre-orders are open.`);
        picks.push(`Skip the wait: early orders are open at ${businessName}.`);
        picks.push(`Your ${productShort} run is live — reserve before the cutoff.`);
    }
    if (intent.bestSeller || (intent.limited && intent.bundle)) {
        picks.push(`This week's favourite is here — ${productShort} is the star.`);
        picks.push(`${productShort} is flying — don't sleep on this week's spotlight.`);
    }
    if (intent.review) {
        picks.push(`Loved ${productShort}? Your words mean everything to us.`);
        picks.push(`Real customers. Real moments — help the next visitor choose ${businessName}.`);
    }
    if (intent.booking) {
        picks.push(`Need ${productShort}? Grab a slot while they're still open.`);
        picks.push(`Your next visit starts with one message.`);
    }
    if (intent.bts) {
        picks.push(`Here's how ${businessName} keeps ${productShort} consistent.`);
        picks.push(`No fluff — just how we prep what you love.`);
    }
    if (intent.poll || theme === "engagement") {
        picks.push(`We're listening — pick what you want next.`);
        picks.push(`Two choices. One honest favourite. Tell us.`);
    }
    if (theme === "promo_offer" || intent.limited) {
        picks.push(`Quick one: ${productShort} + a sharper deal for busy weeks.`);
        picks.push(`Something special dropped — worth a scroll pause.`);
    }
    if (weekend || intent.weekend) {
        picks.push(`Weekend mode: ${productShort} without the fuss.`);
    }
    if (intent.fresh) {
        picks.push(`Fresh, fast, and ready for your next order.`);
    }
    picks.push(`${productShort} at ${businessName} — today's easy yes.`);
    picks.push(`Locals asked, we listened — here's ${productShort}, done right.`);
    const hash = (instruction + format + theme).split("").reduce((h, c) => h + c.charCodeAt(0), 0);
    for (let attempt = 0; attempt < picks.length; attempt += 1) {
        const candidate = picks[(hash + attempt) % picks.length]!;
        if (!tokensTooSimilar(candidate, instruction))
            return squash(candidate, 160);
    }
    return squash(picks[hash % picks.length]!, 160);
}

export function buildPostIdeaCreative(args: {
    instruction: string;
    product: string;
    format: ActivationFormat;
    visualGuide: string[];
    city: string;
}): string {
    const v1 = args.visualGuide[0] ? stripPlanningPrefixes(args.visualGuide[0]) : "";
    const lineA = squash(
        `Creative direction: Lead with ${args.product.trim() || "your offer"}, keep the ${args.format.toLowerCase()} pacing tight, and make the payoff obvious before people scroll.`,
        200,
    );
    const lineB = v1
        ? `Visually: ${v1.charAt(0).toUpperCase() + v1.slice(1)}${args.city.trim() ? ` — clean light, ${args.city.trim()}-friendly.` : "."}`
        : args.city.trim()
            ? `Tone: modern Sri Lankan SME English — warm, clear, no jargon. Mention ${args.city.trim()} once if it fits naturally.`
            : `Tone: modern Sri Lankan SME English — warm, clear, no jargon.`;
    return `${lineA}\n${squash(lineB, 200)}`;
}

export function buildWhyThisWorks(businessGrowthAction: string, goal: MarketingGoalKey, product: string): string {
    const task = squash(stripPlanningPrefixes(businessGrowthAction), 180) || "today's growth task";
    const outcome =
        goal === "Footfall"
            ? "walk-ins"
            : goal === "Bookings"
                ? "bookings"
                : goal === "Orders"
                    ? "orders"
                    : goal === "Leads" || goal === "DMs"
                        ? "real conversations"
                        : "momentum";
    return squash(`Supports your growth task (${task}) by turning scrolls into ${outcome} for ${product || "your offer"}.`, 260);
}

function pickCtaLabel(goal: MarketingGoalKey, intent: ReturnType<typeof intentFromInstruction>): string {
    if (intent.preOrder)
        return "DM to Pre-Order";
    if (intent.booking)
        return "Book Now";
    if (intent.review)
        return "Message Us Now";
    switch (goal) {
        case "Orders":
            return "Order Now";
        case "Bookings":
            return "DM to Reserve";
        case "Footfall":
            return "Visit Us Today";
        case "DMs":
        case "Leads":
        default:
            return "Message Us Now";
    }
}

function pickOfferBadge(args: {
    intent: ReturnType<typeof intentFromInstruction>;
    weekend: boolean;
    offerDeadlineHint?: string;
}): string {
    const hint = (args.offerDeadlineHint || "").toLowerCase();
    if (args.intent.preOrder || hint.includes("pre-order") || hint.includes("preorder"))
        return "Pre-Order Open";
    if (args.weekend || args.intent.weekend)
        return "Weekend Offer";
    if (args.intent.limited && (args.intent.bundle || args.intent.bestSeller))
        return "Limited Offer";
    if (args.intent.bestSeller)
        return "Best Seller";
    if (args.intent.limited)
        return "Limited Today";
    if (args.intent.fresh)
        return "Fresh Today";
    return "";
}

export function buildPosterCopyFromActivation(args: {
    instruction: string;
    product: string;
    businessName: string;
    city: string;
    format: ActivationFormat;
    theme: InternalPlanTheme;
    weekend: boolean;
    goal: MarketingGoalKey;
    offerDeadlineHint?: string;
}): Pick<PosterDesign, "headline" | "subheadline" | "offerBadge" | "ctaLabel"> {
    const { instruction, product, businessName, city, format, theme, weekend, goal, offerDeadlineHint } = args;
    const intent = intentFromInstruction(instruction, product);
    const prod = squash(product, 36) || "Today's pick";
    const loc = city.trim();
    let headline = "";
    let sub = "";

    if (intent.preOrder) {
        headline = weekend ? `${prod} Weekend Pre-Orders` : `${prod} Pre-Orders Open`;
        sub = `Order before the cutoff and we'll hold yours — message us for the next step${loc ? ` (${loc}).` : "."}`;
    }
    else if (intent.bestSeller && intent.limited) {
        headline = "Best-Seller of the Week";
        sub = `Grab ${prod} with this week's limited offer before it ends${loc ? ` — ${loc}.` : "."}`;
    }
    else if (intent.bestSeller) {
        headline = "Best-Seller of the Week";
        sub = `${prod} is the spotlight item customers keep coming back for${loc ? ` in ${loc}.` : "."}`;
    }
    else if (intent.review) {
        headline = "Thank You for Choosing Us";
        sub = `Loved ${prod}? A quick message helps the next customer decide${loc ? ` — ${loc} crew.` : "."}`;
    }
    else if (intent.booking) {
        headline = `Book ${prod}`;
        sub = `Limited slots — message us with your time and we confirm fast${loc ? ` (${loc}).` : "."}`;
    }
    else if (intent.bts || theme === "behind_scenes") {
        headline = "See How We Work";
        sub = `Honest prep, real standards — here's what goes into every ${prod}${loc ? ` at ${loc}.` : "."}`;
    }
    else if (theme === "engagement" || intent.poll) {
        headline = "We Want Your Say";
        sub = `Help us plan the next drop — reply or DM with your pick on ${prod}.`;
    }
    else if (theme === "track_improve") {
        headline = "What's New This Week";
        sub = `Smarter offers, faster replies, and a better experience around ${prod}${loc ? ` — ${loc}.` : "."}`;
    }
    else if (intent.bundle || theme === "promo_offer") {
        headline = `${prod} — Special This Week`;
        sub = `Clear perk, easy next step — DM or WhatsApp to lock it in${loc ? ` from ${loc}.` : "."}`;
    }
    else if (intent.limited) {
        headline = `${prod} — Limited Window`;
        sub = `When it's gone, it's gone — message now to reserve or order${loc ? ` (${loc}).` : "."}`;
    }
    else {
        headline = `${prod} — Today's Highlight`;
        sub = `Straight talk, real value — tap in for details${loc ? ` — ${loc}.` : "."}`;
    }

    if (format === "Reel")
        sub = squash(`${sub} Short, punchy cuts work best.`, 100);
    if (format === "Carousel")
        sub = squash(`${sub} Use 3–5 slides: hook → proof → CTA.`, 100);

    const offerBadge = pickOfferBadge({ intent, weekend, offerDeadlineHint });
    const ctaLabel = pickCtaLabel(goal, intent);

    return {
        headline: squash(headline, 52),
        subheadline: squash(sub, 100),
        offerBadge: squash(offerBadge, 28),
        ctaLabel: squash(ctaLabel, 24),
    };
}

export function buildMarketingActivationCopyPack(args: {
    rawActivation: string;
    product: string;
    businessName: string;
    businessGrowthAction: string;
    city: string;
    format: ActivationFormat;
    theme: InternalPlanTheme;
    weekend: boolean;
    goal: MarketingGoalKey;
    visualGuide: string[];
    offerDeadlineHint?: string;
}): MarketingActivationCopyPack {
    const whatToPostInstruction = buildWhatToPostInstruction(args.rawActivation, args.product, args.format);
    const hookLine = buildCatchyHookLine({
        instruction: whatToPostInstruction,
        product: args.product,
        businessName: args.businessName,
        theme: args.theme,
        weekend: args.weekend,
        format: args.format,
    });
    const postIdeaCreative = buildPostIdeaCreative({
        instruction: whatToPostInstruction,
        product: args.product,
        format: args.format,
        visualGuide: args.visualGuide,
        city: args.city,
    });
    const whyThisWorks = buildWhyThisWorks(args.businessGrowthAction, args.goal, args.product);
    const poster = buildPosterCopyFromActivation({
        instruction: whatToPostInstruction,
        product: args.product,
        businessName: args.businessName,
        city: args.city,
        format: args.format,
        theme: args.theme,
        weekend: args.weekend,
        goal: args.goal,
        offerDeadlineHint: args.offerDeadlineHint,
    });
    return {
        whatToPostInstruction,
        hookLine,
        postIdeaCreative,
        whyThisWorks,
        poster,
    };
}
