"use client";

import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";

export function ResetPasswordScreen() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("This password reset link is invalid.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not reset the password.");
      setMessage(data.message ?? "Password updated. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not reset the password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-4 py-8 dark:bg-atomic-navy">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20 sm:p-6"
        >
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Choose a new password</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Use at least 8 characters.
            </p>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">New password</span>
            <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
              <LockKeyhole className="h-4 w-4 text-slate-400" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                minLength={8}
                autoComplete="new-password"
                className="w-full bg-transparent text-sm outline-none"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Confirm password</span>
            <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
              <LockKeyhole className="h-4 w-4 text-slate-400" />
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                minLength={8}
                autoComplete="new-password"
                className="w-full bg-transparent text-sm outline-none"
              />
            </span>
          </label>
          {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
          {message && <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-atomic-orange px-4 py-3 text-sm font-semibold text-white transition hover:bg-atomic-orange-dark disabled:opacity-60"
          >
            {submitting ? "Updating..." : "Update password"}
          </button>
          <Link
            href="/"
            className="block rounded-xl px-4 py-2 text-center text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Return to Atomic AI
          </Link>
        </form>
      </div>
    </main>
  );
}
