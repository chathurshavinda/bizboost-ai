import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { computeProgress, normalizePlanDocument } from "@/src/lib/marketingPlan";

type CompleteDayRequest = {
  firebase_uid?: string;
  planId?: string;
  dayNumber?: number;
  completed?: boolean;
};

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as CompleteDayRequest;
    const firebase_uid = typeof body.firebase_uid === "string" ? body.firebase_uid.trim() : "";
    const dayNumber = Number(body.dayNumber);
    const completed = Boolean(body.completed);

    if (!firebase_uid) {
      return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
    }
    if (!Number.isInteger(dayNumber) || dayNumber <= 0) {
      return NextResponse.json({ ok: false, error: "valid dayNumber is required" }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection("marketing_plans");

    const query: Record<string, unknown> = { firebase_uid };
    if (typeof body.planId === "string" && ObjectId.isValid(body.planId)) {
      query._id = new ObjectId(body.planId);
    } else {
      query.status = "active";
    }

    const existing = await collection.findOne(query, { sort: { createdAt: -1, generatedAt: -1 } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "plan_not_found" }, { status: 404 });
    }

    const plan = normalizePlanDocument(existing as Record<string, unknown>);
    if (!plan) {
      return NextResponse.json({ ok: false, error: "plan_not_found" }, { status: 404 });
    }

    const nextDays = plan.planDays.map((day) => {
      if (day.dayNumber !== dayNumber) return day;
      return {
        ...day,
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
      };
    });

    const progress = computeProgress(nextDays);
    const status = progress.completedCount === nextDays.length ? "completed" : "active";
    const updatedAt = new Date().toISOString();

    await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          planDays: nextDays,
          planData: nextDays,
          progress,
          status,
          completedDays: nextDays.filter((day) => day.completed).map((day) => day.dayNumber),
          updatedAt,
        },
      },
    );

    const updated = await collection.findOne({ _id: existing._id });
    const normalizedUpdated = normalizePlanDocument(updated as Record<string, unknown>);
    console.log("[marketing-plan/day-complete]", { firebase_uid, dayNumber, completed, status });
    return NextResponse.json({ ok: true, plan: normalizedUpdated }, { status: 200 });
  } catch (error) {
    console.error("marketing-plan day-complete error:", error);
    return NextResponse.json({ ok: false, error: "Failed to update day completion" }, { status: 500 });
  }
}

// Quick test checklist:
// - PATCH toggles a day and updates plan.progress.
// - Completing all days sets plan.status to completed.
// - Invalid dayNumber or missing uid returns 400.
