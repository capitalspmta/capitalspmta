import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { audit } from "@/lib/audit";

async function exchangeCode(code: string) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || "http://localhost:3000/api/discord/callback";

  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    // @ts-ignore
    cache: "no-store",
  });

  if (!tokenRes.ok) return null;
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token as string | undefined;
  if (!accessToken) return null;

  const meRes = await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: `Bearer ${accessToken}` },
    // @ts-ignore
    cache: "no-store",
  });
  if (!meRes.ok) return null;
  const me = await meRes.json();
  return { id: String(me.id), username: String(me.username ?? ""), discriminator: String(me.discriminator ?? "") };
}

export async function GET(req: Request) {
  const user = await requireUserApi();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const expected = cookies().get("discord_oauth_state")?.value;
  cookies().delete("discord_oauth_state");

  if (!code || !state || !expected || state !== expected) {
    redirect("/account/profile?discord=state_error");
  }

  const data = await exchangeCode(code);
  if (!data) {
    redirect("/account/profile?discord=exchange_error");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { discordId: data!.id, discordUsername: `${data!.username}${data!.discriminator && data!.discriminator !== "0" ? `#${data!.discriminator}` : ""}` },
  });

  await audit("account.discord.link", "User", user.id, { discordId: data!.id });

  redirect("/account/profile?discord=linked");
}
