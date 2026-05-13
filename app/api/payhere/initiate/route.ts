import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { PLAN_CATALOG, buildOrderId, formatAmount, generateInitiationHash, getPayHereMode, isPlanDays, } from "@/lib/payhere";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type CustomerInput = {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
};
type InitiatePayload = {
    firebase_uid?: string;
    planDays?: number;
    customer?: CustomerInput;
    select_plan_mode?: string;
};
function cleanString(value: unknown, fallback = ""): string {
    if (typeof value !== "string")
        return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}
function resolveBaseUrl(req: Request): string {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (fromEnv && /^https?:\/\//.test(fromEnv)) {
        return fromEnv.replace(/\/$/, "");
    }
    try {
        return new URL(req.url).origin;
    }
    catch {
        return "http://localhost:3000";
    }
}
export async function POST(req: Request) {
    try {
        const merchantId = process.env.PAYHERE_MERCHANT_ID?.trim();
        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET?.trim();
        if (!merchantId || !merchantSecret) {
            return NextResponse.json({ ok: false, error: "PayHere credentials are not configured on the server." }, { status: 500 });
        }
        const payload = (await req.json().catch(() => ({}))) as InitiatePayload;
        const firebase_uid = cleanString(payload.firebase_uid);
        const planDaysRaw = Number(payload.planDays);
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        if (!isPlanDays(planDaysRaw)) {
            return NextResponse.json({ ok: false, error: "planDays must be 7, 14, or 30" }, { status: 400 });
        }
        if (planDaysRaw === 7) {
            return NextResponse.json({
                ok: false,
                error: "starter_plan_is_free",
                message: "The 7-day Starter plan is free. Use Select plan to activate it without PayHere.",
            }, { status: 400 });
        }
        const plan = PLAN_CATALOG[planDaysRaw];
        const currency = plan.currency;
        const orderId = buildOrderId(firebase_uid);
        const amount = plan.price;
        const hash = generateInitiationHash({
            merchantId,
            merchantSecret,
            orderId,
            amount,
            currency,
        });
        const baseUrl = resolveBaseUrl(req);
        const customer = payload.customer ?? {};
        const selectPlanSuffix = cleanString(payload.select_plan_mode) === "new" ? "&mode=new" : "";
        const popupConfig = {
            sandbox: getPayHereMode() === "sandbox",
            merchant_id: merchantId,
            return_url: `${baseUrl}/select-plan?payment=success${selectPlanSuffix}`,
            cancel_url: `${baseUrl}/select-plan?payment=cancelled${selectPlanSuffix}`,
            notify_url: `${baseUrl}/api/payhere/notify`,
            order_id: orderId,
            items: `BizBoost AI - ${plan.name} Plan (${planDaysRaw} days)`,
            amount: formatAmount(amount),
            currency,
            hash,
            recurrence: plan.recurrence,
            duration: plan.duration,
            first_name: cleanString(customer.first_name, "Customer"),
            last_name: cleanString(customer.last_name, "User"),
            email: cleanString(customer.email, "customer@example.com"),
            phone: cleanString(customer.phone, "0770000000"),
            address: cleanString(customer.address, "No.1, Main Street"),
            city: cleanString(customer.city, "Colombo"),
            country: cleanString(customer.country, "Sri Lanka"),
            custom_1: firebase_uid,
            custom_2: String(planDaysRaw),
        };
        const db = await getDb();
        const now = new Date();
        await db.collection("payhere_orders").insertOne({
            order_id: orderId,
            firebase_uid,
            planDays: planDaysRaw,
            planName: plan.name,
            amount,
            currency,
            recurrence: plan.recurrence,
            duration: plan.duration,
            status: "initiated",
            createdAt: now,
            updatedAt: now,
        });
        return NextResponse.json({
            ok: true,
            data: {
                orderId,
                popupConfig,
                plan: {
                    name: plan.name,
                    price: plan.price,
                    currency: plan.currency,
                    recurrence: plan.recurrence,
                    duration: plan.duration,
                    planDays: planDaysRaw,
                },
            },
        }, { status: 200 });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("POST /api/payhere/initiate failed:", message, error);
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
