import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, GoogleAuthProvider, GithubAuthProvider, FacebookAuthProvider, type ActionCodeSettings, type User, } from "firebase/auth";
import { auth, firebaseEnvError } from "./firebase";
export type ProviderName = "google" | "github" | "facebook";
export type AuthResult = {
    ok: boolean;
    message: string;
    user?: User;
};
const ensureAuth = (): AuthResult | null => {
    if (!auth) {
        return { ok: false, message: firebaseEnvError || "Firebase not configured" };
    }
    return null;
};
export async function signUpEmail(email: string, password: string): Promise<AuthResult> {
    const guard = ensureAuth();
    if (guard)
        return guard;
    try {
        const cred = await createUserWithEmailAndPassword(auth!, email, password);
        return { ok: true, message: `Account created: ${cred.user.email}`, user: cred.user };
    }
    catch (e: any) {
        return { ok: false, message: e?.message || "Signup failed" };
    }
}
export async function loginEmail(email: string, password: string): Promise<AuthResult> {
    const guard = ensureAuth();
    if (guard)
        return guard;
    try {
        const cred = await signInWithEmailAndPassword(auth!, email, password);
        return { ok: true, message: `Logged in: ${cred.user.email}`, user: cred.user };
    }
    catch (e: any) {
        return { ok: false, message: e?.message || "Login failed" };
    }
}
export async function loginWithProvider(providerName: ProviderName): Promise<AuthResult> {
    const guard = ensureAuth();
    if (guard)
        return guard;
    try {
        const provider = providerName === "google"
            ? new GoogleAuthProvider()
            : providerName === "github"
                ? new GithubAuthProvider()
                : new FacebookAuthProvider();
        const cred = await signInWithPopup(auth!, provider);
        return { ok: true, message: `Logged in: ${cred.user.email}`, user: cred.user };
    }
    catch (e: any) {
        return { ok: false, message: e?.message || "Social login failed" };
    }
}
function buildPasswordResetActionSettings(): ActionCodeSettings | undefined {
    if (typeof window === "undefined")
        return undefined;
    /* Always use the current origin so local dev does not accidentally send a production URL from NEXT_PUBLIC_APP_URL. */
    return {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
    };
}

/**
 * Sends Firebase password-reset email. Retries without continue URL if the
 * domain is not yet listed under Firebase → Authentication → Authorized domains.
 * Uses a neutral success message when the email is not registered (enumeration).
 */
export async function resetPasswordEmail(email: string): Promise<AuthResult> {
    const guard = ensureAuth();
    if (guard)
        return guard;
    const trimmed = email.trim();
    if (!trimmed) {
        return { ok: false, message: "Enter your email address." };
    }
    const settings = buildPasswordResetActionSettings();
    try {
        if (settings) {
            try {
                await sendPasswordResetEmail(auth!, trimmed, settings);
            }
            catch (first: any) {
                const c = first?.code as string | undefined;
                if (c === "auth/unauthorized-continue-uri" || c === "auth/invalid-continue-uri") {
                    await sendPasswordResetEmail(auth!, trimmed);
                }
                else {
                    throw first;
                }
            }
        }
        else {
            await sendPasswordResetEmail(auth!, trimmed);
        }
        return {
            ok: true,
            message: "Check your inbox for a link to reset your password.",
        };
    }
    catch (e: any) {
        const code = e?.code as string | undefined;
        if (code === "auth/user-not-found") {
            return {
                ok: true,
                message: "If an account exists for that email, you'll receive reset instructions shortly.",
            };
        }
        if (code === "auth/invalid-email") {
            return { ok: false, message: "Please enter a valid email address." };
        }
        if (code === "auth/too-many-requests") {
            return {
                ok: false,
                message: "Too many attempts. Please wait a few minutes and try again.",
            };
        }
        if (code === "auth/operation-not-allowed") {
            return {
                ok: false,
                message: "Email/password sign-in is not enabled for this project. Ask an admin to enable it in Firebase Console (Authentication → Sign-in method).",
            };
        }
        if (code === "auth/network-request-failed") {
            return {
                ok: false,
                message: "Network error. Check your connection and try again.",
            };
        }
        if (code === "auth/unauthorized-continue-uri" || code === "auth/invalid-continue-uri") {
            return {
                ok: false,
                message:
                    "Password reset could not use this site URL. In Firebase Console → Authentication → Settings, add this site's domain (e.g. localhost or your production host) under Authorized domains, then try again.",
            };
        }
        return {
            ok: false,
            message: e?.message || "Could not send reset email. Please try again later.",
        };
    }
}

export async function logout(): Promise<AuthResult> {
    const guard = ensureAuth();
    if (guard)
        return guard;
    try {
        await auth!.signOut();
        return { ok: true, message: "Logged out" };
    }
    catch (e: any) {
        return { ok: false, message: e?.message || "Logout failed" };
    }
}
