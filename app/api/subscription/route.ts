import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { PLAN_CATALOG, isPlanDays } from "@/lib/payhere";
export const dynamic = "force-dynamic";
function toIso(value: unknown): string | null {
    if (!value)
        return null;
    if (value instanceof Date)
        return value.toISOString();
    if (typeof value === "string")
        return value;
    if (typeof value === "number")
        return new Date(value).toISOString();
    return null;
}
export async function GET(req: Request) {
    try {
        const firebase_uid = new URL(req.url).searchParams.get("firebase_uid")?.trim();
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        const order_id = new URL(req.url).searchParams.get("order_id")?.trim();
        const db = await getDb();
        const subscription = await db.collection("subscriptions").findOne({ firebase_uid });
        let lastOrder: Record<string, unknown> | null = null;
        if (order_id) {
            lastOrder = (await db
                .collection("payhere_orders")
                .findOne({ order_id })) as Record<string, unknown> | null;
        }
        else if (subscription?.lastOrderId) {
            lastOrder = (await db
                .collection("payhere_orders")
                .findOne({ order_id: subscription.lastOrderId })) as Record<string, unknown> | null;
        }
        if (!subscription) {
            const selectedPlan = await db.collection("selected_plans").findOne({ firebase_uid });
            const spDays = Number(selectedPlan?.planDays);
            if (selectedPlan && isPlanDays(spDays)) {
                const plan = PLAN_CATALOG[spDays];
                const price = typeof selectedPlan.price === "number" && Number.isFinite(selectedPlan.price)
                    ? selectedPlan.price
                    : plan.price;
                const currency = typeof selectedPlan.currency === "string" && selectedPlan.currency.trim()
                    ? selectedPlan.currency.trim()
                    : plan.currency;
                return NextResponse.json({
                    ok: true,
                    data: {
                        firebase_uid,
                        status: "active",
                        planDays: spDays,
                        planName: plan.name,
                        amount: price,
                        currency,
                        method: selectedPlan.selectionMode === "free" ? "free_starter" : "payhere",
                        lastOrderId: selectedPlan.lastOrderId ?? null,
                        lastPaymentId: selectedPlan.lastPaymentId ?? null,
                        payhere_subscription_id: null,
                        lastPaidAt: toIso(selectedPlan.selectedAt ?? selectedPlan.updatedAt),
                        nextRenewalAt: null,
                        cancelledAt: null,
                        updatedAt: toIso(selectedPlan.updatedAt),
                        createdAt: toIso(selectedPlan.updatedAt),
                    },
                    lastOrder: lastOrder
                        ? {
                            orderId: lastOrder.order_id,
                            status: lastOrder.status,
                            statusMessage: lastOrder.status_message ?? null,
                            planDays: lastOrder.planDays ?? null,
                            updatedAt: toIso(lastOrder.updatedAt),
                        }
                        : null,
                });
            }
            return NextResponse.json({
                ok: false,
                error: "no_subscription",
                lastOrder: lastOrder
                    ? {
                        orderId: lastOrder.order_id,
                        status: lastOrder.status,
                        statusMessage: lastOrder.status_message ?? null,
                        planDays: lastOrder.planDays ?? null,
                        updatedAt: toIso(lastOrder.updatedAt),
                    }
                    : null,
            }, { status: 404 });
        }
        const planDays = subscription.planDays;
        const plan = typeof planDays === "number" && isPlanDays(planDays) ? PLAN_CATALOG[planDays] : null;
        return NextResponse.json({
            ok: true,
            data: {
                firebase_uid: subscription.firebase_uid,
                status: subscription.status,
                planDays: subscription.planDays,
                planName: plan?.name ?? null,
                amount: subscription.amount ?? null,
                currency: subscription.currency ?? plan?.currency ?? "LKR",
                method: subscription.method ?? null,
                lastOrderId: subscription.lastOrderId ?? null,
                lastPaymentId: subscription.lastPaymentId ?? null,
                payhere_subscription_id: subscription.payhere_subscription_id ?? null,
                lastPaidAt: toIso(subscription.lastPaidAt),
                nextRenewalAt: toIso(subscription.nextRenewalAt),
                cancelledAt: toIso(subscription.cancelledAt),
                updatedAt: toIso(subscription.updatedAt),
                createdAt: toIso(subscription.createdAt),
            },
            lastOrder: lastOrder
                ? {
                    orderId: lastOrder.order_id,
                    status: lastOrder.status,
                    statusMessage: lastOrder.status_message ?? null,
                    planDays: lastOrder.planDays ?? null,
                    updatedAt: toIso(lastOrder.updatedAt),
                }
                : null,
        });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("GET /api/subscription failed:", message, error);
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
