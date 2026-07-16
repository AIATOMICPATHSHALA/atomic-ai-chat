"use client";

import {
  ArrowLeft,
  BookOpenCheck,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { getProviders } from "next-auth/react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import type { Language, StudentProfile } from "@/types/chat";

type AuthMode = "signin" | "signup" | "forgot";

const TARGETS: NonNullable<StudentProfile["target"]>[] = [
  "NEET",
  "JEE",
  "Board",
  "Other",
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "hinglish", label: "Hinglish" },
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
];

interface AuthScreenProps {
  onContinueAsGuest?: () => void;
}

export function AuthScreen({ onContinueAsGuest }: AuthScreenProps) {
  const {
    signIn,
    signUp,
    signInWithGoogle,
    requestPasswordReset,
    backend,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [target, setTarget] =
    useState<NonNullable<StudentProfile["target"]>>("NEET");
  const [language, setLanguage] = useState<Language>("hinglish");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("atomic-pathshala-remembered-email");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }

    void getProviders().then((providers) => setGoogleEnabled(Boolean(providers?.google)));
  }, []);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const result =
        mode === "forgot"
          ? await requestPasswordReset(email)
          : mode === "signin"
            ? await signIn({ email, password, remember })
            : await signUp({
                email,
                password,
                name,
                className,
                target,
                language,
              });

      if (result.message) setMessage(result.message);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Authentication failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);

    try {
      await signInWithGoogle();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Google sign-in could not be started."
      );
      setSubmitting(false);
    }
  };

  const subtitle =
    mode === "forgot"
      ? "We will send a secure reset link if an account exists."
      : backend === "supabase"
        ? "Secure email login is connected with Supabase."
        : backend === "nextauth"
          ? "Your Atomic account is secured and synced."
          : "Sign in to sync chats, or continue as a guest.";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-4 py-8 dark:bg-atomic-navy">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20 sm:p-6">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {mode === "signin"
                ? "Welcome back"
                : mode === "signup"
                  ? "Create student account"
                  : "Reset your password"}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>

          {mode !== "forgot" && (
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => changeMode("signin")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === "signin"
                    ? "bg-white text-atomic-orange shadow-sm dark:bg-slate-950"
                    : "text-slate-500"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => changeMode("signup")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-white text-atomic-orange shadow-sm dark:bg-slate-950"
                    : "text-slate-500"
                }`}
              >
                Sign up
              </button>
            </div>
          )}

          <form className="space-y-3" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Student name
                  </span>
                  <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                    <User className="h-4 w-4 text-slate-400" />
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">
                      Class
                    </span>
                    <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                      <GraduationCap className="h-4 w-4 text-slate-400" />
                      <input
                        value={className}
                        onChange={(event) => setClassName(event.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder="11 / 12"
                      />
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">
                      Target
                    </span>
                    <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                      <BookOpenCheck className="h-4 w-4 text-slate-400" />
                      <select
                        value={target}
                        onChange={(event) =>
                          setTarget(
                            event.target.value as NonNullable<StudentProfile["target"]>
                          )
                        }
                        className="w-full bg-transparent text-sm outline-none"
                      >
                        {TARGETS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </span>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Preferred language
                  </span>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as Language)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-atomic-orange dark:border-slate-700 dark:bg-slate-800"
                  >
                    {LANGUAGES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Email</span>
              <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="student@example.com"
                  type="email"
                  autoComplete="email"
                />
              </span>
            </label>

            {mode !== "forgot" && (
              <label className="block">
                <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
                  Password
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => changeMode("forgot")}
                      className="text-atomic-orange hover:text-atomic-orange-dark"
                    >
                      Forgot password?
                    </button>
                  )}
                </span>
                <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="At least 8 characters"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                </span>
              </label>
            )}

            {mode === "signin" && (
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <input
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-atomic-orange focus:ring-atomic-orange"
                />
                Remember my email on this device
              </label>
            )}

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </p>
            )}

            {message && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-atomic-orange px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-atomic-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Please wait..."
                : mode === "signin"
                  ? "Login"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </button>

            {mode === "signin" && googleEnabled && (
              <button
                type="button"
                onClick={() => void handleGoogle()}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <span className="text-base font-bold text-atomic-orange">G</span>
                Continue with Google
              </button>
            )}

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => changeMode("signin")}
                className="flex w-full items-center justify-center gap-1 rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            )}
          </form>

          {onContinueAsGuest && mode !== "forgot" && (
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <KeyRound className="h-4 w-4" />
              Continue as guest
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
