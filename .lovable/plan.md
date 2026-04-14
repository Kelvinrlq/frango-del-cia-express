

## Envio Automático para Estabelecimento + Grupo de Entregadores

### Situação Atual
- Mensagens são enviadas via Evolution API (Edge Function `send-whatsapp`)
- Ambas as mensagens (estabelecimento e entrega) vão para o mesmo número (556793277165)
- O grupo de entregadores (`120363423717180111@g.us`) não recebe nada

### O que muda

#### 1. Atualizar `supabase/functions/send-whatsapp/index.ts`
- Adicionar suporte para enviar mensagens a grupos WhatsApp (IDs `@g.us`)
- A Evolution API aceita grupo IDs no campo `number` — basta passar o ID do grupo diretamente
- Detectar automaticamente se o destinatário é grupo (contém `@g.us`) ou número normal

#### 2. Atualizar `src/components/OrderModal.tsx`
- Na função `sendWhatsAppFromServer`:
  - Mensagem do estabelecimento → enviar para `556793277165` (como já funciona)
  - Mensagem de entrega (`deliveryGroupMessage`) → enviar para o grupo `120363423717180111@g.us` em vez do número do estabelecimento
- Manter o envio 100% automático (sem `wa.me`, sem edição manual)

#### 3. Adicionar timeout + retry na Edge Function
- Adicionar `AbortController` com timeout de 50s no fetch para a Evolution API
- 1 retry automático em caso de falha (para lidar com cold start do Render)

#### 4. Melhorar UX de loading
- Separar confirmação do pedido do envio do WhatsApp: após `create-order` com sucesso, mostrar tela "Pedido confirmado!" imediatamente
- Enviar WhatsApp em background (fire-and-forget) para não travar a UI por 2+ minutos

### Arquivos alterados
- `supabase/functions/send-whatsapp/index.ts` — suporte a grupos + retry
- `src/components/OrderModal.tsx` — enviar para grupo + fire-and-forget

