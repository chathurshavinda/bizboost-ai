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
] as const;

export type PosterStyle = (typeof POSTER_STYLES)[number];

export type PosterDesign = {
  style: PosterStyle;
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

export const POSTER_STYLE_META: Record<
  PosterStyle,
  { label: string; description: string; vibeColor: string }
> = {
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
};

function overlayStyle(overlay: PosterDesign["overlay"]): CSSProperties {
  if (overlay === "none") return { background: "transparent" };
  if (overlay === "light") {
    return {
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.55) 100%)",
    };
  }
  return {
    background:
      "linear-gradient(180deg, rgba(2,6,23,0.35) 0%, rgba(2,6,23,0.5) 55%, rgba(2,6,23,0.75) 100%)",
  };
}

export type PosterTemplateProps = {
  imageUrl: string | null;
  design: PosterDesign;
};

export function PosterTemplate({ imageUrl, design }: PosterTemplateProps) {
  return (
    <div className="posterWrap" aria-label={`Poster preview - ${design.style}`}>
      <div className="posterImg">
        {imageUrl ? (
          <img src={imageUrl} alt="Poster background" crossOrigin="anonymous" />
        ) : (
          <div className="posterPlaceholder">Upload a photo to see poster</div>
        )}
        <div className="posterOverlay" style={overlayStyle(design.overlay)} />
      </div>

      {design.style === "bold-statement" && <BoldStatementLayout design={design} />}
      {design.style === "landscape-action" && <LandscapeActionLayout design={design} />}
      {design.style === "hero-product" && <HeroProductLayout design={design} />}
      {design.style === "editorial" && <EditorialLayout design={design} />}
      {design.style === "minimal-clean" && <MinimalCleanLayout design={design} />}
      {design.style === "luxury-dark" && <LuxuryDarkLayout design={design} />}
      {design.style === "neon-tech" && <NeonTechLayout design={design} />}
      {design.style === "festival-vibrant" && <FestivalVibrantLayout design={design} />}

      <style jsx>{`
        .posterWrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 18px;
          overflow: hidden;
          background: #0f172a;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
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
          background: linear-gradient(135deg, #0f172a, #1e293b);
        }
        .posterOverlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

/** Small swatch for the style picker grid */
export function PosterStyleSwatch({
  style,
  active,
  onClick,
}: {
  style: PosterStyle;
  active: boolean;
  onClick: () => void;
}) {
  const meta = POSTER_STYLE_META[style];
  return (
    <button
      type="button"
      className={`swatch ${active ? "active" : ""}`}
      onClick={onClick}
      aria-label={`Use ${meta.label} style`}
    >
      <div className="miniPoster" style={{ background: swatchBackground(style) }}>
        <MiniPreview style={style} />
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
    </button>
  );
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
  }
}

function MiniPreview({ style }: { style: PosterStyle }) {
  const meta = POSTER_STYLE_META[style];
  const textColor = style === "minimal-clean" ? "#0f172a" : "#fff";

  return (
    <div className="mini">
      {style === "bold-statement" && (
        <>
          <div className="bar">
            <span className="b">BRAND</span>
            <span className="pill" style={{ background: meta.vibeColor }}>20%</span>
          </div>
          <div className="huge">NEW</div>
          <div className="cta" style={{ background: meta.vibeColor }}>BUY NOW</div>
        </>
      )}
      {style === "landscape-action" && (
        <>
          <div className="leftBlock">
            <div className="small">BRAND</div>
            <div className="mid">MAD READY</div>
            <div className="btn">BUY</div>
          </div>
        </>
      )}
      {style === "hero-product" && (
        <>
          <div className="topLbl" style={{ background: meta.vibeColor }}>NEW</div>
          <div className="center">
            <div className="small">BRAND</div>
            <div className="mid2">PRO</div>
          </div>
          <div className="arrow">VIEW ONLINE →</div>
        </>
      )}
      {style === "editorial" && (
        <>
          <div className="italics">Retro Drop</div>
          <div className="grid">
            <div className="cell">•</div>
            <div className="cell">•</div>
            <div className="cell">•</div>
          </div>
        </>
      )}
      {style === "minimal-clean" && (
        <>
          <div className="min small">BRAND</div>
          <div className="min title">Quiet. Clean.</div>
          <div className="min under">— buy now</div>
        </>
      )}
      {style === "luxury-dark" && (
        <>
          <div className="lxBar">
            <span className="gold">◆</span>
            <span className="small g">BRAND</span>
          </div>
          <div className="lxTitle">LUXE</div>
          <div className="lxCta">RESERVE →</div>
        </>
      )}
      {style === "neon-tech" && (
        <>
          <div className="neonTop">[ v2 · DROP ]</div>
          <div className="neonTitle">
            <span>PRO:</span>
            <span style={{ color: meta.vibeColor }}>DIRECT</span>
          </div>
          <div className="neonCta">→ VIEW</div>
        </>
      )}
      {style === "festival-vibrant" && (
        <>
          <div className="fsTop">AVURUDU 🎉</div>
          <div className="fsTitle">SPECIAL</div>
          <div className="fsCta" style={{ background: meta.vibeColor }}>SHOP NOW</div>
        </>
      )}
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
      `}</style>
    </div>
  );
}

