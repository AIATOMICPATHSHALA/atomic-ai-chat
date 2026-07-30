"use client";

import { useAuth } from "@/components/AuthProvider";
import { ScheduleManager } from "@/components/ScheduleManager";
import { StudentSchedule } from "@/components/StudentSchedule";

export function ScheduleGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white dark:bg-atomic-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-atomic-orange border-t-transparent" />
      </div>
    );
  }

  if (user && (user.role === "ADMIN" || user.role === "FACULTY")) {
    return <ScheduleManager />;
  }

  return <StudentSchedule />;
}