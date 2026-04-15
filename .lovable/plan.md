

## Plano: Telegram Bot para Grupo de Entregadores + Google Maps

### Resumo
- Cliente finaliza pedido → abre `wa.me` para enviar mensagem ao estabelecimento (manual)
- Para pedidos de entrega → sistema envia **automaticamente** para o grupo de entregadores no **Telegram** (gratuito, sem cold start)
- A mensagem inclui o **link clicável do Google Maps** com o endereço do cliente

### Fluxo

```text
Cliente finaliza pedido
  ├─→ Abre wa.me/556793277165 (estabelecimento, manual)
  └─→ Se entrega: Edge Function envia para Telegram (automático)
        └─→ Mensagem com endereço + link Google Maps clicável
```

### O que muda no código

#### 1. Conectar Telegram Bot via connector
- Usar `standard_connectors--connect` para configurar o Telegram
- Você precisará criar um bot no Telegram via @BotFather e me passar o token

#### 2. Nova Edge Function `send-telegram/index.ts`
- Recebe `message` e `chat_id`
- Envia via gateway (`connector-gateway.lovable.dev/telegram/sendMessage`)
- Usa `parse_mode: 'HTML'` para formatação (negrito, links clicáveis)
- Timeout nativo do Telegram: resposta em <1s

#### 3. Atualizar `build-whatsapp-message/index.ts`
- Adicionar campo `deliveryTelegramMessage` no retorno
- Formatado em HTML do Telegram (em vez de Markdown do WhatsApp)
- Incluir link Google Maps clicável: `<a href="URL">📍 Ver no mapa</a>`

#### 4. Atualizar `OrderModal.tsx`
- Após criar pedido: abrir `wa.me` para estabelecimento
- Se entrega: chamar `send-telegram` em background (fire-and-forget)
- Remover toda referência à Evolution API

#### 5. Criar `src/services/telegramService.ts`
- Substituir `evolutionService.ts`
- Função simples que invoca a Edge Function `send-telegram`

#### 6. Limpeza
- Remover `send-whatsapp` Edge Function
- Remover `evolutionService.ts`
- Remover secrets `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` (opcional)

### O que você precisa fazer (1-2 minutos)
1. Abrir Telegram → pesquisar **@BotFather** → `/newbot` → dar um nome → copiar o **token**
2. Criar um **grupo no Telegram** para os entregadores
3. Adicionar o bot ao grupo
4. Me passar o **token do bot** e o **chat_id do grupo** (eu te ajudo a descobrir o chat_id)

### Arquivos
- **Novo**: `supabase/functions/send-telegram/index.ts`
- **Novo**: `src/services/telegramService.ts`
- **Editado**: `supabase/functions/build-whatsapp-message/index.ts`
- **Editado**: `src/components/OrderModal.tsx`
- **Removido**: `supabase/functions/send-whatsapp/index.ts`
- **Removido**: `src/services/evolutionService.ts`

