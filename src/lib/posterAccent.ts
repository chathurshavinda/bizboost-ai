import type { CSSProperties } from "react";

export type PosterAccentTokens = {
    accent: string;
    /** "r, g, b" for rgba() / rgb() */
    accentRgb: string;
    /** Text/icon on solid accent fills (CTA, filled badges) */
    onAccent: string;
    /** Accent hue as foreground on dark imagery / overlays */
    fgOnDark: string;
    /** Accent hue as foreground on light panels */
    fgOnLight: string;
    /** Soft wash (rgba) */
    accentSoft: string;
};

const FALLBACK_ACCENT = "#E11D48";

function clamp01(n: number): number {
    return Math.min(1, Math.max(0, n));
}

export function parseHex6(hex: string): [number, number, number] | null {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec((hex || "").trim());
    if (!m)
        return null;
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** WCAG relative luminance (sRGB), 0–1 */
export function luminance([r, g, b]: [number, number, number]): number {
    const lin = (x: number) => {
        const c = x / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const R = lin(r);
    const G = lin(g);
    const B = lin(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
    t = clamp01(t);
    return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
    ];
}

function toHex([r, g, b]: [number, number, number]): string {
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** Readable text on top of a solid `hex` fill (buttons, pills). */
export function onForHex(hex: string): string {
    const rgb = parseHex6((hex || "").trim());
    if (!rgb)
        return "#0f172a";
    return luminance(rgb) > 0.58 ? "#0f172a" : "#ffffff";
}

/**
 * Derives poster-wide accent tokens from a hex accent.
 * Handles very light / very dark accents for readable text-on-accent and accent-as-text.
 */
export function getPosterAccentTokens(accentInput: string | undefined | null): PosterAccentTokens {
    const rgb = parseHex6(accentInput || "") ?? parseHex6(FALLBACK_ACCENT)!;
    const accent = toHex(rgb);
    const accentRgb = `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
    const lum = luminance(rgb);

    const onAccent = lum > 0.58 ? "#0f172a" : "#ffffff";

    let fgOnLight = accent;
    if (lum > 0.76) {
        fgOnLight = toHex(mixRgb(rgb, [15, 23, 42], 0.5));
    }
    else if (lum > 0.62) {
        fgOnLight = toHex(mixRgb(rgb, [15, 23, 42], 0.28));
    }

    let fgOnDark = accent;
    if (lum < 0.14) {
        fgOnDark = toHex(mixRgb(rgb, [248, 250, 252], 0.62));
    }
    else if (lum < 0.32) {
        fgOnDark = toHex(mixRgb(rgb, [254, 243, 199], 0.38));
    }

    const accentSoft = `rgba(${accentRgb}, 0.18)`;

    return { accent, accentRgb, onAccent, fgOnDark, fgOnLight, accentSoft };
}

export function posterAccentCssVars(t: PosterAccentTokens): CSSProperties {
    return {
        "--p-accent": t.accent,
        "--p-accent-rgb": t.accentRgb,
        "--p-on-accent": t.onAccent,
        "--p-fg-on-dark": t.fgOnDark,
        "--p-fg-on-light": t.fgOnLight,
        "--p-accent-soft": t.accentSoft,
    } as CSSProperties;
}
