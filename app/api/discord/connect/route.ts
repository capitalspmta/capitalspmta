import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { requireUserApi } from "@/lib/auth";

export async function GET() {
  await requireUserApi();

  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || "http://localhost:3000/api/discord/callback";

  if (!clientId) {
    // Se não configurou, manda para a conta com aviso
    redirect("/account/profile?discord=missing_client");
  }

  const state = randomUUID();
  cookies().set("discord_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 10 * 60 });

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
    prompt: "consent",
  });

  redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
}
