"use client";

import { BadgeIndianRupee, Ban, CalendarPlus, ChevronDown, Search, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface AdminUser {
  id: string;
  atomicId: string;
  email: string;
  name: string | null;
  profile: { phone: string | null; className: string | null } | null;
  access: {
    plan: string;
    accessType: string;
    status: string;
    expiresAt: string | null;
    batch: { title: string } | null;
    subscription: { id: string; reason: string | null } | null;
  } | null;
  enrollments: Array<{ batch: { title: string } | null; course: { title: string } }>;
  subscriptions: Array<{ id: string; plan: string; accessType: string; accessStatus: string; endsAt: string | null }>;
}

interface Batch {
  id: string;
  title: string;
  endsAt: string | null;
  course: { title: string };
  _count: { enrollments: number; subscriptions: number };
}

interface Metrics {
  users: number;
  proUsers: number;
  activeSubscriptions: number;
  conversations: number;
  messages: number;
}

function title(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextSearch = "") => {
    setLoading(true);
    setError(null);
    try {
      const [accessResponse, batchResponse, analyticsResponse] = await Promise.all([
        fetch(`/api/admin/access?search=${encodeURIComponent(nextSearch)}`, { cache: "no-store" }),
        fetch("/api/admin/batches", { cache: "no-store" }),
        fetch("/api/admin/analytics", { cache: "no-store" }),
      ]);
      if (!accessResponse.ok) {
        const data = (await accessResponse.json()) as { error?: string };
        throw new Error(data.error ?? "Could not load admin access.");
      }
      const accessData = (await accessResponse.json()) as { users: AdminUser[] };
      setUsers(accessData.users);
      if (batchResponse.ok) setBatches(((await batchResponse.json()) as { batches: Batch[] }).batches);
      if (analyticsResponse.ok) setMetrics(((await analyticsResponse.json()) as { metrics: Metrics }).metrics);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runAccessAction = async (body: Record<string, unknown>) => {
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update access.");
      setNotice("Access updated.");
      await load(search);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update access.");
    }
  };

  const grantBatch = async (batchId: string) => {
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/batches/${batchId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as { error?: string; granted?: number };
      if (!response.ok) throw new Error(data.error ?? "Could not grant batch access.");
      setNotice(`Complimentary Pro access granted to ${data.granted ?? 0} enrolled students.`);
      await load(search);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not grant batch access.");
    }
  };

  const selected = users.find((user) => user.id === selectedUserId) ?? null;
  return (
    <main className="min-h-dvh bg-white dark:bg-atomic-navy">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-700">
          <div><p className="text-sm font-semibold text-atomic-orange">Atomic AI</p><h1 className="text-2xl font-bold">Admin dashboard</h1></div>
          <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Return to chat</Link>
        </header>

        {error && <p className="mt-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        {notice && <p className="mt-4 border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p>}

        <section className="grid gap-3 border-b border-slate-200 py-6 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-700">
          {[
            ["Active users", metrics?.users], ["Pro users", metrics?.proUsers], ["Active subscriptions", metrics?.activeSubscriptions], ["Conversations", metrics?.conversations], ["Messages", metrics?.messages],
          ].map(([label, value]) => <div key={String(label)} className="border-l-2 border-atomic-orange px-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value ?? "-"}</p></div>)}
        </section>

        <section className="border-b border-slate-200 py-6 dark:border-slate-700">
          <div className="mb-4 flex items-center gap-2"><UsersRound className="h-5 w-5 text-atomic-orange" /><h2 className="font-semibold">Student access</h2></div>
          <form onSubmit={(event) => { event.preventDefault(); void load(search); }} className="mb-4 flex max-w-xl gap-2">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, phone, Atomic ID, or batch" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-atomic-orange dark:border-slate-700 dark:bg-slate-900" />
            <button type="submit" className="rounded-lg bg-atomic-orange p-2 text-white" title="Search" aria-label="Search"><Search className="h-4 w-4" /></button>
          </form>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900"><tr><th className="px-3 py-3">Student</th><th className="px-3 py-3">Access</th><th className="px-3 py-3">Batch</th><th className="px-3 py-3">Expiry</th><th className="px-3 py-3">Actions</th></tr></thead>
              <tbody>
                {users.map((user) => <tr key={user.id} className="border-t border-slate-200 dark:border-slate-700"><td className="px-3 py-3"><button onClick={() => setSelectedUserId(user.id)} className="font-semibold text-atomic-orange hover:underline">{user.name ?? user.email}</button><p className="text-xs text-slate-500">{user.atomicId} - {user.profile?.phone ?? user.email}</p></td><td className="px-3 py-3">{user.access ? `${title(user.access.plan)} / ${title(user.access.status)}` : "No active access"}</td><td className="px-3 py-3">{user.access?.batch?.title ?? (user.enrollments.map((item) => item.batch?.title).filter(Boolean).join(", ") || "-")}</td><td className="px-3 py-3">{user.access?.expiresAt ? new Date(user.access.expiresAt).toLocaleDateString("en-IN") : "No expiry"}</td><td className="flex gap-1 px-3 py-3"><button onClick={() => void runAccessAction({ action: "grant", userId: user.id, plan: "PRO", reason: "Admin Pro grant" })} className="rounded-lg p-2 text-atomic-orange hover:bg-orange-50 dark:hover:bg-orange-950/30" title="Grant Pro" aria-label="Grant Pro"><BadgeIndianRupee className="h-4 w-4" /></button><button onClick={() => void runAccessAction({ action: "grant", userId: user.id, plan: "LIFETIME", reason: "Admin lifetime grant" })} className="rounded-lg p-2 text-atomic-blue hover:bg-blue-50 dark:hover:bg-blue-950/30" title="Grant lifetime" aria-label="Grant lifetime"><ShieldCheck className="h-4 w-4" /></button>{user.access?.subscription?.id && <button onClick={() => void runAccessAction({ action: "suspend", subscriptionId: user.access?.subscription?.id, reason: "Admin suspension" })} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" title="Suspend access" aria-label="Suspend access"><Ban className="h-4 w-4" /></button>}</td></tr>)}
                {!loading && users.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No matching students.</td></tr>}
              </tbody>
            </table>
          </div>
          {selected && <div className="mt-4 border-l-4 border-atomic-blue bg-slate-50 px-4 py-3 text-sm dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{selected.name ?? selected.email}</p><button onClick={() => setSelectedUserId(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700" title="Close profile" aria-label="Close profile"><ChevronDown className="h-4 w-4" /></button></div><p className="mt-1 text-slate-500">{selected.email} · {selected.atomicId} · {selected.profile?.phone ?? "No phone"}</p><p className="mt-2">Subscriptions: {selected.subscriptions.map((subscription) => `${title(subscription.plan)} (${title(subscription.accessStatus)})`).join(", ") || "None"}</p>{selected.access?.subscription?.id && <button onClick={() => void runAccessAction({ action: "extend", subscriptionId: selected.access?.subscription?.id, extendDays: 30, reason: "Admin 30-day extension" })} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800"><CalendarPlus className="h-4 w-4" /> Extend 30 days</button>}</div>}
        </section>

        <section className="py-6">
          <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-atomic-orange" /><h2 className="font-semibold">Batch access</h2></div>
          <div className="grid gap-3 md:grid-cols-2">
            {batches.map((batch) => <div key={batch.id} className="border border-slate-200 p-4 dark:border-slate-700"><p className="font-semibold">{batch.title}</p><p className="mt-1 text-sm text-slate-500">{batch.course.title} · {batch._count.enrollments} enrolled</p><p className="mt-1 text-xs text-slate-500">Ends: {batch.endsAt ? new Date(batch.endsAt).toLocaleDateString("en-IN") : "Not set"}</p><button onClick={() => void grantBatch(batch.id)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-atomic-orange px-3 py-2 text-sm font-semibold text-white hover:bg-atomic-orange-dark"><ShieldCheck className="h-4 w-4" /> Grant free Atomic AI access</button></div>)}
            {!loading && batches.length === 0 && <p className="text-sm text-slate-500">Create courses and batches through the admin batch API before assigning complimentary access.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
