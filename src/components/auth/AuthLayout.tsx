"use client";
import type { ReactNode } from "react";
import AuthHeroIllustration from "./AuthHeroIllustration";

export default function AuthLayout({ children }: {
    children: ReactNode;
}) {
    return (<section className="authRefBg">
      <div className="authRefShell">
        <div className="authRefFormCol">{children}</div>
        <div className="authRefVisualCol" aria-hidden="true">
          <div className="authRefVisual">
            <AuthHeroIllustration className="authRefVisualIllustration" />
            <div className="authRefVisualOverlay"/>
          </div>
        </div>
      </div>
    </section>);
}
