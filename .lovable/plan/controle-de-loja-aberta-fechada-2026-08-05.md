# Controle de Loja Aberta/Fechada

Um botão no Painel Admin liga e desliga as vendas. Com a loja desligada, o cliente não consegue adicionar o frango ao carrinho nem finalizar pedido.

## Como vai funcionar

**No painel admin**
- No topo do painel, um cartão de status: "Loja ABERTA ✅" ou "Loja FECHADA 🔒", com um interruptor para alternar.
- Ao desligar, aparece uma confirmação. Opcionalmente é possível escrever um recado curto (ex.: "Voltamos amanhã às 10h") que aparece para os clientes.
- A mudança vale na hora para todos os visitantes do site.

**Para o cliente**
- Loja aberta: tudo igual a hoje.
- Loja fechada:
  - Faixa em destaque no topo da página: "Estamos fechados no momento" + o recado, se houver.
  - Botão "Adicionar ao carrinho" desabilitado no card do produto.
  - Botão de finalizar no carrinho desabilitado, com aviso.
  - Se o cliente já estiver com o modal aberto quando a loja fechar, o envio é bloqueado com mensagem clara.

**Proteção no servidor**
- Mesmo que alguém tente burlar a tela, o pedido é recusado no servidor quando a loja está fechada (vale para dinheiro/cartão e para PIX).

## Detalhes técnicos

1. **Banco** — nova tabela `store_settings` (linha única): `id`, `is_open boolean default true`, `closed_message text`, `updated_at`.
   - `GRANT SELECT` para `anon` e `authenticated` (o status precisa ser lido publicamente), `GRANT ALL` para `service_role`.
   - RLS habilitado: política de `SELECT` pública; escrita apenas por `service_role`.
   - Adicionar a tabela à publicação `supabase_realtime` para o status atualizar sem recarregar (apenas o status é público, sem dados pessoais).

2. **Edge Function `set-store-status`** — protegida por `x-admin-password` (mesmo padrão de `list-orders`/`delete-order`), grava `is_open` e `closed_message` via service role. Registrada em `supabase/config.toml`.

3. **Frontend**
   - Novo hook `src/hooks/useStoreStatus.ts`: lê `store_settings` via cliente Supabase e assina realtime (com cleanup via `removeChannel`).
   - `ProductCard.tsx`: desabilita o botão de adicionar e mostra o aviso quando fechado.
   - `CartSidebar.tsx`: desabilita o checkout quando fechado.
   - `Index.tsx`: faixa de aviso no topo.
   - `Admin.tsx`: cartão de status com `Switch`, campo de recado e chamada à função `set-store-status`.

4. **Servidor** — `create-order` e `create-pix-payment` consultam `store_settings` antes de criar o pedido e retornam erro 403 ("Loja fechada no momento") quando `is_open = false`.
