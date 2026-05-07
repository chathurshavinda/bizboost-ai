import type { PosterDesign, PosterStyle } from "@/src/components/poster/PosterTemplate";
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
    "#0EA5E9",
    "#E11D48",
    "#7C3AED",
    "#059669",
    "#D97706",
    "#DB2777",
    "#0891B2",
    "#EA580C",
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
export function buildPosterSeedFromPlan(args: {
    businessName: string;
    caption: string;
    marketingActivation?: {
        hook?: string;
        postBrief?: string;
        contentBrief?: string;
        cta?: string;
        posterHeadlineHint?: string;
        posterHint?: string;
        offerDeadlineHint?: string;
    } | null;
    mainActionTitle?: string;
    businessGrowthAction?: string;
    posterHintFallback?: string;
}): Pick<PosterDesign, "brandName" | "headline" | "subheadline" | "offerBadge" | "ctaLabel"> {
    const ma = args.marketingActivation ?? null;
    const captionRest = args.caption.replace(/^[^\r\n]+\r?\n?/, "").trim();
    const headline = squash(ma?.hook || "", 56) ||
        squash(ma?.posterHeadlineHint || "", 56) ||
        captionFirstLine(args.caption) ||
        squash(args.mainActionTitle || "", 56) ||
        "YOUR OFFER TODAY";
    const subSource = (ma?.postBrief || ma?.contentBrief || "").trim() ||
        captionRest ||
        (args.businessGrowthAction || "").trim();
    const subheadline = squash(subSource, 100);
    const offerBadge = squash(ma?.offerDeadlineHint || "", 28) || squash(ma?.posterHint || args.posterHintFallback || "", 28);
    const rawCta = (ma?.cta || "DM US").trim();
    const ctaWords = rawCta.split(/\s+/).slice(0, 3).join(" ");
    const ctaLabel = squash(ctaWords, 28).toUpperCase() || "DM US";
    return {
        brandName: squash(args.businessName, 40) || "Your Brand",
        headline: headline.toUpperCase(),
        subheadline,
        offerBadge,
        ctaLabel,
    };
}
