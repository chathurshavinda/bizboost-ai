"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { resetPasswordEmail } from "../../src/lib/auth";
import AuthLayout from "../../src/components/auth/AuthLayout";
import AuthCard from "../../src/components/auth/AuthCard";
import AuthFeedback from "../../src/components/auth/AuthFeedback";

function ForgotPasswordForm() {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = searchParams.get("email");
        if (q)
            setEmail(decodeURIComponent(q));
    }, [searchParams]);

    const onSubmit = async () => {
        if (!email.trim()) {
            setFeedback({ text: "Enter your email address.", ok: false });
            return;
        }
        setLoading(true);
        setFeedback({ text: "Sending reset link...", ok: true });
        try {
            const res = await resetPasswordEmail(email);
            setFeedback({ text: res.message, ok: res.ok });
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <AuthCard
                title="Reset password"
                subtitle="Enter the email for your account and we will send you a link to choose a new password."
            >
                {feedback ? (
                    <AuthFeedback
                        tone={
                            feedback.ok
                                ? feedback.text.toLowerCase().includes("sending")
                                    ? "progress"
                                    : "neutral"
                                : "error"
                        }
                    >
                        {feedback.text}
                    </AuthFeedback>
                ) : null}
                <label className="authRefField">
                    <input
                        type="email"
                        className="authRefInput"
                        placeholder="Email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                void onSubmit();
                            }
                        }}
                    />
                </label>
                <button
                    type="button"
                    className="authRefPrimaryButton"
                    onClick={() => void onSubmit()}
                    disabled={loading}
                >
                    {loading ? "Sending…" : "Send reset link"}
                </button>
                <div className="authRefFooter">
                    <Link href="/login" className="authRefFooterLink">
                        Back to sign in
                    </Link>
                </div>
            </AuthCard>
        </AuthLayout>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense
            fallback={
                <AuthLayout>
                    <AuthCard title="Reset password" subtitle="Loading…">
                        <AuthFeedback>Loading…</AuthFeedback>
                    </AuthCard>
                </AuthLayout>
            }
        >
            <ForgotPasswordForm />
        </Suspense>
    );
}
