# GTA5 Forum Portal (Fórum + Tickets + Admin + Logs + Mercado Pago)

Base **robusta e profissional** para portal de comunidade RP:
- Fórum (categorias/boards/tópicos/posts)
- Moderação (fixar/trancar tópico) com RBAC (cargos)
- Tickets (Ajuda, Denúncia, Unban, Compras) com fila staff
- Painel Admin: tickets (staff), logs/auditoria, usuários (cargos), config do fórum, compras (logs)
- Mercado Pago: criação de preferência (checkout) + webhook (atualiza status) + auditoria

## Requisitos
- Node.js 18+
- NPM (ou PNPM/Yarn)

## Instalação
1) Copie `.env.example` para `.env` e configure:
```bash
cp .env.example .env
```

2) Instale dependências:
```bash
npm install
```

3) Gere o banco (SQLite dev) e rode seed (prisma/seed.js):
```bash
npm run db:push
npm run db:seed
```

4) Rode:
```bash
npm run dev
```

Abra: http://localhost:3000

## Login inicial (seed)
- Email: `admin@exemplo.com`
- Senha: `TroqueEssaSenha123`

**Troque a senha e o e-mail** em produção.

## Mercado Pago (opcional)
- Preencha `MP_ACCESS_TOKEN` no `.env`
- Exponha o webhook (em produção você vai usar HTTPS + domínio)
- Endpoint webhook: `/api/payments/mercadopago/webhook`
- O sistema salva todos os eventos em `MpWebhookEvent` e cria logs em `AuditLog`.

## Logs / Auditoria
Quase todas ações relevantes via API chamam `audit()` e ficam em `AuditLog`:
- auth.login/register/logout
- forum.topic.create / forum.post.create / toggle lock/pin
- ticket.create / ticket.reply
- admin.user.setRole / admin.forum.createCategory/Board
- payment.mp.preference.created / webhook.processed / errors

## Observações de produção
- Troque SQLite por Postgres (mudar `provider` e `DATABASE_URL`).
- Adicione rate limiting e CSRF (recomendado).
- Valide preços dos produtos no servidor (não confie no client).
- Adicione upload de anexos (S3/R2) se precisar.

## Setup do zero (Windows)

1) Instale Node.js LTS: https://nodejs.org/en/download
2) Extraia o ZIP e abra o terminal dentro da pasta do projeto.
3) Rode:

```bat
npm install
npm run setup
npm run dev
```

Abra: http://localhost:3000

### Se aparecer erro do Prisma

Rode manualmente:

```bat
npx prisma generate
npx prisma db push
npx prisma db seed
```
