# Design: Migração Next.js (crm/) — Vercel → VPS

**Data:** 2026-04-13  
**Branch:** feature/crm-vps-migration (a criar)  
**Status:** Aprovado, aguardando implementação

---

## Contexto

O frontend Next.js (`crm/`) roda atualmente no Vercel. O backend FastAPI já está na VPS (Hostinger, Linux) via Docker Swarm + Traefik, exposto em `api.canastrainteligencia.com`. A migração move o frontend para a mesma VPS, seguindo o mesmo padrão de infraestrutura já estabelecido.

**Motivação:** Dois desenvolvedores trabalham na mesma VPS e querem verificar builds em tempo real sem precisar de acesso compartilhado à conta Vercel.

---

## Arquitetura

```
Navegador → canastrainteligencia.com (443)
               ↓
           Traefik (Docker Swarm, já rodando)
           Rede: canastrainteligencia (overlay, external)
               ↓
       Stack "crm" — serviço Next.js (porta 3000)
               ↓
       Supabase (tshmvxxxyxgctrdkqvam.supabase.co)
       Backend FastAPI (api.canastrainteligencia.com) — stack "canastra", inalterado
```

---

## Componentes

### 1. `crm/Dockerfile` (novo)

Build multi-stage para imagem enxuta:

- **Stage `builder`** — `node:20-alpine`: instala dependências (`npm ci`), executa `next build`. Requer `output: 'standalone'` no `next.config.ts`.
- **Stage `runner`** — `node:20-alpine`: copia apenas `.next/standalone/`, `.next/static/` e `public/`. Executa `node server.js` (servidor embutido do standalone output).
- Porta exposta: `3000`.

### 2. `crm/docker-compose.yml` (novo)

Stack Swarm para o frontend:

```yaml
services:
  crm:
    image: canastra-crm:latest
    env_file: .env.production
    networks:
      - canastrainteligencia
    deploy:
      labels:
        - "traefik.enable=true"
        - "traefik.docker.network=canastrainteligencia"
        - "traefik.http.routers.frontend.rule=Host(`canastrainteligencia.com`) || Host(`www.canastrainteligencia.com`)"
        - "traefik.http.routers.frontend.entrypoints=websecure"
        - "traefik.http.routers.frontend.tls.certresolver=letsencryptresolver"
        - "traefik.http.services.frontend.loadbalancer.server.port=3000"

networks:
  canastrainteligencia:
    external: true
```

### 3. `crm/.env.production` (novo)

Variáveis que hoje estão no painel do Vercel — migram para arquivo na VPS:

```
NEXT_PUBLIC_FASTAPI_URL=https://api.canastrainteligencia.com
NEXT_PUBLIC_SUPABASE_URL=https://tshmvxxxyxgctrdkqvam.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave do Supabase>
```

Este arquivo **não é commitado** (`.gitignore`). Fica só na VPS.

### 4. `crm/next.config.ts` (modificar)

Adicionar `output: 'standalone'` para habilitar o build standalone:

```ts
const nextConfig = {
  output: 'standalone',
  // ... resto da config existente
};
```

### 5. Backend — atualização de env var

O backend tem `FRONTEND_URL=http://localhost:5173` (valor legado). Após o deploy do frontend, atualizar:

```bash
docker service update --env-add FRONTEND_URL=https://canastrainteligencia.com canastra_api
```

---

## Workflow de Deploy (pós-migração)

```bash
# 1. Build da imagem (rodar na VPS, dentro de /home/Kelwin/Maquinadevendascanastra)
sg docker -c "docker build -t canastra-crm:latest ./crm"

# 2. Deploy no Swarm
sg docker -c "docker stack deploy -c crm/docker-compose.yml crm"

# 3. Verificar
sg docker -c "docker service ls"
```

O Claude Code executa esses comandos quando solicitado.

---

## O que NÃO muda

- Stack `canastra` (backend, worker, redis) — nenhuma alteração
- Traefik — nenhuma configuração nova necessária
- Supabase — nenhuma alteração
- DNS/Cloudflare — `canastrainteligencia.com` já deve apontar para o IP da VPS (verificar antes do deploy)

---

## Pré-requisitos antes do deploy

1. Confirmar que `canastrainteligencia.com` no Cloudflare aponta para o IP da VPS (não para o Vercel)
2. Ter a `NEXT_PUBLIC_SUPABASE_ANON_KEY` em mãos para criar o `.env.production` na VPS
3. Desativar o projeto no Vercel após confirmar que o site funciona na VPS

---

## Fora do escopo

- CI/CD automático (push → deploy) — workflow atual: Claude Code executa manualmente
- Múltiplas réplicas / load balancing do frontend
- Preview deployments por branch