function BoldStatementLayout({ design }: { design: PosterDesign }) {
  return (
    <div className="layer">
      <div className="topBar">
        <span className="brand">{design.brandName}</span>
        {design.offerBadge && <span className="badge">{design.offerBadge}</span>}
      </div>
      <h1 className="headline">{design.headline}</h1>
      {design.subheadline && <p className="sub">{design.subheadline}</p>}
      <div className="cta">{design.ctaLabel}</div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 6%;
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
          opacity: 0.92;
        }
        .badge {
          background: ${design.accentColor};
          color: ${design.textColor};
          padding: 6px 12px;
          border-radius: 999px;
          letter-spacing: 0.14em;
          font-size: clamp(10px, 1.3vw, 12px);
          font-weight: 900;
        }
        .headline {
          margin: 0;
          font-family: var(--font-anton), Impact, "Arial Narrow", sans-serif;
          font-weight: 400;
          font-size: clamp(56px, 14vw, 150px);
          line-height: 0.88;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.28);
        }
        .sub {
          margin: 10px 0 0;
          font-size: clamp(12px, 1.8vw, 16px);
          font-weight: 600;
          max-width: 82%;
          opacity: 0.94;
          line-height: 1.3;
        }
        .cta {
          align-self: flex-start;
          padding: 12px 22px;
          border-radius: 999px;
          background: ${design.accentColor};
          color: ${design.textColor};
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-size: clamp(11px, 1.4vw, 14px);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
        }
      `}</style>
    </div>
  );
}

function LandscapeActionLayout({ design }: { design: PosterDesign }) {
  return (
    <div className="layer">
      <div className="left">
        <div className="brand">{design.brandName}</div>
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
        <div className="row">
          {design.offerBadge && <span className="badge">{design.offerBadge}</span>}
          <button className="cta" type="button">
            {design.ctaLabel} →
          </button>
        </div>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          padding: 6%;
          color: ${design.textColor};
          font-family: var(--font-sans), system-ui;
        }
        .left {
          max-width: 60%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .brand {
          font-size: clamp(11px, 1.4vw, 14px);
          letter-spacing: 0.26em;
          text-transform: uppercase;
          font-weight: 800;
          opacity: 0.9;
        }
        .headline {
          margin: 0;
          font-family: var(--font-archivo-black), Impact, sans-serif;
          font-size: clamp(36px, 8vw, 80px);
          line-height: 0.95;
          letter-spacing: -0.015em;
          text-transform: uppercase;
        }
        .sub {
          margin: 0;
          font-size: clamp(12px, 1.6vw, 16px);
          font-weight: 500;
          max-width: 95%;
          opacity: 0.94;
          line-height: 1.4;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .badge {
          background: ${design.accentColor};
          color: ${design.textColor};
          padding: 7px 12px;
          border-radius: 999px;
          font-weight: 900;
          letter-spacing: 0.14em;
          font-size: clamp(10px, 1.3vw, 12px);
          text-transform: uppercase;
        }
        .cta {
          background: #000;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 13px 22px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-size: clamp(11px, 1.4vw, 14px);
          cursor: default;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.3);
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}

function HeroProductLayout({ design }: { design: PosterDesign }) {
  return (
    <div className="layer">
      <div className="top">
        <span className="label">{design.offerBadge || "NEW"}</span>
      </div>
      <div className="middle">
        <div className="brand">{design.brandName}</div>
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
      </div>
      <div className="bottom">
        <span className="cta">
          {design.ctaLabel} <span aria-hidden>→</span>
        </span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 6%;
          color: ${design.textColor};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          font-family: var(--font-sans), system-ui;
        }
        .label {
          background: ${design.accentColor};
          color: ${design.textColor};
          padding: 7px 14px;
          border-radius: 6px;
          font-weight: 900;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          font-size: clamp(11px, 1.3vw, 13px);
        }
        .middle {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .brand {
          font-size: clamp(12px, 1.6vw, 16px);
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-weight: 800;
          opacity: 0.9;
        }
        .headline {
          margin: 0;
          font-family: var(--font-archivo-black), Impact, sans-serif;
          font-size: clamp(44px, 10vw, 100px);
          line-height: 0.92;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
        }
        .sub {
          margin: 0;
          font-size: clamp(12px, 1.6vw, 16px);
          font-weight: 500;
          opacity: 0.94;
          max-width: 80%;
        }
        .cta {
          font-size: clamp(11px, 1.5vw, 14px);
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          padding: 10px 16px;
          border-bottom: 2px solid ${design.accentColor};
        }
      `}</style>
    </div>
  );
}

