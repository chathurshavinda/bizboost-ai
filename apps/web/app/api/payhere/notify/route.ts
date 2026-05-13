import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  isPlanDays,
  mapStatusCode,
  planPeriodMs,
  verifyNotificationSignature,
  type PlanDays,
} from "@/lib/payhere";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return value === null ? "" : value.toString();
}

export async function POST(req: Request) {
  try {
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET?.trim();
    if (!merchantSecret) {
      console.error("[payhere/notify] PAYHERE_MERCHANT_SECRET not configured");
      return new NextResponse("PayHere not configured", { status: 500 });
    }

    const formData = await req.formData();
    const merchant_id = readField(formData, "merchant_id");
    const order_id = readField(formData, "order_id");
    const payment_id = readField(formData, "payment_id");
    const payhere_amount = readField(formData, "payhere_amount");
    const payhere_currency = readField(formData, "payhere_currency");
    const status_code = readField(formData, "status_code");
    const md5sig = readField(formData, "md5sig");
    const custom_1 = readField(formData, "custom_1");
    const custom_2 = readField(formData, "custom_2");
    const method = readField(formData, "method");
    const status_message = readField(formData, "status_message");
    const card_holder_name = readField(formData, "card_holder_name");
    const card_no = readField(formData, "card_no");
    const card_expiry = readField(formData, "card_expiry");
    const recurring = readField(formData, "recurring");
    const subscription_id = readField(formData, "subscription_id");
    const event_id = readField(formData, "event_id");

    if (!order_id || !merchant_id || !status_code || !md5sig) {
      console.warn("[payhere/notify] Missing required fields");
      return new NextResponse("Missing fields", { status: 400 });
    }

    const validSignature = verifyNotificationSignature({
      merchantId: merchant_id,
      merchantSecret,
      orderId: order_id,
      amount: payhere_amount,
      currency: payhere_currency,
      statusCode: status_code,
      md5sig,
    });

    if (!validSignature) {
      console.warn("[payhere/notify] Invalid signature for order:", order_id);
      return new NextResponse("Invalid signature", { status: 400 });
    }

    const status = mapStatusCode(status_code);
    const db = await getDb();
    const now = new Date();

    const firebase_uid = custom_1.trim();
    const planDaysNum = Number(custom_2);
    const planDays: PlanDays | null = isPlanDays(planDaysNum) ? planDaysNum : null;
    const amountNumber = Number(payhere_amount);

    await db.collection("payhere_orders").updateOne(
      { order_id },
      {
        $set: {
          payment_id,
          status,
          status_code,
          status_message,
          method,
          payhere_amount: Number.isFinite(amountNumber) ? amountNumber : payhere_amount,
          payhere_currency,
          recurring: recurring === "true" || recurring === "1",
          subscription_id: subscription_id || null,
          card_holder_name: card_holder_name || null,
          card_no: card_no || null,
          card_expiry: card_expiry || null,
          updatedAt: now,
        },
      },
    );

    await db.collection("payhere_events").insertOne({
      event_id: event_id || null,
      order_id,
      payment_id: payment_id || null,
      subscription_id: subscription_id || null,
      firebase_uid: firebase_uid || null,
      planDays,
      status,
      status_code,
      status_message,
      method,
      amount: Number.isFinite(amountNumber) ? amountNumber : payhere_amount,
      currency: payhere_currency,
      receivedAt: now,
    });

    if (!firebase_uid || planDays === null) {
      return new NextResponse("OK", { status: 200 });
    }

    const subscriptions = db.collection("subscriptions");

    if (status === "success") {
      const nextRenewalAt = new Date(now.getTime() + planPeriodMs(planDays));

      await subscriptions.updateOne(
        { firebase_uid },
        {
          $set: {
            firebase_uid,
            planDays,
            status: "active",
            amount: Number.isFinite(amountNumber) ? amountNumber : null,
            currency: payhere_currency,
            method,
            lastOrderId: order_id,
            lastPaymentId: payment_id || null,
            payhere_subscription_id: subscription_id || null,
            lastPaidAt: now,
            nextRenewalAt,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      // Persist the user's plan choice only AFTER PayHere confirms a successful
      // payment. The select-plan page never writes to this collection.
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
            currency: payhere_currency || "LKR",
            lastOrderId: order_id,
            lastPaymentId: payment_id || null,
            selectedAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      );

      await db.collection("subscription_payments").insertOne({
        firebase_uid,
        planDays,
        order_id,
        payment_id: payment_id || null,
        payhere_subscription_id: subscription_id || null,
        amount: Number.isFinite(amountNumber) ? amountNumber : null,
        currency: payhere_currency,
        method,
        status,
        status_code,
        paidAt: now,
      });
    } else if (status === "cancelled") {
      await subscriptions.updateOne(
        { firebase_uid },
        { $set: { status: "cancelled", cancelledAt: now, updatedAt: now } },
      );
    } else if (status === "failed") {
      await subscriptions.updateOne(
        { firebase_uid },
        { $set: { status: "failed", updatedAt: now } },
      );
    } else if (status === "chargedback") {
      await subscriptions.updateOne(
        { firebase_uid },
        { $set: { status: "chargedback", updatedAt: now } },
      );
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("POST /api/payhere/notify failed:", message, error);
    return new NextResponse("Server error", { status: 500 });
  }
}
