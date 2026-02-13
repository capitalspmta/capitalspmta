import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await requireUserApi();

  const convo = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      },
      messages: {
        // NÃO filtra por isDeleted aqui porque alguns bancos antigos podem ter NULL
        // (coluna criada sem default). Filtramos no JSON pra não sumir mensagens.
        orderBy: { createdAt: "asc" },
        take: 200,
        include: {
          attachments: true,
          sender: { select: { id: true, username: true } },
          receiver: { select: { id: true, username: true } },
        },
      },
    },
  });

  if (!convo) {
    return NextResponse.json({ message: "Conversa não encontrada." }, { status: 404 });
  }

  const isMember = convo.participants.some((p) => p.userId === me.id);
  if (!isMember) {
    return NextResponse.json({ message: "Sem acesso." }, { status: 403 });
  }

  const safe = {
    ...convo,
    // garante que mensagens com isDeleted = NULL apareçam
    messages: (convo.messages || []).filter((m: any) => !m?.isDeleted),
  };

  return NextResponse.json({ conversation: safe, meId: me.id });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await requireUserApi();

  const body = await req.json().catch(() => null);
  const content = String(body?.content || "").trim();
  const attachments = Array.isArray(body?.attachments) ? body.attachments : [];
  const cleanAttachments = attachments
    .map((a: any) => ({
      url: String(a?.url || "").trim(),
      name: a?.name ? String(a.name).slice(0, 120) : null,
      mime: a?.mime ? String(a.mime).slice(0, 120) : null,
      size: a?.size != null ? Number(a.size) : null,
    }))
    .filter((a: any) => a.url);

  if (!content && !cleanAttachments.length) {
    return NextResponse.json({ message: "Mensagem vazia." }, { status: 400 });
  }

  const convo = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { participants: true },
  });

  if (!convo) {
    return NextResponse.json({ message: "Conversa não encontrada." }, { status: 404 });
  }

  const isMember = convo.participants.some((p) => p.userId === me.id);
  if (!isMember) {
    return NextResponse.json({ message: "Sem acesso." }, { status: 403 });
  }

  // DM é sempre entre 2 usuários
  const other = convo.participants.find((p) => p.userId !== me.id);
  if (!other) {
    return NextResponse.json({ message: "Conversa inválida." }, { status: 400 });
  }

// Criação robusta (compatível com clients Prisma desatualizados)
const createPayloadScalar: any = {
  conversationId: convo.id,
  senderId: me.id,
  receiverId: other.userId,
  content,
  isDeleted: false,
};

const createPayloadConnect: any = {
  content,
  isDeleted: false,
  conversation: { connect: { id: convo.id } },
  sender: { connect: { id: me.id } },
  receiver: { connect: { id: other.userId } },
};

const attachmentsCreate = cleanAttachments.length
  ? { create: cleanAttachments.map((a: any) => ({ url: a.url, name: a.name ?? undefined, mime: a.mime ?? undefined, size: a.size ?? undefined })) }
  : null;

async function tryCreate(args: { mode: "scalar" | "connect"; withAttachments: boolean; withInclude: boolean }) {
  const data: any = args.mode === "scalar" ? { ...createPayloadScalar } : { ...createPayloadConnect };
  if (args.withAttachments && attachmentsCreate) data.attachments = attachmentsCreate;

  const createArgs: any = { data };
  if (args.withInclude) createArgs.include = { attachments: true };

  return prisma.directMessage.create(createArgs);
}

let msg: any = null;
let lastErr: any = null;

const attempts: Array<{ mode: "scalar" | "connect"; withAttachments: boolean; withInclude: boolean }> = [
  { mode: "scalar", withAttachments: true, withInclude: true },
  { mode: "connect", withAttachments: true, withInclude: true },
  { mode: "scalar", withAttachments: false, withInclude: true },
  { mode: "connect", withAttachments: false, withInclude: true },
  { mode: "scalar", withAttachments: true, withInclude: false },
  { mode: "connect", withAttachments: true, withInclude: false },
  { mode: "scalar", withAttachments: false, withInclude: false },
  { mode: "connect", withAttachments: false, withInclude: false },
];

for (const a of attempts) {
  try {
    msg = await tryCreate(a);
    break;
  } catch (e: any) {
    lastErr = e;
  }
}

// Se o client não suportar nested create / include, cria anexos depois (melhor esforço)
if (msg && cleanAttachments.length && (!msg.attachments || !Array.isArray(msg.attachments))) {
  try {
    await prisma.directMessageAttachment.createMany({
      data: cleanAttachments.map((a: any) => ({
        messageId: msg.id,
        url: a.url,
        name: a.name ?? undefined,
        mime: a.mime ?? undefined,
        size: a.size ?? undefined,
      })),
      skipDuplicates: true,
    });
    try {
      msg = await prisma.directMessage.findUnique({ where: { id: msg.id }, include: { attachments: true } });
    } catch {}
  } catch {}
}

if (!msg) {
  const detail = lastErr?.message || "Erro desconhecido";
  return NextResponse.json(
    { message: "Falha ao enviar mensagem.", detail },
    { status: 500 }
  );
}

  // Atualiza o "updatedAt" para ordenar a lista de conversas
  await prisma.conversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } }).catch(() => null);

  await prisma.notification.create({
    data: {
      userId: other.userId,
      message: `Você recebeu uma mensagem de ${me.username}`,
      href: `/messages/${convo.id}`,
    },
  }).catch(() => null);

  return NextResponse.json({ message: msg });
}
