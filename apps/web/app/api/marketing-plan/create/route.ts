import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { buildDateRange, buildLifecyclePlanDays, computeProgress, normalizePlanDocument } from "@/src/lib/marketingPlan";

type CreatePlanRequest = {
  firebase_uid?: string;
  durationDays?: number;
  businessProfile?: Record<string, unknown>;
};

function buildFallbackPlan(durationDays: 7 | 14 | 30) {
  return Array.from({ length: durationDays }, (_, index) => {
    const dayNumber = index + 1;
    return {
      dayNumber,
      mainActionTitle: `Day ${dayNumber} growth focus`,
      businessGrowthAction: "Complete one practical business task that moves leads, sales, or retention — then support it with a simple post.",
      executionSteps: [
        "Pick one measurable outcome for today (leads, orders, bookings, or reviews).",
        "Execute the top business action from your saved plan or checklist.",
        "Log results in a notebook or sheet for next-week review.",
      ],
      postIdea: "One short post or customer story that backs up today’s business action.",
      caption: "Today we’re focused on delivering real value to customers. Message us if you need help.",
      hashtags: ["#SmallBusiness", "#BusinessGrowth", "#BizBoostAI"],
      posterHint: "",
      successMetric: "One concrete business outcome (sale, lead, booking, or review), not likes alone.",
    };
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatePlanRequest;
    const firebase_uid = typeof body.firebase_uid === "string" ? body.firebase_uid.trim() : "";
    const durationDays = Number(body.durationDays);

    if (!firebase_uid) {
      return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
    }
    if (durationDays !== 7 && durationDays !== 14 && durationDays !== 30) {
      return NextResponse.json({ ok: false, error: "durationDays must be 7, 14, or 30" }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection("marketing_plans");
    const now = new Date().toISOString();

    await collection.updateMany(
      { firebase_uid, status: "active" },
      { $set: { status: "archived", updatedAt: now } },
    );

    const latest = await collection.findOne({ firebase_uid }, { sort: { createdAt: -1, generatedAt: -1 } });
    const previousPlanData = Array.isArray((latest as Record<string, unknown> | null)?.planData)
      ? ((latest as Record<string, unknown>).planData as Array<Record<string, unknown>>)
      : Array.isArray((latest as Record<string, unknown> | null)?.planDays)
        ? ((latest as Record<string, unknown>).planDays as Array<Record<string, unknown>>)
        : [];
    const sourceDays = previousPlanData.length > 0 ? previousPlanData : buildFallbackPlan(durationDays as 7 | 14 | 30);

    const { startDate, endDate } = buildDateRange(durationDays as 7 | 14 | 30);
    const planDays = buildLifecyclePlanDays(sourceDays, durationDays as 7 | 14 | 30, startDate);
    const progress = computeProgress(planDays);

    const createdPlan = {
      firebase_uid,
      status: "active" as const,
      durationDays: durationDays as 7 | 14 | 30,
      startDate,
      endDate,
      createdAt: now,
      updatedAt: now,
      planDays,
      planData: planDays,
      progress,
      businessSnapshot: body.businessProfile ?? null,
    };

    await collection.insertOne(createdPlan);
    const normalized = normalizePlanDocument(createdPlan as unknown as Record<string, unknown>);

    console.log("[marketing-plan/create] created plan", { firebase_uid, durationDays });
    return NextResponse.json({ ok: true, plan: normalized }, { status: 200 });
  } catch (error) {
    console.error("marketing-plan create error:", error);
    return NextResponse.json({ ok: false, error: "Failed to create marketing plan" }, { status: 500 });
  }
}

// Quick test checklist:
// - Creating a plan archives previous active plan.
// - New plan has status=active with computed start/end dates.
// - durationDays only accepts 7, 14, 30.
