import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  const result = await prisma.conversation.updateMany({
    where: { id, userId: user.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  if (!result.count) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      targetUserId: user.id,
      event: "CHAT_DELETED",
      metadata: { conversationId: id },
    },
  });

  return new NextResponse(null, { status: 204 });
}
