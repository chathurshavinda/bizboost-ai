"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginEmail, signUpEmail, loginWithProvider } from "../../src/lib/auth";
import { resolvePostLoginRoute } from "../../src/lib/postLoginRedirect";
import SocialButtons, { ProviderName } from "../../src/components/auth/SocialButtons";
import AuthLayout from "../../src/components/auth/AuthLayout";
import AuthCard from "../../src/components/auth/AuthCard";
import AuthFeedback from "../../src/components/auth/AuthFeedback";
type Tab = "login" | "signup";
export default function AuthPage() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(false);
    const routeAfterLogin = async (uid: string) => {
        setCheckingProfile(true);
        setMessage("Checking your business profile...");
        const routeResult = await resolvePostLoginRoute(uid);
        router.push(routeResult.route);
    };
    const switchTab = (next: Tab) => {
        setTab(next);
        setMessage(null);
        setPassword("");
    };
    const handleLogin = async () => {
        if (!email || !password) {
            setMessage("Please enter email and password.");
            return;
        }
        setLoading(true);
        setMessage("Logging in...");
        try {
            const res = await loginEmail(email, password);
            setMessage(res.message);
            if (res.ok && res.user) {
                await routeAfterLogin(res.user.uid);
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handleSignup = async () => {
        if (!email || !password) {
            setMessage("Please enter email and password.");
            return;
        }
        if (password.length < 6) {
            setMessage("Password should be at least 6 characters.");
            return;
        }
        setLoading(true);
        setMessage("Creating your account...");
        try {
            const res = await signUpEmail(email, password);
            setMessage(res.message);
            if (res.ok && res.user) {
                await routeAfterLogin(res.user.uid);
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handleProvider = async (name: ProviderName) => {
        setLoading(true);
        setMessage(`Continuing with ${name}...`);
        try {
            const res = await loginWithProvider(name);
            setMessage(res.message);
            if (res.ok && res.user) {
                await routeAfterLogin(res.user.uid);
            }
        }
        finally {
            setLoading(false);
        }
    };
    const isLogin = tab === "login";
    if (checkingProfile) {
        return (<AuthLayout>
        <AuthCard title="Almost there" subtitle="Checking your business profile...">
          <AuthFeedback>Please wait while we prepare your workspace.</AuthFeedback>
        </AuthCard>
      </AuthLayout>);
    }
    return (<AuthLayout>
      <AuthCard title={isLogin ? "Welcome Back" : "Create Account"} subtitle={isLogin ? "Enter your email and password to access your account" : "Enter your email and password to create your account"}>
        <div className="authRefModeSwitch" aria-label="Authentication mode">
          <button type="button" onClick={() => switchTab("login")} className={"authRefModeButton" + (isLogin ? " authRefModeButton--active" : "")}>
            Sign In
          </button>
          <button type="button" onClick={() => switchTab("signup")} className={"authRefModeButton" + (!isLogin ? " authRefModeButton--active" : "")}>
            Sign Up
          </button>
        </div>

        {message ? <AuthFeedback>{message}</AuthFeedback> : null}

        {isLogin ? (<>
            <label className="authRefField">
              <span>Email</span>
              <input type="email" autoComplete="email" className="authRefInput" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email"/>
            </label>
            <label className="authRefField">
              <span>Password</span>
              <input type="password" autoComplete="current-password" className="authRefInput" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"/>
            </label>
            <div className="authRefMetaRow">
              <label className="authCheckbox">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}/>
                <span>Remember me</span>
              </label>
              <button type="button" className="authLinkText">
                Forgot Password
              </button>
            </div>
            <button type="button" onClick={handleLogin} disabled={loading} className="authRefPrimaryButton">
              {loading && isLogin ? "Signing in..." : "Sign In"}
            </button>
          </>) : (<>
            <label className="authRefField">
              <span>Email</span>
              <input type="email" autoComplete="email" className="authRefInput" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email"/>
            </label>
            <label className="authRefField">
              <span>Password</span>
              <input type="password" autoComplete="new-password" className="authRefInput" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create your password"/>
            </label>
            <div className="authRefHint">Use at least 6 characters for your password.</div>
            <button type="button" onClick={handleSignup} disabled={loading} className="authRefPrimaryButton">
              {loading && !isLogin ? "Creating account..." : "Create Account"}
            </button>
          </>)}

        <div className="authRefSeparator"/>

        <SocialButtons onClick={handleProvider} disabled={loading} mode={isLogin ? "continue" : "signup"}/>

        <div className="authRefFooter">
          {isLogin ? (<span>
              New to BizBoost? <button type="button" className="authLinkText" onClick={() => switchTab("signup")}>Create an account</button>
            </span>) : (<span>
              Already have an account? <button type="button" className="authLinkText" onClick={() => switchTab("login")}>Sign in</button>
            </span>)}
        </div>
      </AuthCard>
    </AuthLayout>);
}
