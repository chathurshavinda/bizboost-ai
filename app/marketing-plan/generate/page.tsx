"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
type DayItem = {
    day: number;
    objective: string;
    postIdea: string;
    caption: string;
    hashtags: string[];
    channel: "Facebook" | "Instagram";
    bestTime: string;
    cta: string;
};
type ApiErrorCode = "business_profile_not_found" | "plan_not_selected" | "subscription_required" | "generic" | "";
export default function GenerateMarketingPlanPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [channel, setChannel] = useState<"Instagram" | "Facebook">("Instagram");
    const [goal, setGoal] = useState("");
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<DayItem[]>([]);
    const [planDays, setPlanDays] = useState(0);
    const [openDay, setOpenDay] = useState<number | null>(null);
    const [copiedDay, setCopiedDay] = useState<number | null>(null);
    const [errorCode, setErrorCode] = useState<ApiErrorCode>("");
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace("/login");
        }
    }, [authLoading, user, router]);
    async function generate() {
        if (!user?.uid) {
            router.replace("/login");
            return;
        }
        setLoading(true);
        setErrorCode("");
        try {
            const res = await fetch("/api/marketing-plan/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firebase_uid: user.uid,
                    channel,
                    goal,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                if (data?.error === "business_profile_not_found") {
                    setErrorCode("business_profile_not_found");
                }
                else if (data?.error === "plan_not_selected") {
                    setErrorCode("plan_not_selected");
                }
                else if (data?.code === "SUBSCRIPTION_REQUIRED") {
                    setErrorCode("subscription_required");
                }
                else {
                    setErrorCode("generic");
                }
                return;
            }
            const nextPlan: DayItem[] = Array.isArray(data?.data?.planData) ? data.data.planData : [];
            setPlan(nextPlan);
            setPlanDays(Number(data?.data?.planDays || nextPlan.length || 0));
            setOpenDay(nextPlan.length > 0 ? nextPlan[0].day : null);
        }
        catch {
            setErrorCode("generic");
        }
        finally {
            setLoading(false);
        }
    }
    async function copyCaption(caption: string, day: number) {
        try {
            await navigator.clipboard.writeText(caption);
            setCopiedDay(day);
            setTimeout(() => setCopiedDay(null), 1400);
        }
        catch {
            setCopiedDay(null);
        }
    }
    function downloadJson() {
        if (plan.length === 0)
            return;
        const payload = {
            planDays,
            channel,
            goal,
            planData: plan,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "marketing-plan.json";
        a.click();
        URL.revokeObjectURL(url);
    }
    const errorContent = useMemo(() => {
        if (errorCode === "business_profile_not_found") {
            return {
                title: "Complete business details first",
                ctaText: "Go to Business Details",
                onClick: () => router.push("/onboarding/business-details"),
            };
        }
        if (errorCode === "plan_not_selected") {
            return {
                title: "Select a plan first",
                ctaText: "Go to Select Plan",
                onClick: () => router.push("/select-plan"),
            };
        }
        if (errorCode === "subscription_required") {
            return {
                title: "Pro subscription required",
                ctaText: "Subscribe on Select plan",
                onClick: () => router.push("/select-plan"),
            };
        }
        if (errorCode === "generic") {
            return {
                title: "Something went wrong",
                ctaText: "Retry",
                onClick: generate,
            };
        }
        return null;
    }, [errorCode, router]);
    return (<div className="bb-workspace-canvas min-h-screen px-4 py-8 text-black sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
        <section className="rounded-3xl border border-black/15 bg-black/10 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-300 sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => router.push("/select-plan")} className="rounded-full border border-black/15 bg-white/60 px-3 py-1.5 text-xs font-medium text-black/80 transition hover:scale-[1.02] hover:bg-white/90">
              Back
            </button>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-4xl">Marketing Plan Generator</h1>
          <p className="mt-2 text-sm text-black/65 sm:text-base">
            Pick a channel and create a ready-to-post schedule.
          </p>
        </section>

        <section className="rounded-3xl border border-black/15 bg-black/10 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.07)] backdrop-blur-xl transition-all duration-300 sm:p-8">
          <div className="space-y-5">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-black/60">Channel</label>
              <div className="mt-2 inline-flex rounded-full border border-black/15 bg-black/10 p-1">
                <button type="button" onClick={() => setChannel("Instagram")} className={`rounded-full px-4 py-2 text-sm font-medium transition ${channel === "Instagram" ? "bg-black text-white shadow-sm" : "text-black/70 hover:bg-white/80"}`}>
                  Instagram
                </button>
                <button type="button" onClick={() => setChannel("Facebook")} className={`rounded-full px-4 py-2 text-sm font-medium transition ${channel === "Facebook" ? "bg-black text-white shadow-sm" : "text-black/70 hover:bg-white/80"}`}>
                  Facebook
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-black/60">Goal (optional)</label>
              <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g., Increase sales / awareness" className="mt-2 w-full rounded-2xl border border-black/15 bg-white/70 px-4 py-3 text-sm text-black outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/10"/>
            </div>

            <button type="button" disabled={loading || authLoading} onClick={generate} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-black/20 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              {loading ? (<>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"/>
                  Generating...
                </>) : ("Generate Plan")}
            </button>
          </div>
        </section>

        {errorContent && (<section className="rounded-2xl border border-black/15 bg-black/10 p-4 shadow-[0_12px_35px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-black/85">{errorContent.title}</p>
              <button type="button" onClick={errorContent.onClick} className="inline-flex items-center justify-center rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white">
                {errorContent.ctaText}
              </button>
            </div>
          </section>)}

        {plan.length > 0 && (<section className="rounded-3xl border border-black/15 bg-black/10 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-300 sm:p-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-black sm:text-2xl">Your Plan ({planDays || plan.length} Days)</h2>
              <button type="button" onClick={downloadJson} className="rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white">
                Download JSON
              </button>
            </div>

            <div className="space-y-3">
              {plan.map((d) => {
                const isOpen = openDay === d.day;
                return (<article key={d.day} className="overflow-hidden rounded-2xl border border-black/10 bg-white/80 shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition-all duration-300">
                    <button type="button" onClick={() => setOpenDay((prev) => (prev === d.day ? null : d.day))} className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-black/5">
                      <span className="text-sm font-semibold text-black sm:text-base">Day {d.day}</span>
                      <span className="text-xs text-black/60">{isOpen ? "Hide" : "Show"}</span>
                    </button>

                    {isOpen && (<div className="space-y-4 border-t border-black/10 px-4 py-4 text-sm text-black/80 sm:px-5">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-black/50">Objective</p>
                          <p className="mt-1">{d.objective}</p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-black/50">Post Idea</p>
                          <p className="mt-1">{d.postIdea}</p>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-black/50">Caption</p>
                            <button type="button" onClick={() => copyCaption(d.caption, d.day)} className="rounded-lg border border-black/15 bg-white px-3 py-1 text-xs font-medium text-black transition hover:bg-black hover:text-white">
                              {copiedDay === d.day ? "Copied" : "Copy Caption"}
                            </button>
                          </div>
                          <pre className="whitespace-pre-wrap rounded-xl border border-black/10 bg-black/[0.03] p-3 font-sans text-sm leading-relaxed text-black/75">
                            {d.caption}
                          </pre>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-black/50">Hashtags</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {d.hashtags.map((tag) => (<span key={`${d.day}-${tag}`} className="rounded-full border border-black/12 bg-white px-2.5 py-1 text-xs text-black/70">
                                {tag}
                              </span>))}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-black/10 bg-white p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-black/50">Best Time</p>
                            <p className="mt-1 text-sm text-black/80">{d.bestTime}</p>
                          </div>
                          <div className="rounded-xl border border-black/10 bg-white p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-black/50">CTA</p>
                            <p className="mt-1 text-sm text-black/80">{d.cta}</p>
                          </div>
                        </div>
                      </div>)}
                  </article>);
            })}
            </div>
          </section>)}
      </div>
    </div>);
}
