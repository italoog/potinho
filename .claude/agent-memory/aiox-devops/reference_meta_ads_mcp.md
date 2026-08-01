---
name: meta-ads-mcp-options
description: Meta tem MCP oficial hospedado em https://mcp.facebook.com/ads com OAuth+DCR (não precisa App ID/Secret/token); alternativas são brokers terceiros.
metadata:
  type: reference
---

# MCP de Meta Ads — onde está e o que exige

**Oficial (preferir):** `https://mcp.facebook.com/ads` — remote MCP hospedado pela própria Meta ("ads AI connectors").
Docs: https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-overview

Verificado em 2026-08-01 via probe direto:
- Responde `401` com `WWW-Authenticate: Bearer resource_metadata=".../.well-known/oauth-protected-resource/ads"`
- Auth server metadata expõe `registration_endpoint` (Dynamic Client Registration) e `token_endpoint_auth_methods: ["none"]` → **cliente público com PKCE**
- **Consequência prática:** não precisa de App ID, App Secret, nem access token de System User. O Claude Code registra o client sozinho e o usuário só aprova no browser (login Facebook + escolha do Business/ad account).
- Scopes: `ads_management ads_read catalog_management business_management pages_show_list instagram_basic ads_mcp_management`
- Cobre: reporting, criação/edição de campanha-adset-ad, catálogo, signals/datasets, A/B test e lift, activity logs, help center.

**Alternativa terceira (só se a oficial não servir):** `co.pipeboard/meta-ads-mcp` (github pipeboard-co/meta-ads-mcp, ~1.1k stars, BUSL-1.1). Remote em `https://meta-ads.mcp.pipeboard.co/`. É um **broker**: o token da conta de anúncios fica com a Pipeboard, não com a Meta. Só vale pela família multi-plataforma (Google/TikTok/Snap/Reddit no mesmo auth). Os pacotes npm `meta-ads-mcp`, `meta-ads-mcp-server`, `@mikusnuz/meta-ads-mcp` são de autor anônimo/baixa tração — não usar em conta que gasta dinheiro real.

**Why:** o usuário roda tráfego pago real da potinho; conectar via token de System User hardcoded seria risco desnecessário quando a Meta já oferece OAuth first-party.
**How to apply:** ao pedirem "MCP da Meta/Facebook Ads", ir direto na URL oficial via `claude mcp add --transport http`. Não pedir credencial nenhuma ao usuário.

Nota de infra: o Docker MCP Toolkit descrito em `.claude/rules/mcp-usage.md` **não está inicializado nesta máquina** (`~/.docker/mcp` não existe e o Docker Desktop estava parado em 2026-08-01). O bug de secrets do Docker MCP é irrelevante para MCPs remotos com OAuth como esse.
