import type { CSSProperties } from "react";
import type { PosterDesign, PosterStyle } from "@/src/components/poster/PosterTemplate";
import type { PosterAccentTokens } from "@/src/lib/posterAccent";
import { luminance, onForHex, parseHex6 } from "@/src/lib/posterAccent";

export type PosterSlotColors = {
    brand: string;
    headline: string;
    sub: string;
    offerBg: string;
    offerText: string;
    offerBorder: string;
    ctaBg: string;
    ctaText: string;
    ctaBorder: string;
};

function pickHex(override: string | undefined, base: string): string {
    const v = (override ?? "").trim();
    return parseHex6(v) ? v : base;
}

function rgbCsv(hex: string): string {
    const rgb = parseHex6(hex.trim());
    return rgb ? `${rgb[0]}, ${rgb[1]}, ${rgb[2]}` : "225, 29, 72";
}

function ensureReadableOnLight(fgHex: string): string {
    const rgb = parseHex6(fgHex.trim());
    if (!rgb)
        return fgHex;
    if (luminance(rgb) > 0.74) {
        const r = Math.round(rgb[0] * 0.35 + 15 * 0.65);
        const g = Math.round(rgb[1] * 0.35 + 23 * 0.65);
        const b = Math.round(rgb[2] * 0.35 + 42 * 0.65);
        return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
    }
    return fgHex.trim();
}

function ensureReadableOnDark(fgHex: string): string {
    const rgb = parseHex6(fgHex.trim());
    if (!rgb)
        return fgHex;
    if (luminance(rgb) < 0.18) {
        const r = Math.round(rgb[0] * 0.45 + 248 * 0.55);
        const g = Math.round(rgb[1] * 0.45 + 250 * 0.55);
        const b = Math.round(rgb[2] * 0.45 + 252 * 0.55);
        return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
    }
    return fgHex.trim();
}

