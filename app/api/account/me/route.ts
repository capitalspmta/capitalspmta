import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireUserApi();

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
      username: true,
      role: true,
      avatarKey: true,
      phone: true,
      recoveryEmail: true,
      googleId: true,
      discordId: true,
      discordUsername: true,
      points: true,
      whitelistStatus: true,
      bannedUntil: true,
      gameAccounts: {
        select: {
          mtaSerial: true,
          mtaAccount: true,
          locked: true,
          changedAfterApproved: true,
        },
        take: 1,
      },
    },
  });

  return NextResponse.json(me);
}
