import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ensureInitialAdmin } from "@/lib/system-bootstrap";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session.user : null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  await ensureInitialAdmin();
  const user = await requireCurrentUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}
