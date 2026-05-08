import type { PosterDesign, PosterStyle } from "@/src/components/poster/PosterTemplate";
import {
    buildPosterCopyFromActivation,
    buildWhatToPostInstruction,
    type ActivationFormat,
    type InternalPlanTheme,
    type MarketingGoalKey,
} from "@/src/lib/posterActivationCopy";
import { pickPosterStyleForContext } from "@/src/lib/posterTemplateSelection";
export const DAY_THEMES = [
    "Promo",
    "ProductHighlight",
    "Testimonial",
    "BTS",
    "Engagement",
    "WeekendSpecial",
    "GrowthPush",
] as const;
export type DayTheme = (typeof DAY_THEMES)[number];
export function deriveDayThemeForPlan(internalTheme: string, weekend: boolean, festivalTrim: string): DayTheme {
    if (festivalTrim.trim())
        return "Promo";
    if (weekend && (internalTheme === "promo_offer" || internalTheme === "growth_push"))
        return "WeekendSpecial";
    switch (internalTheme) {
        case "promo_offer":
            return "Promo";
        case "highlight":
            return "ProductHighlight";
        case "review_collection":
            return "Testimonial";
        case "behind_scenes":
            return "BTS";
        case "engagement":
            return "Engagement";
        case "growth_push":
            return "GrowthPush";
        case "track_improve":
            return "ProductHighlight";
        default:
            return "Promo";
    }
}
const STYLE_POOLS: Record<DayTheme, PosterStyle[]> = {
    Promo: ["hero-product", "landscape-action", "bold-statement", "festival-vibrant"],
    ProductHighlight: ["editorial", "minimal-clean", "hero-product", "bold-statement"],
    Testimonial: ["editorial", "minimal-clean", "luxury-dark", "bold-statement"],
    BTS: ["landscape-action", "editorial", "neon-tech", "minimal-clean"],
    Engagement: ["neon-tech", "bold-statement", "festival-vibrant", "landscape-action"],
    WeekendSpecial: ["festival-vibrant", "bold-statement", "hero-product", "landscape-action"],
    GrowthPush: ["landscape-action", "bold-statement", "neon-tech", "hero-product"],
};
const BRAND_ACCENT_HEX = [
    "#111111",
    "#222222",
    "#333333",
    "#444444",
    "#555555",
    "#666666",
    "#777777",
    "#888888",
];
function hashString(input: string): number {
    let h = 0;
    const s = input.trim().toLowerCase();
    for (let i = 0; i < s.length; i += 1) {
        h = (h << 5) - h + s.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}
export function pickBrandAccentHex(businessName: string): string {
    const ix = BRAND_ACCENT_HEX.length ? hashString(businessName || "bizboost") % BRAND_ACCENT_HEX.length : 0;
    return BRAND_ACCENT_HEX[ix]!;
}
export function pickPosterStyleForDay(dayTheme: string | undefined, dayNumber: number, businessType?: string): PosterStyle {
    return pickPosterStyleForContext(dayTheme, dayNumber, businessType);
}
function squash(s: string, max: number): string {
    const t = (s || "").replace(/\s+/g, " ").trim();
    if (!t)
        return "";
    return t.length <= max ? t : `${t.slice(0, max - 1).trim()}…`;
}
function captionFirstLine(caption: string): string {
    const line = caption.split(/\r?\n/).map((x) => x.trim()).find(Boolean);
    return line ? squash(line.replace(/^[#•\-\*]\s*/, ""), 72) : "";
}

function mapUiDayThemeToInternal(ui: string | undefined): InternalPlanTheme {
    const u = (ui || "").toLowerCase();
    if (u.includes("weekend") || u.includes("promo") || u.includes("festival"))
        return "promo_offer";
    if (u.includes("highlight") || u.includes("product"))
        return "highlight";
    if (u.includes("testimonial"))
        return "review_collection";
    if (u.includes("bts") || u.includes("behind"))
        return "behind_scenes";
    if (u.includes("engagement"))
        return "engagement";
    if (u.includes("growth"))
        return "growth_push";
    return "promo_offer";
}

export type PosterSeedContext = {
    product: string;
    businessName: string;
    city: string;
    format: ActivationFormat;
    dayTheme?: string;
    weekend?: boolean;
    goal: MarketingGoalKey;
    businessGrowthAction?: string;
};

export function buildPosterSeedFromPlan(args: {
    businessName: string;
    caption: string;
    marketingActivation?: {
        hook?: string;
        postIdea?: string;
        whatToPost?: string;
        postBrief?: string;
        contentBrief?: string;
        cta?: string;
        posterHeadlineHint?: string;
        posterSubheadline?: string;
        posterCtaLabel?: string;
        posterOfferBadge?: string;
        posterHint?: string;
        offerDeadlineHint?: string;
        format?: string;
    } | null;
    mainActionTitle?: string;
    businessGrowthAction?: string;
    posterHintFallback?: string;
    posterContext?: PosterSeedContext | null;
}): Pick<PosterDesign, "brandName" | "headline" | "subheadline" | "offerBadge" | "ctaLabel"> {
    const ma = args.marketingActivation ?? null;
    const packHeadline = (ma?.posterHeadlineHint || "").trim();
    const packSub = (ma?.posterSubheadline || "").trim();
    const packCta = (ma?.posterCtaLabel || "").trim();
    const packBadge = (ma?.posterOfferBadge || "").trim();

    let headline = packHeadline;
    let subheadline = packSub;
    let offerBadge = packBadge;
    let ctaLabel = packCta;

    const needsGeneratedPack = !headline || !subheadline || !ctaLabel;
    const pc = args.posterContext;
    if (needsGeneratedPack && pc) {
        const rawLine = (ma?.whatToPost || ma?.postBrief || ma?.contentBrief || args.mainActionTitle || "").trim();
        const instruction = buildWhatToPostInstruction(rawLine, pc.product, pc.format);
        const gen = buildPosterCopyFromActivation({
            instruction,
            product: pc.product,
            businessName: pc.businessName,
            city: pc.city,
            format: pc.format,
            theme: mapUiDayThemeToInternal(pc.dayTheme),
            weekend: Boolean(pc.weekend),
            goal: pc.goal,
            offerDeadlineHint: ma?.offerDeadlineHint,
        });
        headline = headline || gen.headline;
        subheadline = subheadline || gen.subheadline;
        offerBadge = offerBadge || gen.offerBadge;
        ctaLabel = ctaLabel || gen.ctaLabel;
    }

    const captionRest = args.caption.replace(/^[^\r\n]+\r?\n?/, "").trim();
    if (!headline) {
        headline =
            squash(ma?.hook || "", 56) ||
            captionFirstLine(args.caption) ||
            squash(args.mainActionTitle || "", 56) ||
            "YOUR OFFER TODAY";
    }
    if (!subheadline) {
        subheadline =
            squash(ma?.postIdea || ma?.postBrief || ma?.contentBrief || ma?.whatToPost || "", 100) ||
            squash(captionRest, 100) ||
            squash(args.businessGrowthAction || "", 100);
    }
    if (!ctaLabel) {
        const rawCta = (ma?.cta || "DM US").trim();
        const ctaWords = rawCta.split(/\s+/).slice(0, 3).join(" ");
        ctaLabel = squash(ctaWords, 28) || "DM US";
    }
    if (!offerBadge) {
        offerBadge = squash(ma?.offerDeadlineHint || "", 28) ||
            squash(ma?.posterHint || args.posterHintFallback || "", 28);
    }

    return {
        brandName: squash(args.businessName, 40) || "Your Brand",
        headline: headline.toUpperCase(),
        subheadline: squash(subheadline, 100),
        offerBadge: squash(offerBadge, 28),
        ctaLabel: squash(ctaLabel, 28).toUpperCase(),
    };
}
