"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import StepSidebar, { type StepId } from "../../../src/components/onboarding/StepSidebar";
import BusinessForm from "../../../src/components/onboarding/BusinessForm";

const STEP_ORDER: StepId[] = ["business", "products", "team", "financials"];

export default function BusinessDetailsPage() {
    const [activeStep, setActiveStep] = useState<StepId>("business");
    const [detailsMode, setDetailsMode] = useState<"create" | "edit">("create");
    /** Bumps only when which sections are mounted changes (not on every ref callback). */
    const [observeTick, setObserveTick] = useState(0);
    const sectionRefs = useRef<Partial<Record<StepId, HTMLElement | null>>>({});
    const sectionMountSig = useRef<string>("");
    const registerSectionRef = useCallback((step: StepId, el: HTMLElement | null) => {
        sectionRefs.current[step] = el;
        const sig = STEP_ORDER.map((id) => (sectionRefs.current[id] ? "1" : "0")).join("");
        if (sig !== sectionMountSig.current) {
            sectionMountSig.current = sig;
            setObserveTick((t) => t + 1);
        }
    }, []);
    useEffect(() => {
        const elements = STEP_ORDER.map((id) => sectionRefs.current[id]).filter((el): el is HTMLElement => Boolean(el));
        if (elements.length === 0)
            return;
        const observer = new IntersectionObserver((entries) => {
            let bestStep: StepId | null = null;
            let bestRatio = 0;
            for (const entry of entries) {
                if (!entry.isIntersecting || entry.intersectionRatio <= 0)
                    continue;
                const target = entry.target as HTMLElement;
                const stepId = STEP_ORDER.find((id) => sectionRefs.current[id] === target);
                if (!stepId)
                    continue;
                if (entry.intersectionRatio > bestRatio) {
                    bestRatio = entry.intersectionRatio;
                    bestStep = stepId;
                }
            }
            if (bestStep)
                setActiveStep((prev) => (prev === bestStep ? prev : bestStep));
        }, {
            /* Prefer the section occupying the upper-middle of the viewport */
            root: null,
            rootMargin: "-12% 0px -35% 0px",
            threshold: [0, 0.08, 0.15, 0.25, 0.35, 0.5, 0.65, 0.8, 1],
        });
        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [observeTick]);
    const handleStepClick = (step: StepId) => {
        setActiveStep(step);
        const el = sectionRefs.current[step];
        if (el)
            el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return (<div className="bb-page">
      <section className="bb-hero-dark" aria-labelledby="biz-details-title">
        <div className="bb-hero-dark-inner">
          <p className="bb-eyebrow-dark">Business setup</p>
          <h1 id="biz-details-title" className="bb-title-dark">
            {detailsMode === "edit" ? "Update your business details" : "Tell us about your business"}
          </h1>
          <p className="bb-lead-dark">
            {detailsMode === "edit"
            ? "Keep your profile accurate so plans, captions, and recommendations stay aligned with how you operate."
            : "One structured profile powers your growth plan, marketing days, and creative tools—fill it in once, refine anytime."}
          </p>
        </div>
      </section>

      <section className="bb-band-light" aria-label="Business details form">
        <div className="bb-shell">
          <div className="onboardingCard onboardingCard--light">
            <StepSidebar currentStep={activeStep} onStepClick={handleStepClick}/>
            <BusinessForm embedded registerSectionRef={registerSectionRef} onModeChange={setDetailsMode}/>
          </div>
        </div>
      </section>
    </div>);
}
