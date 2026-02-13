✅ Patch aplicado no site: Prisma model MtaDelivery adicionado.

Próximos passos obrigatórios:
1) No seu .env do SITE, defina:
   MTA_API_KEY=mta_local_dev_key_123   (ou a chave que você usa no MTA config.lua)

2) Rode o migrate do Prisma:
   npx prisma migrate dev --name mta_delivery
   (ou em produção: npx prisma migrate deploy)

3) Reinicie o Next server (npm run dev / npm start)


v2: whitelist/status corrigido para usar prisma.gameAccount.findFirst (evita 500 quando mtaSerial não é unique).
