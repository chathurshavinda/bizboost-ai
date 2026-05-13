import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isPlanDays, planPeriodMs, type PlanDays } from "@/lib/payhere";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * DEV-ONLY shortcut to simulate a successful PayHere `notify` callback for an
 * order. Use this when the PayHere server cannot reach your machine (e.g. you
 * are running on localhost without ngrok). It performs the exact same DB
 * writes as `/api/payhere/notify` does on `status === "success"`.
 *
 * This endpoint is disabled when NODE_ENV === "production" unless the env var
 * PAYHERE_ALLOW_DEV_CONFIRM === "1". Never enable that flag in production.
 */
function devConfirmEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.PAYHERE_ALLOW_DEV_CONFIRM === "1";
}

type DevConfirmPayload = {
  firebase_uid?: string;
  order_id?: string;
};

export async function POST(req: Request) {
  if (!devConfirmEnabled()) {
    return NextResponse.json(
      { ok: false, error: "dev_confirm_disabled" },
      { status: 403 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as DevConfirmPayload;
    const firebase_uid = body.firebase_uid?.trim() ?? "";
    const order_id = body.order_id?.trim() ?? "";

    if (!firebase_uid || !order_id) {
      return NextResponse.json(
        { ok: false, error: "firebase_uid and order_id are required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const order = (await db
      .collection("payhere_orders")
      .findOne({ order_id })) as Record<string, unknown> | null;

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "order_not_found" },
        { status: 404 },
      );
    }

    if (order.firebase_uid !== firebase_uid) {
      return NextResponse.json(
        { ok: false, error: "order_mismatch" },
        { status: 403 },
      );
    }

    const planDaysRaw = Number(order.planDays ?? 0);
    if (!isPlanDays(planDaysRaw)) {
      return NextResponse.json(
        { ok: false, error: "invalid_plan_days" },
        { status: 400 },
      );
    }
    const planDays: PlanDays = planDaysRaw;
    const amountNumber =
      typeof order.amount === "number" ? order.amount : Number(order.amount);
    const currency = (typeof order.currency === "string" && order.currency
      ? order.currency
      : "LKR") as string;

    const now = new Date();
    const nextRenewalAt = new Date(now.getTime() + planPeriodMs(planDays));

    await db.collection("payhere_orders").updateOne(
      { order_id },
      {
        $set: {
          status: "success",
          status_code: "2",
          status_message: "DEV_CONFIRM (simulated notify)",
          payhere_amount: Number.isFinite(amountNumber) ? amountNumber : amountNumber,
          payhere_currency: currency,
          updatedAt: now,
        },
      },
    );

    await db.collection("payhere_events").insertOne({
      event_id: null,
      order_id,
      payment_id: null,
      subscription_id: null,
      firebase_uid,
      planDays,
      status: "success",
      status_code: "2",
      status_message: "DEV_CONFIRM (simulated notify)",
      method: "DEV",
      amount: Number.isFinite(amountNumber) ? amountNumber : null,
      currency,
      receivedAt: now,
      source: "dev_confirm",
    });

    await db.collection("subscriptions").updateOne(
      { firebase_uid },
      {
        $set: {
          firebase_uid,
          planDays,
          status: "active",
          amount: Number.isFinite(amountNumber) ? amountNumber : null,
          currency,
          method: "DEV",
          lastOrderId: order_id,
          lastPaymentId: null,
          payhere_subscription_id: null,
          lastPaidAt: now,
          nextRenewalAt,
          updatedAt: now,
          devConfirmed: true,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    const planName = `${planDays} Day Plan`;
    await db.collection("selected_plans").updateOne(
      { firebase_uid },
      {
        $set: {
          firebase_uid,
          planDays,
          nextPlanDays: planDays,
          selectionMode: "paid",
          planName,
          price: Number.isFinite(amountNumber) ? amountNumber : undefined,
          currency,
          lastOrderId: order_id,
          lastPaymentId: null,
          selectedAt: now,
          updatedAt: now,
          devConfirmed: true,
        },
      },
      { upsert: true },
    );

    await db.collection("subscription_payments").insertOne({
      firebase_uid,
      planDays,
      order_id,
      payment_id: null,
      payhere_subscription_id: null,
      amount: Number.isFinite(amountNumber) ? amountNumber : null,
      currency,
      method: "DEV",
      status: "success",
      status_code: "2",
      paidAt: now,
      devConfirmed: true,
    });

    return NextResponse.json({
      ok: true,
      message: "Subscription activated via dev-confirm.",
      planDays,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("POST /api/payhere/dev-confirm failed:", message, error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
