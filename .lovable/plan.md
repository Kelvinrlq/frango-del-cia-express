

## Plano: Corrigir status PIX, traduzir rótulos e botão de excluir

### Problema 1 — Pedido continua "PIX pendente" mesmo após pagamento

**Causa raiz identificada:** verifiquei o pedido #8 no banco. O pagamento na tabela `payments` ficou como `approved`, mas a tabela `orders` continuou como `pending`. Os logs mostram que o webhook do Mercado Pago está sendo **rejeitado por assinatura inválida** ("Invalid webhook signature"), então quem está atualizando o pagamento é o polling do frontend (`check-payment-status`). Mas no código atual, esse polling atualiza `payments` e tenta atualizar `orders`, sem verificar se a atualização funcionou — e ela está falhando silenciosamente.

**Solução:**
- Em `check-payment-status` e `mercadopago-webhook`: adicionar verificação de erro e logs em cada `.update()`. Se o update da `orders` falhar, logar o erro detalhado para podermos diagnosticar.
- Substituir os dois `update` separados por uma **função SQL transacional** `mark_payment_approved(payment_id, mp_data)` que atualiza `payments` e `orders` numa só chamada — assim ou os dois atualizam ou nenhum atualiza, sem inconsistência.
- Corrigir o pedido #8 atual no banco: marcar como `paid`.
- Em paralelo: revisar a `MERCADOPAGO_WEBHOOK_SECRET` configurada — o segredo precisa ser exatamente o que está no painel do Mercado Pago em "Suas integrações → Webhooks → Chave secreta". Vou deixar uma mensagem orientando você a verificar isso, mas mesmo com webhook quebrado o polling do frontend resolve em até 3 segundos.

### Problema 2 — Status em inglês (`pending_cash`, `pending_credit`)

**Causa:** A função `create-order` salva no banco `pending_cash`, `pending_debit`, `pending_credito` (em inglês), mas o painel admin só conhece `pending_dinheiro`, `pending_debito`, `pending_credito` (em português) — então cai no fallback que mostra a string crua.

**Solução:**
- Migration para renomear pedidos antigos: `pending_cash` → `pending_dinheiro`, `pending_debit` → `pending_debito`, `pending_credit` → `pending_credito`.
- Atualizar `supabase/functions/create-order/index.ts` para gravar direto em português.
- Atualizar `supabase/functions/build-whatsapp-message/index.ts` para reconhecer os novos nomes em português.
- Manter no `Admin.tsx` ambos os formatos no mapa (legado em inglês + novo em português) para não quebrar pedidos antigos.

### Problema 3 — Botão de excluir pedidos no painel admin

**Solução:**
- Criar edge function `delete-order` (com `verify_jwt = false`) que exige um cabeçalho `x-admin-password` igual ao `ADMIN_PASSWORD`. Ela deleta o pedido + pagamentos relacionados usando service role.
- Migration para adicionar políticas RLS de DELETE em `orders` e `payments` permitindo apenas service_role (já é o padrão, mas garantindo).
- No `Admin.tsx`: botão vermelho "🗑️ Excluir" em cada card, com diálogo de confirmação (`AlertDialog`). Ao confirmar, chama a edge function passando a senha do localStorage. Após sucesso, o realtime já remove o pedido da lista automaticamente.

### Resumo dos arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/...sql` (novo) | Renomear status legados em inglês; criar função `mark_payment_approved`; corrigir pedido #8 |
| `supabase/functions/check-payment-status/index.ts` | Usar `mark_payment_approved`; logar erros |
| `supabase/functions/mercadopago-webhook/index.ts` | Usar `mark_payment_approved`; logar erros |
| `supabase/functions/create-order/index.ts` | Gravar `pending_dinheiro/debito/credito` em português |
| `supabase/functions/build-whatsapp-message/index.ts` | Reconhecer nomes em português |
| `supabase/functions/delete-order/index.ts` (novo) | Excluir pedido + pagamentos com senha admin |
| `supabase/config.toml` | Adicionar `[functions.delete-order] verify_jwt = false` |
| `src/pages/Admin.tsx` | Botão "Excluir" com confirmação; mapa de status com legados |

### Observação sobre o webhook do Mercado Pago
O webhook está sendo rejeitado (assinatura inválida). Isso não é bloqueante porque o polling do frontend cobre o caso, mas é bom verificar no painel do Mercado Pago se o segredo configurado em `MERCADOPAGO_WEBHOOK_SECRET` corresponde exatamente à chave secreta atual da integração. Posso investigar separadamente se quiser.

