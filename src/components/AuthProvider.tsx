"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  signIn as signInWithNextAuth,
  signOut as signOutWithNextAuth,
  useSession,
} from "next-auth/react";
import type {
  SupabaseClient,
  User as SupabaseUser,
} from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Language, StudentProfile } from "@/types/chat";
import type {
  AuthActionResult,
  AuthBackend,
  AuthUser,
  SignInInput,
  SignUpInput,
} from "@/types/auth";

const LOCAL_USERS_KEY = "atomic-pathshala-local-users";
const LOCAL_SESSION_KEY = "atomic-pathshala-local-session";
const REMEMBERED_EMAIL_KEY = "atomic-pathshala-remembered-email";

interface LocalAccount {
  id: string;
  email: string;
  passwordHash: string;
  profile: StudentProfile;
  createdAt: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: StudentProfile;
  backend: AuthBackend;
  loading: boolean;
  signIn: (input: SignInInput) => Promise<AuthActionResult>;
  signUp: (input: SignUpInput) => Promise<AuthActionResult>;
  signInWithGoogle: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getLocalAccounts(): LocalAccount[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as LocalAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalAccount[]) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(accounts));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(email: string, password: string) {
  const data = new TextEncoder().encode(`${normalizeEmail(email)}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isLanguage(value: unknown): value is Language {
  return value === "english" || value === "hindi" || value === "hinglish";
}

function isTarget(value: unknown): value is NonNullable<StudentProfile["target"]> {
  return value === "NEET" || value === "JEE" || value === "Board" || value === "Other";
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function createAuthUserFromLocal(account: LocalAccount): AuthUser {
  return {
    id: account.id,
    email: account.email,
    name: account.profile.name,
  };
}

function createProfileFromSupabase(user: SupabaseUser): StudentProfile {
  const metadata = user.user_metadata as Record<string, unknown>;

  return {
    name: readString(metadata.name) ?? readString(metadata.full_name),
    className: readString(metadata.className),
    target: isTarget(metadata.target) ? metadata.target : "NEET",
    language: isLanguage(metadata.language) ? metadata.language : "hinglish",
  };
}

function createAuthUserFromSupabase(user: SupabaseUser): AuthUser {
  const metadata = user.user_metadata as Record<string, unknown>;

  return {
    id: user.id,
    email: user.email ?? "",
    name: readString(metadata.name) ?? readString(metadata.full_name),
  };
}

function createAuthUserFromSession(user: {
  id: string;
  email?: string | null;
  name?: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? undefined,
  };
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: nextAuthSession, status: nextAuthStatus, update: updateNextAuthSession } =
    useSession();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [backend, setBackend] = useState<AuthBackend>("guest");
  const [profile, setProfile] = useState<StudentProfile>({
    target: "NEET",
    language: "hinglish",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    async function hydrate() {
      if (nextAuthStatus === "loading") return;

      const sessionUser = nextAuthSession?.user;
      if (sessionUser?.id) {
        setBackend("nextauth");
        setUser(createAuthUserFromSession(sessionUser));
        setProfile({
          name: sessionUser.name ?? undefined,
          target: "NEET",
          language: "hinglish",
        });

        try {
          const response = await fetch("/api/profile", { cache: "no-store" });
          if (response.ok) {
            const data = (await response.json()) as { studentProfile?: StudentProfile };
            if (mounted && data.studentProfile) setProfile(data.studentProfile);
          }
        } catch {
          // A session remains usable if profile enrichment is temporarily unavailable.
        }

        if (mounted) setLoading(false);
        return;
      }

      const client = await getSupabaseBrowserClient();
      if (!mounted) return;

      setSupabase(client);

      if (client) {
        const { data } = await client.auth.getSession();
        const sessionUser = data.session?.user;

        if (mounted && sessionUser) {
          setUser(createAuthUserFromSupabase(sessionUser));
          setProfile(createProfileFromSupabase(sessionUser));
          setBackend("supabase");
        }

        const subscription = client.auth.onAuthStateChange((_event, session) => {
          const sessionUser = session?.user;

          if (sessionUser) {
            setUser(createAuthUserFromSupabase(sessionUser));
            setProfile(createProfileFromSupabase(sessionUser));
            setBackend("supabase");
            return;
          }

          setUser(null);
          setProfile({ target: "NEET", language: "hinglish" });
          setBackend("guest");
        });

        unsubscribe = () => subscription.data.subscription.unsubscribe();

        if (mounted) setLoading(false);
        return;
      }

      const sessionId = localStorage.getItem(LOCAL_SESSION_KEY);
      const account = getLocalAccounts().find((item) => item.id === sessionId);

      if (mounted && account) {
        setUser(createAuthUserFromLocal(account));
        setProfile(account.profile);
        setBackend("local");
      } else if (mounted) {
        setBackend("guest");
      }

      if (mounted) setLoading(false);
    }

    void hydrate();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [nextAuthSession, nextAuthStatus]);

  const signIn = useCallback(
    async ({ email, password, remember }: SignInInput) => {
      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail || password.length < 6) {
        throw new Error("Enter a valid email and a password with at least 6 characters.");
      }

      const localAccount = getLocalAccounts().find((item) => item.email === cleanEmail);
      if (localAccount) {
        const passwordHash = await hashPassword(cleanEmail, password);
        if (passwordHash !== localAccount.passwordHash) {
          throw new Error("Incorrect password.");
        }

        localStorage.setItem(LOCAL_SESSION_KEY, localAccount.id);
        if (remember) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, cleanEmail);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
        setUser(createAuthUserFromLocal(localAccount));
        setProfile(localAccount.profile);
        setBackend("local");
        return {};
      }

      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error("Login failed. Please try again.");

        setUser(createAuthUserFromSupabase(data.user));
        setProfile(createProfileFromSupabase(data.user));
        setBackend("supabase");
        return {};
      }

      const result = await signInWithNextAuth("credentials", {
        redirect: false,
        email: cleanEmail,
        password,
        remember: remember ? "true" : "false",
      });
      if (!result?.ok) {
        throw new Error(
          result?.error === "CredentialsSignin"
            ? "Incorrect email or password."
            : "Account not found. Please create an account first."
        );
      }

      if (remember) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, cleanEmail);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      const session = await updateNextAuthSession();
      if (!session?.user?.id) throw new Error("Login failed. Please try again.");

      setUser(createAuthUserFromSession(session.user));
      setProfile({ name: session.user.name ?? undefined, target: "NEET", language: "hinglish" });
      setBackend("nextauth");

      return {};
    },
    [supabase, updateNextAuthSession]
  );

  const signUp = useCallback(
    async ({ email, password, name, className, target, language }: SignUpInput) => {
      const cleanEmail = normalizeEmail(email);
      const cleanName = name.trim();

      if (!cleanName) throw new Error("Name is required.");
      if (!cleanEmail) throw new Error("Email is required.");
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      const nextProfile: StudentProfile = {
        name: cleanName,
        className: className?.trim() || undefined,
        target,
        language,
      };

      const localAccounts = getLocalAccounts();
      if (localAccounts.some((account) => account.email === cleanEmail)) {
        throw new Error("A local account already exists for this email. Please sign in.");
      }

      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            name: cleanName,
            className: nextProfile.className,
            target,
            language,
          }),
        });
        const data = (await response.json()) as { error?: string };

        if (response.ok) {
          const result = await signInWithNextAuth("credentials", {
            redirect: false,
            email: cleanEmail,
            password,
          });
          if (!result?.ok) throw new Error("Account created, but automatic login failed.");

          const session = await updateNextAuthSession();
          if (session?.user?.id) {
            setUser(createAuthUserFromSession(session.user));
            setProfile(nextProfile);
            setBackend("nextauth");
          }
          return {};
        }

        if (response.status !== 503) {
          throw new Error(data.error ?? "Could not create the account.");
        }
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("Server-backed accounts")) {
          throw error;
        }
      }

      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: nextProfile,
          },
        });

        if (error) throw new Error(error.message);

        if (data.session?.user) {
          setUser(createAuthUserFromSupabase(data.session.user));
          setProfile(createProfileFromSupabase(data.session.user));
          setBackend("supabase");
          return {};
        }

        return {
          message: "Account created. Please verify your email, then sign in.",
        };
      }

      const account: LocalAccount = {
        id: createId(),
        email: cleanEmail,
        passwordHash: await hashPassword(cleanEmail, password),
        profile: nextProfile,
        createdAt: Date.now(),
      };

      saveLocalAccounts([...localAccounts, account]);
      localStorage.setItem(LOCAL_SESSION_KEY, account.id);
      setUser(createAuthUserFromLocal(account));
      setProfile(nextProfile);
      setBackend("local");

      return {};
    },
    [supabase, updateNextAuthSession]
  );

  const signInWithGoogle = useCallback(async () => {
    await signInWithNextAuth("google", { callbackUrl: "/" });
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizeEmail(email) }),
    });
    const data = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not request password reset.");
    return { message: data.message };
  }, []);

  const signOut = useCallback(async () => {
    if (backend === "nextauth") {
      await signOutWithNextAuth({ redirect: false });
    } else if (backend === "supabase" && supabase) {
      await supabase.auth.signOut();
    }

    localStorage.removeItem(LOCAL_SESSION_KEY);
    setUser(null);
    setProfile({ target: "NEET", language: "hinglish" });
    setBackend("guest");
  }, [backend, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      backend,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      requestPasswordReset,
      signOut,
    }),
    [
      backend,
      loading,
      profile,
      requestPasswordReset,
      signIn,
      signInWithGoogle,
      signOut,
      signUp,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
