"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
import { DEFAULT_POSTER_DESIGN, POSTER_STYLE_META, PosterDesign, PosterStyle, PosterTemplate, } from "@/src/components/poster/PosterTemplate";
import { PosterTemplatePicker } from "@/src/components/poster/PosterTemplatePicker";
import { getPosterTemplateById } from "@/src/lib/posterTemplateCatalog";
import { pickPosterTemplateForContext } from "@/src/lib/posterTemplateSelection";
import { buildPosterSeedFromPlan, pickBrandAccentHex } from "@/src/lib/posterDayTheme";
type BusinessProfile = {
    businessName?: string;
    businessType?: string;
    city?: string;
    country?: string;
    productsOrServices?: string[] | string;
    targetCustomers?: string;
    businessGoals?: string;
    monthlyMarketingBudget?: string;
    monthlyBusinessBudget?: string;
    language?: string;
};
type MarketingActivationBrief = {
    postBrief?: string;
    contentBrief?: string;
    hook?: string;
    cta?: string;
    format?: string;
    platform?: string;
    visualGuide?: string[];
    posterHeadlineHint?: string;
    postIdea?: string;
    caption?: string;
    posterHint?: string;
    offerDeadlineHint?: string;
};
type DayPlan = {
    dayNumber: number;
    dayTheme?: string;
    mainActionTitle?: string;
    businessGrowthAction?: string;
    postIdea?: string;
    caption?: string;
    posterHint?: string;
    hashtags?: string[];
    marketingActivation?: MarketingActivationBrief;
};
function mapActivationToApi(ma: MarketingActivationBrief | null): {
    activationPostBrief: string;
    activationHook: string;
    activationCta: string;
    activationFormat: string;
    activationPlatform: string;
    activationVisualSummary: string;
    activationPosterHint: string;
    activationOfferDeadline: string;
} {
    if (!ma) {
        return {
            activationPostBrief: "",
            activationHook: "",
            activationCta: "",
            activationFormat: "",
            activationPlatform: "",
            activationVisualSummary: "",
            activationPosterHint: "",
            activationOfferDeadline: "",
        };
    }
    const visual = Array.isArray(ma.visualGuide)
        ? ma.visualGuide.filter((x) => typeof x === "string" && x.trim()).slice(0, 3).join(" | ")
        : "";
    return {
        activationPostBrief: (ma.postBrief || ma.contentBrief || "").trim(),
        activationHook: (ma.hook || "").trim(),
        activationCta: (ma.cta || "").trim(),
        activationFormat: String(ma.format ?? "").trim(),
        activationPlatform: String(ma.platform ?? "").trim(),
        activationVisualSummary: visual,
        activationPosterHint: (ma.posterHeadlineHint || "").trim(),
        activationOfferDeadline: (ma.offerDeadlineHint || "").trim(),
    };
}
function buildPhotoContextLine(hasImage: boolean, imageFileName: string): string {
    if (hasImage && imageFileName.trim())
        return `Owner-uploaded photo (${imageFileName.trim()}) for today's planned post — keep typography readable on this image.`;
    if (hasImage)
        return `Owner-uploaded photo for today's planned post — keep typography readable on this image.`;
    return "A real photo uploaded by the business owner";
}
function parseCaptionAndHashtags(text: string): {
    caption: string;
    hashtags: string[];
} {
    const safe = (text || "").replace(/\r\n/g, "\n").trim();
    const captionMatch = safe.match(/Caption:\s*([\s\S]*?)(?:\n\s*Hashtags:|$)/i);
    const hashtagsMatch = safe.match(/Hashtags:\s*([\s\S]*)$/i);
    const captionRaw = captionMatch?.[1]?.trim() ?? safe;
    const hashtagsRaw = hashtagsMatch?.[1]?.trim() ?? "";
    const hashtagTokens = hashtagsRaw
        .split(/\s+|,|\n/)
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) => (token.startsWith("#") ? token : `#${token}`))
        .slice(0, 6);
    return {
        caption: captionRaw.replace(/^"+|"+$/g, "").trim(),
        hashtags: hashtagTokens,
    };
}
function mergePosterWithBrandLocks(style: PosterStyle, accentHex: string, ai: PosterDesign | null | undefined, fallback: PosterDesign): PosterDesign {
    const base = { ...fallback };
    if (!ai) {
        return { ...base, style, accentColor: accentHex };
    }
    return {
        ...ai,
        style,
        accentColor: accentHex,
        templateId: fallback.templateId,
    };
}
function aiPosterCatalogMeta(templateId?: string): {
    posterTemplateId?: string;
    posterTemplateHint?: string;
} {
    const def = templateId ? getPosterTemplateById(templateId) : null;
    if (!def)
        return {};
    return {
        posterTemplateId: def.id,
        posterTemplateHint: `${def.name} — ${def.recommendedUse} Layout renderer: "${def.layoutType}". Tags: ${def.styleTags.join(", ")}.`,
    };
}
function buildBusinessDetailsPayload(business: BusinessProfile | null, offerText: string, dayPlanSummary: string, photoContext: string, finalCaption: string, activation: MarketingActivationBrief | null, posterMeta?: {
    dayTheme?: string;
    brandAccentLocked?: string;
    posterTemplateId?: string;
    posterTemplateHint?: string;
}): {
    ok: true;
    payload: {
        businessName: string;
        businessType: string;
        location: string;
        productsOrServices: string;
        targetCustomers: string;
        businessGoal: string;
        budget: string;
        language: string;
        offer: string;
        dayPlan: string;
        photoContext: string;
        finalCaption?: string;
        tone: string;
        activationPostBrief: string;
        activationHook: string;
        activationCta: string;
        activationFormat: string;
        activationPlatform: string;
        activationVisualSummary: string;
        activationPosterHint: string;
        activationOfferDeadline: string;
        dayTheme?: string;
        brandAccentLocked?: string;
        posterTemplateId?: string;
        posterTemplateHint?: string;
    };
} | {
    ok: false;
    missing: string[];
} {
    const businessName = business?.businessName?.trim() || "";
    const businessType = business?.businessType?.trim() || "";
    const location = [business?.city?.trim(), business?.country?.trim()].filter(Boolean).join(", ");
    const productsOrServices = Array.isArray(business?.productsOrServices)
        ? business?.productsOrServices.filter((item) => typeof item === "string" && item.trim().length > 0).join(", ")
        : typeof business?.productsOrServices === "string"
            ? business.productsOrServices.trim()
            : "";
    const targetCustomers = business?.targetCustomers?.trim() || "";
    const businessGoal = offerText.trim() || business?.businessGoals?.trim() || "";
    const budget = business?.monthlyMarketingBudget?.trim() || business?.monthlyBusinessBudget?.trim() || "";
    const language = business?.language?.trim() || "English";
    const missing: string[] = [];
    if (!businessName)
        missing.push("businessName");
    if (!businessType)
        missing.push("businessType");
    if (!location)
        missing.push("location");
    if (!productsOrServices)
        missing.push("productsOrServices");
    if (!targetCustomers)
        missing.push("targetCustomers");
    if (missing.length > 0) {
        return { ok: false, missing };
    }
    const activationFields = mapActivationToApi(activation);
    const trimmedTheme = posterMeta?.dayTheme?.trim() ?? "";
    return {
        ok: true,
        payload: {
            businessName,
            businessType,
            location,
            productsOrServices,
            targetCustomers,
            businessGoal,
            budget,
            language,
            offer: offerText.trim(),
            dayPlan: dayPlanSummary,
            photoContext,
            finalCaption: finalCaption || undefined,
            tone: "Friendly and professional",
            ...activationFields,
            ...(trimmedTheme ? { dayTheme: trimmedTheme } : {}),
            ...(posterMeta?.brandAccentLocked && /^#[0-9a-fA-F]{6}$/i.test(posterMeta.brandAccentLocked)
                ? { brandAccentLocked: posterMeta.brandAccentLocked }
                : {}),
            ...(posterMeta?.posterTemplateId?.trim() ? { posterTemplateId: posterMeta.posterTemplateId.trim() } : {}),
            ...(posterMeta?.posterTemplateHint?.trim() ? { posterTemplateHint: posterMeta.posterTemplateHint.trim() } : {}),
        },
    };
}
type LatestPlanResponse = {
    ok?: boolean;
    data?: {
        planData?: DayPlan[];
    };
    error?: string;
};
export default function BizEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const editorContext = useMemo(() => {
        const fromQuery = {
            day: Number(searchParams.get("day") ?? 0),
            caption: searchParams.get("caption") ?? "",
            postIdea: searchParams.get("postIdea") ?? "",
            mainActionTitle: searchParams.get("mainActionTitle") ?? "",
            posterHint: searchParams.get("posterHint") ?? "",
            dayTheme: searchParams.get("dayTheme") ?? "",
            offerDeadlineHint: searchParams.get("offerDeadlineHint") ?? "",
            reelScript: searchParams.get("reelScript") ?? "",
            storyFrames: searchParams.get("storyFrames") ?? "",
            backTo: searchParams.get("backTo") ?? "",
        };
        const hasQuery = fromQuery.day > 0 ||
            fromQuery.caption.trim() ||
            fromQuery.postIdea.trim() ||
            fromQuery.mainActionTitle.trim() ||
            fromQuery.posterHint.trim() ||
            fromQuery.dayTheme.trim() ||
            fromQuery.offerDeadlineHint.trim() ||
            fromQuery.reelScript.trim() ||
            fromQuery.storyFrames.trim() ||
            fromQuery.backTo.trim();
        if (hasQuery)
            return fromQuery;
        if (typeof window === "undefined")
            return fromQuery;
        try {
            const raw = sessionStorage.getItem("bizboost:editorDayContext");
            if (!raw)
                return fromQuery;
            const parsed = JSON.parse(raw) as {
                dayNumber?: number;
                caption?: string;
                postIdea?: string;
                mainActionTitle?: string;
                posterHint?: string;
                dayTheme?: string;
                offerDeadlineHint?: string;
                reelScript?: string;
                storyFrames?: string;
                backTo?: string;
            };
            return {
                day: Number(parsed.dayNumber ?? 0),
                caption: typeof parsed.caption === "string" ? parsed.caption : "",
                postIdea: typeof parsed.postIdea === "string" ? parsed.postIdea : "",
                mainActionTitle: typeof parsed.mainActionTitle === "string" ? parsed.mainActionTitle : "",
                posterHint: typeof parsed.posterHint === "string" ? parsed.posterHint : "",
                dayTheme: typeof parsed.dayTheme === "string" ? parsed.dayTheme : "",
                offerDeadlineHint: typeof parsed.offerDeadlineHint === "string" ? parsed.offerDeadlineHint : "",
                reelScript: typeof parsed.reelScript === "string" ? parsed.reelScript : "",
                storyFrames: typeof parsed.storyFrames === "string" ? parsed.storyFrames : "",
                backTo: typeof parsed.backTo === "string" ? parsed.backTo : "",
            };
        }
        catch {
            return fromQuery;
        }
    }, [searchParams]);
    const dayParam = editorContext.day;
    const queryCaption = editorContext.caption;
    const queryPostIdea = editorContext.postIdea;
    const queryActionTitle = editorContext.mainActionTitle;
    const queryPosterHint = editorContext.posterHint;
    const queryReelScript = editorContext.reelScript;
    const queryStoryFrames = editorContext.storyFrames;
    const backToHref = useMemo(() => {
        const raw = editorContext.backTo;
        if (typeof raw === "string" && raw.trim().length > 0)
            return raw;
        if (dayParam > 0)
            return `/marketing-plan/day/${dayParam}`;
        return "/marketing-plan";
    }, [editorContext.backTo, dayParam]);
    const [planDayThemeFromApi, setPlanDayThemeFromApi] = useState("");
    const campaignDayTheme = useMemo(() => editorContext.dayTheme.trim() || planDayThemeFromApi.trim(), [
        editorContext.dayTheme,
        planDayThemeFromApi,
    ]);
    const [loading, setLoading] = useState(true);
    const [showMissingBusinessModal, setShowMissingBusinessModal] = useState(false);
    const [business, setBusiness] = useState<BusinessProfile | null>(null);
    const [offerText, setOfferText] = useState(() => queryPostIdea || queryActionTitle || "");
    const [caption, setCaption] = useState(() => queryCaption);
    const [hashtags, setHashtags] = useState<string[]>([]);
    const [imageName, setImageName] = useState<string>("");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [inlineError, setInlineError] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [generated, setGenerated] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [generatingAi, setGeneratingAi] = useState(false);
    const [suggestingCaption, setSuggestingCaption] = useState(false);
    const [dayPlanSummary, setDayPlanSummary] = useState("");
    const [marketingActivation, setMarketingActivation] = useState<MarketingActivationBrief | null>(null);
    const [captionAutoSuggested, setCaptionAutoSuggested] = useState(false);
    const [posterDesign, setPosterDesign] = useState<PosterDesign>(DEFAULT_POSTER_DESIGN);
    const [recommendedTemplateId, setRecommendedTemplateId] = useState<string | null>(null);
    const [designLoading, setDesignLoading] = useState(false);
    const [posterVariantChoices, setPosterVariantChoices] = useState<[
        PosterDesign | null,
        PosterDesign | null
    ]>([
        null,
        null,
    ]);
    const [variantGenerating, setVariantGenerating] = useState(false);
    const lockedBrandAccent = useMemo(() => pickBrandAccentHex(business?.businessName ?? ""), [business?.businessName]);
    const activationForPoster = useMemo((): MarketingActivationBrief | null => {
        const hint = editorContext.offerDeadlineHint.trim();
        if (!marketingActivation && !hint)
            return null;
        if (!marketingActivation)
            return { offerDeadlineHint: hint };
        if (!hint)
            return marketingActivation;
        const existing = marketingActivation.offerDeadlineHint?.trim();
        return existing ? marketingActivation : { ...marketingActivation, offerDeadlineHint: hint };
    }, [marketingActivation, editorContext.offerDeadlineHint]);
    useEffect(() => {
        if (!queryPostIdea &&
            !queryActionTitle &&
            !queryCaption &&
            !queryPosterHint &&
            !editorContext.dayTheme.trim() &&
            !editorContext.offerDeadlineHint.trim() &&
            !queryReelScript &&
            !queryStoryFrames)
            return;
        const parsedReel = (() => {
            try {
                return queryReelScript ? JSON.parse(queryReelScript) as {
                    hook?: string;
                    beats?: string[];
                    cta?: string;
                } : null;
            }
            catch {
                return null;
            }
        })();
        const parsedStory = (() => {
            try {
                return queryStoryFrames ? (JSON.parse(queryStoryFrames) as string[]) : [];
            }
            catch {
                return [];
            }
        })();
        const socialAppendix = [
            parsedReel?.hook ? `Reel hook: ${parsedReel.hook}` : "",
            Array.isArray(parsedReel?.beats) && parsedReel?.beats?.length ? `Reel beats: ${parsedReel?.beats.join(" | ")}` : "",
            parsedReel?.cta ? `Reel CTA: ${parsedReel.cta}` : "",
            parsedStory.length ? `Story frames: ${parsedStory.join(" | ")}` : "",
        ]
            .filter(Boolean)
            .join("\n");
        setOfferText((prev) => (prev.trim() ? prev : queryPostIdea || queryActionTitle || prev));
        setCaption((prev) => {
            const base = prev.trim() ? prev : queryCaption || prev;
            if (!socialAppendix)
                return base;
            return `${base}${base ? "\n\n" : ""}${socialAppendix}`;
        });
        if (dayParam <= 0) {
            const themeForStandalone = editorContext.dayTheme.trim() || undefined;
            const bn = business?.businessName?.trim() || "";
            const bt = business?.businessType?.trim() || "";
            const shouldPickTheme = !!(bn || themeForStandalone);
            const picked = shouldPickTheme
                ? pickPosterTemplateForContext({ dayTheme: themeForStandalone, dayNumber: 1, businessType: bt })
                : null;
            const stylePick = picked?.layoutType ?? DEFAULT_POSTER_DESIGN.style;
            const accent = bn ? pickBrandAccentHex(bn) : DEFAULT_POSTER_DESIGN.accentColor;
            const hint = editorContext.offerDeadlineHint.trim();
            const standaloneMa = hint ? ({ offerDeadlineHint: hint } as MarketingActivationBrief) : null;
            const seed = buildPosterSeedFromPlan({
                businessName: bn || "Your Brand",
                caption: queryCaption || queryPostIdea || "",
                marketingActivation: standaloneMa,
                mainActionTitle: queryActionTitle,
                posterHintFallback: queryPosterHint,
            });
            setPosterDesign((prev) => ({
                ...DEFAULT_POSTER_DESIGN,
                ...prev,
                ...seed,
                style: stylePick as PosterDesign["style"],
                ...(picked ? { templateId: picked.id } : {}),
                accentColor: accent,
            }));
            setRecommendedTemplateId(picked?.id ?? null);
        }
        setDayPlanSummary((prev) => {
            if (prev.trim())
                return prev;
            const chunks = [
                queryActionTitle ? `Main action: ${queryActionTitle}` : "",
                queryPostIdea ? `Post idea: ${queryPostIdea}` : "",
                queryPosterHint ? `Poster hint: ${queryPosterHint}` : "",
            ].filter(Boolean);
            return chunks.join(". ");
        });
    }, [
        queryActionTitle,
        queryCaption,
        queryPostIdea,
        queryPosterHint,
        queryReelScript,
        queryStoryFrames,
        dayParam,
        business?.businessName,
        editorContext.dayTheme,
        editorContext.offerDeadlineHint,
        business?.businessType,
    ]);
    useEffect(() => {
        if (authLoading)
            return;
        if (!user?.uid) {
            router.replace("/login");
            return;
        }
        const load = async () => {
            setLoading(true);
            try {
                setPlanDayThemeFromApi("");
                const businessRes = await fetch(`/api/business-profile?firebase_uid=${encodeURIComponent(user.uid)}`, { cache: "no-store" });
                const businessJson = await businessRes.json();
                if (businessRes.status === 404 || businessJson?.error === "business_profile_not_found") {
                    setShowMissingBusinessModal(true);
                    return;
                }
                if (!businessRes.ok || !businessJson?.ok) {
                    setShowMissingBusinessModal(true);
                    return;
                }
                setBusiness(businessJson.data ?? {});
                if (dayParam > 0) {
                    const latestRes = await fetch(`/api/marketing-plan/latest?firebase_uid=${encodeURIComponent(user.uid)}`, { cache: "no-store" });
                    const latestJson = (await latestRes.json()) as LatestPlanResponse;
                    if (latestRes.ok && latestJson?.ok) {
                        const safePlan = Array.isArray(latestJson?.data?.planData) ? latestJson?.data?.planData : [];
                        const dayItem = safePlan.find((item) => Number(item.dayNumber) === dayParam);
                        if (dayItem) {
                            const bizNameSeed = String(businessJson?.data?.businessName ?? "").trim();
                            const ma = dayItem.marketingActivation && typeof dayItem.marketingActivation === "object" ? dayItem.marketingActivation : null;
                            const themeForStyle = editorContext.dayTheme.trim() ||
                                (typeof dayItem.dayTheme === "string" ? dayItem.dayTheme.trim() : "") ||
                                "";
                            setPlanDayThemeFromApi(typeof dayItem.dayTheme === "string" ? dayItem.dayTheme.trim() : "");
                            const bizTypeSeed = String(businessJson?.data?.businessType ?? "").trim();
                            const pickedTpl = pickPosterTemplateForContext({
                                dayTheme: themeForStyle || undefined,
                                dayNumber: dayParam,
                                businessType: bizTypeSeed,
                            });
                            const accent = pickBrandAccentHex(bizNameSeed || "bizboost");
                            const captionSeed = ma?.caption || dayItem.caption || "";
                            const seed = buildPosterSeedFromPlan({
                                businessName: bizNameSeed || "Your Brand",
                                caption: captionSeed,
                                marketingActivation: ma,
                                mainActionTitle: dayItem.mainActionTitle,
                                businessGrowthAction: dayItem.businessGrowthAction,
                                posterHintFallback: ma?.posterHint || dayItem.posterHint || "",
                            });
                            setOfferText((prev) => prev || dayItem.mainActionTitle || dayItem.postIdea || "");
                            setHashtags(Array.isArray(dayItem.hashtags) ? dayItem.hashtags : []);
                            setCaption((prev) => prev || dayItem.caption || "");
                            setPosterDesign(() => ({
                                ...DEFAULT_POSTER_DESIGN,
                                ...seed,
                                style: pickedTpl.layoutType,
                                templateId: pickedTpl.id,
                                accentColor: accent,
                            }));
                            setRecommendedTemplateId(pickedTpl.id);
                            const summaryParts = [
                                dayItem.mainActionTitle ? `Main action: ${dayItem.mainActionTitle}` : "",
                                dayItem.businessGrowthAction ? `Business action: ${dayItem.businessGrowthAction}` : "",
                                dayItem.postIdea ? `Post idea: ${dayItem.postIdea}` : "",
                                `Day: ${dayItem.dayNumber}`,
                            ].filter(Boolean);
                            setDayPlanSummary(summaryParts.join(". "));
                            setMarketingActivation(ma);
                        }
                        else {
                            setMarketingActivation(null);
                            setRecommendedTemplateId(null);
                        }
                    }
                    else {
                        setMarketingActivation(null);
                        setRecommendedTemplateId(null);
                    }
                }
                else {
                    setMarketingActivation(null);
                }
            }
            finally {
                setLoading(false);
            }
        };
        void load();
    }, [authLoading, user?.uid, router, dayParam, editorContext.dayTheme]);
    useEffect(() => {
        if (loading || authLoading)
            return;
        if (!business)
            return;
        if (captionAutoSuggested)
            return;
        if (caption.trim().length > 0) {
            setCaptionAutoSuggested(true);
            return;
        }
        const prepared = buildBusinessDetailsPayload(business, offerText, dayPlanSummary, buildPhotoContextLine(!!imageUrl, imageName), "", activationForPoster, { dayTheme: campaignDayTheme, ...aiPosterCatalogMeta(posterDesign.templateId) });
        if (!prepared.ok)
            return;
        let cancelled = false;
        const run = async () => {
            try {
                setSuggestingCaption(true);
                const res = await fetch("/api/ai/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "poster-caption",
                        businessDetails: prepared.payload,
                    }),
                });
                const json = await res.json();
                if (cancelled)
                    return;
                if (!res.ok || !json?.ok || typeof json?.text !== "string")
                    return;
                const parsed = parseCaptionAndHashtags(json.text);
                if (parsed.caption) {
                    setCaption(parsed.caption);
                    setCaptionAutoSuggested(true);
                }
                if ((hashtags?.length ?? 0) === 0 && parsed.hashtags.length > 0) {
                    setHashtags(parsed.hashtags);
                }
            }
            catch {
            }
            finally {
                if (!cancelled)
                    setSuggestingCaption(false);
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [
        loading,
        authLoading,
        business,
        offerText,
        dayPlanSummary,
        caption,
        captionAutoSuggested,
        hashtags,
        activationForPoster,
        imageUrl,
        imageName,
        campaignDayTheme,
        posterDesign.templateId,
    ]);
    useEffect(() => {
        if (loading || authLoading)
            return;
        if (!business)
            return;
        const prepared = buildBusinessDetailsPayload(business, offerText, dayPlanSummary, buildPhotoContextLine(!!imageUrl, imageName), caption.trim(), activationForPoster, {
            dayTheme: campaignDayTheme,
            brandAccentLocked: lockedBrandAccent,
            ...aiPosterCatalogMeta(posterDesign.templateId),
        });
        if (!prepared.ok)
            return;
        let cancelled = false;
        const run = async () => {
            try {
                setDesignLoading(true);
                const res = await fetch("/api/ai/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "poster-design",
                        businessDetails: {
                            ...prepared.payload,
                            lockedStyle: posterDesign.style,
                        },
                    }),
                });
                const json = await res.json();
                if (cancelled)
                    return;
                if (!res.ok || !json?.ok || !json?.design)
                    return;
                const designRaw = json.design as PosterDesign;
                setPosterDesign((prev) => mergePosterWithBrandLocks(prev.style, lockedBrandAccent, designRaw, prev));
            }
            catch {
            }
            finally {
                if (!cancelled)
                    setDesignLoading(false);
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [
        loading,
        authLoading,
        business,
        offerText,
        dayPlanSummary,
        activationForPoster,
        caption,
        imageUrl,
        imageName,
        posterDesign.style,
        posterDesign.templateId,
        lockedBrandAccent,
        campaignDayTheme,
    ]);
    async function regeneratePosterVariants() {
        if (!business)
            return;
        const prepared = buildBusinessDetailsPayload(business, offerText, dayPlanSummary, buildPhotoContextLine(!!imageUrl, imageName), caption.trim(), activationForPoster, {
            dayTheme: campaignDayTheme,
            brandAccentLocked: lockedBrandAccent,
            ...aiPosterCatalogMeta(posterDesign.templateId),
        });
        if (!prepared.ok)
            return;
        try {
            setVariantGenerating(true);
            const snapshotStyle = posterDesign.style;
            const base = {
                ...prepared.payload,
                lockedStyle: snapshotStyle,
            };
            async function fetchOne(seed: string) {
                const res = await fetch("/api/ai/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "poster-design",
                        businessDetails: {
                            ...base,
                            avoidHeadline: posterDesign.headline.trim(),
                            avoidSubheadline: posterDesign.subheadline.trim(),
                            variationHint: seed,
                        },
                    }),
                });
                const json = await res.json();
                if (!res.ok || !json?.ok || !json?.design)
                    return null;
                return json.design as PosterDesign;
            }
            const results = await Promise.all([
                fetchOne("Variant A: tighten urgency and one credible proof cue — still one coherent campaign."),
                fetchOne("Variant B: warmer benefit-led angle and conversational CTA — same offer, different tone."),
            ]);
            const [a, b] = results;
            setPosterVariantChoices([
                a ? mergePosterWithBrandLocks(snapshotStyle, lockedBrandAccent, a, posterDesign) : null,
                b ? mergePosterWithBrandLocks(snapshotStyle, lockedBrandAccent, b, posterDesign) : null,
            ]);
        }
        finally {
            setVariantGenerating(false);
        }
    }
    function applyPosterVariant(ix: 0 | 1) {
        const choice = posterVariantChoices[ix];
        if (!choice)
            return;
        setPosterDesign(choice);
        setPosterVariantChoices([null, null]);
    }
    function readFile(file: File) {
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setImageName(file.name);
        setInlineError("");
    }
    function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        readFile(file);
    }
    function onDrop(event: React.DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        setDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (!file)
            return;
        readFile(file);
    }
    async function generateContent() {
        if (!imageUrl) {
            setInlineError("Please upload an image first.");
            return;
        }
        const fallbackHashtags = ["#SmallBusiness", "#BusinessGrowth", "#SupportLocal", "#BizBoostAI"];
        const prepared = buildBusinessDetailsPayload(business, offerText, dayPlanSummary, imageName ? `Uploaded photo: ${imageName}` : "A real photo uploaded by the business owner", caption.trim(), activationForPoster, { dayTheme: campaignDayTheme, ...aiPosterCatalogMeta(posterDesign.templateId) });
        if (!prepared.ok) {
            setInlineError(`Missing business details: ${prepared.missing.join(", ")}. Please complete your business profile first.`);
            return;
        }
        try {
            setGeneratingAi(true);
            setInlineError("");
            const aiResponse = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "final-post",
                    businessDetails: prepared.payload,
                }),
            });
            const aiJson = await aiResponse.json();
            if (!aiResponse.ok || !aiJson?.ok || typeof aiJson?.text !== "string" || !aiJson.text.trim()) {
                const message = typeof aiJson?.error === "string" ? aiJson.error : "Post generation failed.";
                setInlineError(message);
                return;
            }
            const parsed = parseCaptionAndHashtags(aiJson.text);
            const finalCaption = parsed.caption || caption.trim();
            const mergedHashtags = parsed.hashtags.length > 0
                ? parsed.hashtags
                : Array.isArray(hashtags) && hashtags.length > 0
                    ? hashtags
                    : fallbackHashtags;
            setCaption(finalCaption);
            setHashtags(mergedHashtags);
            setGenerated(true);
            if (!user?.uid)
                return;
            setSavingDraft(true);
            const response = await fetch("/api/caption-drafts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firebase_uid: user.uid,
                    dayNumber: Number.isFinite(dayParam) && dayParam > 0 ? dayParam : null,
                    caption: finalCaption,
                    hashtags: mergedHashtags,
                    imageName: imageName || "uploaded-image",
                    offerText: offerText.trim(),
                    imageDataUrl: imageUrl,
                    posterDesign,
                    posterStyle: posterDesign.style,
                }),
            });
            const result = await response.json();
            if (response.ok && result?.ok) {
                const draftId = String(result?.data?.draftId ?? "");
                if (draftId) {
                    router.push(`/poster-preview?draftId=${encodeURIComponent(draftId)}`);
                }
            }
            else {
                setInlineError("Post generated, but saving draft failed. Please try again.");
            }
        }
        catch {
            setInlineError("Failed to generate post content. Please try again.");
        }
        finally {
            setGeneratingAi(false);
            setSavingDraft(false);
        }
    }
    async function copyCaption() {
        if (!caption)
            return;
        try {
            await navigator.clipboard.writeText(caption);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        }
        catch {
            setCopied(false);
        }
    }
    const previewCaption = useMemo(() => caption || "Caption preview will appear here after generation.", [caption]);
    return (<div className="editorPage">
      <div className="editorShell">
        <section className="editorHeader">
          <div>
            <p className="eyebrow">Biz Editor</p>
            <h1>Creative Editor</h1>
            <p className="sub">Upload an image, generate a business-ready caption, and prepare your post output.</p>
          </div>
          <button type="button" className="backBtn" onClick={() => router.push(backToHref)}>
            Back
          </button>
        </section>

        <section className="editorGrid">
          <div className="glassCard">
            <h2>Image Upload</h2>
            <label className={`dropZone ${dragOver ? "dragOver" : ""}`} onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
        }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
              <input type="file" accept="image/*" onChange={onFileChange}/>
              {imageUrl ? (<img src={imageUrl} alt="Uploaded preview" className="uploaded"/>) : (<div className="dropText">
                  <strong>Drag & drop an image</strong>
                  <span>or click to upload</span>
                </div>)}
            </label>
            {inlineError && <p className="errorText">{inlineError}</p>}
          </div>

          <div className="glassCard">
            <h2>Content</h2>
            <label className="fieldLabel">Offer / Post Idea</label>
            <input value={offerText} onChange={(e) => setOfferText(e.target.value)} className="textInput" placeholder="e.g. Weekend combo offer"/>

            <label className="fieldLabel">
              Caption{suggestingCaption ? " (suggesting...)" : captionAutoSuggested ? " (suggested - you can edit)" : ""}
            </label>
            <textarea value={caption} onChange={(e) => {
            setCaption(e.target.value);
            setCaptionAutoSuggested(true);
        }} className="textArea" placeholder={suggestingCaption
            ? "Suggesting a caption based on your day plan..."
            : "A simple caption will be suggested automatically. You can edit it before generating the final post."} rows={7}/>

            <label className="fieldLabel">Hashtags</label>
            <div className="tagWrap">
              {(hashtags ?? []).length > 0 ? ((hashtags ?? []).map((tag) => (<span key={tag} className="tag">
                    {tag}
                  </span>))) : (<span className="tagEmpty">Hashtags will appear after generation.</span>)}
            </div>

            <div className="btnRow">
              <button type="button" className="primaryBtn" onClick={generateContent} disabled={loading || generatingAi || savingDraft || suggestingCaption}>
                {generatingAi || savingDraft ? "Generating post..." : "Generate Final Post"}
              </button>
              <button type="button" className="secondaryBtn" onClick={() => void copyCaption()} disabled={!caption}>
                {copied ? "Copied" : "Copy Caption"}
              </button>
            </div>
          </div>
        </section>

        <section className="glassCard previewCard">
          <div className="previewHeader">
            <div>
              <h2>Poster Preview</h2>
              <p className="previewHint">
                Browse templates by category below typography uses the shared BizBoost layout system so branding stays cohesive.
              </p>
              {campaignDayTheme ? (<p className="themeBadge">Poster theme from plan · {campaignDayTheme}</p>) : null}
            </div>
            {designLoading || variantGenerating ? (<span className="designBadge">{variantGenerating ? "Variants…" : "Designing…"}</span>) : null}
          </div>

          <PosterTemplatePicker selectedTemplateId={posterDesign.templateId} selectedStyle={posterDesign.style} recommendedTemplateId={recommendedTemplateId} onPick={(id, layoutStyle) => setPosterDesign((prev) => ({ ...prev, templateId: id, style: layoutStyle }))}/>

          <div className="posterActionsRow">
            <button type="button" className="secondaryBtn slimBtn" onClick={() => void regeneratePosterVariants()} disabled={loading || suggestingCaption || variantGenerating || designLoading || !business}>
              {variantGenerating ? "Generating variants…" : "Regenerate variation"}
            </button>
            {posterVariantChoices[0] || posterVariantChoices[1] ? (<span className="variantPick">
                {posterVariantChoices[0] ? (<button type="button" className="ghostMini" onClick={() => applyPosterVariant(0)}>
                    Use option 1
                  </button>) : null}
                {posterVariantChoices[1] ? (<button type="button" className="ghostMini" onClick={() => applyPosterVariant(1)}>
                    Use option 2
                  </button>) : null}
              </span>) : null}
          </div>

          <div className="activeStyleInfo">
            <span className="dot" style={{ background: POSTER_STYLE_META[posterDesign.style].vibeColor }}/>
            <div className="activeStyleTexts">
              {posterDesign.templateId ? (<strong className="templateLine">
                  Template:{" "}
                  {getPosterTemplateById(posterDesign.templateId)?.name ?? posterDesign.templateId}
                </strong>) : null}
              <strong className="layoutLine">{POSTER_STYLE_META[posterDesign.style].label}</strong>
              <span className="activeStyleDesc">{POSTER_STYLE_META[posterDesign.style].description}</span>
            </div>
          </div>

          <div className="posterStage">
            <PosterTemplate imageUrl={imageUrl} design={posterDesign}/>
          </div>

          <section className="designTuning">
            <h3 className="tuningTitle">Fine tune poster</h3>
            <div className="tuningBodyWrap">
              <div className="tuningGrid">
              <label className="tuneField">
                <span>Brand name</span>
                <input value={posterDesign.brandName} onChange={(e) => setPosterDesign((prev) => ({ ...prev, brandName: e.target.value }))}/>
              </label>
              <label className="tuneField">
                <span className="tuneLabelRow">
                  <span>Headline</span>
                  <em>{posterDesign.headline.length}</em>
                </span>
                <input value={posterDesign.headline} onChange={(e) => setPosterDesign((prev) => ({ ...prev, headline: e.target.value }))}/>
              </label>
              <label className="tuneField">
                <span className="tuneLabelRow">
                  <span>Subheadline</span>
                  <em>{posterDesign.subheadline.length}</em>
                </span>
                <input value={posterDesign.subheadline} onChange={(e) => setPosterDesign((prev) => ({ ...prev, subheadline: e.target.value }))}/>
              </label>
              <label className="tuneField">
                <span>Offer badge</span>
                <input value={posterDesign.offerBadge} onChange={(e) => setPosterDesign((prev) => ({ ...prev, offerBadge: e.target.value }))}/>
              </label>
              <label className="tuneField">
                <span className="tuneLabelRow">
                  <span>CTA label</span>
                  <em>{posterDesign.ctaLabel.length}</em>
                </span>
                <input value={posterDesign.ctaLabel} onChange={(e) => setPosterDesign((prev) => ({ ...prev, ctaLabel: e.target.value }))}/>
              </label>
              <label className="tuneField">
                <span>Accent color (manual — AI regenerate restores brand accent)</span>
                <input type="color" value={posterDesign.accentColor} onChange={(e) => setPosterDesign((prev) => ({ ...prev, accentColor: e.target.value }))}/>
              </label>
              </div>
            </div>
          </section>

          {generated ? <p className="previewCaptionHint">Caption: {previewCaption}</p> : null}
        </section>
      </div>

      {showMissingBusinessModal && (<div className="modalOverlay">
          <div className="modalCard">
            <h3>Fill business details first</h3>
            <p>Please complete your business details before using Biz Editor.</p>
            <button type="button" className="modalPrimary" onClick={() => router.push("/onboarding/business-details")}>
              Go to Business Details
            </button>
          </div>
        </div>)}

      <style jsx>{`
        .editorPage {
          min-height: 100vh;
          padding: 28px 16px 12px;
          background: var(--page-bg);
        }
        .editorShell {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }
        .editorHeader,
        .glassCard {
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(12px);
          padding: 18px;
        }
        .editorHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .eyebrow {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }
        h1 {
          margin: 8px 0 0;
          color: #0f172a;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.1;
        }
        .sub {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
        }
        .backBtn,
        .primaryBtn,
        .modalPrimary {
          border: 1px solid rgba(16, 185, 129, 0.3);
          background: linear-gradient(145deg, #10b981, #059669);
          color: #fff;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .secondaryBtn {
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: #fff;
          color: #334155;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .secondaryBtn:disabled,
        .primaryBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .editorGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        h2 {
          margin: 0 0 10px;
          color: #0f172a;
          font-size: 18px;
        }
        .dropZone {
          position: relative;
          min-height: 280px;
          border-radius: 14px;
          border: 1px dashed rgba(148, 163, 184, 0.52);
          background: rgba(248, 250, 252, 0.9);
          display: grid;
          place-items: center;
          overflow: hidden;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .dropZone.dragOver {
          border-color: rgba(16, 185, 129, 0.55);
          background: rgba(236, 253, 245, 0.92);
        }
        .dropZone input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }
        .dropText {
          display: grid;
          gap: 4px;
          text-align: center;
          color: #64748b;
        }
        .dropText strong {
          color: #334155;
        }
        .uploaded {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .errorText {
          margin: 8px 0 0;
          color: #be123c;
          font-size: 13px;
        }
        .fieldLabel {
          display: block;
          margin: 8px 0 6px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          font-weight: 700;
        }
        .textInput,
        .textArea {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.42);
          background: rgba(255, 255, 255, 0.92);
          color: #0f172a;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
        }
        .textArea {
          resize: vertical;
          min-height: 120px;
          font-family: inherit;
          line-height: 1.5;
        }
        .tagWrap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tag {
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.34);
          background: #fff;
          color: #475569;
          font-size: 12px;
          padding: 5px 10px;
        }
        .tagEmpty {
          font-size: 12px;
          color: #94a3b8;
        }
        .btnRow {
          margin-top: 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .previewCard {
          padding-top: 14px;
        }
        .previewHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }
        .previewHeader h2 {
          margin: 0;
        }
        .previewHint {
          margin: 4px 0 0;
          font-size: 12px;
          color: #64748b;
          line-height: 1.4;
          max-width: 380px;
        }
        .themeBadge {
          margin: 6px 0 0;
          font-size: 11px;
          font-weight: 600;
          color: #0369a1;
        }
        .posterActionsRow {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .slimBtn {
          padding: 8px 12px !important;
          font-size: 13px;
        }
        .variantPick {
          display: inline-flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .ghostMini {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.55);
          background: transparent;
          font-weight: 600;
          cursor: pointer;
          font-size: 12px;
          color: #334155;
        }
        .designBadge {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #0369a1;
          background: rgba(14, 165, 233, 0.12);
          border: 1px solid rgba(14, 165, 233, 0.35);
          padding: 4px 8px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .activeStyleInfo {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(241, 245, 249, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 10px;
          padding: 8px 12px;
          margin-bottom: 12px;
          font-size: 12px;
          color: #334155;
          flex-wrap: wrap;
        }
        .activeStyleTexts {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .activeStyleInfo .templateLine {
          color: #0369a1;
          font-size: 12px;
        }
        .activeStyleInfo .layoutLine {
          color: #0f172a;
          font-size: 13px;
        }
        .activeStyleInfo .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.6);
          flex-shrink: 0;
          margin-top: 4px;
        }
        .activeStyleDesc {
          color: #64748b;
        }
        .posterStage {
          border-radius: 16px;
          overflow: hidden;
        }
        .designTuning {
          margin-top: 14px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: rgba(255, 255, 255, 0.7);
          padding: 10px 12px;
        }
        .tuningTitle {
          margin: 0;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
        }
        .tuningBodyWrap {
          margin-top: 10px;
        }
        .tuningGrid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .tuneField {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tuneField span {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }
        .tuneLabelRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .tuneLabelRow em {
          font-style: normal;
          font-size: 10px;
          letter-spacing: 0;
          text-transform: none;
          color: #94a3b8;
          font-weight: 700;
        }
        .tuneField input {
          border: 1px solid rgba(148, 163, 184, 0.42);
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 13px;
          background: #fff;
          color: #0f172a;
          outline: none;
        }
        .previewCaptionHint {
          margin: 12px 0 0;
          font-size: 13px;
          color: #475569;
          white-space: pre-wrap;
        }
        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(15, 23, 42, 0.26);
          backdrop-filter: blur(2px);
        }
        .modalCard {
          width: 100%;
          max-width: 460px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.34);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
          padding: 18px;
        }
        .modalCard h3 {
          margin: 0;
          color: #0f172a;
        }
        .modalCard p {
          margin: 10px 0 14px;
          color: #64748b;
        }
        @media (max-width: 900px) {
          .editorGrid {
            grid-template-columns: 1fr;
          }
          .tuningGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>);
}
