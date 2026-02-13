import nodemailer from "nodemailer";

function getSmtp() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  if (!host || !user || !pass || !from) return null;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return { transporter, from };
}

export async function sendMail(params: { to: string; subject: string; html: string; text?: string }) {
  const smtp = getSmtp();
  if (!smtp) return { ok: false, reason: "SMTP not configured" } as const;
  await smtp.transporter.sendMail({
    from: smtp.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
  return { ok: true } as const;
}
