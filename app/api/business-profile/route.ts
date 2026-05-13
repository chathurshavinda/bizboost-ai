export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { EJSON } from "bson";
import { getDb } from "@/lib/mongodb";
function mongoDocForJson(doc: Record<string, unknown>): Record<string, unknown> {
    return EJSON.serialize(doc, { relaxed: true }) as Record<string, unknown>;
}
type BusinessProfilePayload = {
    firebase_uid?: string;
    businessName?: string;
    businessType?: string;
    country?: string;
    city?: string;
    language?: string;
    productsOrServices?: string | string[];
    targetCustomers?: string;
    businessGoals?: string;
    socialLinks?: string[];
    ownerOrManagerName?: string;
    teamSize?: string;
    contactEmail?: string;
    monthlyBusinessBudget?: string;
    monthlyMarketingBudget?: string;
    expectedRevenueRange?: string;
};
function missingRequiredField(payload: BusinessProfilePayload): string | null {
    const requiredFields: Array<keyof BusinessProfilePayload> = [
        "firebase_uid",
        "businessName",
        "businessType",
        "country",
        "city",
        "language",
    ];
    for (const field of requiredFields) {
        const value = payload[field];
        if (typeof value !== "string" || value.trim().length === 0) {
            return field;
        }
    }
    return null;
}
function toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);
    }
    if (typeof value === "string") {
        return value
            .split(/\r?\n|,/g)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
}
function cleanString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}
export async function GET(request: Request) {
    try {
        const firebase_uid = cleanString(new URL(request.url).searchParams.get("firebase_uid"));
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        const db = await getDb();
        const filter = { firebase_uid };
        console.log("business-profile firebase_uid", firebase_uid);
        console.log("[business-profile][GET] query filter:", filter);
        const profile = await db
            .collection("business_profiles")
            .findOne(filter);
        if (!profile) {
            console.log("[business-profile][GET] profile found: not found");
            return NextResponse.json({ ok: false, error: "business_profile_not_found" }, { status: 404 });
        }
        console.log("[business-profile][GET] profile found: found");
        const data = mongoDocForJson(profile as Record<string, unknown>);
        return NextResponse.json({ ok: true, data }, { status: 200 });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("GET /api/business-profile failed:", message, error);
        return NextResponse.json({
            ok: false,
            error: "business_profile_fetch_failed",
            ...(process.env.NODE_ENV === "development" ? { detail: message } : {}),
        }, { status: 500 });
    }
}
export async function POST(request: NextRequest) {
    try {
        const payload = (await request.json()) as BusinessProfilePayload;
        const firebase_uid = cleanString(payload.firebase_uid);
        const missingField = missingRequiredField(payload);
        if (missingField) {
            return NextResponse.json({ ok: false, error: `${missingField} is required` }, { status: 400 });
        }
        const db = await getDb();
        const now = new Date();
        const normalizedProductsOrServices = toStringArray(payload.productsOrServices);
        const normalizedSocialLinks = toStringArray(payload.socialLinks);
        const filter = { firebase_uid };
        console.log("business-profile firebase_uid", firebase_uid);
        console.log("[business-profile][POST] query filter:", filter);
        const result = await db.collection("business_profiles").updateOne(filter, {
            $set: {
                firebase_uid,
                businessName: cleanString(payload.businessName),
                businessType: cleanString(payload.businessType),
                country: cleanString(payload.country),
                city: cleanString(payload.city),
                language: cleanString(payload.language),
                productsOrServices: normalizedProductsOrServices,
                targetCustomers: cleanString(payload.targetCustomers),
                businessGoals: cleanString(payload.businessGoals),
                socialLinks: normalizedSocialLinks,
                ownerOrManagerName: cleanString(payload.ownerOrManagerName),
                teamSize: cleanString(payload.teamSize),
                contactEmail: cleanString(payload.contactEmail),
                monthlyBusinessBudget: cleanString(payload.monthlyBusinessBudget),
                monthlyMarketingBudget: cleanString(payload.monthlyMarketingBudget),
                expectedRevenueRange: cleanString(payload.expectedRevenueRange),
                updated_at: now,
            },
            $setOnInsert: {
                created_at: now,
            },
        }, { upsert: true });
        return NextResponse.json({
            ok: true,
            upsertedId: result.upsertedId ? result.upsertedId.toString() : null,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
        });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
export const PUT = POST;
export async function DELETE(request: NextRequest) {
    try {
        const payload = (await request.json().catch(() => ({}))) as Pick<BusinessProfilePayload, "firebase_uid">;
        const firebase_uid = cleanString(payload.firebase_uid);
        if (!firebase_uid) {
            return NextResponse.json({ ok: false, error: "firebase_uid is required" }, { status: 400 });
        }
        const db = await getDb();
        const filter = { firebase_uid };
        console.log("business-profile firebase_uid", firebase_uid);
        console.log("[business-profile][DELETE] query filter:", filter);
        const [businessProfiles, selectedPlans, marketingPlans, posters, dayStatus, subscriptions, payhereOrders, subscriptionPayments,] = await Promise.all([
            db.collection("business_profiles").deleteMany(filter),
            db.collection("selected_plans").deleteMany(filter),
            db.collection("marketing_plans").deleteMany(filter),
            db.collection("posters").deleteMany(filter),
            db.collection("day_status").deleteMany(filter),
            db.collection("subscriptions").deleteMany(filter),
            db.collection("payhere_orders").deleteMany(filter),
            db.collection("subscription_payments").deleteMany(filter),
        ]);
        return NextResponse.json({
            ok: true,
            deletedCounts: {
                business_profiles: businessProfiles.deletedCount,
                selected_plans: selectedPlans.deletedCount,
                marketing_plans: marketingPlans.deletedCount,
                posters: posters.deletedCount,
                day_status: dayStatus.deletedCount,
                subscriptions: subscriptions.deletedCount,
                payhere_orders: payhereOrders.deletedCount,
                subscription_payments: subscriptionPayments.deletedCount,
            },
        }, { status: 200 });
    }
    catch (error: unknown) {
        console.error("DELETE /api/business-profile failed:", error);
        return NextResponse.json({ ok: false, error: "business_profile_delete_failed" }, { status: 500 });
    }
}
