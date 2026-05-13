"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/useAuth";
import { auth } from "../../lib/firebase";
import type { StepId } from "./StepSidebar";
type BusinessProfilePayload = {
    firebase_uid: string;
    businessName: string;
    businessType: string;
    country: string;
    city: string;
    language: string;
    productsOrServices: string[];
    targetCustomers: string;
    businessGoals: string;
    socialLinks: string[];
    ownerOrManagerName: string;
    teamSize: string;
    contactEmail: string;
    monthlyBusinessBudget: string;
    monthlyMarketingBudget: string;
    expectedRevenueRange: string;
};
type BusinessFormValues = Omit<BusinessProfilePayload, "firebase_uid">;
type BusinessProfileApiResponse = {
    ok: boolean;
    error?: string;
    data?: {
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
};
type BusinessFormProps = {
    registerSectionRef?: (step: StepId, el: HTMLElement | null) => void;
    onModeChange?: (mode: "create" | "edit") => void;
    embedded?: boolean;
};
export default function BusinessForm({ registerSectionRef, onModeChange, embedded = false }: BusinessFormProps) {
    const setBusinessSectionRef = useCallback((el: HTMLElement | null) => {
        registerSectionRef?.("business", el);
    }, [registerSectionRef]);
    const setProductsSectionRef = useCallback((el: HTMLElement | null) => {
        registerSectionRef?.("products", el);
    }, [registerSectionRef]);
    const setTeamSectionRef = useCallback((el: HTMLElement | null) => {
        registerSectionRef?.("team", el);
    }, [registerSectionRef]);
    const setFinancialsSectionRef = useCallback((el: HTMLElement | null) => {
        registerSectionRef?.("financials", el);
    }, [registerSectionRef]);
    const { user, loading: authLoading } = useAuth();
    const [status, setStatus] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [businessName, setBusinessName] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [country, setCountry] = useState("Sri Lanka");
    const [city, setCity] = useState("");
    const [language, setLanguage] = useState("English");
    const [productsOrServices, setProductsOrServices] = useState("");
    const [targetCustomers, setTargetCustomers] = useState("");
    const [businessGoals, setBusinessGoals] = useState("");
    const [socialLinks, setSocialLinks] = useState("");
    const [ownerOrManagerName, setOwnerOrManagerName] = useState("");
    const [teamSize, setTeamSize] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [monthlyBusinessBudget, setMonthlyBusinessBudget] = useState("");
    const [monthlyMarketingBudget, setMonthlyMarketingBudget] = useState("");
    const [expectedRevenueRange, setExpectedRevenueRange] = useState("");
    const [errors, setErrors] = useState<Partial<Record<keyof BusinessFormValues, string>>>({});
    const [submitting, setSubmitting] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successToastMessage, setSuccessToastMessage] = useState("Profile saved successfully");
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const router = useRouter();
    useEffect(() => {
        if (window.sessionStorage.getItem("bizboostProfileDeleted") !== "1")
            return;
        window.sessionStorage.removeItem("bizboostProfileDeleted");
        setSuccessToastMessage("Profile deleted");
        setShowSuccessToast(true);
        const timeoutId = window.setTimeout(() => setShowSuccessToast(false), 3500);
        return () => window.clearTimeout(timeoutId);
    }, []);
    useEffect(() => {
        if (authLoading)
            return;
        if (!user?.uid) {
            router.replace("/login");
            return;
        }
        let cancelled = false;
        const load = async () => {
            setProfileLoading(true);
            setFormMode("create");
            onModeChange?.("create");
            try {
                const uid = auth.currentUser?.uid ?? user.uid;
                if (!uid) {
                    console.log("UID", uid);
                    return;
                }
                console.log("UID", uid);
                const response = await fetch(`/api/business-profile?firebase_uid=${encodeURIComponent(uid)}`, {
                    cache: "no-store",
                });
                const result = (await response.json()) as BusinessProfileApiResponse;
                if (cancelled)
                    return;
                if (response.ok && result.ok && result.data) {
                    const d = result.data;
                    setFormMode("edit");
                    onModeChange?.("edit");
                    if (typeof d.businessName === "string")
                        setBusinessName(d.businessName);
                    if (typeof d.businessType === "string")
                        setBusinessType(d.businessType);
                    if (typeof d.country === "string" && d.country.trim())
                        setCountry(d.country);
                    if (typeof d.city === "string")
                        setCity(d.city);
                    if (typeof d.language === "string" && d.language.trim())
                        setLanguage(d.language);
                    if (Array.isArray(d.productsOrServices))
                        setProductsOrServices(d.productsOrServices.join(", "));
                    if (typeof d.productsOrServices === "string")
                        setProductsOrServices(d.productsOrServices);
                    if (typeof d.targetCustomers === "string")
                        setTargetCustomers(d.targetCustomers);
                    if (typeof d.businessGoals === "string")
                        setBusinessGoals(d.businessGoals);
                    if (Array.isArray(d.socialLinks))
                        setSocialLinks(d.socialLinks.join(", "));
                    if (typeof d.ownerOrManagerName === "string")
                        setOwnerOrManagerName(d.ownerOrManagerName);
                    if (typeof d.teamSize === "string")
                        setTeamSize(d.teamSize);
                    if (typeof d.contactEmail === "string")
                        setContactEmail(d.contactEmail);
                    if (typeof d.monthlyBusinessBudget === "string")
                        setMonthlyBusinessBudget(d.monthlyBusinessBudget);
                    if (typeof d.monthlyMarketingBudget === "string")
                        setMonthlyMarketingBudget(d.monthlyMarketingBudget);
                    if (typeof d.expectedRevenueRange === "string")
                        setExpectedRevenueRange(d.expectedRevenueRange);
                }
                else if (response.status === 404) {
                    setFormMode("create");
                    onModeChange?.("create");
                }
            }
            catch {
            }
            finally {
                if (!cancelled)
                    setProfileLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [authLoading, user?.uid, router, onModeChange]);
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextErrors: Partial<Record<keyof BusinessFormValues, string>> = {};
        if (!businessName.trim())
            nextErrors.businessName = "Business name is required.";
        if (!businessType.trim())
            nextErrors.businessType = "Business type is required.";
        if (!country.trim())
            nextErrors.country = "Country is required.";
        if (!city.trim())
            nextErrors.city = "City / location is required.";
        if (!language.trim())
            nextErrors.language = "Language is required.";
        if (!productsOrServices.trim())
            nextErrors.productsOrServices = "Products or services are required.";
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0)
            return;
        const firebaseUid = auth.currentUser?.uid ?? user?.uid;
        if (!firebaseUid) {
            console.log("UID", firebaseUid);
            setSubmitError("Please login again");
            return;
        }
        console.log("UID", firebaseUid);
        const toArray = (value: string) => value
            .split(/\r?\n|,/g)
            .map((item) => item.trim())
            .filter(Boolean);
        const payload: BusinessProfilePayload = {
            firebase_uid: firebaseUid,
            businessName: businessName.trim(),
            businessType: businessType.trim(),
            country: country.trim(),
            city: city.trim(),
            language: language.trim(),
            productsOrServices: toArray(productsOrServices.trim()),
            targetCustomers: targetCustomers.trim(),
            businessGoals: businessGoals.trim(),
            socialLinks: toArray(socialLinks.trim()),
            ownerOrManagerName: ownerOrManagerName.trim(),
            teamSize: teamSize.trim(),
            contactEmail: contactEmail.trim(),
            monthlyBusinessBudget: monthlyBusinessBudget.trim(),
            monthlyMarketingBudget: monthlyMarketingBudget.trim(),
            expectedRevenueRange: expectedRevenueRange.trim(),
        };
        setSubmitting(true);
        setStatus(null);
        setSubmitError(null);
        try {
            const response = await fetch("/api/business-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            const result = (await response.json()) as BusinessProfileApiResponse;
            if (!response.ok || !result.ok) {
                throw new Error(result.error ?? "Failed to save business profile.");
            }
            setStatus("Saved");
            setSuccessToastMessage("Profile saved successfully");
            setShowSuccessToast(true);
            window.setTimeout(() => setShowSuccessToast(false), 3500);
            router.push("/dashboard/profile");
        }
        catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save business profile.";
            setSubmitError(message);
        }
        finally {
            setSubmitting(false);
        }
    };
    if (authLoading || profileLoading) {
        if (embedded) {
            return (<section className="onboardingMain">
          <div className="bb-form-loading">
            <div className="bb-skeleton-line" aria-hidden/>
            <div className="bb-skeleton-line" style={{ width: "72%" }} aria-hidden/>
            <p className="onboardingSubtitle">Loading your saved profile…</p>
          </div>
        </section>);
        }
        return (<section className="onboardingMain">
        <header className="onboardingMainHeader">
          <h1 className="onboardingTitle">{formMode === "edit" ? "Edit Business Details" : "Create Business Details"}</h1>
          <p className="onboardingSubtitle">Loading your saved profile…</p>
        </header>
      </section>);
    }
    return (<section className="onboardingMain">
      {showSuccessToast ? (<div className="profileSaveToast" role="status" aria-live="polite">
          {successToastMessage}
        </div>) : null}

      {!embedded ? (<header className="onboardingMainHeader">
          <h1 className="onboardingTitle">{formMode === "edit" ? "Edit Business Details" : "Create Business Details"}</h1>
          <p className="onboardingSubtitle">Tell BizBoost AI about your business so we can tailor campaigns and content.</p>
        </header>) : null}

      <form className="onboardingForm" onSubmit={handleSubmit} noValidate>
        <section id="business" ref={setBusinessSectionRef} className="bb-form-section">
          <div className="bb-form-section-head">
            <p className="bb-form-section-kicker">Step 1</p>
            <h2 className="bb-form-section-title">Business overview</h2>
            <p className="bb-form-section-desc">
              Your public identity and location—used to personalize plans, posts, and recommendations.
            </p>
          </div>

          <div className="bb-form-field-grid">
            <div className="onboardingFieldGroup">
              <label className="onboardingLabel">
                <span>Business name</span>
                <input type="text" className={"onboardingInput" + (errors.businessName ? " onboardingInput--error" : "")} placeholder="e.g. Stellar Studio" value={businessName} onChange={(e) => setBusinessName(e.target.value)}/>
                {errors.businessName ? <span className="onboardingError">{errors.businessName}</span> : null}
              </label>
            </div>

            <div className="onboardingFieldGroup">
              <label className="onboardingLabel">
                <span>Business type</span>
                <input type="text" className={"onboardingInput" + (errors.businessType ? " onboardingInput--error" : "")} placeholder="e.g. Local restaurant, retail, consulting" value={businessType} onChange={(e) => setBusinessType(e.target.value)}/>
                {errors.businessType ? <span className="onboardingError">{errors.businessType}</span> : null}
              </label>
            </div>
          </div>

          <div className="bb-form-field-grid bb-form-field-grid--2">
            <div className="onboardingFieldGroup">
              <label className="onboardingLabel">
                <span>Country</span>
                <select className={"onboardingInput onboardingSelect" + (errors.country ? " onboardingInput--error" : "")} value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="Sri Lanka">Sri Lanka</option>
                </select>
                {errors.country ? <span className="onboardingError">{errors.country}</span> : null}
              </label>
            </div>

            <div className="onboardingFieldGroup">
              <label className="onboardingLabel">
                <span>City / location</span>
                <input type="text" className={"onboardingInput" + (errors.city ? " onboardingInput--error" : "")} placeholder="e.g. Colombo" value={city} onChange={(e) => setCity(e.target.value)}/>
                {errors.city ? <span className="onboardingError">{errors.city}</span> : null}
              </label>
            </div>
          </div>

          <div className="onboardingFieldGroup">
            <label className="onboardingLabel">
              <span>Primary language</span>
              <select className={"onboardingInput onboardingSelect" + (errors.language ? " onboardingInput--error" : "")} value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="English">English</option>
              </select>
              {errors.language ? <span className="onboardingError">{errors.language}</span> : null}
            </label>
          </div>
        </section>

        <section id="products" ref={setProductsSectionRef} className="bb-form-section">
          <div className="bb-form-section-head">
            <p className="bb-form-section-kicker">Step 2</p>
            <h2 className="bb-form-section-title">Offerings &amp; audience</h2>
            <p className="bb-form-section-desc">
              What you sell, who you serve, and where you show up online.
            </p>
          </div>

          <div className="onboardingFieldGroup">
            <label className="onboardingLabel">
              <span>Main products or services</span>
              <textarea className={"onboardingInput onboardingInput--multiline" + (errors.productsOrServices ? " onboardingInput--error" : "")} rows={3} placeholder="e.g. Catering packages, lunch combos, weekend tasting menus" value={productsOrServices} onChange={(e) => setProductsOrServices(e.target.value)}/>
              {errors.productsOrServices ? <span className="onboardingError">{errors.productsOrServices}</span> : null}
            </label>
          </div>

          <div className="bb-form-field-grid bb-form-field-grid--2">
            <div className="onboardingFieldGroup">
              <label className="onboardingLabel">
                <span>Target customers</span>
                <input type="text" className="onboardingInput" placeholder="e.g. Office workers within 2 km, families on weekends" value={targetCustomers} onChange={(e) => setTargetCustomers(e.target.value)}/>
              </label>
            </div>

            <div className="onboardingFieldGroup">
              <label className="onboardingLabel">
                <span>Business goals</span>
                <input type="text" className="onboardingInput" placeholder="e.g. More weekday orders and repeat visits" value={businessGoals} onChange={(e) => setBusinessGoals(e.target.value)}/>
              </label>
            </div>
          </div>

          <div className="onboardingFieldGroup">
            <label className="onboardingLabel">
              <span>Social links (comma separated)</span>
              <input type="text" className="onboardingInput" placeholder="instagram.com/yourbrand, facebook.com/yourbrand" value={socialLinks} onChange={(e) => setSocialLinks(e.target.value)}/>
            </label>
          </div>

          <div className="onboardingFieldGroup">
            <label className="onboardingLabel">
              <span>Typical price range</span>
              <input type="text" className="onboardingInput" placeholder="e.g. LKR 5,000 – 50,000 per package"/>
            </label>
          </div>
        </section>

        <section id="team" ref={setTeamSectionRef} className="bb-form-section">
          <div className="bb-form-section-head">
            <p className="bb-form-section-kicker">Step 3</p>
            <h2 className="bb-form-section-title">Team &amp; contact</h2>
            <p className="bb-form-section-desc">
              Who we should reference in your plan and how to reach you.
            </p>
          </div>

          <div className="bb-form-field-grid bb-form-field-grid--2">
            <div className="onboardingFieldGroup">
              <label className="onboardingLabel">
                <span>Owner / manager name</span>
                <input type="text" className="onboardingInput" placeholder="e.g. Jane Perera" value={ownerOrManagerName} onChange={(e) => setOwnerOrManagerName(e.target.value)}/>
              </label>
            </div>

            <div className="onboardingFieldGroup">
              <label className="onboardingLabel">
                <span>Team size</span>
                <input type="text" className="onboardingInput" placeholder="e.g. Solo founder, 3 full-time" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}/>
              </label>
            </div>
          </div>

          <div className="onboardingFieldGroup">
            <label className="onboardingLabel">
              <span>Contact email</span>
              <input type="email" className="onboardingInput" placeholder="hello@yourbusiness.lk" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}/>
            </label>
          </div>
        </section>

        <section id="financials" ref={setFinancialsSectionRef} className="bb-form-section">
          <div className="bb-form-section-head">
            <p className="bb-form-section-kicker">Step 4</p>
            <h2 className="bb-form-section-title">Budget &amp; revenue</h2>
            <p className="bb-form-section-desc">
              Helps BizBoost scale tactics to the resources you actually have.
            </p>
          </div>

          <div className="bb-form-field-grid bb-form-field-grid--2">
            <div className="onboardingFieldGroup">
              <label className="onboardingLabel">
                <span>Monthly business budget</span>
                <input type="text" className="onboardingInput" placeholder="e.g. LKR 100,000 / month" value={monthlyBusinessBudget} onChange={(e) => setMonthlyBusinessBudget(e.target.value)}/>
              </label>
            </div>

            <div className="onboardingFieldGroup">
              <label className="onboardingLabel">
                <span>Monthly marketing budget</span>
                <input type="text" className="onboardingInput" placeholder="e.g. LKR 25,000 / month" value={monthlyMarketingBudget} onChange={(e) => setMonthlyMarketingBudget(e.target.value)}/>
              </label>
            </div>
          </div>

          <div className="onboardingFieldGroup">
            <label className="onboardingLabel">
              <span>Expected revenue range</span>
              <input type="text" className="onboardingInput" placeholder="e.g. LKR 200,000 – 500,000 / month" value={expectedRevenueRange} onChange={(e) => setExpectedRevenueRange(e.target.value)}/>
            </label>
          </div>

          {status ? <p className="onboardingStatus">{status}</p> : null}
          {submitError ? <p className="onboardingError">{submitError}</p> : null}

          <div className="onboardingActions flex justify-end gap-3 pt-2">
            <button type="submit" className="onboardingSubmitButton" disabled={submitting}>
              {submitting ? "Saving…" : "Save & continue"}
            </button>
          </div>
        </section>
      </form>

      <style jsx>{`
        .profileSaveToast {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          padding: 12px 20px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.35);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
          backdrop-filter: blur(12px);
        }
      `}</style>
    </section>);
}
