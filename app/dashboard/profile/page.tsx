"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaChevronDown, FaBuilding, FaChartLine, FaGlobe, FaLanguage, FaMagic, FaMapMarkerAlt, FaPenNib, } from "react-icons/fa";
import { auth } from "../../../src/lib/firebase";
import { useAuth } from "../../../src/lib/useAuth";
import BusinessProfileGateModal from "../../../src/components/business-profile/BusinessProfileGateModal";
import BusinessProfileErrorModal from "../../../src/components/business-profile/BusinessProfileErrorModal";
type BusinessProfileData = {
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
type BusinessProfileApiResponse = {
    ok: true;
    data: BusinessProfileData;
} | {
    ok: false;
    error: string;
};
type ProfilePageStatus = "loading" | "ready" | "missing" | "error";
type Capability = {
    key: "strategy" | "content" | "insights";
    title: string;
    description: string;
    button: string;
    href: string;
    icon: JSX.Element;
};
const capabilities: Capability[] = [
    {
        key: "strategy",
        title: "Strategy Generator",
        description: "Craft ready-to-launch marketing strategies tailored to your niche.",
        button: "Generate Strategy",
        href: "/dashboard",
        icon: <FaMagic size={20}/>,
    },
    {
        key: "content",
        title: "Content Studio",
        description: "Spin up posters, captions, and ad copy in seconds.",
        button: "Create Content",
        href: "/dashboard/editor",
        icon: <FaPenNib size={20}/>,
    },
    {
        key: "insights",
        title: "Smart Insights",
        description: "Track what works and uncover new growth opportunities.",
        button: "View Insights",
        href: "/dashboard/day-detail",
        icon: <FaChartLine size={20}/>,
    },
];
const PROFILE_PAGE_STYLES = String.raw `
  .profilePage {
    min-height: 100vh;
    padding: 28px 16px 14px;
  background: var(--page-bg);
  }

  .profileShell {
    max-width: 1120px;
    margin: 0 auto;
    border-radius: 28px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 20px 55px rgba(15, 23, 42, 0.1);
    backdrop-filter: blur(14px);
    padding: 22px 20px;
  }

  .profileShell.businessProfileShell--loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 280px;
  }

  .profilePage :global(.heroSubtitle) {
    color: #64748b;
  }

  .moreDetailsToggle {
    margin-top: 12px;
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.75);
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    color: #334155;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .moreDetailsToggleIcon {
    transition: transform 0.2s ease;
  }

  .moreDetailsToggleIcon--open {
    transform: rotate(180deg);
  }

  .moreDetailsBody {
    margin-top: 10px;
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: max-height 0.28s ease, opacity 0.24s ease;
  }

  .moreDetailsBody--open {
    max-height: 600px;
    opacity: 1;
  }

  .moreDetailsGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .moreDetailsItem {
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.8);
    padding: 10px 11px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .moreDetailsItemLabel {
    color: #64748b;
    font-size: 12px;
    font-weight: 600;
  }

  .moreDetailsItemValue {
    color: #0f172a;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    word-break: break-word;
  }

  .businessProfileDangerRow {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
  }

  .businessProfileDeleteButton {
    border: none;
    background: transparent;
    color: #b91c1c;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    padding: 8px 4px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .businessProfileDeleteButton:hover {
    color: #7f1d1d;
  }

  .businessProfileDeleteOverlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(15, 23, 42, 0.42);
    backdrop-filter: blur(4px);
  }

  .businessProfileDeleteModal {
    width: min(100%, 420px);
    border-radius: 22px;
    border: 1px solid rgba(239, 68, 68, 0.22);
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
    padding: 22px;
  }

  .businessProfileDeleteTitle {
    margin: 0;
    color: #111827;
    font-size: 20px;
    line-height: 1.2;
  }

  .businessProfileDeleteText {
    margin: 10px 0 0;
    color: #475569;
    font-size: 14px;
    line-height: 1.6;
  }

  .businessProfileDeleteError {
    margin: 12px 0 0;
    border-radius: 12px;
    border: 1px solid rgba(239, 68, 68, 0.28);
    background: rgba(254, 242, 242, 0.95);
    color: #b91c1c;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 600;
  }

  .businessProfileDeleteActions {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .businessProfileCancelDeleteButton,
  .businessProfileConfirmDeleteButton {
    border-radius: 12px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.18s ease, opacity 0.18s ease;
  }

  .businessProfileCancelDeleteButton {
    border: 1px solid rgba(148, 163, 184, 0.42);
    background: #ffffff;
    color: #334155;
  }

  .businessProfileConfirmDeleteButton {
    border: 1px solid rgba(220, 38, 38, 0.25);
    background: #dc2626;
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(220, 38, 38, 0.22);
  }

  .businessProfileCancelDeleteButton:disabled,
  .businessProfileConfirmDeleteButton:disabled {
    cursor: not-allowed;
    opacity: 0.68;
  }

  @media (max-width: 900px) {
    .profileShell {
      padding: 14px 12px;
    }

    .moreDetailsGrid {
      grid-template-columns: 1fr;
    }
  }
`;
export default function BusinessProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<BusinessProfileData | null>(null);
    const [status, setStatus] = useState<ProfilePageStatus>("loading");
    const [retryKey, setRetryKey] = useState(0);
    const [planGateOpen, setPlanGateOpen] = useState(false);
    const [checkingPlan, setCheckingPlan] = useState(false);
    const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingProfile, setDeletingProfile] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    useEffect(() => {
        let isMounted = true;
        const loadProfile = async () => {
            if (authLoading)
                return;
            const uid = user?.uid ?? auth?.currentUser?.uid;
            console.log("UID", uid);
            if (!uid) {
                router.replace("/login");
                return;
            }
            setStatus("loading");
            try {
                const query = new URLSearchParams({ firebase_uid: uid });
                const response = await fetch(`/api/business-profile?${query.toString()}`, {
                    method: "GET",
                    cache: "no-store",
                });
                if (!isMounted)
                    return;
                if (response.status === 404) {
                    const missingResult = (await response.json()) as BusinessProfileApiResponse;
                    if (!missingResult.ok && missingResult.error === "business_profile_not_found") {
                        setProfile(null);
                        setStatus("missing");
                        return;
                    }
                    throw new Error("Profile not found.");
                }
                const data = (await response.json()) as BusinessProfileApiResponse;
                if (response.status === 500) {
                    throw new Error("Profile service is unavailable.");
                }
                if (response.status === 400) {
                    throw new Error("Invalid request.");
                }
                if (!response.ok || !data.ok || !("data" in data)) {
                    throw new Error("Failed to load profile.");
                }
                setProfile(data.data);
                setStatus("ready");
            }
            catch (error: unknown) {
                if (!isMounted)
                    return;
                console.error("Failed to load business profile:", error);
                setProfile(null);
                setStatus("error");
            }
        };
        loadProfile();
        return () => {
            isMounted = false;
        };
    }, [authLoading, retryKey, router, user]);
    async function handleStrategyGeneratorClick() {
        const uid = user?.uid ?? auth?.currentUser?.uid;
        console.log("UID", uid);
        if (!uid) {
            router.replace("/login");
            return;
        }
        try {
            setCheckingPlan(true);
            const response = await fetch(`/api/select-plan?firebase_uid=${encodeURIComponent(uid)}`, {
                cache: "no-store",
            });
            const planJson = (await response.json()) as {
                ok?: boolean;
                active?: boolean;
                planDays?: number;
            };
            const hasPlan = response.ok
                && planJson?.ok === true
                && planJson.active === true
                && [7, 14, 30].includes(Number(planJson.planDays ?? 0));
            if (!hasPlan) {
                setPlanGateOpen(true);
                return;
            }
            router.push("/select-plan");
        }
        catch {
            router.push("/select-plan");
        }
        finally {
            setCheckingPlan(false);
        }
    }
    async function handleDeleteBusinessProfile() {
        const uid = user?.uid ?? auth?.currentUser?.uid;
        console.log("UID", uid);
        if (!uid) {
            router.replace("/login");
            return;
        }
        setDeletingProfile(true);
        setDeleteError(null);
        try {
            const response = await fetch("/api/business-profile", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ firebase_uid: uid }),
            });
            const result = (await response.json()) as {
                ok: boolean;
                error?: string;
            };
            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to delete business profile.");
            }
            window.sessionStorage.setItem("bizboostProfileDeleted", "1");
            router.replace("/onboarding/business-details");
        }
        catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to delete business profile.";
            setDeleteError(message);
            setDeletingProfile(false);
        }
    }
    if (authLoading || status === "loading") {
        return (<div className="profilePage">
        <div className="profileShell businessProfileShell--loading" style={{ maxWidth: 1100 }}>
          <div style={{
                width: "100%",
                display: "grid",
                gap: 12,
                maxWidth: 420,
                margin: "0 auto",
            }}>
            <div style={{
                height: 14,
                borderRadius: 999,
                background: "rgba(148, 163, 184, 0.24)",
            }}/>
            <div style={{
                height: 14,
                borderRadius: 999,
                width: "78%",
                justifySelf: "center",
                background: "rgba(148, 163, 184, 0.2)",
            }}/>
            <div className="heroSubtitle">Checking business details...</div>
          </div>
        </div>
        <style jsx>{PROFILE_PAGE_STYLES}</style>
      </div>);
    }
    if (status === "missing") {
        return (<div className="profilePage">
        <div className="profileShell businessProfileShell--loading" style={{ maxWidth: 1100 }}>
          <div style={{
                minHeight: 340,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 12,
                borderRadius: 24,
                border: "1px solid rgba(148, 163, 184, 0.3)",
                background: "linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.92))",
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
            }}>
            <div style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid rgba(148, 163, 184, 0.35)",
                color: "#475569",
                background: "rgba(255, 255, 255, 0.95)",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
            }}>
              Details required
            </div>
            <div className="heroSubtitle">Create your Business Details to unlock this dashboard.</div>
          </div>
        </div>

        <BusinessProfileGateModal open={true} onGoToDetails={() => router.push("/onboarding/business-details")} onBackToHome={() => router.push("/")}/>
        <style jsx>{PROFILE_PAGE_STYLES}</style>
      </div>);
    }
    if (status === "error") {
        return (<div className="profilePage">
        <div className="profileShell businessProfileShell--loading" style={{ maxWidth: 1100 }}>
          <div style={{
                minHeight: 340,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 24,
                border: "1px solid rgba(148, 163, 184, 0.28)",
                background: "linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(241, 245, 249, 0.94))",
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
            }}>
            <div className="heroSubtitle">Please try again in a moment.</div>
          </div>
        </div>

        <BusinessProfileErrorModal open={true} onRetry={() => setRetryKey((value) => value + 1)} onBackToHome={() => router.push("/")}/>
        <style jsx>{PROFILE_PAGE_STYLES}</style>
      </div>);
    }
    if (!profile) {
        return null;
    }
    const businessName = profile.businessName || "Your business";
    const businessType = profile.businessType || "Business type";
    const city = profile.city || "City";
    const country = profile.country || "Country";
    const language = profile.language || "English";
    const productsOrServices = Array.isArray(profile.productsOrServices)
        ? profile.productsOrServices.join(", ")
        : profile.productsOrServices || "Not provided";
    const socialLinks = Array.isArray(profile.socialLinks) ? profile.socialLinks.join(", ") : "Not provided";
    const fields = [
        profile.businessName,
        profile.businessType,
        profile.city,
        profile.country,
        profile.language,
        Array.isArray(profile.productsOrServices) ? profile.productsOrServices.join(", ") : profile.productsOrServices,
    ];
    const filledFields = fields.filter((item) => (item ?? "").trim().length > 0).length;
    const completion = Math.round((filledFields / fields.length) * 100);
    return (<div className="profilePage">
      <div className="profileShell">
        <section className="businessProfileHero">
          <div className="businessProfileHeroInner">
          <p className="businessProfileWelcome">Welcome back</p>
          <div className="businessProfileBadge">Business profile</div>
          <h1 className="businessProfileTitle">{businessName}</h1>
          <p className="businessProfileSubtitle">
            {businessType} · {city}, {country}
          </p>

          <div className="businessProfileHeroMeta">
            <div className="businessProfileMetaChip">
              <FaLanguage size={14}/>
              <span>{language}</span>
            </div>
            <div className="businessProfileMetaChip">
              <FaGlobe size={14}/>
              <span>{country}</span>
            </div>
            <div className="businessProfileMetaChip">
              <FaMapMarkerAlt size={14}/>
              <span>{city}</span>
            </div>
          </div>

          <div className="businessProfileActionsRow">
            <button type="button" className="btn primary businessProfileActionButton" onClick={() => router.push("/select-plan")}>
              Open Plan Builder
            </button>
            <button type="button" className="btn businessProfileGhostButton" onClick={() => router.push("/onboarding/business-details")}>
              Edit business details
            </button>
          </div>
          </div>
        </section>

        <section className="businessProfileMainGrid">
          <article className="card businessProfilePanel">
            <div className="businessProfilePanelHeader">
              <div className="businessProfilePanelTitle">Company Information</div>
              <div className="businessProfilePanelHint">Core details used to personalize your strategy.</div>
            </div>

            <div className="businessProfileInfoGrid">
              <div className="businessProfileInfoItem">
                <div className="businessProfileInfoLabel">
                  <FaBuilding size={14}/>
                  <span>Business name</span>
                </div>
                <div className="businessProfileInfoValue">{businessName}</div>
              </div>

              <div className="businessProfileInfoItem">
                <div className="businessProfileInfoLabel">
                  <FaBuilding size={14}/>
                  <span>Business type</span>
                </div>
                <div className="businessProfileInfoValue">{businessType}</div>
              </div>

              <div className="businessProfileInfoItem">
                <div className="businessProfileInfoLabel">
                  <FaMapMarkerAlt size={14}/>
                  <span>City / Location</span>
                </div>
                <div className="businessProfileInfoValue">{city}</div>
              </div>

              <div className="businessProfileInfoItem">
                <div className="businessProfileInfoLabel">
                  <FaGlobe size={14}/>
                  <span>Country</span>
                </div>
                <div className="businessProfileInfoValue">{country}</div>
              </div>

              <div className="businessProfileInfoItem businessProfileInfoItemWide">
                <div className="businessProfileInfoLabel">
                  <FaLanguage size={14}/>
                  <span>Primary language</span>
                </div>
                <div className="businessProfileInfoValue">{language}</div>
              </div>

              <div className="businessProfileInfoItem businessProfileInfoItemWide">
                <div className="businessProfileInfoLabel">
                  <FaPenNib size={14}/>
                  <span>Products or services</span>
                </div>
                <div className="businessProfileInfoValue">{productsOrServices}</div>
              </div>
            </div>

            <button type="button" className="moreDetailsToggle" onClick={() => setMoreDetailsOpen((prev) => !prev)}>
              <span>More business details</span>
              <FaChevronDown size={14} className={`moreDetailsToggleIcon ${moreDetailsOpen ? "moreDetailsToggleIcon--open" : ""}`}/>
            </button>

            <div className={`moreDetailsBody ${moreDetailsOpen ? "moreDetailsBody--open" : ""}`}>
              <div className="moreDetailsGrid">
                <div className="moreDetailsItem">
                  <span className="moreDetailsItemLabel">Target audience</span>
                  <span className="moreDetailsItemValue">{profile.targetCustomers || "Not provided"}</span>
                </div>
                <div className="moreDetailsItem">
                  <span className="moreDetailsItemLabel">Business goals</span>
                  <span className="moreDetailsItemValue">{profile.businessGoals || "Not provided"}</span>
                </div>
                <div className="moreDetailsItem">
                  <span className="moreDetailsItemLabel">Social links</span>
                  <span className="moreDetailsItemValue">{socialLinks}</span>
                </div>
                <div className="moreDetailsItem">
                  <span className="moreDetailsItemLabel">Owner / manager</span>
                  <span className="moreDetailsItemValue">{profile.ownerOrManagerName || "Not provided"}</span>
                </div>
                <div className="moreDetailsItem">
                  <span className="moreDetailsItemLabel">Team size</span>
                  <span className="moreDetailsItemValue">{profile.teamSize || "Not provided"}</span>
                </div>
                <div className="moreDetailsItem">
                  <span className="moreDetailsItemLabel">Contact email</span>
                  <span className="moreDetailsItemValue">{profile.contactEmail || "Not provided"}</span>
                </div>
                <div className="moreDetailsItem">
                  <span className="moreDetailsItemLabel">Monthly business budget</span>
                  <span className="moreDetailsItemValue">{profile.monthlyBusinessBudget || "Not provided"}</span>
                </div>
                <div className="moreDetailsItem">
                  <span className="moreDetailsItemLabel">Monthly marketing budget</span>
                  <span className="moreDetailsItemValue">{profile.monthlyMarketingBudget || "Not provided"}</span>
                </div>
                <div className="moreDetailsItem">
                  <span className="moreDetailsItemLabel">Expected revenue range</span>
                  <span className="moreDetailsItemValue">{profile.expectedRevenueRange || "Not provided"}</span>
                </div>
              </div>
            </div>
          </article>

          <article className="card businessProfilePanel businessProfileStatusPanel">
            <div className="businessProfilePanelTitle">Profile Status</div>
            <div className="businessProfileProgressValue">{completion}% complete</div>
            <div className="businessProfileMeterTrack">
              <div className="businessProfileMeterFill" style={{ width: `${completion}%` }}/>
            </div>

            <div className="businessProfileStatusList">
              <div className="businessProfileStatusItem">
                <span>Saved profile fields</span>
                <strong>
                  {filledFields}/{fields.length}
                </strong>
              </div>
              <div className="businessProfileStatusItem">
                <span>Recommended next step</span>
                <strong>Select a plan</strong>
              </div>
              <div className="businessProfileStatusItem">
                <span>Readiness</span>
                <strong>{completion >= 80 ? "High" : "In progress"}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="businessProfileCapabilityGrid">
          {capabilities.map((card) => (<article key={card.key} className="card businessProfileCapabilityCard" onClick={card.key === "strategy" ? () => void handleStrategyGeneratorClick() : undefined} role={card.key === "strategy" ? "button" : undefined} tabIndex={card.key === "strategy" ? 0 : undefined} onKeyDown={card.key === "strategy"
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void handleStrategyGeneratorClick();
                    }
                }
                : undefined} style={card.key === "strategy" ? { cursor: "pointer" } : undefined}>
              <div className="businessProfileCapabilityTop">
                <span className="businessProfileCapabilityIcon">{card.icon}</span>
                <h3 className="businessProfileCapabilityTitle">{card.title}</h3>
              </div>

              <p className="businessProfileCapabilityDescription">{card.description}</p>

              <button type="button" className="btn primary businessProfileActionButton" onClick={(event) => {
                event.stopPropagation();
                if (card.key === "strategy") {
                    void handleStrategyGeneratorClick();
                    return;
                }
                router.push(card.href);
            }} disabled={card.key === "strategy" && checkingPlan}>
                {card.key === "strategy" && checkingPlan ? "Checking..." : card.button}
              </button>
            </article>))}
        </section>

        <div className="businessProfileDangerRow">
          <button type="button" className="businessProfileDeleteButton" onClick={() => {
            setDeleteError(null);
            setDeleteModalOpen(true);
        }}>
            Delete Business Profile
          </button>
        </div>
      </div>

      {planGateOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[3px]">
          <div className="w-full max-w-sm rounded-2xl border border-black/15 bg-white/65 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-6">
            <h2 className="text-lg font-semibold text-black">Select your plan first</h2>
            <p className="mt-2 text-sm text-black/65">Please choose a plan to continue.</p>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => router.push("/select-plan")} className="rounded-xl border border-black/20 bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/85">
                Go to Select Plan
              </button>
            </div>
          </div>
        </div>)}

      {deleteModalOpen && (<div className="businessProfileDeleteOverlay" role="dialog" aria-modal="true" aria-labelledby="delete-profile-title">
          <div className="businessProfileDeleteModal">
            <h2 id="delete-profile-title" className="businessProfileDeleteTitle">Delete business profile?</h2>
            <p className="businessProfileDeleteText">
              This will permanently remove your saved business details and plans. This cannot be undone.
            </p>
            {deleteError ? <p className="businessProfileDeleteError">{deleteError}</p> : null}
            <div className="businessProfileDeleteActions">
              <button type="button" className="businessProfileCancelDeleteButton" onClick={() => setDeleteModalOpen(false)} disabled={deletingProfile}>
                Cancel
              </button>
              <button type="button" className="businessProfileConfirmDeleteButton" onClick={() => void handleDeleteBusinessProfile()} disabled={deletingProfile}>
                {deletingProfile ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>)}
      <style jsx>{PROFILE_PAGE_STYLES}</style>
    </div>);
}
