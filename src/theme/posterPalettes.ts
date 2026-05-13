export type PosterTemplatePalette = {
    bgGradient: string;
    accent: string;
    badgeBg: string;
    textColor: string;
    border: string;
};

export const POSTER_TEMPLATE_PALETTES: Record<string, PosterTemplatePalette> = {
    "promo-flash-impact": {
        bgGradient: "linear-gradient(145deg,#111827 0%,#1f2937 48%,#064e3b 100%)",
        accent: "#86efac",
        badgeBg: "rgba(134,239,172,0.18)",
        textColor: "#f8fafc",
        border: "rgba(134,239,172,0.34)",
    },
    "promo-split-cta": {
        bgGradient: "linear-gradient(150deg,#151923 0%,#28313f 50%,#4c1d95 100%)",
        accent: "#c4b5fd",
        badgeBg: "rgba(196,181,253,0.18)",
        textColor: "#f6f3ff",
        border: "rgba(196,181,253,0.34)",
    },
    "promo-hero-drop": {
        bgGradient: "linear-gradient(145deg,#14171f 0%,#2f2a37 50%,#0f766e 100%)",
        accent: "#99f6e4",
        badgeBg: "rgba(153,246,228,0.17)",
        textColor: "#f4fffb",
        border: "rgba(153,246,228,0.32)",
    },
    "promo-festival-burst": {
        bgGradient: "linear-gradient(136deg,#18151f 0%,#3b294f 48%,#6d28d9 100%)",
        accent: "#ddd6fe",
        badgeBg: "rgba(221,214,254,0.18)",
        textColor: "#faf7ff",
        border: "rgba(221,214,254,0.32)",
    },
    "promo-neon-deal": {
        bgGradient: "linear-gradient(152deg,#0f172a 0%,#1f2937 52%,#047857 100%)",
        accent: "#6ee7b7",
        badgeBg: "rgba(110,231,183,0.18)",
        textColor: "#ecfdf5",
        border: "rgba(110,231,183,0.34)",
    },
    "product-editorial-spotlight": {
        bgGradient: "linear-gradient(156deg,#121826 0%,#263244 54%,#4338ca 100%)",
        accent: "#c7d2fe",
        badgeBg: "rgba(199,210,254,0.18)",
        textColor: "#f5f7ff",
        border: "rgba(199,210,254,0.34)",
    },
    "product-minimal-focus": {
        bgGradient: "linear-gradient(192deg,#ffffff 0%,#f6f7f9 52%,#e8edf2 100%)",
        accent: "#4f46e5",
        badgeBg: "rgba(79,70,229,0.08)",
        textColor: "#111827",
        border: "rgba(79,70,229,0.18)",
    },
    "product-hero-launch": {
        bgGradient: "linear-gradient(154deg,#111827 0%,#263445 50%,#065f46 100%)",
        accent: "#a7f3d0",
        badgeBg: "rgba(167,243,208,0.18)",
        textColor: "#f0fdf4",
        border: "rgba(167,243,208,0.34)",
    },
    "product-action-rows": {
        bgGradient: "linear-gradient(150deg,#111827 0%,#243447 50%,#3730a3 100%)",
        accent: "#a5b4fc",
        badgeBg: "rgba(165,180,252,0.18)",
        textColor: "#f5f7ff",
        border: "rgba(165,180,252,0.34)",
    },
    "product-bold-line": {
        bgGradient: "linear-gradient(154deg,#0f172a 0%,#1e293b 54%,#047857 100%)",
        accent: "#5eead4",
        badgeBg: "rgba(94,234,212,0.17)",
        textColor: "#f0fdfa",
        border: "rgba(94,234,212,0.32)",
    },
    "review-editorial-quote": {
        bgGradient: "linear-gradient(158deg,#111827 0%,#24352f 54%,#047857 100%)",
        accent: "#bbf7d0",
        badgeBg: "rgba(187,247,208,0.18)",
        textColor: "#f0fdf4",
        border: "rgba(187,247,208,0.34)",
    },
    "review-luxury-proof": {
        bgGradient: "linear-gradient(160deg,#080b12 0%,#151923 52%,#312e81 100%)",
        accent: "#c4b5fd",
        badgeBg: "rgba(196,181,253,0.16)",
        textColor: "#faf7ff",
        border: "rgba(196,181,253,0.3)",
    },
    "review-minimal-trust": {
        bgGradient: "linear-gradient(192deg,#ffffff 0%,#f7f8fb 52%,#e8f1ed 100%)",
        accent: "#047857",
        badgeBg: "rgba(4,120,87,0.08)",
        textColor: "#111827",
        border: "rgba(4,120,87,0.18)",
    },
    "review-bold-social": {
        bgGradient: "linear-gradient(150deg,#111827 0%,#2b3444 50%,#6d28d9 100%)",
        accent: "#ddd6fe",
        badgeBg: "rgba(221,214,254,0.18)",
        textColor: "#faf7ff",
        border: "rgba(221,214,254,0.32)",
    },
    "event-festival-banner": {
        bgGradient: "linear-gradient(144deg,#111827 0%,#312a46 50%,#7c3aed 100%)",
        accent: "#e9d5ff",
        badgeBg: "rgba(233,213,255,0.18)",
        textColor: "#fbf7ff",
        border: "rgba(233,213,255,0.32)",
    },
    "event-bold-countdown": {
        bgGradient: "linear-gradient(145deg,#101827 0%,#22313c 48%,#047857 100%)",
        accent: "#86efac",
        badgeBg: "rgba(134,239,172,0.18)",
        textColor: "#f0fdf4",
        border: "rgba(134,239,172,0.34)",
    },
    "event-hero-gather": {
        bgGradient: "linear-gradient(152deg,#111827 0%,#2d3140 50%,#5b21b6 100%)",
        accent: "#c4b5fd",
        badgeBg: "rgba(196,181,253,0.18)",
        textColor: "#f6f3ff",
        border: "rgba(196,181,253,0.32)",
    },
    "event-split-announce": {
        bgGradient: "linear-gradient(150deg,#111827 0%,#243443 52%,#0f766e 100%)",
        accent: "#99f6e4",
        badgeBg: "rgba(153,246,228,0.18)",
        textColor: "#f0fdfa",
        border: "rgba(153,246,228,0.34)",
    },
    "premium-luxury-card": {
        bgGradient: "linear-gradient(160deg,#05070d 0%,#131720 52%,#312e81 100%)",
        accent: "#c4b5fd",
        badgeBg: "rgba(196,181,253,0.16)",
        textColor: "#faf7ff",
        border: "rgba(196,181,253,0.32)",
    },
    "premium-minimal-zen": {
        bgGradient: "linear-gradient(192deg,#ffffff 0%,#f5f8f6 52%,#e4eee9 100%)",
        accent: "#047857",
        badgeBg: "rgba(4,120,87,0.08)",
        textColor: "#111827",
        border: "rgba(4,120,87,0.18)",
    },
    "premium-editorial-magazine": {
        bgGradient: "linear-gradient(192deg,#ffffff 0%,#f7f6fb 50%,#ece8f6 100%)",
        accent: "#6d28d9",
        badgeBg: "rgba(109,40,217,0.08)",
        textColor: "#111827",
        border: "rgba(109,40,217,0.18)",
    },
    "premium-clean-hero": {
        bgGradient: "linear-gradient(192deg,#ffffff 0%,#f4f7fa 50%,#e7eef5 100%)",
        accent: "#334155",
        badgeBg: "rgba(51,65,85,0.07)",
        textColor: "#111827",
        border: "rgba(51,65,85,0.16)",
    },
    "general-balanced-bold": {
        bgGradient: "linear-gradient(150deg,#111827 0%,#263242 52%,#047857 100%)",
        accent: "#86efac",
        badgeBg: "rgba(134,239,172,0.18)",
        textColor: "#f0fdf4",
        border: "rgba(134,239,172,0.34)",
    },
    "general-split-safe": {
        bgGradient: "linear-gradient(150deg,#111827 0%,#283243 50%,#4338ca 100%)",
        accent: "#c7d2fe",
        badgeBg: "rgba(199,210,254,0.18)",
        textColor: "#f5f7ff",
        border: "rgba(199,210,254,0.34)",
    },
    "general-centered-cta": {
        bgGradient: "linear-gradient(154deg,#111827 0%,#263545 52%,#0f766e 100%)",
        accent: "#99f6e4",
        badgeBg: "rgba(153,246,228,0.18)",
        textColor: "#f0fdfa",
        border: "rgba(153,246,228,0.34)",
    },
    "general-tech-neutral": {
        bgGradient: "linear-gradient(152deg,#0f172a 0%,#1f2937 54%,#5b21b6 100%)",
        accent: "#c4b5fd",
        badgeBg: "rgba(196,181,253,0.18)",
        textColor: "#f6f3ff",
        border: "rgba(196,181,253,0.32)",
    },
};

export const DEFAULT_POSTER_TEMPLATE_PALETTE: PosterTemplatePalette = {
    bgGradient: "linear-gradient(156deg,#111827 0%,#263242 52%,#334155 100%)",
    accent: "#cbd5e1",
    badgeBg: "rgba(203,213,225,0.18)",
    textColor: "#f8fafc",
    border: "rgba(203,213,225,0.3)",
};

export function getPosterTemplatePalette(templateId: string): PosterTemplatePalette {
    return POSTER_TEMPLATE_PALETTES[templateId] ?? DEFAULT_POSTER_TEMPLATE_PALETTE;
}
