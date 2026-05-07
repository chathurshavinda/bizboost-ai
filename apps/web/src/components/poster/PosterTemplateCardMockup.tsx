"use client";
import type { CSSProperties } from "react";
import type { PosterStyle } from "@/src/components/poster/PosterTemplate";
import { type PosterTemplateCategory, type PosterTemplateDefinition, POSTER_TEMPLATE_CATEGORY_LABELS, } from "@/src/lib/posterTemplateCatalog";
import { getPosterTemplatePalette, type PosterTemplatePalette, } from "@/src/theme/posterPalettes";
type Palette = PosterTemplatePalette & {
    muted: string;
    surface: string;
    chipBg?: string;
    chipFg?: string;
};
function pillStyle(palette: Palette): {
    background: string;
    color: string;
} {
    if (palette.chipBg && palette.chipFg)
        return { background: palette.chipBg, color: palette.chipFg };
    return { background: palette.badgeBg, color: palette.textColor };
}
function heroDepth(palette: Palette): CSSProperties {
    return palette.textColor === "#111827" ? {} : { textShadow: "0 1px 10px rgba(0,0,0,0.35)" };
}
function paletteFor(template: PosterTemplateDefinition): Palette {
    const base = getPosterTemplatePalette(template.id);
    const isLight = base.textColor === "#111827";
    return {
        ...base,
        muted: isLight ? "rgba(75,85,99,0.82)" : "rgba(248,250,252,0.86)",
        surface: isLight ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.12)",
        chipBg: isLight ? "#ffffff" : undefined,
        chipFg: isLight ? "#111827" : undefined,
    };
}
type MockProps = {
    layout: PosterStyle;
    palette: Palette;
};
function OfferStrip({ palette, text }: {
    palette: Palette;
    text: string;
}) {
    const pill = pillStyle(palette);
    return (<span style={{
            display: "inline-block",
            padding: "3px 8px",
            borderRadius: 999,
            ...pill,
            border: palette.chipBg ? `1px solid rgba(51,65,85,0.14)` : undefined,
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
        }}>

      {text}

    </span>);
}
function MiniLayoutMock({ layout, palette }: MockProps) {
    const h = heroDepth(palette);
    const fakeImg = (<div style={{
            flex: layout === "image-first" ? 1 : undefined,
            minHeight: layout === "image-first" ? 38 : undefined,
            borderRadius: layout === "image-first" ? 9 : 6,
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            position: "relative" as const,
            overflow: "hidden" as const,
        }}>

      <div style={{
            position: "absolute",
            inset: 10,
            borderRadius: 4,
            background: palette.badgeBg,
            opacity: 0.95,
        }}/>

      <span style={{
            position: "absolute",
            bottom: 6,
            right: 8,
            fontSize: 7,
            fontWeight: 800,
            letterSpacing: "0.18em",
            color: palette.muted,
            opacity: 0.92,
        }}>

        PHOTO

      </span>

    </div>);
    if (layout === "bold-statement") {
        const cta = pillStyle(palette);
        return (<div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "9%" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>

          <span style={{ fontSize: 7, letterSpacing: "0.4em", fontWeight: 800, color: palette.textColor, opacity: 0.92 }}>BRAND</span>

          <OfferStrip palette={palette} text="SALE"/>

        </div>

        <span style={{ ...h, fontSize: 30, fontWeight: 900, lineHeight: 0.92, letterSpacing: "-0.04em", color: palette.textColor, fontFamily: "var(--font-anton),impact,sans-serif" }}>

          GO

        </span>

        <span style={{
                alignSelf: "flex-start",
                padding: "5px 12px",
                borderRadius: 999,
                fontWeight: 900,
                fontSize: 8,
                letterSpacing: "0.06em",
                ...cta,
                border: palette.chipBg ? `1px solid rgba(51,65,85,0.12)` : undefined,
            }}>

          BUY NOW →

        </span>

      </div>);
    }
    if (layout === "landscape-action") {
        return (<div style={{ height: "100%", display: "flex", gap: "7%", padding: "8%", alignItems: "stretch" }}>

        <div style={{ flex: "0 0 46%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 }}>

          <span style={{ fontSize: 7, letterSpacing: "0.4em", fontWeight: 800, color: palette.textColor, opacity: 0.9 }}>BRAND</span>

          <span style={{ ...h, fontWeight: 900, fontSize: 17, lineHeight: 0.94, color: palette.textColor }}>ACTION</span>

          <span style={{
                background: palette.textColor === "#111827" ? "#1e293b" : "#0f172a",
                color: "#fff",
                fontSize: 7,
                letterSpacing: "0.2em",
                alignSelf: "flex-start",
                padding: "6px 9px",
                borderRadius: 8,
                fontWeight: 900,
            }}>

            BOOK

          </span>

        </div>

        {fakeImg}

      </div>);
    }
    if (layout === "hero-product") {
        return (<div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "8%", gap: 7 }}>

        <OfferStrip palette={palette} text="NEW"/>

        <span style={{ fontSize: 8, letterSpacing: "0.44em", fontWeight: 800, color: palette.textColor, opacity: 0.9 }}>BRAND</span>

        <span style={{ ...h, fontFamily: "var(--font-archivo-black),impact,sans-serif", fontWeight: 900, fontSize: 28, letterSpacing: "-0.04em", color: palette.textColor }}>PRO</span>

        <span style={{ marginTop: "auto", paddingBottom: 4, borderBottom: `3px solid ${palette.accent}`, fontWeight: 900, fontSize: 9, letterSpacing: "0.24em", color: palette.textColor, ...h }}>PRE ORDER</span>

      </div>);
    }
    if (layout === "editorial") {
        return (<div style={{ height: "100%", display: "grid", gridTemplateColumns: "56% 1fr", gap: 10, padding: "10%", alignItems: "center" }}>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>

          <span style={{ ...h, fontFamily: "var(--font-playfair),Georgia,serif", fontStyle: "italic", fontSize: 22, fontWeight: 700, color: palette.textColor, lineHeight: 0.95 }}>

            Editorial

          </span>

          <span style={{ fontSize: 8, lineHeight: 1.35, color: palette.muted }}>Supporting line underneath.</span>

        </div>

        <div style={{ display: "grid", gap: 5 }}>

          {[1, 2, 3].map((x) => (<div key={x} style={{ borderRadius: 6, border: `1px solid ${palette.border}`, background: palette.surface, minHeight: 22 }}/>))}

        </div>

      </div>);
    }
    if (layout === "minimal-clean") {
        return (<div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 9, padding: "13%", textAlign: "center" as const }}>

        <span style={{ fontSize: 8, letterSpacing: "0.42em", color: palette.muted, fontWeight: 700 }}>BRAND</span>

        <span style={{ fontFamily: "var(--font-playfair),Georgia,serif", fontSize: 24, fontWeight: 650, color: palette.textColor }}>

          Quiet

        </span>

        <span style={{ fontSize: 9, color: palette.textColor === "#111827" ? "#64748b" : palette.accent }}>— Shop the drop</span>

      </div>);
    }
    if (layout === "luxury-dark") {
        return (<div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "12%", alignItems: "center", textAlign: "center" as const }}>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>

          <span style={{ color: palette.accent, fontWeight: 800, opacity: 0.95 }}>◆</span>

          <span style={{ fontSize: 7, letterSpacing: "0.4em", color: palette.textColor, opacity: 0.92 }}>BRAND</span>

        </div>

        <span style={{ ...h, fontFamily: "var(--font-playfair),Georgia,serif", fontWeight: 700, letterSpacing: "0.06em", color: palette.textColor, fontSize: 30 }}>LUXE</span>

        <span style={{ padding: "5px 12px", border: `1px solid ${palette.accent}`, fontSize: 8, letterSpacing: "0.32em", color: palette.accent, fontWeight: 900, opacity: 0.95 }}>RESERVE</span>

      </div>);
    }
    if (layout === "neon-tech") {
        return (<div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "10%" }}>

        <span style={{ fontFamily: "var(--font-mono),monospace", fontSize: 7, letterSpacing: "0.14em", color: palette.accent, opacity: 0.95 }}>[ LIVE · DIGITAL ]</span>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "baseline" }}>

          <span style={{ ...h, fontWeight: 900, fontSize: 26, letterSpacing: "-0.06em", color: palette.textColor }}>PRO</span>

          <span style={{ ...h, fontWeight: 900, fontSize: 26, color: palette.accent }}>MODE</span>

        </div>

        <span style={{ alignSelf: "flex-end", fontFamily: "var(--font-mono),monospace", fontSize: 8, letterSpacing: "0.38em", color: palette.accent }}>JOIN →</span>

      </div>);
    }
    if (layout === "festival-vibrant") {
        const cel = pillStyle(palette);
        return (<div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "10%" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>

          <span style={{ ...h, fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", color: palette.textColor }}>WEEKEND</span>

          <OfferStrip palette={palette} text="HOT"/>

        </div>

        <span style={{ ...h, fontFamily: "var(--font-anton),impact,sans-serif", fontSize: 32, lineHeight: 0.94, letterSpacing: "-0.06em", color: palette.textColor }}>SPECIAL</span>

        <span style={{
                alignSelf: "flex-start",
                padding: "6px 14px",
                borderRadius: 999,
                fontWeight: 900,
                fontSize: 8,
                letterSpacing: "0.08em",
                ...cel,
                border: palette.chipBg ? `1px solid rgba(51,65,85,0.1)` : undefined,
            }}>

          CELEBRATE

        </span>

      </div>);
    }
    if (layout === "testimonial-quote") {
        return (<div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "11%", textAlign: "center" as const }}>

        <span style={{ fontSize: 6.5, letterSpacing: "0.4em", color: palette.muted, fontWeight: 800 }}>REVIEW</span>

        <span style={{ ...h, fontFamily: "var(--font-playfair),Georgia,serif", fontStyle: "italic", fontSize: 24, fontWeight: 700, color: palette.textColor }}>“Amazing.”</span>

        <span style={{ fontSize: 11, color: palette.accent, letterSpacing: "0.28em", fontWeight: 800, lineHeight: 1 }}>★★★★★</span>

        <OfferStrip palette={palette} text="SEE ALL"/>

      </div>);
    }
    if (layout === "image-first") {
        return (<div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "8%" }}>

        {fakeImg}

        <div style={{
                marginTop: 8,
                display: "grid",
                gridTemplateColumns: "4px 1fr",
                gap: 9,
                padding: "8px 11px",
                borderRadius: 11,
                background: palette.surface,
                borderTop: `3px solid ${palette.accent}`,
                alignItems: "center",
                boxShadow: "0 10px 18px rgba(0,0,0,0.12)",
            }}>

          <div style={{ height: "76%", alignSelf: "center", borderRadius: 999, background: palette.accent, minHeight: 32 }}/>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

            <span style={{ ...h, fontWeight: 900, fontSize: 14, letterSpacing: "-0.03em", color: palette.textColor }}>SPOTLIGHT</span>

            <span style={{ fontWeight: 700, fontSize: 7.5, lineHeight: 1.35, color: palette.muted }}>Detail line underneath.</span>

          </div>

        </div>

      </div>);
    }
    if (layout === "offer-card") {
        const save = pillStyle(palette);
        return (<div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center", padding: "11%" }}>

        <div style={{
                width: "100%",
                padding: "11% 9%",
                borderRadius: 16,
                background: palette.surface,
                border: `2px solid ${palette.accent}`,
                boxShadow: "0 14px 32px rgba(0,0,0,0.28)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
            }}>

          <OfferStrip palette={palette} text="20%"/>

          <span style={{ ...h, fontWeight: 900, fontSize: 32, letterSpacing: "-0.04em", color: palette.textColor, fontFamily: "var(--font-anton),impact,sans-serif" }}>

            OFF

          </span>

          <span style={{
                padding: "6px 13px",
                borderRadius: 999,
                fontSize: 7,
                letterSpacing: "0.2em",
                fontWeight: 900,
                ...save,
                border: palette.chipBg ? `1px solid rgba(51,65,85,0.1)` : undefined,
            }}>

            SAVE NOW

          </span>

        </div>

      </div>);
    }
    if (layout === "social-stack") {
        return (<div style={{ height: "100%", display: "flex" }}>

        <div style={{
                width: "17%",
                borderRadius: "0 12px 12px 0",
                background: palette.accent,
            }}/>

        <div style={{ flex: 1, padding: "8% 10%", display: "flex", flexDirection: "column", gap: 9 }}>

          <span style={{ fontFamily: "var(--font-mono),monospace", fontSize: 9, fontWeight: 700, color: palette.muted }}>@yourbrand · story</span>

          <div style={{
                flex: 1,
                padding: "11% 9%",
                borderRadius: 16,
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 7,
                boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
            }}>

            <span style={{ ...h, fontWeight: 900, fontSize: 20, letterSpacing: "-0.05em", lineHeight: 0.93, color: palette.textColor }}>NEW DROP</span>

            <span style={{ fontSize: 9, opacity: 0.9, color: palette.textColor, lineHeight: 1.3 }}>Story stack & caption.</span>

          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>

            <span style={{
                padding: "5px 16px",
                borderRadius: 999,
                background: palette.textColor === "#111827" ? "#f8fafc" : "#ffffff",
                border: `2px dashed ${palette.accent}88`,
                color: "#0f172a",
                fontSize: 7,
                fontWeight: 900,
                letterSpacing: "0.42em",
            }}>

              DM US

            </span>

          </div>

        </div>

      </div>);
    }
    return (<div style={{ padding: "10%", color: palette.textColor }}>

      <span style={{ fontWeight: 900, fontSize: 18 }}>{layout}</span>

    </div>);
}
function categoryBadgeLabel(category: PosterTemplateCategory): string {
    const base = POSTER_TEMPLATE_CATEGORY_LABELS[category];
    return base.replace(/\s+\/.*/, "").trim().slice(0, 36);
}
function tagChipsFor(template: PosterTemplateDefinition): string[] {
    const categoryTag = template.category === "promo-discount"
        ? "Promo"
        : template.category === "product-service"
            ? "Product"
            : template.category === "testimonial-review"
                ? "Trust"
                : template.category === "event-weekend"
                    ? "Weekend"
                    : template.category === "minimal-premium"
                        ? "Premium"
                        : "General";
    const merged = [...template.styleTags, categoryTag];
    return Array.from(new Set(merged.map((x) => x.trim()).filter(Boolean))).slice(0, 6);
}
export function PosterTemplateCardMockup({ template }: {
    template: PosterTemplateDefinition;
}) {
    const palette = paletteFor(template);
    const innerShade = palette.textColor === "#111827"
        ? "inset 0 1px 0 rgba(255,255,255,0.92)"
        : "inset 0 0 48px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)";
    return (<div style={{
            borderRadius: 12,
            overflow: "hidden",
            height: "100%",
            border: `1px solid ${palette.border}`,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
        }}>

      <div style={{ height: "100%", backgroundImage: palette.bgGradient, boxShadow: innerShade }}>

        <MiniLayoutMock layout={template.layoutType} palette={palette}/>

      </div>

    </div>);
}
export function templateCardSubtitle(template: PosterTemplateDefinition): string {
    const sentence = template.recommendedUse.trim();
    if (sentence.length <= 96)
        return sentence;
    return `${sentence.slice(0, 94)}…`;
}
export { categoryBadgeLabel, tagChipsFor };