function EditorialLayout({ design }: { design: PosterDesign }) {
  return (
    <div className="layer">
      <div className="top">
        <div className="eyebrow">{design.brandName}</div>
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
      </div>
      <div className="infoRow">
        {design.offerBadge && (
          <div className="cell">
            <span className="k">Offer</span>
            <span className="v accent">{design.offerBadge}</span>
          </div>
        )}
        <div className="cell">
          <span className="k">Feature</span>
          <span className="v">Limited Release</span>
        </div>
        <div className="cell">
          <span className="k">Action</span>
          <span className="v">{design.ctaLabel}</span>
        </div>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 6%;
          color: ${design.textColor};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
        }
        .top {
          max-width: 82%;
        }
        .eyebrow {
          font-size: clamp(11px, 1.4vw, 14px);
          letter-spacing: 0.34em;
          text-transform: uppercase;
          opacity: 0.9;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .headline {
          margin: 0;
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(38px, 8.5vw, 84px);
          line-height: 0.98;
          letter-spacing: -0.01em;
          font-style: italic;
          font-weight: 700;
        }
        .sub {
          margin: 10px 0 0;
          font-size: clamp(12px, 1.6vw, 15px);
          font-weight: 500;
          opacity: 0.92;
          line-height: 1.5;
        }
        .infoRow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          background: rgba(2, 6, 23, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 12px;
          padding: 12px 14px;
          backdrop-filter: blur(6px);
        }
        .cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .k {
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          opacity: 0.75;
          font-weight: 700;
        }
        .v {
          font-size: clamp(12px, 1.6vw, 15px);
          font-weight: 800;
        }
        .accent {
          color: ${design.accentColor};
        }
      `}</style>
    </div>
  );
}

function MinimalCleanLayout({ design }: { design: PosterDesign }) {
  return (
    <div className="layer">
      <div className="top">
        <div className="brand">{design.brandName}</div>
        {design.offerBadge && <div className="badge">{design.offerBadge}</div>}
      </div>
      <div className="mid">
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
      </div>
      <div className="bottom">
        <span className="cta">
          <span className="dash">—</span> {design.ctaLabel}
        </span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 8%;
          color: ${design.textColor === "#FFFFFF" ? "#0f172a" : design.textColor};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(2px);
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .brand {
          font-size: clamp(10px, 1.3vw, 12px);
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-weight: 700;
          color: #475569;
        }
        .badge {
          font-size: clamp(10px, 1.3vw, 12px);
          font-weight: 800;
          letter-spacing: 0.14em;
          color: ${design.accentColor};
          text-transform: uppercase;
        }
        .mid {
          max-width: 88%;
        }
        .headline {
          margin: 0;
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(40px, 9vw, 90px);
          line-height: 0.98;
          letter-spacing: -0.02em;
          font-weight: 600;
          color: #0f172a;
        }
        .sub {
          margin: 12px 0 0;
          font-size: clamp(12px, 1.6vw, 16px);
          color: #475569;
          line-height: 1.5;
          max-width: 80%;
        }
        .bottom {
          display: flex;
        }
        .cta {
          font-size: clamp(11px, 1.4vw, 14px);
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #0f172a;
        }
        .dash {
          color: ${design.accentColor};
          margin-right: 6px;
        }
      `}</style>
    </div>
  );
}

