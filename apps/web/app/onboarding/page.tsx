"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/lib/useAuth";
import StepSidebar from "../../src/components/onboarding/StepSidebar";
import BusinessForm from "../../src/components/onboarding/BusinessForm";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [user, loading, router]);

  if (!ready) {
    return (
      <div className="authWrap">
        <div style={{ color: "var(--text-muted)" }}>Loading your onboarding...</div>
      </div>
    );
  }

  return (
    <div className="onboardingWrap">
      <div className="onboardingCard">
        <StepSidebar currentStep="business" />
        <BusinessForm />
      </div>
    </div>
  );
}
