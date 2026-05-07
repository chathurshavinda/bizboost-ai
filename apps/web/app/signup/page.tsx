"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpEmail, loginWithProvider } from "../../src/lib/auth";
import { resolvePostLoginRoute } from "../../src/lib/postLoginRedirect";
import AuthLayout from "../../src/components/auth/AuthLayout";
import AuthCard from "../../src/components/auth/AuthCard";
import AuthFeedback from "../../src/components/auth/AuthFeedback";
import SocialButtons, { ProviderName } from "../../src/components/auth/SocialButtons";
export default function SignupPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(false);
    const routeAfterAuth = async (uid: string) => {
        setCheckingProfile(true);
        setMsg("Checking your business profile...");
        const routeResult = await resolvePostLoginRoute(uid);
        router.push(routeResult.route);
    };
    const onSignup = async () => {
        if (!email || !password) {
            setMsg("Please enter email and password.");
            return;
        }
        if (password.length < 6) {
            setMsg("Password should be at least 6 characters.");
            return;
        }
        setLoading(true);
        setMsg("Creating account...");
        try {
            const res = await signUpEmail(email, password);
            setMsg(res.message);
            if (res.ok && res.user) {
                await routeAfterAuth(res.user.uid);
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
                await routeAfterAuth(res.user.uid);
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
      <AuthCard title="Welcome to BizBoost" subtitle="Create an account to continue">
        {msg ? <AuthFeedback>{msg}</AuthFeedback> : null}
        <SocialButtons onClick={onProvider} disabled={loading} mode="signup"/>
        <div className="authRefOr">OR</div>
        <label className="authRefField">
          <input type="text" className="authRefInput" placeholder="Name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)}/>
        </label>
        <label className="authRefField">
          <input type="email" className="authRefInput" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}/>
        </label>
        <label className="authRefField">
          <input type="password" className="authRefInput" placeholder="Password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}/>
        </label>
        <button type="button" className="authRefPrimaryButton" onClick={onSignup} disabled={loading}>
          {loading ? "Creating account..." : "Create an account"}
        </button>
        <div className="authRefFooter">
          Already have an account? {" "}
          <Link href="/login" className="authRefFooterLink">Sign In</Link>
        </div>
        <div className="authRefTerms">
          By continuing, you confirm that you&apos;ve read and agreed to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </div>
      </AuthCard>
    </AuthLayout>);
}
