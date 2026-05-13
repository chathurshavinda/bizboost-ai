"use client";
import { useState } from "react";
import { FaGoogle } from "react-icons/fa";
export type ProviderName = "google" | "github" | "facebook";
export default function SocialButtons({ onClick, disabled, mode = "continue", }: {
    onClick: (name: ProviderName) => Promise<void> | void;
    disabled?: boolean;
    mode?: "continue" | "signup";
}) {
    const [busy, setBusy] = useState<ProviderName | null>(null);
    const handle = async (name: ProviderName) => {
        try {
            setBusy(name);
            await onClick(name);
        }
        finally {
            setBusy(null);
        }
    };
    const labelFor = (name: ProviderName) => {
        if (busy === name)
            return "Continuing...";
        if (name === "google")
            return mode === "signup" ? "Sign up with Google" : "Continue with Google";
        if (name === "github")
            return "Continue with GitHub";
        return "Continue with Facebook";
    };
    return (<div className="authRefProviderRow">
      <button type="button" onClick={() => handle("google")} disabled={disabled || busy !== null} className="authRefProviderButton">
        <span className="authRefProviderIcon" aria-hidden="true">
          <FaGoogle />
        </span>
        <span className="authRefProviderLabel">{labelFor("google")}</span>
      </button>
    </div>);
}
