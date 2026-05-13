"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginEmail, loginWithProvider } from "../../src/lib/auth";
import { resolvePostLoginRoute } from "../../src/lib/postLoginRedirect";
import AuthLayout from "../../src/components/auth/AuthLayout";
import AuthCard from "../../src/components/auth/AuthCard";
import AuthFeedback from "../../src/components/auth/AuthFeedback";
import SocialButtons, { ProviderName } from "../../src/components/auth/SocialButtons";
export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(false);
    const routeAfterLogin = async (uid: string) => {
        setCheckingProfile(true);
        setMsg("Checking your business profile...");
        const routeResult = await resolvePostLoginRoute(uid);
        router.push(routeResult.route);
    };
    const onLogin = async () => {
        if (!email || !password) {
            setMsg("Please enter email and password.");
            return;
        }
        setLoading(true);
        setMsg("Logging in...");
        try {
            const res = await loginEmail(email, password);
            setMsg(res.message);
            if (res.ok && res.user) {
                await routeAfterLogin(res.user.uid);
            }
        }
        finally {
            setLoading(false);
        }
    };
    const onProvider = async (name: ProviderName) => {
        setLoading(true);
        setMsg(`Continuing with ${name}...`);
        try {
            const res = await loginWithProvider(name);
            setMsg(res.message);
            if (res.ok && res.user) {
                await routeAfterLogin(res.user.uid);
            }
        }
        finally {
            setLoading(false);
        }
    };
    if (checkingProfile) {
        return (<AuthLayout>
        <AuthCard title="Almost there" subtitle="Checking your business profile...">
          <AuthFeedback>Please wait while we prepare your workspace.</AuthFeedback>
        </AuthCard>
      </AuthLayout>);
    }
    return (<AuthLayout>
      <AuthCard title="Welcome back" subtitle="Sign in to your account to continue">
        {msg ? <AuthFeedback>{msg}</AuthFeedback> : null}
        <SocialButtons onClick={onProvider} disabled={loading} mode="continue"/>
        <div className="authRefOr">OR</div>
        <label className="authRefField">
          <input type="email" className="authRefInput" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}/>
        </label>
        <label className="authRefField">
          <input type="password" className="authRefInput" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}/>
        </label>
        <button type="button" className="authRefPrimaryButton" onClick={onLogin} disabled={loading}>
          {loading ? "Signing in..." : "Sign In to your account"}
        </button>
        <Link
          href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : "/forgot-password"}
          className="authRefForgotLink"
        >
          Forgot password?
        </Link>
        <div className="authRefFooter">
          Don&apos;t have an account? {" "}
          <Link href="/signup" className="authRefFooterLink">Create an account</Link>
        </div>
      </AuthCard>
    </AuthLayout>);
}
