export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { computeProgress, normalizePlanDocument } from "@/src/lib/marketingPlan";
type CompleteDayRequest = {
    firebase_uid?: string;
    dayNumber?: number;
    completed?: boolean;
};
export async function POST(req: Request) {
    try {
        const body = (await req.json()) as CompleteDayRequest;
        const firebase_uid = body.firebase_uid?.trim() ?? "";
        const dayNumber = Number(body.dayNumber);
        const completed = typeof body.completed === "boolean" ? body.completed : true;
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        if (!Number.isInteger(dayNumber) || dayNumber <= 0) {
            return NextResponse.json({ ok: false, error: "valid dayNumber is required" }, { status: 400 });
        }
        const db = await getDb();
        const collection = db.collection("marketing_plans");
        const latest = await collection.findOne({ firebase_uid, status: "active" }, { sort: { createdAt: -1, generatedAt: -1 } });
        if (!latest) {
            return NextResponse.json({ ok: false, error: "no_plan_found" }, { status: 404 });
        }
        const plan = normalizePlanDocument(latest as Record<string, unknown>);
        if (!plan) {
            return NextResponse.json({ ok: false, error: "no_plan_found" }, { status: 404 });
        }
        const nextDays = plan.planDays.map((day) => day.dayNumber === dayNumber
            ? { ...day, completed, completedAt: completed ? new Date().toISOString() : undefined }
            : day);
        const progress = computeProgress(nextDays);
        const nextStatus = progress.completedCount === nextDays.length ? "completed" : "active";
        const completedDays = nextDays.filter((day) => day.completed).map((day) => day.dayNumber);
        await collection.updateOne({ _id: latest._id }, {
            $set: {
                planDays: nextDays,
                planData: nextDays,
                progress,
                status: nextStatus,
                completedDays,
                updatedAt: new Date().toISOString(),
            },
        });
        return NextResponse.json({
            ok: true,
            data: {
                completedDays,
                dayNumber,
                completed,
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error("complete marketing plan day error:", error);
        return NextResponse.json({ ok: false, error: "Failed to complete day" }, { status: 500 });
    }
}
