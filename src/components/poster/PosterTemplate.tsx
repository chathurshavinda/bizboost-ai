"use client";
import { CSSProperties } from "react";
export const POSTER_STYLES = [
    "bold-statement",
    "landscape-action",
    "hero-product",
    "editorial",
    "minimal-clean",
    "luxury-dark",
    "neon-tech",
    "festival-vibrant",
    "testimonial-quote",
    "image-first",
    "offer-card",
    "social-stack",
] as const;
export type PosterStyle = (typeof POSTER_STYLES)[number];
export type PosterDesign = {
    style: PosterStyle;
    templateId?: string;
    brandName: string;
    headline: string;
    subheadline: string;
    offerBadge: string;
    ctaLabel: string;
    accentColor: string;
    textColor: string;
    overlay: "light" | "dark" | "none";
};
export const DEFAULT_POSTER_DESIGN: PosterDesign = {
    style: "bold-statement",
    brandName: "Your Business",
    headline: "NEW ARRIVAL",
    subheadline: "",
    offerBadge: "",
    ctaLabel: "BUY NOW",
    accentColor: "#E11D48",
    textColor: "#FFFFFF",
    overlay: "dark",
};
export const POSTER_STYLE_META: Record<PosterStyle, {
    label: string;
    description: string;
    vibeColor: string;
}> = {
    "bold-statement": {
        label: "Bold Statement",
        description: "Giant typography, Nike-style impact.",
        vibeColor: "#E11D48",
    },
    "landscape-action": {
        label: "Action Split",
        description: "Left text block + product CTA button.",
        vibeColor: "#0EA5E9",
    },
    "hero-product": {
        label: "Hero Product",
        description: "Centered label, brand, arrow CTA.",
        vibeColor: "#7C3AED",
    },
    editorial: {
        label: "Editorial",
        description: "Fashion-magazine serif + info grid.",
        vibeColor: "#B91C1C",
    },
    "minimal-clean": {
        label: "Minimal Clean",
        description: "Apple-style calm whitespace.",
        vibeColor: "#0F172A",
    },
    "luxury-dark": {
        label: "Luxury Dark",
        description: "Black + gold premium feel.",
        vibeColor: "#D4AF37",
    },
    "neon-tech": {
        label: "Neon Tech",
        description: "Futuristic drop with neon accents.",
        vibeColor: "#22D3EE",
    },
    "festival-vibrant": {
        label: "Festival Vibrant",
        description: "Warm, celebratory Sri Lanka vibe.",
        vibeColor: "#F59E0B",
    },
    "testimonial-quote": {
        label: "Testimonial quote",
        description: "Trust-first quote block, stars, calm hierarchy.",
        vibeColor: "#0D9488",
    },
    "image-first": {
        label: "Image first",
        description: "Large photo field with compact lower story band.",
        vibeColor: "#2563EB",
    },
    "offer-card": {
        label: "Offer card",
        description: "Glassmorphism card frame on top of the photo.",
        vibeColor: "#DB2777",
    },
    "social-stack": {
        label: "Social stack",
        description: "Story-style vertical stack with sticker CTA.",
        vibeColor: "#7C3AED",
    },
};
function overlayStyle(overlay: PosterDesign["overlay"]): CSSProperties {
    if (overlay === "none")
        return { background: "transparent" };
    if (overlay === "light") {
        return {
            background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.38) 55%, rgba(255,255,255,0.72) 100%)",
        };
    }
    return {
        background: "linear-gradient(180deg, rgba(2,6,23,0.18) 0%, rgba(2,6,23,0.42) 45%, rgba(2,6,23,0.78) 88%, rgba(2,6,23,0.92) 100%)",
    };
}
function cleanPosterText(input: string): string {
    const t = (input || "").replace(/\s+/g, " ").trim();
    if (!t)
        return "";
    return t
        .replace(/^(caption|headline|cta|subheadline)\s*:\s*/i, "")
        .replace(/\b(post about|use this caption|what to post|create post|idea:)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}
function clampWords(input: string, maxWords: number, maxChars: number): string {
    const t = cleanPosterText(input);
    if (!t)
        return "";
    const byWords = t.split(" ").filter(Boolean).slice(0, maxWords).join(" ");
    return byWords.length <= maxChars ? byWords : `${byWords.slice(0, maxChars - 1).trim()}…`;
}
function titleCaseFromUpper(input: string): string {
    if (!input)
        return "";
    const raw = input.trim();
    const isMostlyUpper = raw.replace(/[^A-Za-z]/g, "").toUpperCase() === raw.replace(/[^A-Za-z]/g, "");
    if (!isMostlyUpper)
        return raw;
    return raw
        .toLowerCase()
        .split(" ")
        .map((w) => (w ? `${w[0]!.toUpperCase()}${w.slice(1)}` : w))
        .join(" ");
}
function normalizePosterDesign(raw: PosterDesign): PosterDesign {
    const headline = clampWords(raw.headline, 8, 58).toUpperCase();
    const subheadline = titleCaseFromUpper(clampWords(raw.subheadline, 20, 110));
    const offerBadge = clampWords(raw.offerBadge, 5, 28).toUpperCase();
    const ctaLabel = clampWords(raw.ctaLabel, 4, 24).toUpperCase();
    const brandName = clampWords(raw.brandName, 5, 32);
    return {
        ...raw,
        brandName: brandName || DEFAULT_POSTER_DESIGN.brandName,
        headline: headline || DEFAULT_POSTER_DESIGN.headline,
        subheadline,
        offerBadge,
        ctaLabel: ctaLabel || DEFAULT_POSTER_DESIGN.ctaLabel,
    };
}
export type PosterTemplateProps = {
    imageUrl: string | null;
    design: PosterDesign;
};
export function PosterTemplate({ imageUrl, design }: PosterTemplateProps) {
    const normalizedDesign = normalizePosterDesign(design);
    return (<div className="posterWrap" aria-label={`Poster preview - ${normalizedDesign.style}`}>
      <div className="posterImg">
        {imageUrl ? (<img src={imageUrl} alt="Poster background" crossOrigin="anonymous"/>) : (<div className="posterPlaceholder">Upload a photo to see poster</div>)}
        <div className="posterOverlay" style={overlayStyle(normalizedDesign.overlay)}/>
        <div className="posterEdgeVignette" aria-hidden/>
      </div>

      {normalizedDesign.style === "bold-statement" && <BoldStatementLayout design={normalizedDesign}/>}
      {normalizedDesign.style === "landscape-action" && <LandscapeActionLayout design={normalizedDesign}/>}
      {normalizedDesign.style === "hero-product" && <HeroProductLayout design={normalizedDesign}/>}
      {normalizedDesign.style === "editorial" && <EditorialLayout design={normalizedDesign}/>}
      {normalizedDesign.style === "minimal-clean" && <MinimalCleanLayout design={normalizedDesign}/>}
      {normalizedDesign.style === "luxury-dark" && <LuxuryDarkLayout design={normalizedDesign}/>}
      {normalizedDesign.style === "neon-tech" && <NeonTechLayout design={normalizedDesign}/>}
      {normalizedDesign.style === "festival-vibrant" && <FestivalVibrantLayout design={normalizedDesign}/>}
      {normalizedDesign.style === "testimonial-quote" && <TestimonialQuoteLayout design={normalizedDesign}/>}
      {normalizedDesign.style === "image-first" && <ImageFirstLayout design={normalizedDesign}/>}
      {normalizedDesign.style === "offer-card" && <OfferCardLayout design={normalizedDesign}/>}
      {normalizedDesign.style === "social-stack" && <SocialStackLayout design={normalizedDesign}/>}

      <style jsx>{`
        .posterWrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 24px;
          overflow: hidden;
          background: #0f172a;
          box-shadow: 0 26px 70px rgba(15, 23, 42, 0.28);
        }
        .posterImg,
        .posterImg img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .posterPlaceholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: #cbd5e1;
          font-size: 14px;
          letter-spacing: 0.04em;
          background:
            radial-gradient(circle at 30% 25%, rgba(99, 102, 241, 0.22), transparent 55%),
            radial-gradient(circle at 75% 80%, rgba(244, 114, 182, 0.18), transparent 55%),
            linear-gradient(135deg, #0b1220, #1e293b);
        }
        .posterOverlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .posterEdgeVignette {
          position: absolute;
          inset: 0;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.18);
          pointer-events: none;
        }
      `}</style>
    </div>);
}
export function PosterStyleSwatch({ style, active, onClick, }: {
    style: PosterStyle;
    active: boolean;
    onClick: () => void;
}) {
    const meta = POSTER_STYLE_META[style];
    return (<button type="button" className={`swatch ${active ? "active" : ""}`} onClick={onClick} aria-label={`Use ${meta.label} style`}>
      <div className="miniPoster" style={{ background: swatchBackground(style) }}>
        <PosterLayoutThumbnail style={style}/>
      </div>
      <div className="labels">
        <span className="label">{meta.label}</span>
        <span className="desc">{meta.description}</span>
      </div>
      <style jsx>{`
        .swatch {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: rgba(255, 255, 255, 0.75);
          cursor: pointer;
          text-align: left;
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .swatch:hover {
          transform: translateY(-1px);
          border-color: ${meta.vibeColor};
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12);
        }
        .swatch.active {
          border-color: ${meta.vibeColor};
          box-shadow: 0 0 0 3px ${meta.vibeColor}22, 0 10px 22px rgba(15, 23, 42, 0.12);
          background: #fff;
        }
        .miniPoster {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(15, 23, 42, 0.15);
        }
        .labels {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .label {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.02em;
        }
        .desc {
          font-size: 10px;
          color: #64748b;
          line-height: 1.3;
        }
      `}</style>
    </button>);
}
function swatchBackground(style: PosterStyle): string {
    switch (style) {
        case "bold-statement":
            return "linear-gradient(135deg, #111827, #1f2937)";
        case "landscape-action":
            return "linear-gradient(135deg, #0c4a6e, #0ea5e9)";
        case "hero-product":
            return "linear-gradient(135deg, #2e1065, #7c3aed)";
        case "editorial":
            return "linear-gradient(135deg, #7f1d1d, #b91c1c)";
        case "minimal-clean":
            return "linear-gradient(135deg, #f8fafc, #e2e8f0)";
        case "luxury-dark":
            return "linear-gradient(135deg, #0b0b0b, #1f1b0f)";
        case "neon-tech":
            return "linear-gradient(135deg, #020617, #0891b2)";
        case "festival-vibrant":
            return "linear-gradient(135deg, #7c2d12, #f59e0b)";
        case "testimonial-quote":
            return "linear-gradient(145deg, #0f766e, #ccfbf1)";
        case "image-first":
            return "linear-gradient(180deg, #1e3a5f, #60a5fa)";
        case "offer-card":
            return "linear-gradient(135deg, #9d174d, #fda4af)";
        case "social-stack":
            return "linear-gradient(160deg, #1e1b4b, #a78bfa)";
    }
}
export function PosterLayoutThumbnail({ style }: {
    style: PosterStyle;
}) {
    return <MiniPreview style={style}/>;
}
function MiniPreview({ style }: {
    style: PosterStyle;
}) {
    const meta = POSTER_STYLE_META[style];
    const textColor = style === "minimal-clean" ? "#0f172a" : "#fff";
    return (<div className="mini">
      {style === "bold-statement" && (<>
          <div className="bar">
            <span className="b">BRAND</span>
            <span className="pill" style={{ background: meta.vibeColor }}>20%</span>
          </div>
          <div className="huge">NEW</div>
          <div className="cta" style={{ background: meta.vibeColor }}>BUY NOW</div>
        </>)}
      {style === "landscape-action" && (<>
          <div className="leftBlock">
            <div className="small">BRAND</div>
            <div className="mid">MAD READY</div>
            <div className="btn">BUY</div>
          </div>
        </>)}
      {style === "hero-product" && (<>
          <div className="topLbl" style={{ background: meta.vibeColor }}>NEW</div>
          <div className="center">
            <div className="small">BRAND</div>
            <div className="mid2">PRO</div>
          </div>
          <div className="arrow">VIEW ONLINE →</div>
        </>)}
      {style === "editorial" && (<>
          <div className="italics">Retro Drop</div>
          <div className="grid">
            <div className="cell">•</div>
            <div className="cell">•</div>
            <div className="cell">•</div>
          </div>
        </>)}
      {style === "minimal-clean" && (<>
          <div className="min small">BRAND</div>
          <div className="min title">Quiet. Clean.</div>
          <div className="min under">— buy now</div>
        </>)}
      {style === "luxury-dark" && (<>
          <div className="lxBar">
            <span className="gold">◆</span>
            <span className="small g">BRAND</span>
          </div>
          <div className="lxTitle">LUXE</div>
          <div className="lxCta">RESERVE →</div>
        </>)}
      {style === "neon-tech" && (<>
          <div className="neonTop">[ v2 · DROP ]</div>
          <div className="neonTitle">
            <span>PRO:</span>
            <span style={{ color: meta.vibeColor }}>DIRECT</span>
          </div>
          <div className="neonCta">→ VIEW</div>
        </>)}
      {style === "festival-vibrant" && (<>
          <div className="fsTop">AVURUDU 🎉</div>
          <div className="fsTitle">SPECIAL</div>
          <div className="fsCta" style={{ background: meta.vibeColor }}>SHOP NOW</div>
        </>)}
      {style === "testimonial-quote" && (<>
          <div className="tqBrand">BRAND</div>
          <div className="tqQuote">“WOW”</div>
          <div className="tqStars">★★★★★</div>
          <div className="tqCta">READ MORE</div>
        </>)}
      {style === "image-first" && (<>
          <div className="ifPhoto"/>
          <div className="ifBand">
            <span className="ifH">HEADLINE</span>
            <span className="ifCta">SHOP</span>
          </div>
        </>)}
      {style === "offer-card" && (<>
          <div className="ocCard">
            <span className="ocBadge">20% OFF</span>
            <span className="ocH">SALE</span>
            <span className="ocBtn">GET IT</span>
          </div>
        </>)}
      {style === "social-stack" && (<>
          <div className="ssAccent"/>
          <div className="ssTop">@brand</div>
          <div className="ssBlock">DROP</div>
          <div className="ssStick">LINK IN BIO</div>
        </>)}
      <style jsx>{`
        .mini {
          position: absolute;
          inset: 0;
          padding: 10%;
          color: ${textColor};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
        }
        .bar {
          display: flex;
          justify-content: space-between;
          font-size: 6px;
          font-weight: 800;
          letter-spacing: 0.2em;
        }
        .pill {
          padding: 2px 4px;
          border-radius: 999px;
          font-size: 6px;
        }
        .huge {
          font-family: var(--font-anton), Impact, sans-serif;
          font-size: 32px;
          line-height: 1;
          text-transform: uppercase;
        }
        .cta {
          align-self: flex-start;
          padding: 3px 6px;
          border-radius: 999px;
          font-size: 6px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }
        .leftBlock {
          display: flex;
          flex-direction: column;
          gap: 4px;
          height: 100%;
          justify-content: center;
          max-width: 55%;
        }
        .small {
          font-size: 6px;
          font-weight: 800;
          letter-spacing: 0.2em;
        }
        .mid {
          font-family: var(--font-archivo-black), Impact, sans-serif;
          font-size: 16px;
          line-height: 0.95;
          text-transform: uppercase;
        }
        .btn {
          align-self: flex-start;
          background: #000;
          color: #fff;
          font-size: 6px;
          padding: 3px 6px;
          border-radius: 3px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }
        .topLbl {
          align-self: center;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.3em;
        }
        .center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .mid2 {
          font-family: var(--font-archivo-black), Impact, sans-serif;
          font-size: 22px;
          text-transform: uppercase;
          line-height: 1;
        }
        .arrow {
          align-self: center;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.22em;
          border-bottom: 1.5px solid ${meta.vibeColor};
          padding-bottom: 2px;
        }
        .italics {
          font-family: var(--font-playfair), Georgia, serif;
          font-style: italic;
          font-size: 18px;
          line-height: 0.95;
          font-weight: 700;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3px;
        }
        .cell {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 3px;
          padding: 3px;
          font-size: 6px;
          text-align: center;
        }
        .min.small {
          color: #64748b;
        }
        .min.title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 20px;
          line-height: 1;
          font-weight: 600;
          color: #0f172a;
        }
        .min.under {
          font-size: 7px;
          color: #334155;
        }
        .lxBar {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .gold {
          color: #d4af37;
        }
        .g {
          color: #d4af37;
        }
        .lxTitle {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 26px;
          letter-spacing: 0.08em;
          color: #d4af37;
          font-weight: 700;
          line-height: 1;
        }
        .lxCta {
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.22em;
          color: #d4af37;
          border: 1px solid #d4af37;
          align-self: flex-start;
          padding: 2px 5px;
        }
        .neonTop {
          font-family: var(--font-mono), monospace;
          font-size: 6px;
          color: #67e8f9;
        }
        .neonTitle {
          font-family: var(--font-archivo-black), Impact, sans-serif;
          font-size: 22px;
          text-transform: uppercase;
          line-height: 0.95;
          display: flex;
          gap: 2px;
        }
        .neonCta {
          font-family: var(--font-mono), monospace;
          font-size: 7px;
          color: #67e8f9;
          letter-spacing: 0.2em;
        }
        .fsTop {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }
        .fsTitle {
          font-family: var(--font-anton), Impact, sans-serif;
          font-size: 26px;
          line-height: 0.95;
          text-transform: uppercase;
        }
        .fsCta {
          align-self: flex-start;
          color: #0f172a;
          font-size: 7px;
          font-weight: 900;
          padding: 3px 6px;
          border-radius: 999px;
          letter-spacing: 0.16em;
        }
        .tqBrand {
          font-size: 5px;
          letter-spacing: 0.26em;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.92);
          text-align: center;
        }
        .tqQuote {
          font-family: var(--font-playfair), Georgia, serif;
          font-style: italic;
          font-size: 26px;
          text-align: center;
          font-weight: 700;
          line-height: 0.95;
        }
        .tqStars {
          text-align: center;
          font-size: 10px;
          color: ${meta.vibeColor};
          letter-spacing: 0.1em;
        }
        .tqCta {
          align-self: center;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.22);
          font-size: 5px;
          font-weight: 900;
          letter-spacing: 0.2em;
        }
        .ifPhoto {
          flex: 1;
          border-radius: 6px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
          border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .ifBand {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 4px;
          gap: 4px;
        }
        .ifH {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.06em;
        }
        .ifCta {
          font-size: 5px;
          font-weight: 900;
          background: rgba(255, 255, 255, 0.18);
          padding: 4px 6px;
          border-radius: 4px;
        }
        .ocCard {
          position: absolute;
          inset: 12%;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.45);
          border: 2px solid ${meta.vibeColor};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          backdrop-filter: blur(4px);
        }
        .ocBadge {
          font-size: 5px;
          font-weight: 900;
          background: ${meta.vibeColor};
          color: #0f172a;
          padding: 2px 6px;
          border-radius: 999px;
        }
        .ocH {
          font-size: 20px;
          font-weight: 900;
          font-family: var(--font-archivo-black), Impact, sans-serif;
        }
        .ocBtn {
          font-size: 5px;
          font-weight: 900;
          letter-spacing: 0.22em;
          border: 1px solid rgba(255, 255, 255, 0.85);
          padding: 3px 7px;
          border-radius: 999px;
        }
        .ssAccent {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 14%;
          background: linear-gradient(180deg, ${meta.vibeColor}, #4c1d95);
          border-radius: 0 4px 4px 0;
        }
        .ssTop {
          margin-left: 18%;
          font-size: 5px;
          font-weight: 800;
          font-family: var(--font-mono), monospace;
          color: rgba(255, 255, 255, 0.9);
        }
        .ssBlock {
          margin-left: 18%;
          margin-right: 4%;
          background: rgba(255, 255, 255, 0.14);
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 18px;
          font-weight: 900;
          font-family: var(--font-archivo-black), Impact, sans-serif;
          line-height: 0.95;
        }
        .ssStick {
          margin-left: 18%;
          margin-top: auto;
          text-align: center;
          padding: 4px;
          border-radius: 999px;
          font-size: 5px;
          font-weight: 900;
          letter-spacing: 0.22em;
          background: rgba(255, 255, 255, 0.95);
          color: #1e1b4b;
        }
      `}</style>
    </div>);
}
function BoldStatementLayout({ design }: {
    design: PosterDesign;
}) {
    const words = design.headline.split(/\s+/).filter(Boolean);
    const accentWord = words.length > 1 ? words[words.length - 1] : "";
    const leadWords = words.length > 1 ? words.slice(0, -1).join(" ") : design.headline;
    return (<div className="layer">
      <div className="topBar">
        <span className="brand"><span className="dot" aria-hidden/>{design.brandName}</span>
        {design.offerBadge && <span className="badge">{design.offerBadge}</span>}
      </div>
      <div className="block">
        <h1 className="headline">
          <span className="lead">{leadWords}</span>
          {accentWord && <span className="accentWord"> {accentWord}.</span>}
        </h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
        <div className="rule" aria-hidden/>
        <div className="cta">{design.ctaLabel} <span className="arrow" aria-hidden>→</span></div>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 7% 6% 7%;
          color: ${design.textColor};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
        }
        .topBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: clamp(11px, 1.5vw, 14px);
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-weight: 800;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          opacity: 0.95;
        }
        .dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: ${design.accentColor};
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.18);
        }
        .badge {
          background: ${design.accentColor};
          color: #0f172a;
          padding: 7px 14px;
          border-radius: 6px;
          letter-spacing: 0.18em;
          font-size: clamp(10px, 1.3vw, 12px);
          font-weight: 900;
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.25);
        }
        .block {
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: flex-start;
        }
        .headline {
          margin: 0;
          font-family: var(--font-anton), Impact, "Arial Narrow", sans-serif;
          font-weight: 400;
          font-size: clamp(58px, 14.5vw, 156px);
          line-height: 0.86;
          letter-spacing: -0.015em;
          text-transform: uppercase;
          text-shadow: 0 2px 24px rgba(0, 0, 0, 0.35);
        }
        .lead {
          display: block;
        }
        .accentWord {
          color: ${design.accentColor};
        }
        .sub {
          margin: 4px 0 0;
          font-size: clamp(12px, 1.8vw, 16px);
          font-weight: 600;
          max-width: 78%;
          opacity: 0.94;
          line-height: 1.35;
        }
        .rule {
          width: 56px;
          height: 3px;
          background: ${design.accentColor};
          border-radius: 999px;
          margin-top: 2px;
        }
        .cta {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          border-radius: 999px;
          background: ${design.accentColor};
          color: #0f172a;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-size: clamp(11px, 1.45vw, 14px);
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.32);
        }
        .arrow {
          font-size: 1.15em;
          line-height: 1;
        }
      `}</style>
    </div>);
}
function LandscapeActionLayout({ design }: {
    design: PosterDesign;
}) {
    return (<div className="layer">
      <div className="accentRule" aria-hidden/>
      <div className="left">
        <div className="brandRow">
          <span className="brandDot" aria-hidden style={{ background: design.accentColor }}/>
          <span className="brand">{design.brandName}</span>
        </div>
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
        <div className="row">
          {design.offerBadge && <span className="badge">{design.offerBadge}</span>}
          <span className="cta">
            {design.ctaLabel}
            <span className="arrow" aria-hidden>→</span>
          </span>
        </div>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          padding: 7% 7% 7% 9%;
          color: ${design.textColor};
          font-family: var(--font-sans), system-ui;
        }
        .accentRule {
          position: absolute;
          left: 5%;
          top: 18%;
          bottom: 18%;
          width: 4px;
          border-radius: 999px;
          background: linear-gradient(180deg, ${design.accentColor} 0%, transparent 100%);
          opacity: 0.92;
        }
        .left {
          max-width: 64%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .brandRow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
        }
        .brandDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
        }
        .brand {
          font-size: clamp(11px, 1.4vw, 14px);
          letter-spacing: 0.28em;
          text-transform: uppercase;
          font-weight: 800;
          opacity: 0.95;
        }
        .headline {
          margin: 0;
          font-family: var(--font-archivo-black), Impact, sans-serif;
          font-size: clamp(38px, 8.4vw, 86px);
          line-height: 0.94;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          text-shadow: 0 2px 22px rgba(0, 0, 0, 0.3);
        }
        .sub {
          margin: 0;
          font-size: clamp(12px, 1.6vw, 16px);
          font-weight: 500;
          max-width: 95%;
          opacity: 0.94;
          line-height: 1.45;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .badge {
          background: ${design.accentColor};
          color: #0f172a;
          padding: 8px 14px;
          border-radius: 6px;
          font-weight: 900;
          letter-spacing: 0.18em;
          font-size: clamp(10px, 1.3vw, 12px);
          text-transform: uppercase;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
        }
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #0b1220;
          color: #fff;
          border-radius: 12px;
          padding: 14px 22px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-size: clamp(11px, 1.45vw, 14px);
          box-shadow: 0 16px 34px rgba(0, 0, 0, 0.35);
        }
        .arrow {
          color: ${design.accentColor};
          font-size: 1.2em;
          line-height: 1;
        }
      `}</style>
    </div>);
}
function HeroProductLayout({ design }: {
    design: PosterDesign;
}) {
    return (<div className="layer">
      <div className="top">
        <div className="brandStack">
          <span className="brandMark" aria-hidden>◆</span>
          <span className="brand">{design.brandName}</span>
        </div>
        {design.offerBadge && <span className="label">{design.offerBadge}</span>}
      </div>
      <div className="middle">
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
      </div>
      <div className="bottom">
        <span className="cta">
          {design.ctaLabel} <span className="arrow" aria-hidden>→</span>
        </span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 7% 6%;
          color: ${design.textColor};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          font-family: var(--font-sans), system-ui;
        }
        .top {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .brandStack {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .brandMark {
          color: ${design.accentColor};
          font-size: clamp(14px, 1.8vw, 18px);
          line-height: 1;
        }
        .brand {
          font-size: clamp(12px, 1.6vw, 16px);
          letter-spacing: 0.42em;
          text-transform: uppercase;
          font-weight: 700;
          opacity: 0.95;
        }
        .label {
          background: ${design.accentColor};
          color: #0f172a;
          padding: 6px 14px;
          border-radius: 999px;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-size: clamp(10px, 1.25vw, 12px);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
        }
        .middle {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          max-width: 92%;
        }
        .headline {
          margin: 0;
          font-family: var(--font-archivo-black), Impact, sans-serif;
          font-size: clamp(46px, 10.5vw, 104px);
          line-height: 0.9;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          text-shadow: 0 2px 22px rgba(0, 0, 0, 0.35);
        }
        .sub {
          margin: 0;
          font-size: clamp(12px, 1.65vw, 16px);
          font-weight: 500;
          opacity: 0.94;
          max-width: 78%;
          line-height: 1.4;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: clamp(11px, 1.5vw, 14px);
          font-weight: 900;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          padding: 12px 22px;
          border: 1px solid ${design.accentColor};
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(4px);
        }
        .arrow {
          color: ${design.accentColor};
          font-size: 1.15em;
          line-height: 1;
        }
      `}</style>
    </div>);
}
function EditorialLayout({ design }: {
    design: PosterDesign;
}) {
    return (<div className="layer">
      <div className="masthead">
        <span className="rule" aria-hidden/>
        <span className="eyebrow">{design.brandName}</span>
        <span className="rule" aria-hidden/>
      </div>
      <div className="mid">
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
      </div>
      <div className="footer">
        {design.offerBadge ? (<div className="cell">
            <span className="k">Offer</span>
            <span className="v accent">{design.offerBadge}</span>
          </div>) : (<div className="cell">
            <span className="k">Edition</span>
            <span className="v">Featured</span>
          </div>)}
        <div className="cellRight">
          <span className="k">Tap</span>
          <span className="v cta">{design.ctaLabel} →</span>
        </div>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 7% 6%;
          color: ${design.textColor};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
        }
        .masthead {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .rule {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, ${design.accentColor}, transparent);
          opacity: 0.7;
        }
        .eyebrow {
          font-size: clamp(11px, 1.4vw, 14px);
          letter-spacing: 0.46em;
          text-transform: uppercase;
          font-weight: 700;
          color: ${design.accentColor};
        }
        .mid {
          max-width: 92%;
        }
        .headline {
          margin: 0;
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(42px, 9vw, 92px);
          line-height: 0.96;
          letter-spacing: -0.012em;
          font-style: italic;
          font-weight: 700;
          text-shadow: 0 4px 28px rgba(0, 0, 0, 0.35);
        }
        .sub {
          margin: 14px 0 0;
          font-size: clamp(12px, 1.6vw, 15px);
          font-weight: 500;
          opacity: 0.94;
          line-height: 1.55;
          max-width: 78%;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.22);
        }
        .cell, .cellRight {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .cellRight {
          align-items: flex-end;
          text-align: right;
        }
        .k {
          font-size: 10px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          opacity: 0.7;
          font-weight: 800;
        }
        .v {
          font-size: clamp(13px, 1.7vw, 16px);
          font-weight: 800;
          letter-spacing: 0.04em;
        }
        .accent {
          color: ${design.accentColor};
        }
        .cta {
          color: ${design.accentColor};
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
      `}</style>
    </div>);
}
function MinimalCleanLayout({ design }: {
    design: PosterDesign;
}) {
    return (<div className="layer">
      <div className="top">
        <div className="brandRow">
          <span className="brandDot" aria-hidden/>
          <span className="brand">{design.brandName}</span>
        </div>
        {design.offerBadge && <div className="badge">{design.offerBadge}</div>}
      </div>
      <div className="mid">
        <span className="rule" aria-hidden/>
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
      </div>
      <div className="bottom">
        <span className="cta">
          {design.ctaLabel}
          <span className="arrow" aria-hidden>→</span>
        </span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 9% 8%;
          color: #0f172a;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.78) 0%, rgba(255, 255, 255, 0.86) 100%);
          backdrop-filter: blur(2px);
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .brandRow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
        }
        .brandDot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: ${design.accentColor};
        }
        .brand {
          font-size: clamp(10px, 1.3vw, 12px);
          letter-spacing: 0.36em;
          text-transform: uppercase;
          font-weight: 700;
          color: #334155;
        }
        .badge {
          font-size: clamp(10px, 1.3vw, 12px);
          font-weight: 900;
          letter-spacing: 0.2em;
          color: ${design.accentColor};
          text-transform: uppercase;
          padding: 6px 12px;
          border: 1px solid ${design.accentColor};
          border-radius: 999px;
        }
        .mid {
          max-width: 88%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .rule {
          width: 48px;
          height: 3px;
          background: ${design.accentColor};
          border-radius: 999px;
        }
        .headline {
          margin: 0;
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(42px, 9.2vw, 96px);
          line-height: 0.98;
          letter-spacing: -0.022em;
          font-weight: 600;
          color: #0f172a;
        }
        .sub {
          margin: 0;
          font-size: clamp(12px, 1.6vw, 16px);
          color: #475569;
          line-height: 1.55;
          max-width: 80%;
        }
        .bottom {
          display: flex;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: clamp(11px, 1.45vw, 14px);
          font-weight: 800;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #0f172a;
          padding: 12px 0;
          border-bottom: 2px solid ${design.accentColor};
        }
        .arrow {
          color: ${design.accentColor};
          font-size: 1.15em;
          line-height: 1;
        }
      `}</style>
    </div>);
}
function LuxuryDarkLayout({ design }: {
    design: PosterDesign;
}) {
    const gold = "#D4AF37";
    return (<div className="layer">
      <div className="top">
        <div className="brandBlock">
          <span className="rule" aria-hidden/>
          <span className="mark" aria-hidden>◆</span>
          <span className="rule" aria-hidden/>
        </div>
        <div className="brand">{design.brandName}</div>
      </div>
      <div className="mid">
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
        {design.offerBadge && <div className="badge">{design.offerBadge}</div>}
      </div>
      <div className="bottom">
        <span className="cta">
          {design.ctaLabel} <span className="arrow" aria-hidden>→</span>
        </span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 9% 8%;
          color: #f5f5f4;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.82) 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
        }
        .top {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }
        .brandBlock {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          max-width: 280px;
        }
        .rule {
          flex: 1;
          height: 1px;
          background: ${gold};
          opacity: 0.7;
        }
        .mark {
          color: ${gold};
          font-size: clamp(14px, 1.8vw, 18px);
          line-height: 1;
        }
        .brand {
          color: ${gold};
          letter-spacing: 0.46em;
          text-transform: uppercase;
          font-size: clamp(11px, 1.3vw, 13px);
          font-weight: 700;
        }
        .mid {
          text-align: center;
        }
        .headline {
          margin: 0;
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(52px, 11.5vw, 118px);
          line-height: 0.98;
          letter-spacing: 0.03em;
          font-weight: 700;
          color: ${gold};
          text-transform: uppercase;
          text-shadow: 0 4px 28px rgba(0, 0, 0, 0.55);
        }
        .sub {
          margin: 16px 0 0;
          font-size: clamp(12px, 1.6vw, 15px);
          color: #f1f0eb;
          letter-spacing: 0.1em;
          opacity: 0.92;
          line-height: 1.5;
          font-style: italic;
        }
        .badge {
          display: inline-block;
          margin-top: 16px;
          padding: 7px 18px;
          border: 1px solid ${gold};
          color: ${gold};
          font-size: clamp(10px, 1.3vw, 12px);
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .bottom {
          display: flex;
          justify-content: center;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: ${gold};
          font-size: clamp(11px, 1.4vw, 13px);
          letter-spacing: 0.4em;
          font-weight: 900;
          text-transform: uppercase;
          padding: 12px 22px;
          border: 1px solid ${gold};
          background: rgba(212, 175, 55, 0.05);
        }
        .arrow {
          font-size: 1.15em;
          line-height: 1;
        }
      `}</style>
    </div>);
}
function NeonTechLayout({ design }: {
    design: PosterDesign;
}) {
    const neon = design.accentColor || "#22D3EE";
    return (<div className="layer">
      <div className="grid" aria-hidden/>
      <div className="top">
        <span className="tag">[ {design.brandName} · DROP ]</span>
        {design.offerBadge && <span className="pulse"><span className="dot" aria-hidden/>{design.offerBadge}</span>}
      </div>
      <div className="mid">
        <h1 className="headline">
          {design.headline.split(/\s+/).slice(0, -1).join(" ") || design.headline}
          <span className="neon"> {design.headline.split(/\s+/).slice(-1)[0] || ""}</span>
        </h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
      </div>
      <div className="bottom">
        <span className="cta">
          <span className="arrow" aria-hidden>→</span>
          {design.ctaLabel}
        </span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 7% 6%;
          color: ${design.textColor};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
        }
        .grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(${neon}10 1px, transparent 1px),
            linear-gradient(90deg, ${neon}10 1px, transparent 1px);
          background-size: 38px 38px;
          mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.7), transparent 70%);
          pointer-events: none;
        }
        .top {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tag {
          font-family: var(--font-mono), monospace;
          font-size: clamp(10px, 1.3vw, 13px);
          color: ${neon};
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .pulse {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono), monospace;
          font-size: clamp(10px, 1.3vw, 13px);
          color: ${neon};
          letter-spacing: 0.18em;
          padding: 5px 10px;
          border: 1px solid ${neon}55;
          border-radius: 2px;
        }
        .dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: ${neon};
          box-shadow: 0 0 10px ${neon};
        }
        .mid {
          position: relative;
        }
        .headline {
          margin: 0;
          font-family: var(--font-archivo-black), Impact, sans-serif;
          font-size: clamp(46px, 11.2vw, 112px);
          line-height: 0.9;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          text-shadow: 0 2px 22px rgba(0, 0, 0, 0.45);
        }
        .neon {
          color: ${neon};
          text-shadow: 0 0 18px ${neon}80, 0 0 40px ${neon}50;
        }
        .sub {
          margin: 16px 0 0;
          font-family: var(--font-mono), monospace;
          font-size: clamp(11px, 1.5vw, 14px);
          color: ${neon};
          letter-spacing: 0.08em;
          opacity: 0.95;
          line-height: 1.45;
          max-width: 80%;
        }
        .bottom {
          position: relative;
          display: flex;
          justify-content: flex-end;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-mono), monospace;
          color: #0f172a;
          background: ${neon};
          font-size: clamp(12px, 1.5vw, 15px);
          letter-spacing: 0.22em;
          padding: 12px 18px;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 800;
          box-shadow: 0 0 24px ${neon}66;
        }
        .arrow {
          font-size: 1.2em;
          line-height: 1;
        }
      `}</style>
    </div>);
}
function FestivalVibrantLayout({ design }: {
    design: PosterDesign;
}) {
    return (<div className="layer">
      <div className="conf" aria-hidden>
        <span className="c c1"/>
        <span className="c c2"/>
        <span className="c c3"/>
        <span className="c c4"/>
        <span className="c c5"/>
      </div>
      <div className="top">
        <div className="brand">{design.brandName}</div>
        {design.offerBadge && <div className="sunburst">★ {design.offerBadge} ★</div>}
      </div>
      <div className="block">
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
      </div>
      <div className="bottom">
        <span className="cta">{design.ctaLabel} <span className="arrow" aria-hidden>→</span></span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 7% 6%;
          color: ${design.textColor};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
          background:
            radial-gradient(circle at 85% 12%, ${design.accentColor}48, transparent 55%),
            radial-gradient(circle at 12% 88%, #ef444438, transparent 55%);
        }
        .conf {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .c {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          opacity: 0.85;
        }
        .c1 { top: 12%; left: 14%; background: ${design.accentColor}; transform: rotate(15deg); }
        .c2 { top: 22%; right: 22%; background: #f87171; transform: rotate(-12deg); width: 8px; height: 8px; }
        .c3 { bottom: 28%; left: 8%; background: #fde047; transform: rotate(30deg); width: 6px; height: 6px; border-radius: 999px; }
        .c4 { bottom: 18%; right: 14%; background: #f472b6; transform: rotate(-22deg); width: 12px; height: 4px; }
        .c5 { top: 55%; left: 6%; background: #34d399; border-radius: 999px; width: 5px; height: 5px; }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }
        .brand {
          font-size: clamp(12px, 1.5vw, 14px);
          letter-spacing: 0.26em;
          text-transform: uppercase;
          font-weight: 800;
        }
        .sunburst {
          background: ${design.accentColor};
          color: #0f172a;
          padding: 7px 16px;
          border-radius: 999px;
          font-size: clamp(10px, 1.3vw, 12px);
          letter-spacing: 0.2em;
          font-weight: 900;
          text-transform: uppercase;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
        }
        .block {
          position: relative;
        }
        .headline {
          margin: 0;
          font-family: var(--font-anton), Impact, sans-serif;
          font-size: clamp(54px, 12.4vw, 134px);
          line-height: 0.88;
          text-transform: uppercase;
          letter-spacing: -0.012em;
          text-shadow: 0 4px 26px rgba(0, 0, 0, 0.42);
        }
        .sub {
          margin: 14px 0 0;
          font-size: clamp(12px, 1.65vw, 16px);
          font-weight: 600;
          max-width: 80%;
          opacity: 0.96;
          line-height: 1.4;
        }
        .bottom {
          display: flex;
          position: relative;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 26px;
          background: ${design.accentColor};
          color: #0f172a;
          border-radius: 999px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-size: clamp(11px, 1.45vw, 14px);
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.3);
        }
        .arrow {
          font-size: 1.15em;
          line-height: 1;
        }
      `}</style>
    </div>);
}
function TestimonialQuoteLayout({ design }: {
    design: PosterDesign;
}) {
    const a = design.accentColor;
    return (<div className="layer">
      <div className="wash" aria-hidden/>
      <div className="top">
        <span className="brand">{design.brandName}</span>
        <span className="stars" aria-hidden>★★★★★</span>
      </div>
      <div className="quoteBlock">
        <span className="mark" aria-hidden>"</span>
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">— {design.subheadline}</p>}
        {design.offerBadge && <span className="pill">{design.offerBadge}</span>}
      </div>
      <div className="bottom">
        <span className="cta">{design.ctaLabel} <span className="arrow" aria-hidden>→</span></span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 8% 7%;
          color: ${design.textColor};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
          background: linear-gradient(165deg, rgba(15, 118, 110, 0.22) 0%, rgba(15, 23, 42, 0.62) 50%, rgba(15, 23, 42, 0.92) 100%);
        }
        .wash {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 18%, ${a}26, transparent 58%);
          pointer-events: none;
        }
        .top {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1;
        }
        .brand {
          font-size: clamp(11px, 1.4vw, 13px);
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-weight: 700;
          opacity: 0.95;
        }
        .stars {
          font-size: clamp(14px, 2vw, 18px);
          letter-spacing: 0.18em;
          color: ${a};
          text-shadow: 0 0 12px ${a}55;
        }
        .quoteBlock {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 94%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .mark {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(96px, 22vw, 200px);
          line-height: 0.55;
          color: ${a};
          opacity: 0.32;
          user-select: none;
          margin-bottom: -22px;
        }
        .headline {
          margin: 0;
          font-family: var(--font-playfair), Georgia, serif;
          font-style: italic;
          font-weight: 700;
          font-size: clamp(30px, 6.4vw, 62px);
          line-height: 1.04;
          letter-spacing: -0.005em;
          text-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
        }
        .sub {
          margin: 0;
          font-size: clamp(12px, 1.7vw, 16px);
          font-weight: 600;
          max-width: 84%;
          opacity: 0.92;
          line-height: 1.45;
          letter-spacing: 0.04em;
        }
        .pill {
          margin-top: 4px;
          font-size: clamp(10px, 1.25vw, 12px);
          font-weight: 900;
          padding: 7px 16px;
          border-radius: 999px;
          background: ${a};
          color: #0f172a;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .bottom {
          display: flex;
          justify-content: center;
          z-index: 1;
          position: relative;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          border-radius: 999px;
          font-weight: 800;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          font-size: clamp(10px, 1.35vw, 13px);
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid ${a};
          color: ${design.textColor};
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.32);
        }
        .arrow {
          color: ${a};
          font-size: 1.15em;
          line-height: 1;
        }
      `}</style>
    </div>);
}
function ImageFirstLayout({ design }: {
    design: PosterDesign;
}) {
    const a = design.accentColor;
    return (<div className="layer">
      <div className="dock">
        <div className="accentBar" aria-hidden/>
        <div className="dockText">
          <div className="rowTop">
            <span className="brand">
              <span className="brandDot" aria-hidden/>
              {design.brandName}
            </span>
            {design.offerBadge && <span className="badge">{design.offerBadge}</span>}
          </div>
          <h1 className="headline">{design.headline}</h1>
          {design.subheadline && <p className="sub">{design.subheadline}</p>}
        </div>
        <span className="cta">
          {design.ctaLabel}
          <span className="arrow" aria-hidden>→</span>
        </span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          color: ${design.textColor};
          font-family: var(--font-sans), system-ui;
        }
        .dock {
          position: relative;
          min-height: 36%;
          margin-top: auto;
          padding: 6% 7% 7%;
          display: grid;
          grid-template-columns: 6px 1fr auto;
          gap: 16px;
          align-items: center;
          background: linear-gradient(180deg, rgba(2, 6, 23, 0) 0%, rgba(2, 6, 23, 0.78) 35%, rgba(2, 6, 23, 0.95) 100%);
          border-top: 2px solid ${a};
        }
        .accentBar {
          width: 100%;
          height: 78%;
          border-radius: 999px;
          background: linear-gradient(180deg, ${a}, ${a}aa);
          box-shadow: 0 0 26px ${a}66;
        }
        .dockText {
          min-width: 0;
        }
        .rowTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: clamp(11px, 1.35vw, 13px);
          letter-spacing: 0.36em;
          text-transform: uppercase;
          font-weight: 700;
          opacity: 0.95;
        }
        .brandDot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: ${a};
        }
        .badge {
          font-size: clamp(10px, 1.2vw, 12px);
          font-weight: 900;
          background: ${a};
          color: #0f172a;
          padding: 6px 12px;
          border-radius: 6px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .headline {
          margin: 0;
          font-family: var(--font-archivo-black), Impact, sans-serif;
          font-size: clamp(28px, 6.8vw, 64px);
          line-height: 0.92;
          text-transform: uppercase;
          letter-spacing: -0.022em;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.45);
        }
        .sub {
          margin: 10px 0 0;
          font-size: clamp(11px, 1.55vw, 14px);
          opacity: 0.9;
          line-height: 1.4;
          max-width: 95%;
        }
        .cta {
          align-self: end;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 18px;
          border-radius: 14px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-size: clamp(9px, 1.3vw, 12px);
          background: ${a};
          color: #0f172a;
          box-shadow: 0 16px 30px rgba(0, 0, 0, 0.4);
          white-space: nowrap;
          max-width: 34vw;
        }
        .arrow {
          font-size: 1.2em;
          line-height: 1;
        }
      `}</style>
    </div>);
}
function OfferCardLayout({ design }: {
    design: PosterDesign;
}) {
    const a = design.accentColor;
    return (<div className="layer">
      <div className="backdrop" aria-hidden/>
      <div className="card">
        {design.offerBadge && (<div className="ribbonWrap">
            <span className="ribbon">{design.offerBadge}</span>
          </div>)}
        <span className="brand">{design.brandName}</span>
        <span className="hairline" aria-hidden/>
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
        <span className="cta">
          {design.ctaLabel}
          <span className="arrow" aria-hidden>→</span>
        </span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 5%;
          color: ${design.textColor};
          font-family: var(--font-sans), system-ui;
        }
        .backdrop {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 25% 15%, ${a}38, transparent 50%),
            radial-gradient(circle at 80% 85%, rgba(255, 255, 255, 0.12), transparent 45%);
          pointer-events: none;
        }
        .card {
          position: relative;
          width: min(94%, 440px);
          padding: clamp(28px, 6vw, 44px) clamp(18px, 4.5vw, 30px) clamp(22px, 5vw, 32px);
          border-radius: 28px;
          background: rgba(15, 23, 42, 0.62);
          border: 3px solid ${a};
          box-shadow:
            0 28px 70px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: clamp(10px, 2.2vw, 16px);
        }
        .ribbonWrap {
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
        }
        .ribbon {
          display: inline-block;
          font-weight: 900;
          letter-spacing: 0.22em;
          font-size: clamp(10px, 1.35vw, 13px);
          background: ${a};
          color: #0f172a;
          padding: 9px 22px;
          border-radius: 6px;
          text-transform: uppercase;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.3);
        }
        .brand {
          font-size: clamp(11px, 1.4vw, 13px);
          letter-spacing: 0.46em;
          text-transform: uppercase;
          font-weight: 700;
          opacity: 0.95;
        }
        .hairline {
          width: 42px;
          height: 2px;
          background: ${a};
          border-radius: 999px;
        }
        .headline {
          margin: 0;
          font-family: var(--font-anton), Impact, sans-serif;
          font-size: clamp(40px, 9.6vw, 104px);
          line-height: 0.9;
          text-transform: uppercase;
          letter-spacing: -0.012em;
          text-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        }
        .sub {
          margin: 0;
          font-size: clamp(12px, 1.65vw, 16px);
          max-width: 92%;
          line-height: 1.45;
          opacity: 0.94;
        }
        .cta {
          margin-top: 6px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 15px 30px;
          border-radius: 14px;
          font-weight: 900;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          font-size: clamp(10px, 1.4vw, 13px);
          background: ${a};
          color: #0f172a;
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.34);
          border: none;
        }
        .arrow {
          font-size: 1.18em;
          line-height: 1;
        }
      `}</style>
    </div>);
}
function SocialStackLayout({ design }: {
    design: PosterDesign;
}) {
    const a = design.accentColor;
    return (<div className="layer">
      <div className="rail" aria-hidden/>
      <div className="content">
        <div className="top">
          <span className="handle">
            <span className="ringDot" aria-hidden/>
            {design.brandName}
          </span>
          {design.offerBadge && (<span className="tag">
              <span className="tagDot" aria-hidden/>
              {design.offerBadge}
            </span>)}
        </div>
        <div className="bubble">
          <h1 className="headline">{design.headline}</h1>
          {design.subheadline && <p className="sub">{design.subheadline}</p>}
        </div>
        <div className="dock">
          <span className="sticker">
            {design.ctaLabel}
            <span className="arrow" aria-hidden>→</span>
          </span>
        </div>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          color: ${design.textColor};
          font-family: var(--font-sans), system-ui;
          padding: 0;
          overflow: hidden;
        }
        .rail {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 9%;
          background: linear-gradient(180deg, ${a}, rgba(139, 92, 246, 0.85));
          box-shadow: 8px 0 36px rgba(0, 0, 0, 0.3);
          z-index: 0;
        }
        .content {
          position: relative;
          z-index: 1;
          margin-left: 9%;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 7% 6% 7% 6%;
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.32) 0%, rgba(15, 23, 42, 0.78) 100%);
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .handle {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-family: var(--font-mono), monospace;
          font-size: clamp(12px, 1.65vw, 15px);
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .ringDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: ${a};
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.6), 0 0 12px ${a};
        }
        .tag {
          font-size: clamp(10px, 1.25vw, 12px);
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.3);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .tagDot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: ${a};
          box-shadow: 0 0 10px ${a};
        }
        .bubble {
          flex: 1;
          margin-top: clamp(22px, 5vw, 36px);
          padding: clamp(22px, 5vw, 36px);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.08);
          border: 2px solid rgba(255, 255, 255, 0.2);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 12px;
          backdrop-filter: blur(6px);
        }
        .headline {
          margin: 0;
          font-family: var(--font-archivo-black), Impact, sans-serif;
          font-size: clamp(32px, 8vw, 76px);
          line-height: 0.92;
          text-transform: uppercase;
          letter-spacing: -0.022em;
          text-shadow: 0 2px 22px rgba(0, 0, 0, 0.4);
        }
        .sub {
          margin: 0;
          font-size: clamp(12px, 1.65vw, 16px);
          line-height: 1.45;
          opacity: 0.92;
          max-width: 95%;
        }
        .dock {
          padding-top: 6%;
          display: flex;
          justify-content: center;
        }
        .sticker {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 15px clamp(26px, 8vw, 44px);
          border-radius: 999px;
          font-weight: 900;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-size: clamp(9px, 1.4vw, 12px);
          background: #fff;
          color: #1e1b4b;
          box-shadow: 0 22px 44px rgba(0, 0, 0, 0.4);
          border: 2px solid ${a};
        }
        .arrow {
          color: ${a};
          font-size: 1.25em;
          line-height: 1;
        }
      `}</style>
    </div>);
}
