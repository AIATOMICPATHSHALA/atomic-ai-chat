"use client";

import { AuthScreen } from "@/components/AuthScreen";
import { ChatApp } from "@/components/ChatApp";
import { useAuth } from "@/components/AuthProvider";
import { useState } from "react";

export function AuthGate() {
  const { user, profile, backend, loading, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white dark:bg-atomic-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-atomic-orange border-t-transparent" />
      </div>
    );
  }

  if (!user && showAuth) {
    return <AuthScreen onContinueAsGuest={() => setShowAuth(false)} />;
  }

  if (!user) {
    return (
      <ChatApp
        studentProfile={profile}
        authBackend="guest"
        onRequestAuth={() => setShowAuth(true)}
      />
    );
  }

  return (
    <ChatApp
      studentProfile={profile}
      userName={user.name}
      userEmail={user.email}
      authBackend={backend}
      onSignOut={() => void signOut()}
    />
  );
}
