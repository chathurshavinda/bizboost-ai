import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizePlanDocument } from "@/src/lib/marketingPlan";
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const firebase_uid = searchParams.get("firebase_uid")?.trim() ?? "";
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        const db = await getDb();
        const plans = await db
            .collection("marketing_plans")
            .find({ firebase_uid })
            .sort({ createdAt: -1, generatedAt: -1 })
            .toArray();
        const normalized = plans
            .map((plan) => normalizePlanDocument(plan as Record<string, unknown>))
            .filter((plan) => Boolean(plan));
        return NextResponse.json({ ok: true, plans: normalized }, { status: 200 });
    }
    catch (error) {
        console.error("marketing-plan history error:", error);
        return NextResponse.json({ ok: false, error: "Failed to fetch marketing plan history" }, { status: 500 });
    }
}
