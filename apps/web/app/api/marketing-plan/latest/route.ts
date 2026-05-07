import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { normalizePlanDocument } from "@/src/lib/marketingPlan";
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
        const latestAny = planId && ObjectId.isValid(planId)
            ? await collection.findOne({ _id: new ObjectId(planId), firebase_uid })
            : (await collection.findOne({ firebase_uid, status: "active" }, { sort: { createdAt: -1, generatedAt: -1 } })) ??
                (await collection.findOne({ firebase_uid }, { sort: { createdAt: -1, generatedAt: -1 } }));
        if (!latestAny) {
            return NextResponse.json({ ok: true, plan: null, data: null }, { status: 200 });
        }
        const plan = normalizePlanDocument(latestAny as Record<string, unknown>);
        if (!plan) {
            return NextResponse.json({ ok: true, plan: null, data: null }, { status: 200 });
        }
        return NextResponse.json({
            ok: true,
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
