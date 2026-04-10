

## Corrigir envio WhatsApp via Evolution API

### Problema
A Evolution API é chamada diretamente do navegador do cliente, causando:
1. **Erro CORS** - o navegador bloqueia a requisição cross-origin
2. **Sem API Key** - o header `apikey` não é enviado (a key é `kelvin1234`)
3. **Demora** - Render free tier tem cold start de 30-60s

### Solução
Criar uma Edge Function `send-whatsapp` no Supabase que faz a chamada à Evolution API no servidor, eliminando CORS e protegendo a API key.

### Alterações

**1. Adicionar secret no Supabase**
- `EVOLUTION_API_KEY` = `kelvin1234`
- `EVOLUTION_API_URL` = `https://frango-evolution-api.onrender.com`

**2. Criar `supabase/functions/send-whatsapp/index.ts`**
- Recebe `{ phone, message }` via POST
- Lê `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` dos secrets
- Chama `POST {URL}/message/sendText/frango-delivery` com header `apikey`
- Retorna sucesso/erro

**3. Atualizar `src/services/evolutionService.ts`**
- Trocar `fetch` direto pela chamada `supabase.functions.invoke("send-whatsapp")`
- Remove URL e credenciais do frontend

### Sobre o cold start do Render
O delay de 30-60s na primeira requisição continuará existindo (limitação do plano gratuito do Render). Opções futuras: cron ping ou plano pago.

