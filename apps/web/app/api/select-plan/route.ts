export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
type SelectPlanPayload = {
    firebase_uid?: string;
    planDays?: number;
    nextPlanDays?: number;
    mode?: string;
    planName?: string;
    price?: number;
    selectedAt?: string;
};
export async function GET(req: Request) {
    try {
        const firebase_uid = new URL(req.url).searchParams.get("firebase_uid")?.trim();
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        const db = await getDb();
        const selectedPlan = await db.collection("selected_plans").findOne({ firebase_uid }, { sort: { updatedAt: -1, selectedAt: -1 } });
        if (!selectedPlan) {
            return NextResponse.json({ ok: false, error: "No plan selected" }, { status: 404 });
        }
        const createdAtRaw = selectedPlan.selectedAt ?? selectedPlan.updatedAt ?? new Date();
        const createdAt = createdAtRaw instanceof Date
            ? createdAtRaw.toISOString()
            : typeof createdAtRaw === "string"
                ? createdAtRaw
                : new Date(createdAtRaw).toISOString();
        return NextResponse.json({
            ok: true,
            data: {
                firebase_uid: selectedPlan.firebase_uid,
                plan_days: selectedPlan.planDays,
                next_plan_days: selectedPlan.nextPlanDays ?? null,
                plan_name: selectedPlan.planName,
                created_at: createdAt,
            },
        }, { status: 200 });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
/**
 * Plan selection on /select-plan is now UI-only. The chosen plan is persisted
 * by the PayHere notify route after a successful payment, so this endpoint
 * intentionally rejects writes from the client.
 */
export async function POST() {
    return NextResponse.json(
        {
            ok: false,
            error: "plan_selection_requires_payment",
            message: "Selecting a plan does not save it. Complete PayHere checkout to activate your plan.",
        },
        { status: 405 },
    );
}
