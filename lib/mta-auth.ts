import { NextResponse } from "next/server";

export function requireMtaKey(req: Request) {
  // Compat: versões antigas usavam MTA_API_TOKEN. Preferimos MTA_API_KEY.
  const need = (process.env.MTA_API_KEY || process.env.MTA_API_TOKEN || "").trim();
  const got = (req.headers.get("x-mta-key") || "").trim();
  if (!need) {
    return NextResponse.json(
      { message: "MTA_API_KEY (ou MTA_API_TOKEN) não configurada no servidor." },
      { status: 500 }
    );
  }
  if (got !== need) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  return null;
}
