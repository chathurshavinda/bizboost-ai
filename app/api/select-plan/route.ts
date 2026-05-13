export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isPlanDays, PLAN_CATALOG, planPeriodMs, type PlanDays } from "@/lib/payhere";
function displayPlanNameForStorage(planDays: PlanDays, bodyPlanName: string, catalogName: string): string {
    const t = bodyPlanName.trim();
    if (t.length > 0)
        return t;
    if (planDays === 7)
        return "Starter";
    return catalogName;
}
type SelectPlanPayload = {
    firebase_uid?: string;
    planDays?: number;
    nextPlanDays?: number;
    mode?: string;
    planName?: string;
    price?: number;
    selectedAt?: string;
    order_id?: string;
};
function toIsoSelectedAt(value: unknown): string {
    if (!value)
        return new Date().toISOString();
    if (value instanceof Date)
        return value.toISOString();
    if (typeof value === "string")
        return value;
    try {
        return new Date(value as number | Date).toISOString();
    }
    catch {
        return new Date().toISOString();
    }
}
export async function GET(req: Request) {
    try {
        const firebase_uid = new URL(req.url).searchParams.get("firebase_uid")?.trim();
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        const db = await getDb();
        const selectedPlan = await db.collection("selected_plans").findOne({ firebase_uid }, { sort: { updatedAt: -1, selectedAt: -1 } });
        if (!selectedPlan) {
            return NextResponse.json({
                ok: true,
                success: true,
                active: false,
                planDays: null,
                planName: null,
                selectedAt: null,
                error: "No plan selected",
            }, { status: 200 });
        }
        const createdAtRaw = selectedPlan.selectedAt ?? selectedPlan.updatedAt ?? new Date();
        const selectedAt = toIsoSelectedAt(createdAtRaw);
        const planDaysNum = Number(selectedPlan.planDays);
        const catalogName = isPlanDays(planDaysNum) ? PLAN_CATALOG[planDaysNum].name : null;
        const planNameDisplay = typeof selectedPlan.planName === "string" && selectedPlan.planName.trim()
            ? selectedPlan.planName.trim()
            : catalogName;
        return NextResponse.json({
            ok: true,
            success: true,
            active: true,
            planDays: planDaysNum,
            planName: planNameDisplay ?? catalogName,
            selectedAt,
            data: {
                firebase_uid: selectedPlan.firebase_uid,
                plan_days: selectedPlan.planDays,
                next_plan_days: selectedPlan.nextPlanDays ?? null,
                plan_name: selectedPlan.planName,
                created_at: selectedAt,
            },
        }, { status: 200 });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => ({}))) as SelectPlanPayload;
        const firebase_uid = typeof body.firebase_uid === "string" ? body.firebase_uid.trim() : "";
        const planDaysNum = Number(body.planDays);
        const order_id = typeof body.order_id === "string" ? body.order_id.trim() : "";
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        if (!isPlanDays(planDaysNum)) {
            return NextResponse.json({ ok: false, error: "planDays must be 7, 14, or 30" }, { status: 400 });
        }
        const db = await getDb();
        const now = new Date();
        if (planDaysNum === 7) {
            if (order_id) {
                return NextResponse.json({ ok: false, error: "order_id_not_allowed", message: "Free Starter does not use order_id." }, { status: 400 });
            }
            const planDays: PlanDays = 7;
            const selectedExisting = await db.collection("selected_plans").findOne({ firebase_uid });
            if (selectedExisting && Number(selectedExisting.planDays) === 7) {
                return NextResponse.json({
                    ok: true,
                    success: true,
                    planDays: 7,
                    planName: "Starter",
                    alreadyExists: true,
                    data: { planDays: 7, planName: "Starter", alreadyExists: true },
                }, { status: 200 });
            }
            const nextRenewalAt = new Date(now.getTime() + planPeriodMs(planDays));
            const bodyPlanNameFree = typeof body.planName === "string" ? body.planName : "";
            const planName = displayPlanNameForStorage(planDays, bodyPlanNameFree, "Starter");
            await db.collection("subscriptions").updateOne({ firebase_uid }, {
                $set: {
                    firebase_uid,
                    planDays,
                    status: "active",
                    amount: 0,
                    currency: "LKR",
                    method: "free_starter",
                    lastOrderId: null,
                    lastPaymentId: null,
                    payhere_subscription_id: null,
                    lastPaidAt: now,
                    nextRenewalAt,
                    updatedAt: now,
                },
                $setOnInsert: { createdAt: now },
            }, { upsert: true });
            await db.collection("selected_plans").updateOne({ firebase_uid }, {
                $set: {
                    firebase_uid,
                    planDays,
                    nextPlanDays: planDays,
                    selectionMode: "free",
                    planName,
                    price: 0,
                    currency: "LKR",
                    lastOrderId: null,
                    lastPaymentId: null,
                    selectedAt: now,
                    updatedAt: now,
                },
            }, { upsert: true });
            return NextResponse.json({
                ok: true,
                success: true,
                planDays: 7,
                planName: "Starter",
                alreadyExists: false,
                data: { planDays: 7, planName: "Starter", alreadyExists: false },
            }, { status: 200 });
        }
        if (!order_id) {
            return NextResponse.json({ ok: false, error: "order_id_required", message: "Paid plans require order_id from checkout." }, { status: 400 });
        }
        const planDays = planDaysNum as PlanDays;
        const catalog = PLAN_CATALOG[planDays];
        const bodyPlanName = typeof body.planName === "string" ? body.planName : "";
        const order = await db.collection("payhere_orders").findOne({ order_id });
        if (!order || String(order.firebase_uid ?? "").trim() !== firebase_uid) {
            return NextResponse.json({ ok: false, error: "order_not_found" }, { status: 404 });
        }
        const orderPlanDays = Number(order.planDays);
        if (orderPlanDays !== planDays) {
            return NextResponse.json({ ok: false, error: "plan_mismatch" }, { status: 400 });
        }
        const selectedBefore = await db.collection("selected_plans").findOne({ firebase_uid });
        const alreadyPaid = selectedBefore
            && Number(selectedBefore.planDays) === planDays
            && String(selectedBefore.lastOrderId ?? "").trim() === order_id;
        if (alreadyPaid) {
            return NextResponse.json({
                ok: true,
                success: true,
                planDays,
                planName: catalog.name,
                alreadyExists: true,
                data: { planDays, planName: catalog.name, alreadyExists: true },
            }, { status: 200 });
        }
        const o = order as Record<string, unknown>;
        const pickAmount = (): number => {
            for (const key of ["amount", "payhere_amount"] as const) {
                const v = o[key];
                if (typeof v === "number" && Number.isFinite(v))
                    return v;
                if (typeof v === "string") {
                    const n = Number(v);
                    if (Number.isFinite(n))
                        return n;
                }
            }
            return catalog.price;
        };
        const pickCurrency = (): string => {
            for (const key of ["currency", "payhere_currency"] as const) {
                const v = o[key];
                if (typeof v === "string" && v.trim())
                    return v.trim();
            }
            return catalog.currency;
        };
        const amount = pickAmount();
        const currency = pickCurrency();
        const lastPaymentId = typeof o.payment_id === "string" ? o.payment_id : null;
        const payhereSubscriptionId = typeof o.subscription_id === "string" ? o.subscription_id : null;
        const payMethod = typeof o.method === "string" && o.method.trim() ? o.method.trim() : "payhere";
        const lastPaidRaw = o.updatedAt ?? o.lastPaidAt ?? now;
        let lastPaidAt: Date;
        if (lastPaidRaw instanceof Date && !Number.isNaN(lastPaidRaw.getTime())) {
            lastPaidAt = lastPaidRaw;
        }
        else if (typeof lastPaidRaw === "string" || typeof lastPaidRaw === "number") {
            const d = new Date(lastPaidRaw);
            lastPaidAt = Number.isNaN(d.getTime()) ? now : d;
        }
        else {
            lastPaidAt = now;
        }
        const planNameStored = displayPlanNameForStorage(planDays, bodyPlanName, catalog.name);
        await db.collection("subscriptions").updateOne({ firebase_uid }, {
            $set: {
                firebase_uid,
                planDays,
                status: "active",
                amount,
                currency,
                method: payMethod,
                lastOrderId: order_id,
                lastPaymentId,
                payhere_subscription_id: payhereSubscriptionId,
                lastPaidAt,
                nextRenewalAt: new Date(now.getTime() + planPeriodMs(planDays)),
                updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
        }, { upsert: true });
        await db.collection("selected_plans").updateOne({ firebase_uid }, {
            $set: {
                firebase_uid,
                planDays,
                nextPlanDays: planDays,
                selectionMode: "paid",
                planName: planNameStored,
                price: amount,
                currency,
                lastOrderId: order_id,
                lastPaymentId,
                selectedAt: now,
                updatedAt: now,
            },
        }, { upsert: true });
        return NextResponse.json({
            ok: true,
            success: true,
            planDays,
            planName: catalog.name,
            alreadyExists: false,
            data: { planDays, planName: catalog.name, alreadyExists: false },
        }, { status: 200 });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
