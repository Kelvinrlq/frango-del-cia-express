

## Plano: Numeração diária + Painel admin + Corrigir WhatsApp

### Problema 1 — Pedido marcou #35 no primeiro do dia
A coluna `order_number` é uma sequência global que nunca zera. Vou trocar para **numeração diária**: cada dia começa em #1.

**Solução técnica:**
- Adicionar coluna `daily_order_number` (int) e `order_date` (date) na tabela `orders`.
- Criar função `get_next_daily_order_number()` que faz `MAX(daily_order_number) + 1 WHERE order_date = CURRENT_DATE` — retorna 1 se não houver pedidos hoje.
- Trigger `BEFORE INSERT` preenche `order_date = CURRENT_DATE` e `daily_order_number` automaticamente.
- Atualizar `build-whatsapp-message` para usar `daily_order_number` no lugar de `order_number` na mensagem do Telegram (formato continua `PEDIDO #1`, `#2`, `#3`...).
- Manter `order_number` antiga no banco (não remover) para não quebrar nada.

### Problema 2 — WhatsApp não abriu após finalizar pedido
**Causa:** `window.open()` é chamado dentro de `openWhatsAppAndNotifyGroup()` que roda DEPOIS do `await createOrder()`. Em navegadores mobile, `window.open` só funciona se chamado **sincronamente dentro do clique do usuário** — após um `await`, o navegador bloqueia como popup.

**Solução técnica:**
- Na tela de sucesso (`step === "sent"`), mostrar um **botão grande "📱 Abrir WhatsApp"** que o cliente clica manualmente. Esse clique é gesto direto do usuário → `window.open` funciona em qualquer navegador.
- Guardar a mensagem do WhatsApp em estado (`useState<string>`) após o pedido ser criado, para o botão usar.
- Também mostrar o resumo do pedido na tela de sucesso (número, total, itens) para o cliente saber o que foi pedido mesmo sem abrir o WhatsApp.
- Telegram continua sendo enviado automático em background (já funciona).

### Problema 3 — Painel admin no site para ver pedidos
Página `/admin` protegida por senha simples (sem necessidade de criar conta de usuário) para a dona ver todos os pedidos em tempo real.

**Solução técnica:**
- Criar rota `/admin` com tela de login simples: campo de senha comparado com uma senha fixa armazenada no `localStorage` após validação inicial. Senha definida via secret/constante (você me passa a senha desejada ou eu gero uma padrão).
- Após login, página lista pedidos da tabela `orders` ordenados por `created_at DESC`, com:
  - Número do dia (#1, #2...)
  - Nome, telefone do cliente
  - Tipo (entrega/retirada), endereço
  - Itens, total, forma de pagamento
  - Status (pendente, pago, etc.)
  - Link "Ver no Maps" se for entrega
  - Botão "Abrir no WhatsApp" para responder ao cliente
- Atualização em tempo real usando Supabase Realtime — pedidos novos aparecem sem precisar atualizar a página.
- RLS: criar policy de SELECT autorizada apenas com chave anon (já é o padrão público), mas a tela só mostra após senha correta no client. Para algo mais robusto depois, podemos migrar para auth real.

### Arquivos a alterar
- `supabase/migrations/...` — coluna `daily_order_number`, `order_date`, função e trigger.
- `supabase/functions/build-whatsapp-message/index.ts` — usar `daily_order_number`.
- `src/components/OrderModal.tsx` — botão manual "Abrir WhatsApp" na tela de sucesso, guardar mensagem em estado.
- `src/pages/Admin.tsx` (novo) — painel de pedidos com login por senha + realtime.
- `src/App.tsx` — adicionar rota `/admin`.

### Pergunta antes de implementar
Qual senha você quer para o painel admin? Sugiro `frango21` (simples de lembrar). Se preferir outra, me avise — caso contrário uso essa.

