"use client";

import { useEffect, useRef, useState } from "react";
import StepSidebar, { type StepId } from "../../../src/components/onboarding/StepSidebar";
import BusinessForm from "../../../src/components/onboarding/BusinessForm";

export default function BusinessDetailsPage() {
  const [activeStep, setActiveStep] = useState<StepId>("business");
  const [detailsMode, setDetailsMode] = useState<"create" | "edit">("create");
  const sectionRefs = useRef<Partial<Record<StepId, HTMLElement | null>>>({});

  const registerSectionRef = (step: StepId, el: HTMLElement | null) => {
    sectionRefs.current[step] = el;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let bestStep: StepId | null = null;
        let bestRatio = 0;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          const match = (Object.entries(sectionRefs.current) as [StepId, HTMLElement | null][]).find(
            ([, el]) => el === target
          );
          if (!match) return;
          const [stepId] = match;
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestStep = stepId;
          }
        });

        if (bestStep && bestStep !== activeStep) {
          setActiveStep(bestStep);
        }
      },
      {
        threshold: [0.3, 0.5, 0.7],
      }
    );

    const elements = (Object.entries(sectionRefs.current) as [StepId, HTMLElement | null][]) 
      .filter(([id]) => id === "business" || id === "products" || id === "team" || id === "financials")
      .map(([, el]) => el)
      .filter((el): el is HTMLElement => Boolean(el));

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [activeStep]);

  const handleStepClick = (step: StepId) => {
    const el = sectionRefs.current[step];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="detailsPage">
      <div className="detailsShell">
        <section className="detailsHeader">
          <p className="eyebrow">Business Setup</p>
          <h1>{detailsMode === "edit" ? "Edit Business Details" : "Create Business Details"}</h1>
          <p>
            {detailsMode === "edit"
              ? "Update your business profile to keep your strategy and content accurate."
              : "Complete your core profile to personalize your growth and marketing plan."}
          </p>
        </section>

        <section className="detailsCard onboardingWrap">
          <div className="onboardingCard">
            <StepSidebar currentStep={activeStep} onStepClick={handleStepClick} />
            <BusinessForm registerSectionRef={registerSectionRef} onModeChange={setDetailsMode} />
          </div>
        </section>
      </div>

      <style jsx>{`
        .detailsPage {
          min-height: 100vh;
          padding: 28px 16px 14px;
          background: var(--page-bg);
        }

        .detailsShell {
          max-width: 1140px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .detailsHeader,
        .detailsCard {
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(12px);
        }

        .detailsHeader {
          padding: 20px 18px;
        }

        .eyebrow {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }

        h1 {
          margin: 8px 0 0;
          color: #0f172a;
          font-size: clamp(30px, 4.6vw, 44px);
          line-height: 1.08;
          letter-spacing: -0.02em;
        }

        p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
        }

        .detailsCard {
          padding: 0;
          overflow: hidden;
        }

        .detailsCard :global(.onboardingWrap) {
          min-height: 0;
          padding: 0;
          background: transparent;
        }

        .detailsCard :global(.onboardingCard) {
          max-width: none;
          border: none;
          box-shadow: none;
          background: transparent;
          backdrop-filter: none;
          padding: 22px 20px;
          gap: 24px;
        }

        .detailsCard :global(.onboardingSidebar) {
          border-right: 1px solid rgba(148, 163, 184, 0.28);
        }

        .detailsCard :global(.onboardingTitle),
        .detailsCard :global(.onboardingPanelTitle) {
          color: #0f172a;
        }

        .detailsCard :global(.onboardingSubtitle),
        .detailsCard :global(.onboardingLabel),
        .detailsCard :global(.onboardingStepLabel),
        .detailsCard :global(.onboardingHint) {
          color: #64748b;
        }

        .detailsCard :global(.onboardingInput) {
          background: rgba(255, 255, 255, 0.9);
          color: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.44);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        .detailsCard :global(.onboardingInput::placeholder) {
          color: #94a3b8;
        }

        .detailsCard :global(.onboardingInput:focus) {
          border-color: rgba(16, 185, 129, 0.55);
          box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.45), 0 0 0 6px rgba(16, 185, 129, 0.12);
          background: #ffffff;
        }

        .detailsCard :global(.onboardingSubmitButton) {
          border: 1px solid rgba(16, 185, 129, 0.3);
          background: linear-gradient(145deg, #10b981, #059669);
          color: #ffffff;
          border-radius: 12px;
          padding: 12px 26px;
          text-transform: none;
          letter-spacing: 0.01em;
          font-size: 15px;
          font-weight: 700;
          box-shadow: 0 14px 28px rgba(16, 185, 129, 0.34);
        }

        @media (max-width: 900px) {
          .detailsCard :global(.onboardingCard) {
            padding: 18px 14px;
          }

          .detailsCard :global(.onboardingSidebar) {
            border-right: none;
            border-bottom: 1px solid rgba(148, 163, 184, 0.28);
          }
        }
      `}</style>
    </div>
  );
}
