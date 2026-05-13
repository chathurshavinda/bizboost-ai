import type { Db } from "mongodb";
export type SubscriptionDoc = {
    firebase_uid?: string;
    status?: string;
    planDays?: number;
    lastOrderId?: string | null;
};
export async function hasActiveProSubscription(db: Db, firebase_uid: string): Promise<boolean> {
    const doc = (await db
        .collection("subscriptions")
        .findOne({ firebase_uid })) as SubscriptionDoc | null;
    if (doc?.status === "active")
        return true;
    const selected = await db.collection("selected_plans").findOne({ firebase_uid });
    const days = Number(selected?.planDays);
    return days === 7 || days === 14 || days === 30;
}
export async function requireActiveSubscription(db: Db, firebase_uid: string): Promise<{
    error: string;
    code: "SUBSCRIPTION_REQUIRED";
} | null> {
    const ok = await hasActiveProSubscription(db, firebase_uid);
    if (ok)
        return null;
    return {
        error: "An active subscription is required. Complete payment on Select plan to unlock Pro.",
        code: "SUBSCRIPTION_REQUIRED",
    };
}
