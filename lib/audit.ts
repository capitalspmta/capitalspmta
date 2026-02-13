import { prisma } from "./prisma";
import { getRequestMeta, getSessionUser } from "./auth";

export async function audit(action: string, entityType: string, entityId?: string | null, meta?: any) {
  const user = await getSessionUser();
  const { ip, userAgent } = getRequestMeta();

  await prisma.auditLog.create({
    data: {
      actorId: user?.id ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      ip,
      userAgent,
      meta: meta === undefined ? undefined : JSON.stringify(meta),
    },
  });
}
