"use client";

const steps = [
  { id: "business", label: "Business details" },
  { id: "products", label: "Products or services" },
  { id: "team", label: "Management team" },
  { id: "financials", label: "Financials" },
] as const;

export type StepId = (typeof steps)[number]["id"]; 

type StepSidebarProps = {
  currentStep: StepId;
  onStepClick?: (step: StepId) => void;
};

export default function StepSidebar({ currentStep, onStepClick }: StepSidebarProps) {
  return (
    <aside className="onboardingSidebar">
      <ol className="onboardingStepList">
        {steps.map((step, index) => {
          const isCompleted = index < steps.findIndex((s) => s.id === currentStep);
          const isActive = step.id === currentStep;
          return (
            <li
              key={step.id}
              className="onboardingStepItem"
              onClick={() => onStepClick && onStepClick(step.id)}
              style={onStepClick ? { cursor: "pointer" } : undefined}
            >
              <div className="onboardingStepMarkerCol">
                <div
                  className={
                    "onboardingStepIcon " +
                    (isActive ? "onboardingStepIcon--active" : isCompleted ? "onboardingStepIcon--done" : "")
                  }
                >
                  <span className="onboardingStepIconDot" />
                </div>
                {index < steps.length - 1 && <div className="onboardingStepLine" />}
              </div>
              <div className="onboardingStepLabelCol">
                <span
                  className={
                    "onboardingStepLabel " +
                    (isActive ? "onboardingStepLabel--active" : isCompleted ? "onboardingStepLabel--done" : "")
                  }
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
