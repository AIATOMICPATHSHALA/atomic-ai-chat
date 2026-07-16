import { z } from "zod";

export const languageSchema = z.enum(["english", "hindi", "hinglish"]);
export const targetSchema = z.enum(["NEET", "JEE", "Board", "Other"]);

export const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  remember: z.boolean().optional(),
});

export const signUpSchema = credentialsSchema.extend({
  name: z.string().trim().min(1, "Name is required.").max(80),
  className: z.string().trim().max(60).optional(),
  target: targetSchema.default("NEET"),
  language: languageSchema.default("hinglish"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  className: z.string().trim().max(60).nullable().optional(),
  target: targetSchema.optional(),
  board: z.string().trim().max(80).nullable().optional(),
  preferredLanguage: languageSchema.optional(),
  preferredTeachers: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  strongChapters: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  weakChapters: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  favoriteSubject: z.string().trim().max(80).nullable().optional(),
  learningPreferences: z.record(z.string(), z.unknown()).nullable().optional(),
  recentActivity: z.unknown().nullable().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: languageSchema.optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  privacyMode: z.boolean().optional(),
});
