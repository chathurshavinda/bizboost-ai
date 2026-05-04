"use client";

import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <section className="authRefBg">
      <div className="authRefShell">
        <div className="authRefFormCol">{children}</div>
        <div className="authRefVisualCol" aria-hidden="true">
          <div className="authRefVisual">
            <Image
              src="/auth-growth-hero.jpg"
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 45vw"
              className="authRefVisualImg"
              priority
            />
            <div className="authRefVisualOverlay" />
          </div>
        </div>
      </div>
    </section>
  );
}
