"use client";
export const dynamic = "force-dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { useAuth } from "@/src/lib/useAuth";
type PlanCardConfig = {
  name: string;
  days: 7 | 14 | 30;
  label: string;
  price: number;
  currency: string;
  cadence: string;
  bullets: string[];
};
const FREE_STARTER_DAYS = 7 as const;
const plans: PlanCardConfig[] = [
  {
    name: "Starter",
    days: 7,
    label: "7 Days",
        price: 0,
    currency: "LKR",
        cadence: "No payment required",
    bullets: ["Quick launch", "Simple actions", "Fast results"],
  },
  {
    name: "Pro",
    days: 14,
    label: "14 Days",
    price: 900,
    currency: "LKR",
    cadence: "billed every 2 weeks",
    bullets: ["More reach", "Steady growth", "Better rhythm"],
  },
  {
    name: "Premium",
    days: 30,
    label: "30 Days",
    price: 1500,
    currency: "LKR",
    cadence: "billed every month",
    bullets: ["Full month", "Deeper planning", "Strong momentum"],
  },
];
type PayHerePopupConfig = {
  sandbox: boolean;
  merchant_id: string;
  return_url?: string | null;
  cancel_url?: string | null;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
  currency: string;
  hash: string;
  recurrence?: string;
  duration?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  custom_1?: string;
  custom_2?: string;
};
type PayHereSDK = {
  startPayment: (config: PayHerePopupConfig) => void;
  onCompleted?: (orderId: string) => void;
  onDismissed?: () => void;
  onError?: (error: string) => void;
};
declare global {
  interface Window {
    payhere?: PayHereSDK;
  }
}
type InitiateResponse = {
  ok: boolean;
  error?: string;
  data?: {
    orderId: string;
    popupConfig: PayHerePopupConfig;
    plan: {
      name: string;
      price: number;
      currency: string;
      recurrence: string;
      duration: string;
      planDays: number;
    };
  };
};
type SubscriptionData = {
  status?: string;
  planDays?: number | null;
  planName?: string | null;
  amount?: number | null;
  currency?: string | null;
  nextRenewalAt?: string | null;
  lastPaidAt?: string | null;
    lastOrderId?: string | null;
};
type SubscriptionResponse = {
  ok: boolean;
  data?: SubscriptionData;
};
type ProfileData = {
  businessName?: string;
  ownerOrManagerName?: string;
  contactEmail?: string;
  city?: string;
  country?: string;
};
type CheckoutStage = {
    kind: "idle";
} | {
    kind: "preparing";
} | {
    kind: "opening";
} | {
    kind: "activating";
    orderId: string;
} | {
    kind: "activating_plan";
} | {
    kind: "activating_free";
} | {
    kind: "success_starter";
} | {
    kind: "success_pro";
} | {
    kind: "success_premium";
} | {
    kind: "cancelled";
} | {
    kind: "error";
    message: string;
};
const LS_PENDING_PLAN_DAYS = "pendingPlanDays";
const LS_PENDING_PLAN_NAME = "pendingPlanName";
const LS_PENDING_ORDER_ID = "pendingOrderId";
const LS_PENDING_AMOUNT = "pendingAmount";
const LS_PENDING_FIREBASE_UID = "pendingFirebaseUid";
function writePendingPaidPlan(opts: {
    planDays: number;
    planName: string;
    orderId: string;
    amount: string;
    firebaseUid: string;
}) {
    try {
        if (typeof window === "undefined")
            return;
        localStorage.setItem(LS_PENDING_PLAN_DAYS, String(opts.planDays));
        localStorage.setItem(LS_PENDING_PLAN_NAME, opts.planName);
        localStorage.setItem(LS_PENDING_ORDER_ID, opts.orderId);
        localStorage.setItem(LS_PENDING_AMOUNT, opts.amount);
        localStorage.setItem(LS_PENDING_FIREBASE_UID, opts.firebaseUid);
    }
    catch {
    }
}
function readPendingForOrder(completedOrderId: string, firebaseUid: string): {
    planDays: 14 | 30;
    planName: string;
    amount: string;
} | null {
    if (typeof window === "undefined")
        return null;
    try {
        const lsUid = localStorage.getItem(LS_PENDING_FIREBASE_UID)?.trim() ?? "";
        if (!lsUid || lsUid !== String(firebaseUid).trim())
            return null;
        const storedOrder = localStorage.getItem(LS_PENDING_ORDER_ID)?.trim() ?? "";
        if (!storedOrder || storedOrder !== String(completedOrderId).trim())
            return null;
        const planDays = Number(localStorage.getItem(LS_PENDING_PLAN_DAYS));
        if (planDays !== 14 && planDays !== 30)
            return null;
        return {
            planDays,
            planName: localStorage.getItem(LS_PENDING_PLAN_NAME) ?? "",
            amount: localStorage.getItem(LS_PENDING_AMOUNT) ?? "",
        };
    }
    catch {
        return null;
    }
}
function clearPendingPaidPlan() {
    try {
        if (typeof window === "undefined")
            return;
        localStorage.removeItem(LS_PENDING_PLAN_DAYS);
        localStorage.removeItem(LS_PENDING_PLAN_NAME);
        localStorage.removeItem(LS_PENDING_ORDER_ID);
        localStorage.removeItem(LS_PENDING_AMOUNT);
        localStorage.removeItem(LS_PENDING_FIREBASE_UID);
    }
    catch {
    }
}
async function resolvePaidPlanDaysForOrder(uid: string, orderId: string, hint: 14 | 30 | null): Promise<14 | 30> {
    const pending = readPendingForOrder(orderId, uid);
    if (hint === 14 || hint === 30)
        return hint;
    if (pending?.planDays === 14 || pending?.planDays === 30)
        return pending.planDays;
    try {
        const res = await fetch(`/api/subscription?firebase_uid=${encodeURIComponent(uid)}&order_id=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
            lastOrder?: {
                planDays?: number | null;
            };
        };
        const d = Number(data?.lastOrder?.planDays);
        if (d === 14 || d === 30)
            return d;
    }
    catch {
    }
    return 14;
}
function parsePaidSelectPlanResponse(res: Response, body: Record<string, unknown>): {
    planDays: 14 | 30;
    alreadyExists: boolean;
} | null {
    const ok = body.ok === true || body.success === true;
    if (!res.ok || !ok)
        return null;
    const data = body.data as Record<string, unknown> | undefined;
    const days = Number(data?.planDays ?? body.planDays);
    if (days !== 14 && days !== 30)
        return null;
    const alreadyExists = Boolean(data?.alreadyExists ?? body.alreadyExists);
    return { planDays: days as 14 | 30, alreadyExists };
}
function getPayHereReturnContext(searchParams: URLSearchParams): "success" | "cancelled" | null {
    const payment = searchParams.get("payment")?.toLowerCase() ?? "";
    const status = searchParams.get("status")?.toLowerCase() ?? "";
    const statusCode = searchParams.get("status_code") ?? "";
    if (payment === "success" || status === "success" || statusCode === "2")
        return "success";
    if (payment === "cancelled" || payment === "cancel" || status === "cancelled") {
        return "cancelled";
    }
    return null;
}
function isSuccessStage(s: CheckoutStage): boolean {
    return (s.kind === "success_starter" || s.kind === "success_pro" || s.kind === "success_premium");
}
function SuccessModalIconSmall({ variant }: {
    variant: "starter" | "pro" | "premium";
}) {
    const c = variant === "starter" ? "#16a34a" : variant === "pro" ? "#4f46e5" : "#d97706";
    return (<div className="successModalIcon" style={{ color: c }} aria-hidden>
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" fill="#fff"/>
        <path d="M9 16l4.5 4.5L23 11" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>);
}
export default function SelectPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const isNewMode = searchParams.get("mode") === "new";
    const [selected, setSelected] = useState<(number | null)>(null);
  const [planHydrated, setPlanHydrated] = useState(false);
    const [subscription, setSubscription] = useState<(SubscriptionData | null)>(null);
    const [profile, setProfile] = useState<(ProfileData | null)>(null);
    const [stage, setStage] = useState<(CheckoutStage)>({ kind: "idle" });
  const [sdkReady, setSdkReady] = useState(false);
  const handlersBoundRef = useRef(false);
    const paymentPollCancelRef = useRef({ cancelled: false });
    const clearPaymentPoll = useCallback(() => {
        paymentPollCancelRef.current.cancelled = true;
    }, []);
    useEffect(() => () => clearPaymentPoll(), [clearPaymentPoll]);
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);
  useEffect(() => {
    if (authLoading || !user?.uid || isNewMode) {
      setPlanHydrated(true);
      return;
    }
    let cancelled = false;
    const loadSelected = async () => {
      try {
                const res = await fetch(`/api/select-plan?firebase_uid=${encodeURIComponent(user.uid)}`, { cache: "no-store" });
        const data = await res.json();
                if (cancelled)
                    return;
                if (res.ok && data?.ok) {
                    if (data.active === false)
                        return;
                    const days = Number(data.planDays ?? data.data?.plan_days ?? data.data?.planDays ?? 0);
          if ([7, 14, 30].includes(days)) {
            setSelected(days);
          }
        }
            }
            catch {
            }
            finally {
                if (!cancelled)
                    setPlanHydrated(true);
      }
    };
    void loadSelected();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.uid, isNewMode]);
    const fetchSubscription = useCallback(async (uid: string): Promise<(SubscriptionData | null)> => {
        try {
            const res = await fetch(`/api/subscription?firebase_uid=${encodeURIComponent(uid)}`, { cache: "no-store" });
            if (res.status === 404)
                return null;
        const data = (await res.json()) as SubscriptionResponse;
            if (res.ok && data.ok && data.data)
                return data.data;
        return null;
        }
        catch {
        return null;
      }
    }, []);
  useEffect(() => {
        if (!user?.uid)
            return;
    let cancelled = false;
    void (async () => {
      const data = await fetchSubscription(user.uid);
            if (!cancelled)
                setSubscription(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, fetchSubscription]);
  useEffect(() => {
        if (!user?.uid)
            return;
    let cancelled = false;
    const loadProfile = async () => {
      try {
                const res = await fetch(`/api/business-profile?firebase_uid=${encodeURIComponent(user.uid)}`, { cache: "no-store" });
                if (!res.ok)
                    return;
        const data = await res.json();
                if (cancelled)
                    return;
        if (data?.ok && data.data) {
          setProfile(data.data as ProfileData);
        }
            }
            catch {
      }
    };
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);
  const hasActiveSubscription = subscription?.status === "active";
  const subscribedPlanLabel = useMemo(() => {
        if (!subscription)
            return null;
    const days = subscription.planDays;
    const matched = plans.find((p) => p.days === days);
    return matched ? `${matched.name} (${matched.label})` : null;
  }, [subscription]);
    const planBuilderPath = useMemo(() => (isNewMode ? "/marketing-plan?mode=new" : "/marketing-plan"), [isNewMode]);
    const subscriptionSuccessStage = useCallback((planDays: number | null | undefined) => {
        if (planDays === 14)
            return { kind: "success_pro" as const };
        if (planDays === 30)
            return { kind: "success_premium" as const };
        if (planDays === 7)
            return { kind: "success_starter" as const };
        return { kind: "success_pro" as const };
    }, []);
    const finalizePaidCheckout = useCallback(async (opts: {
        uid: string;
        orderId: string;
        planDaysHint: 14 | 30 | null;
        pollToken: {
            cancelled: boolean;
        };
        source: "popup" | "return_url";
    }): Promise<boolean> => {
        const { uid, orderId, planDaysHint, pollToken, source } = opts;
        if (pollToken.cancelled) {
            console.log("[select-plan] activation aborted (cancelled)", { orderId, source });
            return false;
        }
        const resolvedDays = await resolvePaidPlanDaysForOrder(uid, orderId, planDaysHint);
        const pending = readPendingForOrder(orderId, uid);
        const planNameForLog = pending?.planName?.trim()
            || (resolvedDays === 14 ? "Pro" : "Premium");
        console.log("[select-plan] paid activation (single POST /api/select-plan)", {
            source,
            planDays: resolvedDays,
            planName: planNameForLog,
            orderId,
            paymentStatus: "success",
        });
        const res = await fetch("/api/select-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                firebase_uid: uid,
                planDays: resolvedDays,
                order_id: orderId,
                planName: pending?.planName?.trim() ?? "",
            }),
        });
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        console.log("[select-plan] select-plan API response", {
            status: res.status,
            ok: res.ok,
            body,
        });
        const parsed = parsePaidSelectPlanResponse(res, body);
        if (pollToken.cancelled)
            return false;
        if (parsed) {
            clearPendingPaidPlan();
            const refreshed = await fetchSubscription(uid);
            if (pollToken.cancelled)
                return false;
            setSubscription(refreshed && refreshed.status === "active"
                ? refreshed
                : {
                    status: "active",
                    planDays: parsed.planDays,
                    lastOrderId: orderId,
                    planName: parsed.planDays === 14 ? "Pro" : "Premium",
                });
            setStage(subscriptionSuccessStage(parsed.planDays));
            console.log("[select-plan] paid activation complete", {
                planDays: parsed.planDays,
                orderId,
                alreadyExists: parsed.alreadyExists,
            });
            return true;
        }
        console.log("[select-plan] paid activation failed", { orderId, source, status: res.status });
        return false;
    }, [fetchSubscription, subscriptionSuccessStage]);
    const handleCompleted = useCallback(async (completedOrderId: string) => {
        const uid = user?.uid;
        if (!uid)
            return;
        clearPaymentPoll();
        paymentPollCancelRef.current = { cancelled: false };
        const pollToken = paymentPollCancelRef.current;
        console.log("[select-plan] PayHere popup onCompleted", {
            orderId: completedOrderId,
            paymentStatus: "success",
        });
        setStage({ kind: "activating", orderId: completedOrderId });
        await new Promise((r) => setTimeout(r, 1200));
        if (pollToken.cancelled)
            return;
        const pend = readPendingForOrder(completedOrderId, uid);
        const hint: 14 | 30 | null = pend?.planDays === 14 || pend?.planDays === 30 ? pend.planDays : null;
        const ok = await finalizePaidCheckout({
            uid,
            orderId: completedOrderId,
            planDaysHint: hint,
            pollToken,
            source: "popup",
        });
        if (pollToken.cancelled)
            return;
        if (!ok) {
            clearPendingPaidPlan();
            setStage({
                kind: "error",
                message: "We could not save your plan to your account. Please try Select Plan again. If this keeps happening, sign out and sign back in.",
            });
        }
    }, [user, finalizePaidCheckout, clearPaymentPoll]);
    const returnFlowLockRef = useRef<string | null>(null);
    useEffect(() => {
        if (authLoading || !user?.uid)
            return;
        if (typeof window === "undefined")
            return;
        const ctx = getPayHereReturnContext(searchParams);
        if (ctx === "cancelled") {
            clearPendingPaidPlan();
            const path = isNewMode ? "/select-plan?mode=new" : "/select-plan";
            window.history.replaceState(null, "", path);
            console.log("[select-plan] PayHere return cancelled; pending checkout cleared");
            return;
        }
        if (ctx !== "success")
            return;
        const orderFromUrl = searchParams.get("order_id")?.trim() ?? "";
        const orderFromLs = localStorage.getItem(LS_PENDING_ORDER_ID)?.trim() ?? "";
        const orderId = orderFromUrl || orderFromLs;
        if (!orderId) {
            const path = isNewMode ? "/select-plan?mode=new" : "/select-plan";
            window.history.replaceState(null, "", path);
            return;
        }
        const lockKey = `return:${orderId}:${user.uid}`;
        if (returnFlowLockRef.current === lockKey)
            return;
        const pend = readPendingForOrder(orderId, user.uid);
        if (!pend) {
            console.log("[select-plan] return URL success but missing pending checkout keys", {
                orderId,
                paymentStatus: ctx,
            });
            const path = isNewMode ? "/select-plan?mode=new" : "/select-plan";
            window.history.replaceState(null, "", path);
            return;
        }
        returnFlowLockRef.current = lockKey;
        const pollToken = { cancelled: false };
        setStage({ kind: "activating_plan" });
        console.log("[select-plan] PayHere return URL success", {
            orderId,
            planDays: pend.planDays,
            planName: pend.planName,
            paymentStatus: ctx,
        });
        void (async () => {
            const ok = await finalizePaidCheckout({
                uid: user.uid,
                orderId,
                planDaysHint: pend.planDays,
                pollToken,
                source: "return_url",
            });
            const path = isNewMode ? "/select-plan?mode=new" : "/select-plan";
            window.history.replaceState(null, "", path);
            if (!ok) {
                returnFlowLockRef.current = null;
                clearPendingPaidPlan();
                setStage({
                    kind: "error",
                    message: "We could not save your plan. Please return to Select Plan and try again, or sign out and sign back in.",
                });
            }
        })();
        return () => {
            pollToken.cancelled = true;
            returnFlowLockRef.current = null;
        };
    }, [authLoading, user?.uid, searchParams, isNewMode, finalizePaidCheckout]);
  const bindPayHereHandlers = useCallback(() => {
        if (typeof window === "undefined" || !window.payhere)
            return;
        if (handlersBoundRef.current)
            return;
    handlersBoundRef.current = true;
    window.payhere.onCompleted = (orderId: string) => {
      void handleCompleted(orderId);
    };
    window.payhere.onDismissed = () => {
            clearPendingPaidPlan();
            setStage((current) => current.kind === "opening" || current.kind === "preparing"
          ? { kind: "cancelled" }
                : current);
    };
    window.payhere.onError = (error: string) => {
            clearPendingPaidPlan();
      setStage({ kind: "error", message: error || "PayHere reported an error." });
    };
  }, [handleCompleted]);
  useEffect(() => {
        if (sdkReady)
            bindPayHereHandlers();
  }, [sdkReady, bindPayHereHandlers]);
    const startFreePlan = useCallback(async () => {
        if (!user?.uid || selected !== FREE_STARTER_DAYS)
            return;
        if (stage.kind === "preparing" ||
            stage.kind === "opening" ||
            stage.kind === "activating" ||
            stage.kind === "activating_plan" ||
            stage.kind === "activating_free") {
            return;
        }
        clearPaymentPoll();
        clearPendingPaidPlan();
        setStage({ kind: "activating_free" });
        try {
            console.log("[select-plan] free Starter POST", {
                planDays: FREE_STARTER_DAYS,
                planName: "Starter",
            });
            const res = await fetch("/api/select-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firebase_uid: user.uid, planDays: FREE_STARTER_DAYS }),
            });
            const data = (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                success?: boolean;
                error?: string;
                message?: string;
                alreadyExists?: boolean;
            };
            console.log("[select-plan] free Starter API response", {
                status: res.status,
                ok: data.ok,
                success: data.success,
                body: data,
            });
            const activated = res.ok && (data.success === true || data.ok === true);
            if (!activated) {
                throw new Error(data.message || data.error || "Could not activate your free plan.");
            }
            const sub = await fetchSubscription(user.uid);
            if (sub)
                setSubscription(sub);
            setStage({ kind: "success_starter" });
        }
        catch (error: unknown) {
            const text = error instanceof Error ? error.message : "Could not activate your free plan.";
            setStage({ kind: "error", message: text });
        }
    }, [user, selected, stage.kind, clearPaymentPoll, fetchSubscription]);
  const startCheckout = useCallback(async () => {
        if (!user?.uid || selected === null)
            return;
        if (selected === FREE_STARTER_DAYS)
            return;
        if (stage.kind === "preparing" ||
            stage.kind === "opening" ||
            stage.kind === "activating" ||
            stage.kind === "activating_plan" ||
            stage.kind === "activating_free") {
      return;
    }
    if (!sdkReady || typeof window === "undefined" || !window.payhere) {
      setStage({
        kind: "error",
        message: "PayHere is still loading. Please try again in a moment.",
      });
      return;
    }
        clearPaymentPoll();
    setStage({ kind: "preparing" });
    bindPayHereHandlers();
    try {
      const displayName = user.displayName ?? "";
      const [firstName, ...rest] = displayName.split(" ").filter(Boolean);
      const lastName = rest.join(" ");
      const profileFirstName = profile?.ownerOrManagerName?.split(" ")[0];
      const profileLastName = profile?.ownerOrManagerName?.split(" ").slice(1).join(" ");
      const customerPayload = {
        first_name: firstName || profileFirstName || "Customer",
        last_name: lastName || profileLastName || "User",
        email: user.email || profile?.contactEmail || "",
        phone: "0770000000",
        address: profile?.businessName || "Address",
        city: profile?.city || "Colombo",
        country: profile?.country || "Sri Lanka",
      };
      const res = await fetch("/api/payhere/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebase_uid: user.uid,
          planDays: selected,
          customer: customerPayload,
                    ...(isNewMode ? { select_plan_mode: "new" } : {}),
        }),
      });
      const data = (await res.json()) as InitiateResponse;
      if (!res.ok || !data.ok || !data.data) {
        throw new Error(data.error || "Failed to start PayHere checkout");
      }
            const planRow = plans.find((p) => p.days === selected);
            const amountStr = data.data.plan?.price != null
                ? String(data.data.plan.price)
                : planRow != null
                    ? String(planRow.price)
                    : "";
            writePendingPaidPlan({
                planDays: selected,
                planName: planRow?.name ?? data.data.plan?.name ?? "",
                orderId: data.data.orderId,
                amount: amountStr,
                firebaseUid: user.uid,
            });
      setStage({ kind: "opening" });
      window.payhere.startPayment(data.data.popupConfig);
        }
        catch (error: unknown) {
            clearPendingPaidPlan();
      const text = error instanceof Error ? error.message : "Failed to start checkout";
      setStage({ kind: "error", message: text });
    }
    }, [
        user,
        selected,
        profile,
        sdkReady,
        bindPayHereHandlers,
        stage.kind,
        clearPaymentPoll,
        isNewMode,
    ]);
    const handlePrimaryCta = useCallback(() => {
        if (selected === FREE_STARTER_DAYS)
            void startFreePlan();
        else
            void startCheckout();
    }, [selected, startFreePlan, startCheckout]);
    const checkoutBusy = stage.kind === "preparing" ||
        stage.kind === "opening" ||
        stage.kind === "activating" ||
        stage.kind === "activating_plan" ||
        stage.kind === "activating_free";
    const needsPayHere = selected !== null && selected !== FREE_STARTER_DAYS;
    const checkoutButtonLabel = useMemo(() => {
        if (stage.kind === "preparing")
            return "Preparing checkout…";
        if (stage.kind === "opening")
            return "Opening PayHere…";
        if (stage.kind === "activating")
            return "Confirming payment…";
        if (stage.kind === "activating_plan")
            return "Activating your plan…";
        if (stage.kind === "activating_free")
            return "Activating your free plan…";
        if (selected === FREE_STARTER_DAYS)
            return "Start for Free";
        if (hasActiveSubscription)
            return "Switch plan & Pay";
    return "Subscribe & Pay";
    }, [stage.kind, selected, hasActiveSubscription]);
    return (<div className="bb-page">
      <Script src="https://www.payhere.lk/lib/payhere.js" strategy="afterInteractive" onLoad={() => setSdkReady(true)} onReady={() => setSdkReady(true)}/>

      <section className="bb-hero-dark">
        <div className="bb-hero-dark-inner bb-hero-centered bb-hero-selectPlan mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
          <p className="bb-eyebrow-dark">{isSuccessStage(stage) ? "All set" : "Plan Selection"}</p>
          <h1 className="bb-title-dark">{isSuccessStage(stage) ? "Plan activated" : "Select Plan"}</h1>
          <p className="bb-lead-dark">
            {isSuccessStage(stage)
            ? "Your subscription is ready. Open the Plan Builder to create or review your growth and marketing plan."
            : isNewMode
              ? "Pick a new duration for your next fresh plan."
                : "Pick the right duration for your marketing plan. Starter is free for 7 days; Pro and Premium are flexible subscriptions you can manage anytime."}
          </p>
        </div>
      </section>

      <section className="bb-band-light bb-app-canvas">
        <div className="bb-shell">
          <div className="selectPlanContent">
            {isSuccessStage(stage) ? (<section className="selectPlanSuccess" aria-labelledby="selectPlanSuccessTitle">
                <div className="selectPlanSuccessCard">
                  <div className="selectPlanSuccessIconWrap">
                    <SuccessModalIconSmall variant={stage.kind === "success_starter"
                    ? "starter"
                    : stage.kind === "success_pro"
                        ? "pro"
                        : "premium"}/>
                  </div>
                  <p className="selectPlanSuccessKicker">Payment complete</p>
                  {stage.kind === "success_starter" && (<>
                      <h2 id="selectPlanSuccessTitle" className="selectPlanSuccessTitle">
                        Congratulations, you&apos;re on Starter
                      </h2>
                      <p className="selectPlanSuccessLead">
                        Your free 7-day BizBoost AI plan is now active.
                      </p>
                    </>)}
                  {stage.kind === "success_pro" && (<>
                      <h2 id="selectPlanSuccessTitle" className="selectPlanSuccessTitle">
                        Congratulations, you&apos;re on Pro
                      </h2>
                      <p className="selectPlanSuccessLead">
                        Your 14-day BizBoost AI Pro plan is now active.
                      </p>
                    </>)}
                  {stage.kind === "success_premium" && (<>
                      <h2 id="selectPlanSuccessTitle" className="selectPlanSuccessTitle">
                        Congratulations, you&apos;re on Premium
                      </h2>
                      <p className="selectPlanSuccessLead">
                        Your 30-day BizBoost AI Premium plan is now active.
                      </p>
                    </>)}
                  <p className="selectPlanSuccessBody">
                    You can now start building your personalized business growth and marketing plan.
                  </p>
                  <div className="selectPlanSuccessActions">
                    <Link href={planBuilderPath} className="nextBtn selectPlanSuccessCta">
                      Open Plan Builder
                    </Link>
                    <Link href="/dashboard/profile" className="backBtn selectPlanSuccessSecondary">
                      View business profile
                    </Link>
                  </div>
                </div>
              </section>) : (<>
            {stage.kind === "activating_plan" && (<section className="notice noticeActivating">
                <p>Activating your plan...</p>
              </section>)}

            {hasActiveSubscription && !isSuccessStage(stage) && stage.kind !== "activating_plan" && (<section className="notice noticeSuccess">
                <p>
                  You already have an active subscription
                  {subscribedPlanLabel ? `: ${subscribedPlanLabel}` : ""}. Choosing a new plan
                  below will update your plan or billing where applicable.
                </p>
              </section>)}

            {stage.kind === "error" && (<section className="notice noticeError">
                <div className="noticeRow">
                  <p>{stage.message}</p>
                  <button type="button" onClick={() => setStage({ kind: "idle" })} className="retryBtn">
                    Dismiss
                  </button>
                </div>
              </section>)}

            {stage.kind === "cancelled" && (<section className="notice noticeWarn">
                <div className="noticeRow">
                  <p>Checkout was closed before payment was completed. You can try again.</p>
                  <button type="button" onClick={() => setStage({ kind: "idle" })} className="retryBtn">
                    Dismiss
                  </button>
                </div>
              </section>)}

            {!isSuccessStage(stage) && stage.kind !== "activating_plan" && (<>
                <section className="planGrid">
                  {plans.map((plan) => {
                    const isSelected = selected === plan.days;
                    const isFeatured = plan.days === 14;
                const isFreeStarter = plan.days === FREE_STARTER_DAYS;
                const isBusy = authLoading || !planHydrated || checkoutBusy || isSuccessStage(stage);
                return (<button key={plan.days} type="button" onClick={() => {
                        setStage((current) => current.kind === "error" || current.kind === "cancelled"
                              ? { kind: "idle" }
                            : current);
                          setSelected(plan.days);
                    }} disabled={isBusy} className={`planCard ${isFeatured ? "planCardFeatured" : ""} ${isSelected ? "isSelected" : ""} ${isBusy ? "isDisabled" : ""}`}>
                    <div className="planCardGlow"/>
                        <div className="planTop">
                          <div>
                        {isFeatured ? (<span className="popularTag">Recommended</span>) : null}
                            <div className="planLabel">{plan.label}</div>
                            <h3>{plan.name}</h3>
                            <p className="planDays">{plan.days} day plan</p>
                          </div>
                          <div className={`checkCircle ${isSelected ? "active" : ""}`}>
                            {isSelected ? "✓" : "○"}
                          </div>
                        </div>

                        <div className="priceRow">
                      {isFreeStarter ? (<>
                          <span className="priceAmount priceFree">Free</span>
                          <span className="priceCadence priceCadenceFree">{plan.cadence}</span>
                        </>) : (<>
                          <span className="priceAmount">
                            {plan.currency} {plan.price.toLocaleString()}
                          </span>
                          <span className="priceCadence">{plan.cadence}</span>
                        </>)}
                        </div>

                        <div className={`cardCta ${isSelected ? "active" : ""}`}>
                      {isFreeStarter ? "Start for Free" : isSelected ? "Selected" : "Choose this plan"}
                        </div>
                        <p className="included">What&apos;s included:</p>

                        <ul>
                      {plan.bullets.map((bullet) => (<li key={bullet}>
                              <span>✓</span>
                              {bullet}
                        </li>))}
                        </ul>
                  </button>);
                  })}
                </section>

                <div className="actions">
                  <button type="button" onClick={() => router.push("/dashboard/profile")} className="backBtn">
                    Back
                  </button>

                  <button type="button" disabled={selected === null ||
                      authLoading ||
                      !planHydrated ||
                checkoutBusy ||
                (needsPayHere && !sdkReady)} onClick={() => void handlePrimaryCta()} className="nextBtn">
                    {checkoutButtonLabel}
                  </button>
                </div>

                <p className="secureNote">
                  {selected === FREE_STARTER_DAYS
                ? "Starter is free — no checkout. Pro and Premium open in a secure PayHere popup."
                : "Payments open in a secure PayHere popup. You can cancel or change your plan anytime."}
                </p>
              </>)}
            </>)}
          </div>
        </div>
      </section>
      <style jsx>{`
        .selectPlanContent {
          display: grid;
          gap: clamp(18px, 3vw, 26px);
        }

        .notice {
          max-width: 680px;
          margin: 0 auto;
          border-radius: 16px;
          padding: 12px 14px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(255, 255, 255, 0.75);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(12px);
        }

        .notice p {
          margin: 0;
          font-size: 14px;
          color: #334155;
          line-height: 1.55;
        }

        .noticeError {
          border-color: rgba(251, 113, 133, 0.42);
        }

        .noticeWarn {
          border-color: rgba(234, 179, 8, 0.42);
          background: rgba(254, 252, 232, 0.85);
        }

        .noticeSuccess {
          border-color: rgba(34, 197, 94, 0.42);
          background: rgba(240, 253, 244, 0.85);
        }

        .noticeActivating {
          border-color: rgba(99, 102, 241, 0.42);
          background: rgba(238, 242, 255, 0.92);
          text-align: center;
        }

        .noticeActivating p {
          font-weight: 600;
          color: #312e81;
        }

        .noticeRow {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .retryBtn {
          border: 1px solid rgba(148, 163, 184, 0.52);
          background: #ffffff;
          color: #0f172a;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .selectPlanSuccess {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
        }

        .selectPlanSuccessCard {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.94) 100%);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 20px 50px rgba(15, 23, 42, 0.1),
            0 8px 24px rgba(15, 23, 42, 0.06);
          padding: clamp(26px, 4vw, 36px) clamp(22px, 4vw, 32px);
          text-align: center;
        }

        .selectPlanSuccessCard::before {
          content: "";
          position: absolute;
          inset: -40% -20% auto;
          height: 55%;
          background: radial-gradient(ellipse 70% 55% at 50% 0%, rgba(99, 102, 241, 0.09), transparent 70%);
          pointer-events: none;
        }

        .selectPlanSuccessIconWrap {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
          margin-bottom: 14px;
        }

        .selectPlanSuccessIconWrap :global(.successModalIcon) {
          width: 48px;
          height: 48px;
          margin: 0;
        }

        .selectPlanSuccessKicker {
          position: relative;
          z-index: 1;
          margin: 0 0 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #64748b;
        }

        .selectPlanSuccessTitle {
          position: relative;
          z-index: 1;
          margin: 0 0 10px;
          font-size: clamp(22px, 3.2vw, 28px);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.2;
          color: #0f172a;
        }

        .selectPlanSuccessLead {
          position: relative;
          z-index: 1;
          margin: 0 0 12px;
          font-size: 15px;
          font-weight: 600;
          color: #334155;
          line-height: 1.5;
        }

        .selectPlanSuccessBody {
          position: relative;
          z-index: 1;
          margin: 0 0 22px;
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
          max-width: 42ch;
          margin-left: auto;
          margin-right: auto;
        }

        .selectPlanSuccessActions {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
        }

        a.nextBtn,
        a.backBtn {
          text-decoration: none;
          box-sizing: border-box;
        }

        .selectPlanSuccessCta {
          width: 100%;
          justify-content: center;
        }

        .selectPlanSuccessSecondary {
          width: 100%;
          justify-content: center;
        }

        @media (min-width: 520px) {
          .selectPlanSuccessActions {
            flex-direction: row;
          flex-wrap: wrap;
            justify-content: center;
          }

          .selectPlanSuccessCta {
            width: auto;
            min-width: 200px;
            flex: 1 1 auto;
          }

          .selectPlanSuccessSecondary {
            width: auto;
            flex: 0 1 auto;
          }
        }

        .successModalIcon {
          width: 40px;
          height: 40px;
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f8fafc;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        }

        .priceFree {
          color: #166534;
        }

        .priceCadenceFree {
          color: #15803d !important;
          font-weight: 700 !important;
        }

        .planGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(14px, 2.5vw, 22px);
          align-items: stretch;
        }

        .planCard {
          position: relative;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(12px);
          padding: 22px;
          text-align: left;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          cursor: pointer;
          overflow: hidden;
          min-height: 320px;
        }

        .planCard:hover {
          transform: none;
          border-color: rgba(148, 163, 184, 0.5);
          box-shadow: 0 24px 54px rgba(15, 23, 42, 0.14);
        }

        .planCard.isSelected {
          transform: none;
          border-color: #111111;
          box-shadow: 0 0 0 2px rgba(17, 17, 17, 0.18), 0 18px 40px rgba(15, 23, 42, 0.12);
        }

        .planCardFeatured {
          border-color: rgba(99, 102, 241, 0.42);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.94) 100%);
          box-shadow:
            0 0 0 2px rgba(99, 102, 241, 0.2),
            0 22px 56px rgba(99, 102, 241, 0.14),
            0 16px 42px rgba(15, 23, 42, 0.08);
        }

        .planCardFeatured:hover {
          border-color: rgba(99, 102, 241, 0.55);
        }

        .planCardFeatured.isSelected {
          border-color: #111111;
          box-shadow:
            0 0 0 2px rgba(17, 17, 17, 0.22),
            0 22px 56px rgba(15, 23, 42, 0.14);
        }

        .planCard.isDisabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .planCardGlow {
          position: absolute;
          inset: 0;
          background: radial-gradient(420px 140px at 12% -12%, rgba(17, 17, 17, 0.08), transparent 70%);
          opacity: 0;
          transition: opacity 0.18s ease;
          pointer-events: none;
        }

        .planCard:hover .planCardGlow,
        .planCard.isSelected .planCardGlow {
          opacity: 1;
        }

        .planTop {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .popularTag {
          display: inline-flex;
          margin-bottom: 10px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(99, 102, 241, 0.35);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(236, 72, 153, 0.1));
          color: #4338ca;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .planLabel {
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-weight: 700;
        }

        h3 {
          margin: 10px 0 0;
          font-size: 28px;
          line-height: 1.1;
          color: #0f172a;
        }

        .planDays {
          margin: 6px 0 0;
          font-size: 14px;
          color: #64748b;
        }

        .priceRow {
          position: relative;
          z-index: 1;
          margin-top: 16px;
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }

        .priceAmount {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .priceCadence {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }

        .checkCircle {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.85);
          color: #94a3b8;
          font-size: 15px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .checkCircle.active {
          border-color: transparent;
          background: #111111;
          color: #ffffff;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
        }

        .cardCta {
          position: relative;
          z-index: 1;
          margin-top: 14px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.38);
          background: rgba(255, 255, 255, 0.72);
          color: #0f172a;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
          padding: 10px 12px;
        }

        .cardCta.active {
          border-color: #e5e5e5;
          background: #f5f5f5;
          color: #111111;
        }

        .included {
          position: relative;
          z-index: 1;
          margin: 14px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        ul {
          position: relative;
          z-index: 1;
          margin: 10px 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 8px;
        }

        li {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #334155;
          font-size: 14px;
        }

        li span {
          color: #111111;
          font-weight: 700;
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 4px;
        }

        .backBtn,
        .nextBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 14px 28px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease;
        }

        .backBtn {
          border: 1px solid rgba(148, 163, 184, 0.45);
          background: #ffffff;
          color: #334155;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
        }

        .nextBtn {
          border: 1px solid #111111;
          background: #111111;
          color: #ffffff;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.22);
        }

        .backBtn:hover,
        .nextBtn:hover {
          transform: translateY(-1px);
          filter: brightness(1.02);
        }

        .nextBtn:disabled {
          cursor: not-allowed;
          filter: none;
          transform: none;
          border-color: rgba(148, 163, 184, 0.45);
          background: #cbd5e1;
          box-shadow: none;
          color: #ffffff;
        }

        .secureNote {
          margin: 0;
          text-align: center;
          color: #64748b;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .planGrid {
            grid-template-columns: 1fr;
          }

          h3 {
            font-size: 24px;
          }

          .actions {
            justify-content: stretch;
          }

          .backBtn,
          .nextBtn {
            flex: 1;
            min-width: 0;
            justify-content: center;
          }
        }
      `}</style>
    </div>);
}
