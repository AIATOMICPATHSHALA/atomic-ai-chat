import type { Language, StudentProfile } from "@/types/chat";

export type AuthBackend = "nextauth" | "supabase" | "local" | "guest";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface SignInInput {
  email: string;
  password: string;
  remember?: boolean;
}

export interface SignUpInput extends SignInInput {
  name: string;
  className?: string;
  target: NonNullable<StudentProfile["target"]>;
  language: Language;
}

export interface AuthActionResult {
  message?: string;
}
