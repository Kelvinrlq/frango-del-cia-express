

## Proteger Mensagem WhatsApp contra Edição de Preços

### Problema
O cliente pode editar o preço e a taxa de entrega na mensagem do WhatsApp porque ela é gerada no frontend com valores manipuláveis. Além disso, a mensagem do grupo de entregadores não está sendo enviada corretamente (wa.me não funciona com IDs de grupo).

### Solução

Como você optou por manter o `wa.me` (draft), a mensagem continuará abrindo como rascunho. Mas podemos proteger os valores gerando a mensagem **no servidor** e corrigir o envio ao grupo.

### Alterações

#### 1. Nova Edge Function: `build-whatsapp-message`
- Recebe: `order_id` (UUID do pedido já salvo no banco)
- Busca o pedido na tabela `orders` (com `items`, `total_amount`, `delivery_info`, `order_type`, `notes`, `customer_name`, `customer_phone`)
- Gera a mensagem formatada no servidor com os valores validados do banco
- Gera também a mensagem do grupo de entregadores (se delivery)
- Retorna: `{ establishmentMessage: string, deliveryGroupMessage: string | null, googleMapsLink: string | null }`
- O cliente NÃO consegue alterar preços porque eles vêm do banco

#### 2. Alterar fluxo no `OrderModal.tsx`

**Para pagamentos PIX (já tem order_id):**
- Após pagamento aprovado (`handlePixApproved`): chamar `build-whatsapp-message` com o `order_id` do `pixData`
- Abrir `wa.me` com a mensagem retornada pelo servidor

**Para pagamentos não-PIX (dinheiro/débito/crédito):**
- Em `handleSend`, primeiro chamar `create-pix-payment` SEM gerar PIX — ou criar uma nova edge function `create-order` que só salva o pedido no banco e retorna o `order_id`
- Depois chamar `build-whatsapp-message` com esse `order_id`
- Abrir `wa.me` com a mensagem do servidor

**Problema:** Para não-PIX, não existe `order_id` porque o pedido não é salvo no banco. Solução: criar edge function `create-order` que salva o pedido (com validação server-side de preço/frete) e retorna o ID.

#### 3. Corrigir envio ao grupo de entregadores
- `wa.me` NÃO funciona com IDs de grupo WhatsApp (formato `120363...@g.us`)
- `wa.me` só funciona com números de telefone
- **Solução**: Usar `https://web.whatsapp.com/send?phone=&text=` para o estabelecimento e adicionar instruções no app para o dono encaminhar ao grupo, OU usar a API do WhatsApp no futuro
- Por ora, a mensagem do grupo pode ser enviada como segundo `window.open` para o número do estabelecimento com prefixo "[ENTREGA]" para fácil identificação

#### 4. Nova Edge Function: `create-order`
- Similar ao `create-pix-payment` mas sem chamar Mercado Pago
- Valida preço e frete no servidor (mesma lógica já existente)
- Salva pedido na tabela `orders` com `payment_status: "pending_cash"` (ou similar)
- Retorna `order_id` e `total_amount` validados

### Fluxo Revisado

```text
PIX:      form → confirm → create-pix-payment → pix → approved → build-whatsapp-message → wa.me
Não-PIX:  form → confirm → create-order → build-whatsapp-message → wa.me
```

### Arquivos Envolvidos
- `supabase/functions/create-order/index.ts` (novo)
- `supabase/functions/build-whatsapp-message/index.ts` (novo)
- `supabase/config.toml` (adicionar 2 novas functions)
- `src/components/OrderModal.tsx` (alterar `handleSend` e `handlePixApproved`)
- `src/services/orderService.ts` (novo — funções `createOrder()` e `buildWhatsAppMessage()`)

### Sobre o Grupo de Entregadores
O `wa.me` não suporta envio para grupos WhatsApp (IDs `@g.us`). As opções reais são:
1. Enviar a mensagem de entrega para o número do estabelecimento com marcação "[ENTREGA]"
2. Integrar Twilio/WhatsApp Business API no futuro para envio automático a grupos

