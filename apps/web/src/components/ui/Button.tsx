"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
export default function Button({ variant = "secondary", children, className, ...rest }: {
    variant?: "primary" | "secondary";
    children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
    const cls = ["ui-button", variant, className].filter(Boolean).join(" ");
    return <button {...rest} className={cls}>{children}</button>;
}
