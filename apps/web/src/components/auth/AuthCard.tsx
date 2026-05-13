import type { ReactNode } from "react";
export default function AuthCard({ title, subtitle, children }: {
    title: string;
    subtitle?: string;
    children: ReactNode;
}) {
    return (<div className="authRefCard">
      <h2 className="authRefTitle">{title}</h2>
      {subtitle ? <p className="authRefSubtitle">{subtitle}</p> : null}
      <div className="authRefStack">{children}</div>
    </div>);
}
