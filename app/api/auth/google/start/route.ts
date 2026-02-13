import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

  if (!clientId) {
    // Se não configurou ainda, manda pra login com aviso simples
    return redirect("/auth/login?google=missing");
  }

  const state = crypto.randomBytes(16).toString("hex");
  cookies().set("g_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/" });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    include_granted_scopes: "true",
    access_type: "online",
    prompt: "consent",
    state,
  });

  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
