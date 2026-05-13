export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizePlanDocument } from "@/src/lib/marketingPlan";
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const firebase_uid = searchParams.get("firebase_uid")?.trim() ?? "";
        const mode = searchParams.get("mode")?.trim() ?? "";
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        const db = await getDb();
        const existing = await db
            .collection("marketing_plans")
            .findOne({ firebase_uid, status: "active" }, { sort: { createdAt: -1, generatedAt: -1 } });
        if (!existing) {
            return NextResponse.json({ ok: true, todayTask: null, state: "no_active_plan", planId: null }, { status: 200 });
        }
        const plan = normalizePlanDocument(existing as Record<string, unknown>);
        if (!plan) {
            return NextResponse.json({ ok: true, todayTask: null, state: "no_active_plan", planId: null }, { status: 200 });
        }
        const todayISO = new Date().toISOString().slice(0, 10);
        const todayMatch = plan.planDays.find((day) => day.dateISO === todayISO) ?? null;
        if (todayMatch) {
            if (mode === "next" && todayMatch.completed) {
                const nextIncomplete = plan.planDays.find((day) => !day.completed && day.dayNumber > todayMatch.dayNumber) ??
                    plan.planDays.find((day) => !day.completed) ??
                    null;
                return NextResponse.json({
                    ok: true,
                    todayTask: nextIncomplete,
                    state: nextIncomplete ? "next_incomplete" : "all_completed",
                    planId: String(plan._id ?? ""),
                });
            }
            return NextResponse.json({
                ok: true,
                todayTask: todayMatch,
                state: todayMatch.completed ? "done_today" : "todo",
                planId: String(plan._id ?? ""),
            });
        }
        const nextIncomplete = plan.planDays.find((day) => !day.completed) ?? null;
        return NextResponse.json({
            ok: true,
            todayTask: nextIncomplete,
            state: nextIncomplete ? "next_incomplete" : "all_completed",
            planId: String(plan._id ?? ""),
        });
    }
    catch (error) {
        console.error("marketing-plan today-task error:", error);
        return NextResponse.json({ ok: false, error: "Failed to fetch today task" }, { status: 500 });
    }
}