function colorAtAlpha(cssColor: string, mixFraction: number): string {
    const raw = (cssColor || "").trim();
    const t = raw.toLowerCase();
    if (t === "transparent" || mixFraction <= 0)
        return "rgba(0, 0, 0, 0)";
    if (mixFraction >= 1)
        return raw;
    const hex = parseHex6(raw);
    if (hex)
        return `rgba(${hex[0]}, ${hex[1]}, ${hex[2]}, ${mixFraction})`;
    const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)/.exec(raw);
    if (m) {
        const baseA = m[4] !== undefined ? Number(m[4]) : 1;
        const a = Number.isFinite(baseA) ? baseA * mixFraction : mixFraction;
        return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a})`;
    }
    return `rgba(15, 23, 42, ${mixFraction})`;
}

function mixRgbTowardsWhite(r: number, g: number, b: number, t: number): [number, number, number] {
    return [
        Math.round(r + (255 - r) * t),
        Math.round(g + (255 - g) * t),
        Math.round(b + (255 - b) * t),
    ];
}

function toHex6(r: number, g: number, b: number): string {
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function highlightBgForSticker(bg: string): string {
    const raw = (bg || "").trim();
    if (raw.toLowerCase() === "transparent")
        return "#fafafa";
    const hex = parseHex6(raw);
    if (hex) {
        const [r, g, b] = mixRgbTowardsWhite(hex[0], hex[1], hex[2], 0.88);
        return toHex6(r, g, b);
    }
    const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)/.exec(raw);
    if (m) {
        const r = Number(m[1]);
        const g = Number(m[2]);
        const b = Number(m[3]);
        const [R, G, B] = mixRgbTowardsWhite(r, g, b, 0.88);
        return toHex6(R, G, B);
    }
    return "#fafafa";
}

function blendHexPair(hexA: string, hexB: string, weightOfA: number): string {
    const a = parseHex6(hexA.trim());
    const b = parseHex6(hexB.trim());
    if (!a || !b)
        return hexB.trim() || "#8b5cf6";
    const w = weightOfA;
    const r = Math.round(a[0] * w + b[0] * (1 - w));
    const g = Math.round(a[1] * w + b[1] * (1 - w));
    const bl = Math.round(a[2] * w + b[2] * (1 - w));
    return toHex6(r, g, bl);
}

function baseSlots(style: PosterStyle, tok: PosterAccentTokens, t: string, accent: string): PosterSlotColors {
    const oa = tok.onAccent;
    const asoft = tok.accentSoft;
    const rgb = tok.accentRgb;
    switch (style) {
        case "bold-statement":
            return {
                brand: t,
                headline: t,
                sub: t,
                offerBg: accent,
                offerText: oa,
                offerBorder: accent,
                ctaBg: accent,
                ctaText: oa,
                ctaBorder: accent,
            };
        case "landscape-action":
            return {
                brand: t,
                headline: t,
                sub: t,
                offerBg: accent,
                offerText: oa,
                offerBorder: accent,
                ctaBg: "#0b1220",
                ctaText: "#ffffff",
                ctaBorder: "#0b1220",
            };
        case "hero-product":
            return {
                brand: t,
                headline: t,
                sub: t,
                offerBg: accent,
                offerText: oa,
                offerBorder: accent,
                ctaBg: `rgba(${rgb}, 0.12)`,
                ctaText: t,
                ctaBorder: accent,
            };
        case "editorial":
            return {
                brand: tok.fgOnDark,
                headline: t,
                sub: t,
                offerBg: "transparent",
                offerText: tok.fgOnDark,
                offerBorder: "transparent",
                ctaBg: "transparent",
                ctaText: tok.fgOnDark,
                ctaBorder: "transparent",
            };
        case "minimal-clean":
            return {
                brand: tok.fgOnLight,
                headline: "#0f172a",
                sub: "#475569",
                offerBg: asoft,
                offerText: accent,
                offerBorder: accent,
                ctaBg: "transparent",
                ctaText: tok.fgOnLight,
                ctaBorder: accent,
            };
        case "luxury-dark":
            return {
                brand: tok.fgOnDark,
                headline: tok.fgOnDark,
                sub: "#f1f0eb",
                offerBg: `rgba(${rgb}, 0.08)`,
                offerText: tok.fgOnDark,
                offerBorder: `rgba(${rgb}, 0.85)`,
                ctaBg: accent,
                ctaText: oa,
                ctaBorder: accent,
            };
        case "neon-tech":
            return {
                brand: accent,
                headline: t,
                sub: tok.fgOnDark,
                offerBg: "transparent",
                offerText: accent,
                offerBorder: accent,
                ctaBg: accent,
                ctaText: oa,
                ctaBorder: accent,
            };
        case "festival-vibrant":
            return {
                brand: t,
                headline: t,
                sub: t,
                offerBg: accent,
                offerText: oa,
                offerBorder: accent,
                ctaBg: accent,
                ctaText: oa,
                ctaBorder: accent,
            };
        case "testimonial-quote":
            return {
                brand: t,
                headline: t,
                sub: t,
                offerBg: accent,
                offerText: oa,
                offerBorder: accent,
                ctaBg: "rgba(255, 255, 255, 0.1)",
                ctaText: t,
                ctaBorder: accent,
            };
        case "image-first":
            return {
                brand: t,
                headline: t,
                sub: t,
                offerBg: accent,
                offerText: oa,
                offerBorder: accent,
                ctaBg: accent,
                ctaText: oa,
                ctaBorder: accent,
            };
        case "offer-card":
            return {
                brand: t,
                headline: t,
                sub: t,
                offerBg: accent,
                offerText: oa,
                offerBorder: accent,
                ctaBg: accent,
                ctaText: oa,
                ctaBorder: accent,
            };
        case "social-stack":
            return {
                brand: t,
                headline: t,
                sub: t,
                offerBg: "rgba(255, 255, 255, 0.14)",
                offerText: t,
                offerBorder: "rgba(255, 255, 255, 0.3)",
                ctaBg: accent,
                ctaText: oa,
                ctaBorder: "rgba(255, 255, 255, 0.35)",
            };
    }
}

function applyOfferOverride(style: PosterStyle, userHex: string): Pick<PosterSlotColors, "offerBg" | "offerText" | "offerBorder"> {
    const oh = userHex.trim();
    switch (style) {
        case "minimal-clean":
            return {
                offerBg: `rgba(${rgbCsv(oh)}, 0.14)`,
                offerText: ensureReadableOnLight(oh),
                offerBorder: oh,
            };
        case "neon-tech":
            return {
                offerBg: "transparent",
                offerText: oh,
                offerBorder: oh,
            };
        case "editorial":
            return {
                offerBg: "transparent",
                offerText: ensureReadableOnDark(oh),
                offerBorder: oh,
            };
        case "social-stack":
            return {
                offerBg: `rgba(${rgbCsv(oh)}, 0.22)`,
                offerText: ensureReadableOnDark(oh),
                offerBorder: "rgba(255, 255, 255, 0.38)",
            };
        case "luxury-dark":
            return {
                offerBg: `rgba(${rgbCsv(oh)}, 0.12)`,
                offerText: ensureReadableOnDark(oh),
                offerBorder: `rgba(${rgbCsv(oh)}, 0.9)`,
            };
        default:
            return {
                offerBg: oh,
                offerText: onForHex(oh),
                offerBorder: oh,
            };
    }
}

function applyCtaOverride(style: PosterStyle, userHex: string, t: string): Pick<PosterSlotColors, "ctaBg" | "ctaText" | "ctaBorder"> {
    const ch = userHex.trim();
    const ot = onForHex(ch);
    const chRgb = parseHex6(ch);
    switch (style) {
        case "minimal-clean":
            return {
                ctaBg: "transparent",
                ctaText: ensureReadableOnLight(ch),
                ctaBorder: ch,
            };
        case "editorial":
            return {
                ctaBg: "transparent",
                ctaText: ensureReadableOnDark(ch),
                ctaBorder: ch,
            };
        case "testimonial-quote":
            return {
                ctaBg: "rgba(255, 255, 255, 0.1)",
                ctaText: ensureReadableOnDark(ch),
                ctaBorder: ch,
            };
        case "hero-product":
            return {
                ctaBg: `rgba(${rgbCsv(ch)}, 0.16)`,
                ctaText: chRgb && luminance(chRgb) > 0.62 ? "#0f172a" : t,
                ctaBorder: ch,
            };
        case "landscape-action":
            return {
                ctaBg: ch,
                ctaText: ot,
                ctaBorder: ch,
            };
        case "social-stack":
            return {
                ctaBg: ch,
                ctaText: ot,
                ctaBorder: "rgba(255, 255, 255, 0.35)",
            };
        default:
            return {
                ctaBg: ch,
                ctaText: ot,
                ctaBorder: ch,
            };
    }
}

export function computePosterSlotColors(d: PosterDesign, tok: PosterAccentTokens): PosterSlotColors {
    const t = (d.textColor || "#ffffff").trim();
    const accentRaw = (d.accentColor || "").trim();
    const accent = parseHex6(accentRaw) ? accentRaw : "#E11D48";
    const base = baseSlots(d.style, tok, t, accent);

    const brand = pickHex(d.brandNameColor, base.brand);
    const headline = pickHex(d.headlineColor, base.headline);
    const sub = pickHex(d.subheadlineColor, base.sub);

    let offerBg = base.offerBg;
    let offerText = base.offerText;
    let offerBorder = base.offerBorder;
    const offerPick = (d.offerBadgeColor || "").trim();
    if (parseHex6(offerPick)) {
        const o = applyOfferOverride(d.style, offerPick);
        offerBg = o.offerBg;
        offerText = o.offerText;
        offerBorder = o.offerBorder;
    }

    let ctaBg = base.ctaBg;
    let ctaText = base.ctaText;
    let ctaBorder = base.ctaBorder;
    const ctaPick = (d.ctaColor || "").trim();
    if (parseHex6(ctaPick)) {
        const c = applyCtaOverride(d.style, ctaPick, t);
        ctaBg = c.ctaBg;
        ctaText = c.ctaText;
        ctaBorder = c.ctaBorder;
    }

    return {
        brand,
        headline,
        sub,
        offerBg,
        offerText,
        offerBorder,
        ctaBg,
        ctaText,
        ctaBorder,
    };
}

export function posterSlotCssVars(s: PosterSlotColors, accentHex: string): CSSProperties {
    const acc = parseHex6((accentHex || "").trim()) ? accentHex.trim() : "#E11D48";
    return {
        "--p-slot-brand": s.brand,
        "--p-slot-headline": s.headline,
        "--p-slot-sub": s.sub,
        "--p-slot-offer-bg": s.offerBg,
        "--p-slot-offer-text": s.offerText,
        "--p-slot-offer-border": s.offerBorder,
        "--p-slot-cta-bg": s.ctaBg,
        "--p-slot-cta-text": s.ctaText,
        "--p-slot-cta-border": s.ctaBorder,
        "--p-slot-cta-bd35": colorAtAlpha(s.ctaBorder, 0.35),
        "--p-slot-cta-bd45": colorAtAlpha(s.ctaBorder, 0.45),
        "--p-slot-cta-bd55": colorAtAlpha(s.ctaBorder, 0.55),
        "--p-slot-cta-bd65": colorAtAlpha(s.ctaBorder, 0.65),
        "--p-slot-offer-bd33": colorAtAlpha(s.offerBorder, 0.33),
        "--p-slot-cta-bg-hi": highlightBgForSticker(s.ctaBg),
        "--p-accent-rail-end": blendHexPair(acc, "#8b5cf6", 0.4),
    } as CSSProperties;
}
