import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider,
  type User,
} from "firebase/auth";
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
  if (guard) return guard;
  try {
    const cred = await createUserWithEmailAndPassword(auth!, email, password);
    return { ok: true, message: `Account created: ${cred.user.email}`, user: cred.user };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Signup failed" };
  }
}

export async function loginEmail(email: string, password: string): Promise<AuthResult> {
  const guard = ensureAuth();
  if (guard) return guard;
  try {
    const cred = await signInWithEmailAndPassword(auth!, email, password);
    return { ok: true, message: `Logged in: ${cred.user.email}`, user: cred.user };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Login failed" };
  }
}

export async function loginWithProvider(providerName: ProviderName): Promise<AuthResult> {
  const guard = ensureAuth();
  if (guard) return guard;
  try {
    const provider =
      providerName === "google"
        ? new GoogleAuthProvider()
        : providerName === "github"
        ? new GithubAuthProvider()
        : new FacebookAuthProvider();
    const cred = await signInWithPopup(auth!, provider);
    return { ok: true, message: `Logged in: ${cred.user.email}`, user: cred.user };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Social login failed" };
  }
}

export async function logout(): Promise<AuthResult> {
  const guard = ensureAuth();
  if (guard) return guard;
  try {
    await auth!.signOut();
    return { ok: true, message: "Logged out" };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Logout failed" };
  }
}
