## Plano: Trocar conta Mercado Pago (produção)

1. Abrir formulário seguro para você colar os 2 valores:
   - `MERCADOPAGO_ACCESS_TOKEN` (novo Access Token de produção — começa com `APP_USR-...`)
   - `MERCADOPAGO_WEBHOOK_SECRET` (assinatura do webhook da nova aplicação)

2. Após você salvar, os Edge Functions passam a usar imediatamente as novas credenciais (sem alterar código).

3. Você faz um pedido de teste real (R$ 50) para validar:
   - PIX cai na nova conta Mercado Pago
   - Status do pedido muda automaticamente para "pago" (webhook validando assinatura corretamente)

Sem mudanças de código, banco ou frontend. URL do webhook continua a mesma.

Aprove para eu abrir o formulário seguro.