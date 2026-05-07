"use client";
import type { InputHTMLAttributes } from "react";
export default function Input(props: InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={["ui-input", props.className].filter(Boolean).join(" ")}/>;
}
