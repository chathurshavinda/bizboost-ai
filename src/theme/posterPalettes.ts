export type PosterTemplatePalette = {
    bgGradient: string;
    accent: string;
    badgeBg: string;
    textColor: string;
    border: string;
};
export const POSTER_TEMPLATE_PALETTES: Record<string, PosterTemplatePalette> = {
    "promo-flash-impact": {
        bgGradient: "linear-gradient(148deg,#0b0b0b 0%,#1a0606 45%,#b91c1c 100%)",
        accent: "#facc15",
        badgeBg: "rgba(250,204,21,0.18)",
        textColor: "#fff7ed",
        border: "rgba(250,204,21,0.36)",
    },
    "promo-split-cta": {
        bgGradient: "linear-gradient(150deg,#1c0a0a 0%,#3b1110 48%,#dc2626 100%)",
        accent: "#fed7aa",
        badgeBg: "rgba(254,215,170,0.20)",
        textColor: "#fff7ed",
        border: "rgba(254,215,170,0.34)",
    },
    "promo-hero-drop": {
        bgGradient: "linear-gradient(150deg,#08070a 0%,#1c160d 52%,#3b2410 100%)",
        accent: "#fbbf24",
        badgeBg: "rgba(251,191,36,0.18)",
        textColor: "#fef3c7",
        border: "rgba(251,191,36,0.34)",
    },
    "promo-festival-burst": {
        bgGradient: "linear-gradient(140deg,#1a0a04 0%,#7c2d12 46%,#ea580c 100%)",
        accent: "#fde047",
        badgeBg: "rgba(253,224,71,0.20)",
        textColor: "#fff7ed",
        border: "rgba(253,224,71,0.36)",
    },
    "promo-neon-deal": {
        bgGradient: "linear-gradient(152deg,#020617 0%,#0f172a 52%,#0e7490 100%)",
        accent: "#22d3ee",
        badgeBg: "rgba(34,211,238,0.18)",
        textColor: "#ecfeff",
        border: "rgba(34,211,238,0.36)",
    },
    "product-editorial-spotlight": {
        bgGradient: "linear-gradient(190deg,#fff7ed 0%,#fde6d1 52%,#f4cfa6 100%)",
        accent: "#b45309",
        badgeBg: "rgba(180,83,9,0.10)",
        textColor: "#111827",
        border: "rgba(180,83,9,0.22)",
    },
    "product-minimal-focus": {
        bgGradient: "linear-gradient(192deg,#ffffff 0%,#f5f5f4 52%,#e7e5e4 100%)",
        accent: "#0f172a",
        badgeBg: "rgba(15,23,42,0.07)",
        textColor: "#111827",
        border: "rgba(15,23,42,0.18)",
    },
    "product-hero-launch": {
        bgGradient: "linear-gradient(154deg,#0a0a0a 0%,#1f1610 50%,#78350f 100%)",
        accent: "#f59e0b",
        badgeBg: "rgba(245,158,11,0.18)",
        textColor: "#fef3c7",
        border: "rgba(245,158,11,0.34)",
    },
    "product-action-rows": {
        bgGradient: "linear-gradient(150deg,#0b1220 0%,#152033 50%,#1e40af 100%)",
        accent: "#38bdf8",
        badgeBg: "rgba(56,189,248,0.18)",
        textColor: "#f0f9ff",
        border: "rgba(56,189,248,0.34)",
    },
    "product-bold-line": {
        bgGradient: "linear-gradient(154deg,#0a0a0a 0%,#1f0f08 54%,#9a3412 100%)",
        accent: "#fb923c",
        badgeBg: "rgba(251,146,60,0.20)",
        textColor: "#fff7ed",
        border: "rgba(251,146,60,0.34)",
    },
    "review-editorial-quote": {
        bgGradient: "linear-gradient(190deg,#fefce8 0%,#fef3c7 50%,#fde68a 100%)",
        accent: "#b91c1c",
        badgeBg: "rgba(185,28,28,0.10)",
        textColor: "#111827",
        border: "rgba(185,28,28,0.22)",
    },
    "review-luxury-proof": {
        bgGradient: "linear-gradient(160deg,#000000 0%,#0c0a06 52%,#1c1407 100%)",
        accent: "#d4af37",
        badgeBg: "rgba(212,175,55,0.16)",
        textColor: "#fef3c7",
        border: "rgba(212,175,55,0.32)",
    },
    "review-minimal-trust": {
        bgGradient: "linear-gradient(190deg,#ffffff 0%,#f6faf7 52%,#e6f4ec 100%)",
        accent: "#047857",
        badgeBg: "rgba(4,120,87,0.08)",
        textColor: "#111827",
        border: "rgba(4,120,87,0.20)",
    },
    "review-bold-social": {
        bgGradient: "linear-gradient(148deg,#1a0707 0%,#4b1110 48%,#dc2626 100%)",
        accent: "#fde68a",
        badgeBg: "rgba(253,230,138,0.20)",
        textColor: "#fff7ed",
        border: "rgba(253,230,138,0.34)",
    },
    "event-festival-banner": {
        bgGradient: "linear-gradient(146deg,#1a0a04 0%,#7c2d12 44%,#f97316 100%)",
        accent: "#fde047",
        badgeBg: "rgba(253,224,71,0.20)",
        textColor: "#fff7ed",
        border: "rgba(253,224,71,0.36)",
    },
    "event-bold-countdown": {
        bgGradient: "linear-gradient(146deg,#0a0a0a 0%,#1a0606 48%,#9f1239 100%)",
        accent: "#fde047",
        badgeBg: "rgba(253,224,71,0.18)",
        textColor: "#fff7ed",
        border: "rgba(253,224,71,0.34)",
    },
    "event-hero-gather": {
        bgGradient: "linear-gradient(152deg,#100614 0%,#2a0e2d 50%,#5b1f4c 100%)",
        accent: "#f9a8d4",
        badgeBg: "rgba(249,168,212,0.18)",
        textColor: "#fdf2f8",
        border: "rgba(249,168,212,0.32)",
    },
    "event-split-announce": {
        bgGradient: "linear-gradient(150deg,#0b0b0b 0%,#1f1610 50%,#92400e 100%)",
        accent: "#fcd34d",
        badgeBg: "rgba(252,211,77,0.18)",
        textColor: "#fef3c7",
        border: "rgba(252,211,77,0.34)",
    },
    "premium-luxury-card": {
        bgGradient: "linear-gradient(162deg,#000000 0%,#0a0a0a 52%,#1c1407 100%)",
        accent: "#d4af37",
        badgeBg: "rgba(212,175,55,0.14)",
        textColor: "#fef3c7",
        border: "rgba(212,175,55,0.30)",
    },
    "premium-minimal-zen": {
        bgGradient: "linear-gradient(192deg,#ffffff 0%,#f6f5f1 52%,#ece8de 100%)",
        accent: "#3f6212",
        badgeBg: "rgba(63,98,18,0.08)",
        textColor: "#111827",
        border: "rgba(63,98,18,0.18)",
    },
    "premium-editorial-magazine": {
        bgGradient: "linear-gradient(192deg,#fff7ed 0%,#fde6d1 50%,#f4cfa6 100%)",
        accent: "#9a3412",
        badgeBg: "rgba(154,52,18,0.10)",
        textColor: "#111827",
        border: "rgba(154,52,18,0.22)",
    },
    "premium-clean-hero": {
        bgGradient: "linear-gradient(192deg,#fafaf9 0%,#f2efe9 50%,#e3ddd1 100%)",
        accent: "#334155",
        badgeBg: "rgba(51,65,85,0.08)",
        textColor: "#111827",
        border: "rgba(51,65,85,0.18)",
    },
    "general-balanced-bold": {
        bgGradient: "linear-gradient(150deg,#0a0a0a 0%,#1c0a0a 52%,#7f1d1d 100%)",
        accent: "#fca5a5",
        badgeBg: "rgba(252,165,165,0.18)",
        textColor: "#fff7ed",
        border: "rgba(252,165,165,0.34)",
    },
    "general-split-safe": {
        bgGradient: "linear-gradient(150deg,#0b0b0b 0%,#1f1610 50%,#78350f 100%)",
        accent: "#fbbf24",
        badgeBg: "rgba(251,191,36,0.18)",
        textColor: "#fef3c7",
        border: "rgba(251,191,36,0.34)",
    },
    "general-centered-cta": {
        bgGradient: "linear-gradient(154deg,#0a0a0a 0%,#1f1410 50%,#9a3412 100%)",
        accent: "#fdba74",
        badgeBg: "rgba(253,186,116,0.20)",
        textColor: "#fff7ed",
        border: "rgba(253,186,116,0.34)",
    },
    "general-tech-neutral": {
        bgGradient: "linear-gradient(152deg,#020617 0%,#0f172a 54%,#1e3a8a 100%)",
        accent: "#60a5fa",
        badgeBg: "rgba(96,165,250,0.18)",
        textColor: "#eff6ff",
        border: "rgba(96,165,250,0.32)",
    },
};
export const DEFAULT_POSTER_TEMPLATE_PALETTE: PosterTemplatePalette = {
    bgGradient: "linear-gradient(156deg,#0a0a0a 0%,#1c1407 52%,#3b2410 100%)",
    accent: "#fbbf24",
    badgeBg: "rgba(251,191,36,0.18)",
    textColor: "#fef3c7",
    border: "rgba(251,191,36,0.32)",
};
export function getPosterTemplatePalette(templateId: string): PosterTemplatePalette {
    return POSTER_TEMPLATE_PALETTES[templateId] ?? DEFAULT_POSTER_TEMPLATE_PALETTE;
}
