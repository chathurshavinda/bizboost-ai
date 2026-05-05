import {
  type PlanDayTheme,
  type PosterTemplateCategory,
  type PosterTemplateDefinition,
  POSTER_TEMPLATE_CATALOG,
  getPosterTemplateById,
} from "@/src/lib/posterTemplateCatalog";
import type { PosterStyle } from "@/src/components/poster/PosterTemplate";

const PLAN_DAY_THEMES: PlanDayTheme[] = [
  "Promo",
  "ProductHighlight",
  "Testimonial",
  "BTS",
  "Engagement",
  "WeekendSpecial",
  "GrowthPush",
];

/** Preferred category order per plan day theme — first = strongest match. */
const CATEGORY_PRIORITY_BY_PLAN_DAY: Record<PlanDayTheme, PosterTemplateCategory[]> = {
  Promo: ["promo-discount", "event-weekend", "minimal-premium", "product-service", "general"],
  ProductHighlight: ["product-service", "minimal-premium", "testimonial-review", "general"],
  Testimonial: ["testimonial-review", "minimal-premium", "product-service", "general"],
  BTS: ["product-service", "minimal-premium", "event-weekend", "general"],
  Engagement: ["event-weekend", "promo-discount", "product-service", "general"],
  WeekendSpecial: ["event-weekend", "promo-discount", "minimal-premium", "general"],
  GrowthPush: ["promo-discount", "product-service", "minimal-premium", "general"],
};

const DEFAULT_GENERAL_TEMPLATE_ID = "general-balanced-bold";

export function normalizePlanDayTheme(raw: string | undefined | null): PlanDayTheme {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (PLAN_DAY_THEMES.includes(t as PlanDayTheme)) return t as PlanDayTheme;
  return "Promo";
}

function hashPick(seed: string, modulo: number): number {
  let h = 0;
  const s = seed.trim().toLowerCase();
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % Math.max(1, modulo);
}

function scoreTemplate(
  t: PosterTemplateDefinition,
  planDay: PlanDayTheme,
  businessTypeLower: string,
  categoryRank: (cat: PosterTemplateCategory) => number,
): number {
  let score = 0;
  const cr = categoryRank(t.category);
  if (cr >= 0) score += (10 - cr) * 20;

  if (t.dayThemes.length === 0) {
    score += 6;
  } else if (t.dayThemes.includes(planDay)) {
    score += 18;
  }

  for (const kw of t.businessTypeKeywords) {
    const k = kw.trim().toLowerCase();
    if (k && businessTypeLower.includes(k)) score += 10;
  }

  return score;
}

/**
 * Picks a catalog template from plan day theme + business type + day number (rotation).
 */
export function pickPosterTemplateForContext(opts: {
  dayTheme?: string | null;
  businessType?: string | null;
  dayNumber: number;
}): PosterTemplateDefinition {
  const planDay = normalizePlanDayTheme(opts.dayTheme ?? undefined);
  const businessTypeLower = (opts.businessType ?? "").toLowerCase().trim();
  const priorities = CATEGORY_PRIORITY_BY_PLAN_DAY[planDay];

  const categoryRank = (cat: PosterTemplateCategory) => priorities.indexOf(cat);

  let pool = POSTER_TEMPLATE_CATALOG.filter(
    (t) => t.dayThemes.length === 0 || t.dayThemes.includes(planDay),
  );
  if (pool.length === 0) pool = [...POSTER_TEMPLATE_CATALOG];

  const scored = pool.map((t) => ({
    t,
    score: scoreTemplate(t, planDay, businessTypeLower, categoryRank),
  }));

  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0) {
    return getPosterTemplateById(DEFAULT_GENERAL_TEMPLATE_ID)!;
  }

  const top = scored[0]!.score;
  const band = scored.filter((x) => x.score >= top - 8);
  const finalists = band.length ? band : scored.slice(0, 4);

  const ix = hashPick(`${planDay}|${businessTypeLower}|${opts.dayNumber}`, finalists.length);
  return finalists[ix]!.t;
}

export function pickPosterStyleForContext(
  dayTheme: string | undefined,
  dayNumber: number,
  businessType?: string,
): PosterStyle {
  return pickPosterTemplateForContext({ dayTheme, dayNumber, businessType }).layoutType;
}

export function inferContentCategoryFromPlanDay(planDay: PlanDayTheme): PosterTemplateCategory {
  const first = CATEGORY_PRIORITY_BY_PLAN_DAY[planDay]?.[0];
  return first ?? "general";
}

export function resolvePosterTemplateOrDefault(
  templateId: string | undefined | null,
  fallbackStyle: PosterStyle,
): { template: PosterTemplateDefinition; style: PosterStyle } {
  const t = getPosterTemplateById(templateId ?? "");
  if (t) return { template: t, style: t.layoutType };
  const general = getPosterTemplateById(DEFAULT_GENERAL_TEMPLATE_ID);
  if (general) return { template: general, style: general.layoutType };
  return {
    template: {
      id: "inline-fallback",
      name: "Fallback",
      category: "general",
      layoutType: fallbackStyle,
      recommendedUse: "System fallback",
      styleTags: [],
      supportedContentFields: ["brandName", "headline", "subheadline", "offerBadge", "ctaLabel", "accentColor", "textColor", "overlay"],
      dayThemes: [],
      businessTypeKeywords: [],
    },
    style: fallbackStyle,
  };
}
