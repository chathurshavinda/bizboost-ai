import type { ReactNode } from "react";

function classForText(text: string) {
  const t = text.toLowerCase();
  if (
    /checking|logging|creating|continuing|please wait|almost there|prepare your workspace/.test(t)
  ) {
    return "authRefFeedback authRefFeedback--progress";
  }
  return "authRefFeedback";
}

export default function AuthFeedback({ children }: { children: ReactNode }) {
  const text = typeof children === "string" ? children : "";
  const className = text ? classForText(text) : "authRefFeedback";
  return (
    <div className={className} role="status">
      {children}
    </div>
  );
}
