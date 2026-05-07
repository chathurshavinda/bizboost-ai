"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
type HistoryPlan = {
    _id?: string;
    status?: "active" | "completed" | "archived";
    durationDays?: number;
    startDate?: string;
    endDate?: string;
    progress?: {
        completedCount?: number;
        percent?: number;
    };
    createdAt?: string;
};
export default function MarketingPlanHistoryPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [plans, setPlans] = useState<HistoryPlan[]>([]);
    useEffect(() => {
        if (loading)
            return;
        if (!user?.uid) {
            router.replace("/login");
            return;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const response = await fetch(`/api/marketing-plan/history?firebase_uid=${encodeURIComponent(user.uid)}`, {
                    cache: "no-store",
                });
                const json = await response.json();
                if (cancelled)
                    return;
                setPlans(Array.isArray(json?.plans) ? json.plans : []);
            }
            catch {
                if (!cancelled)
                    setPlans([]);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [loading, user?.uid, router]);
    return (<div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ marginBottom: 12 }}>Plan History</h1>
      <button onClick={() => router.push("/marketing-plan")} style={{ marginBottom: 12 }}>Back to Marketing Plan</button>
      <div style={{ display: "grid", gap: 10 }}>
        {plans.map((plan) => (<div key={plan._id} style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, background: "#fff" }}>
            <p style={{ margin: 0, fontWeight: 700 }}>
              {plan.durationDays} Days · {plan.status}
            </p>
            <p style={{ margin: "6px 0 0" }}>
              {plan.startDate} to {plan.endDate}
            </p>
            <p style={{ margin: "6px 0 0" }}>
              {plan.progress?.completedCount ?? 0} completed · {plan.progress?.percent ?? 0}%
            </p>
          </div>))}
      </div>
    </div>);
}
