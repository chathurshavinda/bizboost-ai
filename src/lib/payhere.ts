import crypto from "crypto";
export type PayHereMode = "sandbox" | "live";
export type PlanDays = 7 | 14 | 30;
export type PlanCatalogEntry = {
    name: string;
    price: number;
    currency: "LKR";
    recurrence: string;
    duration: string;
    description: string;
};
export const PLAN_CATALOG: Record<PlanDays, PlanCatalogEntry> = {
    7: {
        name: "Starter",
        price: 500,
        currency: "LKR",
        recurrence: "1 Week",
        duration: "Forever",
        description: "Billed every week",
    },
    14: {
        name: "Pro",
        price: 900,
        currency: "LKR",
        recurrence: "2 Week",
        duration: "Forever",
        description: "Billed every two weeks",
    },
    30: {
        name: "Premium",
        price: 1500,
        currency: "LKR",
        recurrence: "1 Month",
        duration: "Forever",
        description: "Billed every month",
    },
};
export function isPlanDays(value: unknown): value is PlanDays {
    return value === 7 || value === 14 || value === 30;
}
export function getPayHereMode(): PayHereMode {
    const raw = (process.env.PAYHERE_MODE ?? process.env.NEXT_PUBLIC_PAYHERE_MODE ?? "sandbox")
        .toString()
        .toLowerCase();
    return raw === "live" ? "live" : "sandbox";
}
export function formatAmount(amount: number): string {
    return amount.toFixed(2);
}
function md5Upper(input: string): string {
    return crypto.createHash("md5").update(input).digest("hex").toUpperCase();
}
export function generateInitiationHash(opts: {
    merchantId: string;
    merchantSecret: string;
    orderId: string;
    amount: number;
    currency: string;
}): string {
    const { merchantId, merchantSecret, orderId, amount, currency } = opts;
    const secretHash = md5Upper(merchantSecret);
    return md5Upper(merchantId + orderId + formatAmount(amount) + currency + secretHash);
}
export function verifyNotificationSignature(opts: {
    merchantId: string;
    merchantSecret: string;
    orderId: string;
    amount: string;
    currency: string;
    statusCode: string;
    md5sig: string;
}): boolean {
    const { merchantId, merchantSecret, orderId, amount, currency, statusCode, md5sig } = opts;
    const secretHash = md5Upper(merchantSecret);
    const local = md5Upper(merchantId + orderId + amount + currency + statusCode + secretHash);
    return local === md5sig.toUpperCase();
}
export type PayHereStatus = "success" | "pending" | "cancelled" | "failed" | "chargedback" | "unknown";
export function mapStatusCode(code: string): PayHereStatus {
    switch (code) {
        case "2":
            return "success";
        case "0":
            return "pending";
        case "-1":
            return "cancelled";
        case "-2":
            return "failed";
        case "-3":
            return "chargedback";
        default:
            return "unknown";
    }
}
export function buildOrderId(firebaseUid: string): string {
    const uidPart = firebaseUid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "user";
    const rand = crypto.randomBytes(3).toString("hex");
    return `BB-${uidPart}-${Date.now().toString(36)}-${rand}`.toUpperCase();
}
export function planPeriodMs(planDays: PlanDays): number {
    return planDays * 24 * 60 * 60 * 1000;
}
