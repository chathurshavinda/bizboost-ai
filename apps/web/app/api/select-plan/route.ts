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
export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as SelectPlanPayload;
        const firebase_uid = payload.firebase_uid?.trim();
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        const planDays = Number(payload.planDays);
        const nextPlanDays = Number(payload.nextPlanDays ?? payload.planDays);
        if (![7, 14, 30].includes(planDays)) {
            return NextResponse.json({ ok: false, error: "planDays must be 7, 14, or 30" }, { status: 400 });
        }
        if (![7, 14, 30].includes(nextPlanDays)) {
            return NextResponse.json({ ok: false, error: "nextPlanDays must be 7, 14, or 30" }, { status: 400 });
        }
        const selectedAt = payload.selectedAt ? new Date(payload.selectedAt) : new Date();
        const safeSelectedAt = Number.isNaN(selectedAt.getTime()) ? new Date() : selectedAt;
        const updatedAt = new Date();
        const defaultPlanName = `${planDays} Day Plan`;
        const doc = {
            firebase_uid,
            planDays,
            nextPlanDays,
            selectionMode: payload.mode === "new" ? "new" : "default",
            planName: payload.planName ?? defaultPlanName,
            price: typeof payload.price === "number" ? payload.price : undefined,
            selectedAt: safeSelectedAt,
            updatedAt,
        };
        const db = await getDb();
        await db.collection("selected_plans").updateOne({ firebase_uid }, {
            $set: doc,
        }, { upsert: true });
        return NextResponse.json({
            ok: true,
            data: {
                firebase_uid: doc.firebase_uid,
                planDays: doc.planDays,
                nextPlanDays: doc.nextPlanDays,
                planName: doc.planName,
                price: doc.price,
                selectedAt: doc.selectedAt,
            },
        }, { status: 200 });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
