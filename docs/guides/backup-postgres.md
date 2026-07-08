# Backup do Postgres (10.2 AC2)

Duas opções, escolha uma. Não faz sentido montar as duas.

## Opção A — banco gerenciado com backup automático (recomendado)

Se `DATABASE_URL` apontar pra um provedor gerenciado (Neon, Supabase, Railway, RDS etc.), ative o backup automático direto no painel do provedor — é o caminho mais simples e mais confiável, sem cron pra manter:

- **Neon:** branches + point-in-time restore já vêm habilitados por padrão (retenção configurável no plano).
- **Supabase:** Project Settings → Database → Backups (diário no plano Pro+).
- **RDS:** Automated Backups no console (retenção de 1–35 dias) + snapshot manual antes de migrações grandes.
- **Railway:** aba Backups do serviço Postgres (retenção conforme o plano).

Verifique **antes de ir pra produção**: retenção mínima de 7 dias e que o restore foi testado pelo menos uma vez (restaurar num banco de teste e rodar `npm run db:migrate` pra confirmar que o schema bate com as migrations do repo).

## Opção B — Postgres autogerenciado (VPS, container próprio)

Sem provedor gerenciado, faça `pg_dump` diário e mande pro mesmo bucket S3/R2 já usado pelos snapshots (`STORAGE_*` em `web/src/lib/storage.ts`) — reaproveita a credencial que já existe, sem infra nova.

```bash
#!/usr/bin/env bash
# backup-postgres.sh — rodar via cron diário (ex.: 3h da manhã)
set -euo pipefail

STAMP=$(date +%Y-%m-%d)
FILE="/tmp/potinho-backup-${STAMP}.sql.gz"

pg_dump "$DATABASE_URL" | gzip > "$FILE"

aws s3 cp "$FILE" "s3://${STORAGE_BUCKET}/backups/${STAMP}.sql.gz" \
  --endpoint-url "$STORAGE_ENDPOINT"

rm "$FILE"

# retenção: apaga backups com mais de 30 dias
aws s3api list-objects-v2 --bucket "$STORAGE_BUCKET" --prefix "backups/" \
  --endpoint-url "$STORAGE_ENDPOINT" --query "Contents[?LastModified<='$(date -d '30 days ago' --iso-8601)'].Key" \
  --output text | xargs -r -n1 -I{} aws s3 rm "s3://${STORAGE_BUCKET}/{}" --endpoint-url "$STORAGE_ENDPOINT"
```

Cron (diário às 3h):

```cron
0 3 * * * /path/para/backup-postgres.sh >> /var/log/potinho-backup.log 2>&1
```

**Restore** (testar pelo menos uma vez antes de precisar de verdade):

```bash
gunzip -c potinho-backup-2026-07-08.sql.gz | psql "$DATABASE_URL"
```

## Em qualquer uma das opções

- Backup nunca substitui migration — `web/drizzle/*.sql` é a fonte de verdade do schema; o backup é só dado, não estrutura.
- Nunca commitar um dump no git (pode conter dados de clientes — PII, seção 6 item 8/10 do plano).
- Teste o restore antes do primeiro deploy real, não na hora do incidente.