function LuxuryDarkLayout({ design }: { design: PosterDesign }) {
  const gold = "#D4AF37";
  return (
    <div className="layer">
      <div className="top">
        <div className="mark">◆</div>
        <div className="brand">{design.brandName}</div>
      </div>
      <div className="mid">
        <h1 className="headline">{design.headline}</h1>
        {design.subheadline && <p className="sub">{design.subheadline}</p>}
        {design.offerBadge && <div className="badge">{design.offerBadge}</div>}
      </div>
      <div className="bottom">
        <span className="cta">
          {design.ctaLabel} <span aria-hidden>→</span>
        </span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 8%;
          color: #f5f5f4;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.75) 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
        }
        .top {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
        }
        .mark {
          color: ${gold};
          font-size: clamp(16px, 2vw, 20px);
        }
        .brand {
          color: ${gold};
          letter-spacing: 0.42em;
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
          font-size: clamp(50px, 11vw, 112px);
          line-height: 0.98;
          letter-spacing: 0.04em;
          font-weight: 700;
          color: ${gold};
          text-transform: uppercase;
        }
        .sub {
          margin: 12px 0 0;
          font-size: clamp(12px, 1.6vw, 15px);
          color: #e7e5e4;
          letter-spacing: 0.08em;
          opacity: 0.92;
        }
        .badge {
          display: inline-block;
          margin-top: 14px;
          padding: 6px 16px;
          border: 1px solid ${gold};
          color: ${gold};
          font-size: clamp(10px, 1.3vw, 12px);
          letter-spacing: 0.26em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .bottom {
          display: flex;
          justify-content: center;
        }
        .cta {
          color: ${gold};
          font-size: clamp(11px, 1.4vw, 13px);
          letter-spacing: 0.32em;
          font-weight: 900;
          text-transform: uppercase;
          padding: 10px 16px;
          border: 1px solid ${gold};
        }
      `}</style>
    </div>
  );
}

function NeonTechLayout({ design }: { design: PosterDesign }) {
  const neon = design.accentColor || "#22D3EE";
  return (
    <div className="layer">
      <div className="top">
        <span className="tag">[ {design.brandName} · DROP ]</span>
        {design.offerBadge && <span className="pulse">● {design.offerBadge}</span>}
      </div>
      <div className="mid">
        <h1 className="headline">
          {design.headline.split(/\s+/).slice(0, -1).join(" ") || design.headline}
          <span className="neon"> {design.headline.split(/\s+/).slice(-1)[0] || ""}</span>
        </h1>
        {design.subheadline && <p className="sub">// {design.subheadline}</p>}
      </div>
      <div className="bottom">
        <span className="cta">→ {design.ctaLabel}</span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 6%;
          color: ${design.textColor};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
        }
        .top {
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
          font-family: var(--font-mono), monospace;
          font-size: clamp(10px, 1.3vw, 13px);
          color: ${neon};
          letter-spacing: 0.18em;
        }
        .headline {
          margin: 0;
          font-family: var(--font-archivo-black), Impact, sans-serif;
          font-size: clamp(44px, 11vw, 108px);
          line-height: 0.92;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }
        .neon {
          color: ${neon};
          text-shadow: 0 0 18px ${neon}80, 0 0 40px ${neon}50;
        }
        .sub {
          margin: 14px 0 0;
          font-family: var(--font-mono), monospace;
          font-size: clamp(11px, 1.5vw, 14px);
          color: ${neon};
          letter-spacing: 0.08em;
          opacity: 0.92;
        }
        .bottom {
          display: flex;
          justify-content: flex-end;
        }
        .cta {
          font-family: var(--font-mono), monospace;
          color: ${neon};
          font-size: clamp(12px, 1.5vw, 15px);
          letter-spacing: 0.22em;
          padding: 10px 14px;
          border: 1px solid ${neon};
          border-radius: 2px;
          text-transform: uppercase;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

function FestivalVibrantLayout({ design }: { design: PosterDesign }) {
  return (
    <div className="layer">
      <div className="top">
        <div className="brand">{design.brandName}</div>
        {design.offerBadge && <div className="sunburst">★ {design.offerBadge} ★</div>}
      </div>
      <h1 className="headline">{design.headline}</h1>
      {design.subheadline && <p className="sub">{design.subheadline}</p>}
      <div className="bottom">
        <span className="cta">{design.ctaLabel}</span>
      </div>
      <style jsx>{`
        .layer {
          position: absolute;
          inset: 0;
          padding: 6%;
          color: ${design.textColor};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-sans), system-ui;
          background: radial-gradient(
              circle at top right,
              ${design.accentColor}35,
              transparent 60%
            ),
            radial-gradient(circle at bottom left, #ef444430, transparent 60%);
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .brand {
          font-size: clamp(12px, 1.5vw, 14px);
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-weight: 800;
        }
        .sunburst {
          background: ${design.accentColor};
          color: #0f172a;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: clamp(10px, 1.3vw, 12px);
          letter-spacing: 0.16em;
          font-weight: 900;
          text-transform: uppercase;
          box-shadow: 0 6px 18px rgba(245, 158, 11, 0.45);
        }
        .headline {
          margin: 0;
          font-family: var(--font-anton), Impact, sans-serif;
          font-size: clamp(52px, 12vw, 128px);
          line-height: 0.9;
          text-transform: uppercase;
          letter-spacing: -0.01em;
          text-shadow: 0 3px 22px rgba(0, 0, 0, 0.35);
        }
        .sub {
          margin: 10px 0 0;
          font-size: clamp(12px, 1.6vw, 16px);
          font-weight: 600;
          max-width: 82%;
          opacity: 0.94;
        }
        .bottom {
          display: flex;
        }
        .cta {
          padding: 12px 22px;
          background: ${design.accentColor};
          color: #0f172a;
          border-radius: 999px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-size: clamp(11px, 1.4vw, 14px);
          box-shadow: 0 14px 28px rgba(245, 158, 11, 0.35);
        }
      `}</style>
    </div>
  );
}
