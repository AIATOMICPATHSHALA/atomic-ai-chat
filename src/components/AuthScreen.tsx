"use client";

import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  Phone,
  User,
  X,
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
  const [phone, setPhone] = useState("");
  const [target, setTarget] =
    useState<NonNullable<StudentProfile["target"]>>("NEET");
  const [language, setLanguage] = useState<Language>("hinglish");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [atomicBatch, setAtomicBatch] =
    useState<NonNullable<StudentProfile["atomicBatch"]>>("NO_BATCH");
const BATCHES: { value: NonNullable<StudentProfile["atomicBatch"]>; label: string }[] = [
  { value: "SELECTION_PRO", label: "Selection Pro Batch" },
  { value: "SELECTION_1_0", label: "Selection 1.0 Batch" },
  { value: "ARAMBH", label: "Arambh Batch" },
  { value: "MANZIL", label: "Manzil Batch" },
  { value: "UDAAN", label: "Udaan Batch (Class 10th)" },
  { value: "NO_BATCH", label: "No Batch" },
];
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("atomic-pathshala-remembered-email");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }

    void getProviders().then((providers) => setGoogleEnabled(Boolean(providers?.google)));
  }, []);

const passwordChecklist = [
    { label: "8+ characters", passed: password.length >= 8 },
    { label: "Uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "Lowercase letter", passed: /[a-z]/.test(password) },
    { label: "Number", passed: /[0-9]/.test(password) },
    { label: "Special character", passed: /[^A-Za-z0-9]/.test(password) },
  ];
  const strengthScore = passwordChecklist.filter((item) => item.passed).length;
  const strengthLabel =
    strengthScore <= 2 ? "Weak" : strengthScore <= 4 ? "Medium" : "Strong";
  const strengthBarColor =
    strengthScore <= 2 ? "bg-red-500" : strengthScore <= 4 ? "bg-amber-500" : "bg-emerald-500";
  const strengthTextColor =
    strengthScore <= 2 ? "text-red-500" : strengthScore <= 4 ? "text-amber-500" : "text-emerald-500";

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (strengthScore < 5) {
        setError("Password must meet all the requirements below.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const result =
        mode === "forgot"
          ? await requestPasswordReset(email)
          : mode === "signin"
            ? await signIn({ email, password, remember })
            :await signUp({
                email,
                password,
                name,
                phone,
                className,
                target,
                language,
                atomicBatch,
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

<label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Mobile number
                  </span>
                  <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <input
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="10-digit mobile number"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
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
                      <select
                        value={className}
                        onChange={(event) => setClassName(event.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                      >
                        <option value="">Select class</option>
                        <option value="11th">11th</option>
                        <option value="12th">12th</option>
                        <option value="Dropper">Dropper</option>
                      </select>
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

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Atomic Pathshala batch
                  </span>
                  <select
                    value={atomicBatch}
                    onChange={(event) =>
                      setAtomicBatch(
                        event.target.value as NonNullable<StudentProfile["atomicBatch"]>
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-atomic-orange dark:border-slate-700 dark:bg-slate-800"
                  >
                    {BATCHES.map((item) => (
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
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="shrink-0 text-slate-400 transition-colors hover:text-atomic-orange"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </span>
              </label>
            )}

            {mode === "signup" && password.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Password strength</span>
                  <span className={`font-semibold ${strengthTextColor}`}>{strengthLabel}</span>
                </div>
                <div className="mb-3 flex gap-1">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <span
                      key={index}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        index < strengthScore ? strengthBarColor : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
                <ul className="space-y-1">
                  {passwordChecklist.map((item) => (
                    <li
                      key={item.label}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                        item.passed
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400"
                      }`}
                    >
                      {item.passed ? (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mode === "signup" && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Confirm password
                </span>
                <span
                  className={`flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2.5 dark:bg-slate-800 ${
                    confirmPassword.length > 0
                      ? confirmPassword === password
                        ? "border-emerald-400 dark:border-emerald-700"
                        : "border-red-400 dark:border-red-700"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Re-enter your password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="shrink-0 text-slate-400 transition-colors hover:text-atomic-orange"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </span>
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
                )}
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
