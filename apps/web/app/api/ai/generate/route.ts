import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const DEFAULT_MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-pro-latest",
];

function resolveModelCandidates(): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  if (fromEnv) {
    return [fromEnv, ...DEFAULT_MODEL_CANDIDATES.filter((name) => name !== fromEnv)];
  }
  return DEFAULT_MODEL_CANDIDATES;
}

const SUPPORTED_TYPES = [
  "marketing-plan",
  "poster",
  "social-post",
  "poster-caption",
  "final-post",
  "poster-design",
] as const;
type GenerateType = (typeof SUPPORTED_TYPES)[number];

const POSTER_STYLES = [
  "bold-statement",
  "landscape-action",
  "hero-product",
  "editorial",
  "minimal-clean",
  "luxury-dark",
  "neon-tech",
  "festival-vibrant",
] as const;
type PosterStyle = (typeof POSTER_STYLES)[number];

type PosterDesign = {
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

type BusinessDetails = {
  businessName: string;
  businessType: string;
  location: string;
  productsOrServices: string;
  targetCustomers: string;
  businessGoal: string;
  budget: string;
  language?: string;
  offer?: string;
  marketingGoal?: string;
  tone?: string;
  dayPlan?: string;
  photoContext?: string;
  finalCaption?: string;
  lockedStyle?: PosterStyle | "";
  avoidHeadline?: string;
  avoidSubheadline?: string;
  avoidAccentColor?: string;
  variationHint?: string;
  currentMarketingMethods?: string;
  competitors?: string;
  preferredPlatforms?: string;
  teamSize?: string;
  monthlyMarketingBudget?: string;
  expectedRevenueRange?: string;
  socialLinks?: string;
};

type GenerateRequestBody = {
  type?: unknown;
  businessDetails?: Partial<BusinessDetails> | null;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateBody(body: unknown):
  | { ok: true; type: GenerateType; businessDetails: BusinessDetails }
  | { ok: false; message: string } {
  const payload = (body ?? {}) as GenerateRequestBody;
  const typeRaw = cleanString(payload.type);

  if (!SUPPORTED_TYPES.includes(typeRaw as GenerateType)) {
    return {
      ok: false,
      message:
        "type is required and must be 'marketing-plan', 'poster', 'social-post', 'poster-caption', 'final-post', or 'poster-design'",
    };
  }

  const details = payload.businessDetails;
  if (!details || typeof details !== "object") {
    return { ok: false, message: "businessDetails is required" };
  }

  const lockedStyleRaw = cleanString((details as Partial<BusinessDetails>).lockedStyle);
  const lockedStyle: PosterStyle | "" = (POSTER_STYLES as readonly string[]).includes(lockedStyleRaw)
    ? (lockedStyleRaw as PosterStyle)
    : "";

  const businessDetails: BusinessDetails = {
    businessName: cleanString(details.businessName),
    businessType: cleanString(details.businessType),
    location: cleanString(details.location),
    productsOrServices: cleanString(details.productsOrServices),
    targetCustomers: cleanString(details.targetCustomers),
    businessGoal: cleanString(details.businessGoal),
    budget: cleanString(details.budget),
    language: cleanString(details.language) || "English",
    offer: cleanString(details.offer),
    marketingGoal: cleanString(details.marketingGoal),
    tone: cleanString(details.tone),
    dayPlan: cleanString(details.dayPlan),
    photoContext: cleanString(details.photoContext),
    finalCaption: cleanString(details.finalCaption),
    lockedStyle,
    avoidHeadline: cleanString((details as Partial<BusinessDetails>).avoidHeadline),
    avoidSubheadline: cleanString((details as Partial<BusinessDetails>).avoidSubheadline),
    avoidAccentColor: cleanString((details as Partial<BusinessDetails>).avoidAccentColor),
    variationHint: cleanString((details as Partial<BusinessDetails>).variationHint),
    currentMarketingMethods: cleanString((details as Partial<BusinessDetails>).currentMarketingMethods),
    competitors: cleanString((details as Partial<BusinessDetails>).competitors),
    preferredPlatforms: cleanString((details as Partial<BusinessDetails>).preferredPlatforms),
    teamSize: cleanString((details as Partial<BusinessDetails>).teamSize),
    monthlyMarketingBudget: cleanString((details as Partial<BusinessDetails>).monthlyMarketingBudget),
    expectedRevenueRange: cleanString((details as Partial<BusinessDetails>).expectedRevenueRange),
    socialLinks: cleanString((details as Partial<BusinessDetails>).socialLinks),
  };

  const isShortFormType =
    typeRaw === "social-post" ||
    typeRaw === "poster-caption" ||
    typeRaw === "final-post" ||
    typeRaw === "poster-design";
  const requiredFields: Array<keyof BusinessDetails> = isShortFormType
    ? [
        "businessName",
        "businessType",
        "location",
        "productsOrServices",
        "targetCustomers",
      ]
    : [
        "businessName",
        "businessType",
        "location",
        "productsOrServices",
        "targetCustomers",
        "businessGoal",
        "budget",
      ];
  const missingFields = requiredFields.filter((key) => !businessDetails[key]);

  if (missingFields.length > 0) {
    return {
      ok: false,
      message: `Missing required business details: ${missingFields.join(", ")}`,
    };
  }

  return { ok: true, type: typeRaw as GenerateType, businessDetails };
}

function buildPosterDesignPrompt(details: BusinessDetails): string {
  const offer = details.offer || "";
  const dayPlan = details.dayPlan || "";
  const photoContext = details.photoContext || "A real photo uploaded by the business owner";
  const hasLockedStyle = !!details.lockedStyle;
  const hasVariationHints =
    !!details.avoidHeadline || !!details.avoidSubheadline || !!details.avoidAccentColor || !!details.variationHint;

  const lockedStyleBlock = hasLockedStyle
    ? `
STYLE IS LOCKED — you MUST use style="${details.lockedStyle}". Do NOT pick any other style for this output.`
    : "";

  const variationBlock = hasVariationHints
    ? `
VARIATION REQUEST — this is a regeneration. Produce a DIFFERENT, IMPROVED variation of the design. Keep the brand feel but change the wording, angle, and palette. Specifically:
${details.avoidHeadline ? `- Do NOT reuse this previous headline: "${details.avoidHeadline}". Use different words and a different angle.` : ""}
${details.avoidSubheadline ? `- Do NOT reuse this previous subheadline: "${details.avoidSubheadline}". Write a fresh supporting line.` : ""}
${details.avoidAccentColor ? `- Do NOT reuse this accent color: "${details.avoidAccentColor}". Pick a different bold hex color that still fits the style.` : ""}
${details.variationHint ? `- Variation seed: ${details.variationHint} (use this to pick a creative variation).` : ""}
- Vary the overlay (light / dark / none) if it improves readability over the photo.
- The NEW design must feel fresher and more polished than the previous one.`
    : "";

  return `You are a senior brand designer creating a single social-media poster concept for a small business in Sri Lanka.

Business details:
- Business Name: ${details.businessName}
- Business Type: ${details.businessType}
- Location: ${details.location}
- Products/Services: ${details.productsOrServices}
- Target Customers: ${details.targetCustomers}
- Offer/Promotion: ${offer || "N/A"}
- Selected Day Plan: ${dayPlan || "General promo"}
- Photo Context: ${photoContext}
- Preferred Language: ${details.language || "English"}
${lockedStyleBlock}${variationBlock}

Task:
Produce a clean, bold poster concept inspired by professional brand posters (like Nike and Adidas style social posters). The poster will be rendered as typography and shapes overlaid on the user's real photo.

Style options (pick ONE that best fits the business, photo, and offer):
- "bold-statement": giant 2-3 word headline dominating the poster (fashion, athletic, statement brands)
- "landscape-action": split layout, product name + short tagline + CTA button (products, combos, launches)
- "hero-product": product-focused centered composition with strong top label + centered brand + bottom CTA (e-commerce, product drops)
- "editorial": fashion-magazine feel with italic serif headline + small info grid (lifestyle, apparel, premium)
- "minimal-clean": calm Apple-style composition with lots of whitespace and thin elegant serif headline (tech, premium services, studios)
- "luxury-dark": black + gold premium palette with centered serif brand mark (jewellery, weddings, high-end salons, boutique hotels)
- "neon-tech": futuristic drop feel with monospace tags and neon accent word (tech brands, gadgets, gaming, modern cafes)
- "festival-vibrant": warm vibrant celebratory vibe for Sri Lanka festivals and promotions (Avurudu, Vesak, Christmas, Deepavali, launch parties, food specials)

Rules:
- Pick the style that matches the brand vibe, NOT always bold-statement.
- If the offer/dayPlan mentions a Sri Lankan festival (e.g. Avurudu, Vesak, Christmas, Deepavali, Ramadan), prefer "festival-vibrant".
- If the business is jewellery / salon / wedding / luxury / boutique, prefer "luxury-dark".
- If the business is tech / gadgets / modern / studio / co-working / gaming, prefer "neon-tech" or "minimal-clean".
- If the business is fashion / lifestyle magazine-style, prefer "editorial".
- If it is a strong product drop / e-commerce item, prefer "hero-product" or "landscape-action".
- headline: 2 to 6 words MAX, uppercase-friendly, punchy.
- subheadline: 3 to 10 words, optional supporting line.
- offerBadge: short (max 3 words) like "20% OFF", "NEW", "BUY 1 GET 1" — or empty string if no offer.
- ctaLabel: 1 to 3 words like "BUY NOW", "ORDER TODAY", "VIEW ONLINE", "BOOK NOW", "RESERVE NOW".
- brandName: use the given business name as-is (short version if too long).
- accentColor: a single bold hex color that fits the style (e.g. "#E11D48" bold, "#D4AF37" luxury, "#22D3EE" neon, "#F59E0B" festival).
- textColor: "#FFFFFF" or "#0F172A" — whichever gives the best contrast over a photo.
- overlay: "light" | "dark" | "none" — dark overlay darkens the photo for better white text readability; light for dark photos; none for clean photos.
- Do NOT include the photo in the text. Do NOT describe the photo.
- Keep everything short and brand-like.

Output STRICT JSON only. No markdown, no code fences, no commentary. Use this exact shape:

{
  "style": "bold-statement" | "landscape-action" | "hero-product" | "editorial" | "minimal-clean" | "luxury-dark" | "neon-tech" | "festival-vibrant",
  "brandName": "string",
  "headline": "string",
  "subheadline": "string",
  "offerBadge": "string",
  "ctaLabel": "string",
  "accentColor": "#RRGGBB",
  "textColor": "#RRGGBB",
  "overlay": "light" | "dark" | "none"
}`;
}

function buildMarketingPlanPrompt(details: BusinessDetails): string {
  const language = details.language || "English";
  const fmt = (label: string, value: string | undefined) =>
    value && value.trim() ? `- ${label}: ${value.trim()}` : "";

  const knownLines = [
    fmt("Business Name", details.businessName),
    fmt("Industry / Business Type", details.businessType),
    fmt("Location", details.location),
    fmt("Products or Services", details.productsOrServices),
    fmt("Target Customers", details.targetCustomers),
    fmt("Business Goals", details.businessGoal || details.marketingGoal),
    fmt("Budget Level", details.budget),
    fmt("Monthly Marketing Budget (LKR)", details.monthlyMarketingBudget),
    fmt("Expected Revenue Range", details.expectedRevenueRange),
    fmt("Team Size", details.teamSize),
    fmt("Current Marketing Methods", details.currentMarketingMethods),
    fmt("Known Competitors", details.competitors),
    fmt("Preferred Platforms", details.preferredPlatforms),
    fmt("Social Links", details.socialLinks),
    `- Preferred Language: ${language}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a senior marketing strategist who specializes in small businesses (SMEs) in Sri Lanka.
Write in ${language}.

You MUST personalize the plan using ONLY the business details below. Do NOT invent unrelated industries. Do NOT give generic advice. Every recommendation MUST reference the business name, location, products/services, target customers, budget, or platforms.

Business details:
${knownLines}

Task:
Produce the best, most practical, and highly actionable marketing plan for this exact business.

Global rules:
- Tailor everything to Sri Lanka: local cities, Sinhala/Tamil/English language mix where relevant, Sri Lankan payment methods (Cash on Delivery, bank transfer, Koko, Mintpay), Sri Lankan festivals (Avurudu, Vesak, Poson, Deepavali, Christmas, Ramadan), Sri Lankan social habits (WhatsApp first, Facebook dominant, Instagram growing, TikTok for discovery).
- Budget realism: match every suggested action to the stated budget level and monthly marketing budget. Low budget = free + WhatsApp + organic + referrals. Medium = boosted posts + small Meta ads (LKR 5k–25k/month). High = structured Meta + Google Search + influencer micro-partners.
- Use clear Markdown: each section starts with "## <n>. <Section Title>". Use short, scannable bullets. Quantify where possible (LKR amounts, % targets, days, frequency).
- If a detail is missing (e.g. no competitors), briefly acknowledge the assumption you made before the advice.
- Avoid fluff words, avoid "leverage / synergize", do not repeat the same idea across sections.
- Do NOT add any commentary before "## 1." or after "## 10.". Do NOT use code fences.

Required output (exactly these 10 sections, in this order, in clean Markdown):

## 1. Business Summary
One concise paragraph (3–5 lines) summarizing ${details.businessName || "the business"}: what it sells, who it serves, where it operates, and its main growth goal.

## 2. Target Audience Analysis
- 2–3 clearly named customer personas (age range, area inside ${details.location || "Sri Lanka"}, income band, motivations, objections).
- Where they spend time online (platform + typical behaviour).
- What they would pay for / what blocks them from buying.

## 3. Best Marketing Strategy
- 3–5 strategic pillars chosen specifically for this business (e.g. "Hyperlocal WhatsApp referral", "Instagram reels around ${details.productsOrServices || "the product"}").
- For each pillar: one-line rationale + expected outcome.
- A short unique-selling-point (USP) statement derived from the inputs.

## 4. Weekly Marketing Plan
Write a 7-day Markdown table with columns: Day | Focus | Action | Channel | Time | Expected Outcome.
Seven rows (Mon–Sun). Each row must be specific (mention ${details.businessName || "the business"}, a product, or a channel).

## 5. Social Media Content Ideas
Give 7 concrete content ideas. Each as:
- **Title** — 1-line post idea
- Caption (ready to post, 1–2 sentences, 1 emoji max)
- Hashtags (3–6, mix #LK + #${(details.location || "Colombo").replace(/[^a-zA-Z0-9]/g, "")} + niche)

## 6. Promotion Ideas
- 4–6 promo mechanics fitted to the budget and the products (bundles, BOGO, festival-tied offers, referral bonus, loyalty stamp, collab with a local creator/shop).
- For each: audience it hits, channel to run it on, estimated cost (LKR), and simple success sign.

## 7. Paid Advertising Suggestions
- Channel mix recommendation with split in percentages and LKR (Meta Ads vs Google vs TikTok vs local directories), matched to the stated budget.
- 2 starter ad campaign briefs:
  - Campaign name
  - Objective (awareness / traffic / messages / purchases)
  - Audience targeting (age, area, interests)
  - Budget (daily LKR, duration days)
  - Creative direction (1 line) + suggested CTA
- Realistic CPM/CPC expectations for Sri Lanka if possible.

## 8. Customer Growth Strategy
- Lead capture path (where people first see the business → first message → first purchase → repeat).
- Referral mechanic (what the business can offer to reward word-of-mouth).
- Retention mechanic (1 simple monthly touchpoint suitable for ${details.businessType || "this business"}).
- One partnership idea with a complementary local Sri Lankan business.

## 9. Simple KPI Tracking
Write a Markdown table with columns: KPI | How to measure | Target (4 weeks) | Tool.
Include 6 KPIs appropriate to the business (e.g. WhatsApp inquiries/day, Instagram reach, conversion rate, avg order value in LKR, repeat customer rate, cost per lead).

## 10. Practical Next Steps
Numbered list of the FIRST 7 concrete actions the owner should take in the next 14 days, each 1 short sentence, each starting with an action verb. Be specific (mention platform, time-window, LKR amount, or asset).`;
}

function buildFinalPostPrompt(details: BusinessDetails): string {
  const dayPlan = details.dayPlan || "General promotional post";
  const photoContext = details.photoContext || "A real photo uploaded by the business";
  const offer = details.offer || "No specific offer";
  const tone = details.tone || "Friendly and professional";
  const finalCaption = details.finalCaption || "";

  return `You are an expert social media post writer for small businesses in Sri Lanka.

Inputs:
- Business Name: ${details.businessName}
- Business Type: ${details.businessType}
- Location: ${details.location}
- Products/Services: ${details.productsOrServices}
- Target Customers: ${details.targetCustomers}
- Selected Day Plan: ${dayPlan}
- Poster Image/Photo Context: ${photoContext}
- Offer/Promotion: ${offer}
- Tone: ${tone}
- Preferred Language: ${details.language || "English"}
- User-approved base caption (must be respected and preserved as the core message):
"""
${finalCaption}
"""

Task:
Using the user-approved caption as the base, polish it and compose a final, complete social media post that is ready to publish on Facebook and Instagram. Do not rewrite the caption from scratch — keep its core message and style, and only lightly refine grammar, clarity, and flow.

The final post must combine:
- A short product/service highlight (1 line)
- The refined caption (keep user's meaning)
- A clear, simple call-to-action (1 line)

Rules:
- Keep the post short, natural, and easy to read.
- Professional and suitable for small businesses in Sri Lanka.
- Use only 1-3 suitable emojis total.
- Provide 3-6 relevant hashtags (match business type + location + Sri Lanka).
- Do NOT write long explanations.
- Do NOT describe the photo.
- Do NOT output any extra commentary before or after the required sections.
- Match the writing language to: ${details.language || "English"}.

Output format (strict, no extra text before or after):
Caption:
<final ready-to-post caption, including the short highlight at the top, refined caption body, and call-to-action at the end. Keep it compact and readable.>

Hashtags:
<3 to 6 hashtags separated by spaces, each starting with #>`;
}

function buildPosterCaptionPrompt(details: BusinessDetails): string {
  const dayPlan = details.dayPlan || "General promotional post for today";
  const photoContext = details.photoContext || "A real photo uploaded by the business";
  const offer = details.offer || "No specific offer";
  const tone = details.tone || "Friendly and professional";

  return `You are an expert social media caption writer for small businesses in Sri Lanka.

Inputs:
- Business Name: ${details.businessName}
- Business Type: ${details.businessType}
- Location: ${details.location}
- Products/Services: ${details.productsOrServices}
- Target Customers: ${details.targetCustomers}
- Selected Day Plan: ${dayPlan}
- Poster Image/Photo Context: ${photoContext}
- Offer/Promotion: ${offer}
- Tone: ${tone}
- Preferred Language: ${details.language || "English"}

Task:
Create a short, attractive caption that matches the selected day's marketing plan and the user's real photo.

Rules:
- Caption must be short and natural.
- Must match the purpose of the selected day plan.
- Must be suitable for Facebook and Instagram posting.
- Mention the product/service clearly.
- Include a simple call-to-action.
- Use 1-3 suitable emojis only.
- Add 3-6 relevant hashtags.
- Do not write long explanations.
- Do not generate a full marketing plan.
- Do not describe the photo too much.
- Make it practical for a small business in Sri Lanka.
- Match the writing language to: ${details.language || "English"}.

Output format (strict, no extra text before or after):
Caption:
<short caption text here>

Hashtags:
<3 to 6 hashtags separated by spaces>`;
}

function buildSocialPostPrompt(details: BusinessDetails): string {
  const offer = details.offer || "No specific offer";
  const marketingGoal = details.marketingGoal || details.businessGoal || "Attract more customers";
  const tone = details.tone || "Friendly and professional";

  return `You are an expert social media copywriter for small businesses in Sri Lanka.

Business details:
- Business Name: ${details.businessName}
- Business Type: ${details.businessType}
- Location: ${details.location}
- Products/Services: ${details.productsOrServices}
- Target Customers: ${details.targetCustomers}
- Offer/Discount: ${offer}
- Marketing Goal: ${marketingGoal}
- Tone: ${tone}
- Preferred Language: ${details.language || "English"}

Task:
Generate a social media-ready post based on the business details above.

Output must include these sections, with clear headings:
1. Catchy headline
2. Attractive social media caption
3. Short product/service description
4. Clear call-to-action
5. Relevant hashtags
6. Suggested poster text
7. Poster visual idea

Rules:
- Caption must be suitable for Facebook and Instagram posting.
- Keep it short, attractive, and easy to read.
- Make it suitable for small businesses in Sri Lanka.
- Use emojis only where suitable (do not overuse).
- Hashtags must match the business type and location (include Sri Lanka and city tags).
- Poster text must be short and clean.
- Do not include unnecessary long explanations.
- Match the writing language to: ${details.language || "English"}.`;
}

function buildPosterPrompt(details: BusinessDetails): string {
  return `You are an expert creative strategist and ad copywriter for small businesses in Sri Lanka.

Business details:
- Business Name: ${details.businessName}
- Industry / Business Type: ${details.businessType}
- Location: ${details.location}
- Products or Services: ${details.productsOrServices}
- Target Customers: ${details.targetCustomers}
- Business Goal: ${details.businessGoal}
- Budget Level: ${details.budget}
- Preferred Language: ${details.language || "English"}

Task:
Generate a professional poster concept and ready-to-use poster copy based on the business details.

Output requirements:
- Use clear headings and concise bullet points.
- Keep the concept practical and suitable for social media/local promotions in Sri Lanka.
- Match the writing language to: ${details.language || "English"}.
- Keep text persuasive but simple and clear.

The output must include:
1. Main headline
2. Short promotional caption
3. Offer text (if available from the business goal/products)
4. Call to action
5. Poster layout idea
6. Suggested colors
7. Suggested font style
8. Image/visual idea
9. Final ready-to-use poster text`;
}

function clampHex(input: unknown, fallback: string): string {
  const value = typeof input === "string" ? input.trim() : "";
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function parsePosterDesign(raw: string, details: BusinessDetails): PosterDesign | null {
  const stripped = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  const jsonSlice = stripped.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(jsonSlice) as Partial<PosterDesign>;
    const parsedStyle = (POSTER_STYLES as readonly string[]).includes(String(parsed.style))
      ? (parsed.style as PosterStyle)
      : "bold-statement";
    const style: PosterStyle = details.lockedStyle ? (details.lockedStyle as PosterStyle) : parsedStyle;
    const overlayRaw = typeof parsed.overlay === "string" ? parsed.overlay.toLowerCase() : "dark";
    const overlay = overlayRaw === "light" || overlayRaw === "none" ? overlayRaw : "dark";

    let accentColor = clampHex(parsed.accentColor, "#E11D48");
    if (
      details.avoidAccentColor &&
      accentColor.toLowerCase() === details.avoidAccentColor.toLowerCase()
    ) {
      const fallbackPalette = ["#E11D48", "#0EA5E9", "#7C3AED", "#F59E0B", "#22D3EE", "#D4AF37", "#EF4444", "#10B981"];
      accentColor =
        fallbackPalette.find((hex) => hex.toLowerCase() !== details.avoidAccentColor?.toLowerCase()) || accentColor;
    }

    return {
      style,
      brandName: cleanString(parsed.brandName) || details.businessName,
      headline: cleanString(parsed.headline) || "NEW ARRIVAL",
      subheadline: cleanString(parsed.subheadline),
      offerBadge: cleanString(parsed.offerBadge),
      ctaLabel: cleanString(parsed.ctaLabel) || "BUY NOW",
      accentColor,
      textColor: clampHex(parsed.textColor, "#FFFFFF"),
      overlay,
    };
  } catch (error) {
    console.error("[api/ai/generate] parsePosterDesign error:", error);
    return null;
  }
}

/** Sanity check: GET /api/ai/generate → { ok: true } */
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.error("[api/ai/generate] Invalid JSON body");
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateBody(body);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.message }, { status: 400 });
  }

  let prompt: string;
  switch (validated.type) {
    case "marketing-plan":
      prompt = buildMarketingPlanPrompt(validated.businessDetails);
      break;
    case "social-post":
      prompt = buildSocialPostPrompt(validated.businessDetails);
      break;
    case "poster-caption":
      prompt = buildPosterCaptionPrompt(validated.businessDetails);
      break;
    case "final-post":
      prompt = buildFinalPostPrompt(validated.businessDetails);
      break;
    case "poster-design":
      prompt = buildPosterDesignPrompt(validated.businessDetails);
      break;
    case "poster":
    default:
      prompt = buildPosterPrompt(validated.businessDetails);
      break;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error("[api/ai/generate] GEMINI_API_KEY is not set (check apps/web/.env.local and restart dev server)");
    return NextResponse.json({ ok: false, error: "GEMINI_API_KEY is not set" }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelCandidates = resolveModelCandidates();

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const isOverloadedError = (message: string) =>
    /503|overload|service unavailable|high demand|rate limit|429|quota|temporarily/i.test(message);
  const isModelNotFoundError = (message: string) =>
    /not found|not supported|unsupported model|404/i.test(message);

  const MAX_RETRIES_PER_MODEL = 2;
  const RETRY_DELAYS_MS = [800, 1800];

  let lastError: unknown = null;
  let lastErrorMessage = "";

  const expectJson = validated.type === "poster-design";

  for (const modelName of modelCandidates) {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: expectJson
            ? { responseMimeType: "application/json" }
            : undefined,
        });
        const result = await model.generateContent(prompt);

        let text = "";
        try {
          const raw = result.response.text();
          text = typeof raw === "string" ? raw.trim() : "";
        } catch (extractErr) {
          console.error(`[api/ai/generate] Failed to read text from model ${modelName}:`, extractErr);
          lastError = extractErr;
          lastErrorMessage = extractErr instanceof Error ? extractErr.message : String(extractErr);
          break;
        }

        if (!text) {
          console.error(`[api/ai/generate] Empty text from model ${modelName}`);
          lastError = new Error(`Empty text from model ${modelName}`);
          lastErrorMessage = `Empty text from model ${modelName}`;
          break;
        }

        if (expectJson) {
          const design = parsePosterDesign(text, validated.businessDetails);
          if (!design) {
            console.error(`[api/ai/generate] Failed to parse poster-design JSON from ${modelName}`);
            lastError = new Error("Failed to parse poster design JSON");
            lastErrorMessage = "Failed to parse poster design JSON";
            break;
          }
          return NextResponse.json({ ok: true, text, design, model: modelName });
        }

        return NextResponse.json({ ok: true, text, model: modelName });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[api/ai/generate] Gemini error on model ${modelName} (attempt ${attempt + 1}):`,
          message,
        );
        lastError = error;
        lastErrorMessage = message;

        if (isOverloadedError(message) && attempt < MAX_RETRIES_PER_MODEL) {
          await sleep(RETRY_DELAYS_MS[attempt] ?? 1500);
          continue;
        }

        if (isOverloadedError(message) || isModelNotFoundError(message)) {
          break;
        }

        return NextResponse.json(
          { ok: false, error: `Gemini generation failed: ${message}` },
          { status: 500 },
        );
      }
    }
  }

  const userMessage = isOverloadedError(lastErrorMessage)
    ? "AI service is busy right now. Please try again in a few seconds."
    : `Gemini generation failed: ${
        lastError instanceof Error ? lastError.message : "Unknown Gemini error"
      }`;
  const statusCode = isOverloadedError(lastErrorMessage) ? 503 : 500;

  return NextResponse.json({ ok: false, error: userMessage }, { status: statusCode });
}
