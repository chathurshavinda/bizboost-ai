import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
type SuccessScoreRequest = {
    firebase_uid?: string;
    businessProfile?: Record<string, unknown>;
    dayPlan?: Record<string, unknown>;
    planContext?: Record<string, unknown>;
    recalculate?: boolean;
};
type SuccessScoreResult = {
    successPercent: number;
    reasons: string[];
    improvements: string[];
};
const MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-pro-latest"];
function resolveModels(): string[] {
    const fromEnv = process.env.GEMINI_MODEL?.trim();
    if (!fromEnv)
        return MODEL_CANDIDATES;
    return [fromEnv, ...MODEL_CANDIDATES.filter((model) => model !== fromEnv)];
}
function toInt(value: unknown, fallback = 0): number {
    const n = Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.round(n);
}
function clampPercent(value: unknown): number {
    const n = toInt(value, 0);
    if (n < 0)
        return 0;
    if (n > 100)
        return 100;
    return n;
}
function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value))
        return [];
    return value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .slice(0, 3);
}
function parseGeminiJson(raw: string): SuccessScoreResult | null {
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first < 0 || last <= first)
        return null;
    const jsonSlice = cleaned.slice(first, last + 1);
    try {
        const parsed = JSON.parse(jsonSlice) as Partial<SuccessScoreResult>;
        const successPercent = clampPercent(parsed.successPercent);
        const reasons = asStringArray(parsed.reasons);
        const improvements = asStringArray(parsed.improvements);
        return {
            successPercent,
            reasons: reasons.length > 0 ? reasons : ["Business context is partially complete, so expected outcome is moderate."],
            improvements: improvements.length > 0
                ? improvements
                : ["Tighten today’s execution timing and track results before day end."],
        };
    }
    catch {
        return null;
    }
}
function buildPrompt(businessProfile: Record<string, unknown>, dayPlan: Record<string, unknown>, planContext: Record<string, unknown>): string {
    return `You are a practical SME growth evaluator.

Evaluate the likelihood that today's plan will succeed for this business.
This is NOT a checklist completion score.
Focus on real business outcomes: sales, leads, bookings, retention, conversion, customer trust.

Business Profile JSON:
${JSON.stringify(businessProfile, null, 2)}

Day Plan JSON:
${JSON.stringify(dayPlan, null, 2)}

Plan Context JSON:
${JSON.stringify(planContext, null, 2)}

Rules:
- Return successPercent as an integer 0-100.
- Return 2-3 short reasons why the score is high/low.
- Return 2-3 practical improvements to raise success chance.
- Keep language simple and business practical.
- Do not focus only on social media.
- Output strict JSON only (no markdown).

Output format:
{
  "successPercent": 0,
  "reasons": ["..."],
  "improvements": ["..."]
}`;
}
export async function POST(req: Request) {
    try {
        const body = (await req.json()) as SuccessScoreRequest;
        const firebase_uid = typeof body.firebase_uid === "string" ? body.firebase_uid.trim() : "";
        const businessProfile = body.businessProfile && typeof body.businessProfile === "object" ? body.businessProfile : {};
        const dayPlan = body.dayPlan && typeof body.dayPlan === "object" ? body.dayPlan : {};
        const planContext = body.planContext && typeof body.planContext === "object" ? body.planContext : {};
        const recalculate = body.recalculate === true;
        const dayNumber = toInt((planContext as Record<string, unknown>).dayNumber, 0);
        const planId = String((planContext as Record<string, unknown>).planId ?? "").trim();
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        if (!planId || dayNumber <= 0) {
            return NextResponse.json({ ok: false, error: "planContext.planId and dayNumber are required" }, { status: 400 });
        }
        const db = await getDb();
        const collection = db.collection("ai_success_scores");
        if (!recalculate) {
            const cached = await collection.findOne({ firebase_uid, planId, dayNumber });
            if (cached) {
                return NextResponse.json({
                    ok: true,
                    cached: true,
                    data: {
                        successPercent: clampPercent((cached as Record<string, unknown>).successPercent),
                        reasons: asStringArray((cached as Record<string, unknown>).reasons),
                        improvements: asStringArray((cached as Record<string, unknown>).improvements),
                    },
                });
            }
        }
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        if (!apiKey) {
            return NextResponse.json({ ok: false, error: "GEMINI_API_KEY is not set" }, { status: 500 });
        }
        const prompt = buildPrompt(businessProfile, dayPlan, planContext);
        const client = new GoogleGenerativeAI(apiKey);
        const models = resolveModels();
        let parsed: SuccessScoreResult | null = null;
        let lastError = "";
        for (const modelName of models) {
            try {
                const model = client.getGenerativeModel({
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" },
                });
                const result = await model.generateContent(prompt);
                const raw = result.response.text();
                parsed = parseGeminiJson(raw);
                if (parsed)
                    break;
            }
            catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
            }
        }
        if (!parsed) {
            return NextResponse.json({ ok: false, error: lastError || "Failed to generate success score" }, { status: 500 });
        }
        const now = new Date().toISOString();
        await collection.updateOne({ firebase_uid, planId, dayNumber }, {
            $set: {
                firebase_uid,
                planId,
                dayNumber,
                successPercent: parsed.successPercent,
                reasons: parsed.reasons,
                improvements: parsed.improvements,
                businessProfileSnapshot: businessProfile,
                dayPlanSnapshot: dayPlan,
                updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
        }, { upsert: true });
        return NextResponse.json({ ok: true, cached: false, data: parsed });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
