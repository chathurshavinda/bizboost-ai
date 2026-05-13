import type { ReactNode } from "react";
function classForText(text: string) {
    const t = text.toLowerCase();
    if (/checking|logging|creating|continuing|please wait|almost there|prepare your workspace|sending reset/.test(t)) {
        return "authRefFeedback authRefFeedback--progress";
    }
    return "authRefFeedback";
}
export default function AuthFeedback({ children, tone, }: {
    children: ReactNode;
    tone?: "neutral" | "progress" | "error";
}) {
    const text = typeof children === "string" ? children : "";
    if (tone === "error") {
        return (<div className="authRefFeedback authRefFeedback--error" role="alert">
                {children}
            </div>);
    }
    if (tone === "neutral") {
        return (<div className="authRefFeedback" role="status">
                {children}
            </div>);
    }
    const className = tone === "progress"
        ? "authRefFeedback authRefFeedback--progress"
        : text
            ? classForText(text)
            : "authRefFeedback";
    return (<div className={className} role="status">
            {children}
        </div>);
}
