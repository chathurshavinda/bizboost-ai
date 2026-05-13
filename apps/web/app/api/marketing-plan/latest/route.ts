export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { documentLooksGenerated, normalizePlanDocument } from "@/src/lib/marketingPlan";

/** Any saved row that came from Plan Builder (generate), not skeleton `/create`. */
function generatedPlanFilter(firebase_uid: string) {
    return {
        firebase_uid,
        $or: [
            { generatedAt: { $exists: true, $ne: null } },
            { templateVersion: { $exists: true, $nin: [null, ""] } },
            { narrativePlan: { $regex: /\S/ } },
            { aiBusinessPlan: { $exists: true, $ne: null } },
        ],
    };
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const firebase_uid = searchParams.get("firebase_uid")?.trim() ?? "";
        const planId = searchParams.get("planId")?.trim() ?? "";
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        const db = await getDb();
        const collection = db.collection("marketing_plans");

        const hasGeneratedPlan = !!(await collection.findOne(generatedPlanFilter(firebase_uid), {
            projection: { _id: 1 },
        }));

        let latestAny: Record<string, unknown> | null = null;

        if (planId && ObjectId.isValid(planId)) {
            latestAny = (await collection.findOne({
                _id: new ObjectId(planId),
                firebase_uid,
            })) as Record<string, unknown> | null;
        }
        else {
            const active = (await collection.findOne(
                { firebase_uid, status: "active" },
                { sort: { updatedAt: -1, generatedAt: -1, createdAt: -1 } },
            )) as Record<string, unknown> | null;

            if (active && documentLooksGenerated(active)) {
                latestAny = active;
            }
            else if (active && !documentLooksGenerated(active) && hasGeneratedPlan) {
                const generated = (await collection.findOne(generatedPlanFilter(firebase_uid), {
                    sort: { generatedAt: -1, updatedAt: -1, createdAt: -1 },
                })) as Record<string, unknown> | null;
                latestAny = generated ?? active;
            }
            else if (active) {
                latestAny = active;
            }
            else {
                latestAny = (await collection.findOne(
                    { firebase_uid },
                    { sort: { createdAt: -1, generatedAt: -1, updatedAt: -1 } },
                )) as Record<string, unknown> | null;
            }
        }

        if (!latestAny) {
            return NextResponse.json({ ok: true, plan: null, data: null, hasGeneratedPlan }, { status: 200 });
        }
        const plan = normalizePlanDocument(latestAny as Record<string, unknown>);
        if (!plan) {
            return NextResponse.json({ ok: true, plan: null, data: null, hasGeneratedPlan }, { status: 200 });
        }
        return NextResponse.json({
            ok: true,
            hasGeneratedPlan,
            plan,
            data: {
                ...plan,
                planDays: plan.durationDays,
                planData: plan.planDays,
                completedDays: plan.planDays.filter((day) => day.completed).map((day) => day.dayNumber),
            },
        });
    }
    catch (error) {
        console.error("latest marketing plan error:", error);
        return NextResponse.json({ ok: false, error: "Failed to fetch latest plan" }, { status: 500 });
    }
}
